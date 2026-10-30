import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import type { StreamStatus } from '../../../api/eventStream';
import type {
  ActivityEvent,
  Contest,
  ContestSnapshot,
  ContestStatus,
  ContestUpdate,
  Participant,
  QuarterResult,
  Square,
} from '../../../types/contest';
import { contestsApi } from '../api';
import { describeEvent, MAX_ACTIVITY, seedActivity } from './activity';
import type { ContestEvent, ContestEventOf, ContestEventType } from './events';

// why a stream stopped for good: the server refused it, or the contest went away under it
export type StreamEnd = 'forbidden' | 'not_found' | 'deleted' | 'revoked';

export interface LiveContestState {
  contestId: string | null;
  contest: Contest | null;
  participants: Participant[];
  activity: ActivityEvent[];
  status: StreamStatus;
  ended: StreamEnd | null;
}

const initialState: LiveContestState = {
  contestId: null,
  contest: null,
  participants: [],
  activity: [],
  status: 'connecting',
  ended: null,
};

// recording a quarter moves the contest on to the next one
const statusAfterQuarter: Record<number, ContestStatus> = {
  1: 'Q2',
  2: 'Q3',
  3: 'Q4',
  4: 'FINISHED',
};

// the same change can arrive twice (a write's response, then its event) or out of order on replay,
// so every update below is idempotent and ignores anything older than what is held
function upsertSquare(state: LiveContestState, square: Square) {
  const squares = state.contest?.squares;
  const index = squares?.findIndex((s) => s.id === square.id) ?? -1;
  if (!squares || index === -1 || square.version < squares[index].version) {
    return;
  }
  squares[index] = square;
}

function applyContestUpdate(state: LiveContestState, update: ContestUpdate) {
  const contest = state.contest;
  if (!contest || update.version < contest.version) {
    return;
  }

  const {
    name,
    homeTeam,
    awayTeam,
    xLabels,
    yLabels,
    visibility,
    status,
    gameId,
    version,
    updatedAt,
  } = update;
  Object.assign(contest, {
    name,
    homeTeam,
    awayTeam,
    xLabels,
    yLabels,
    visibility,
    status,
    gameId,
    version,
    updatedAt,
  });
}

function addQuarterResult(state: LiveContestState, result: QuarterResult) {
  const contest = state.contest;
  if (!contest) {
    return;
  }

  contest.quarterResults ??= [];
  if (contest.quarterResults.some((qr) => qr.quarter === result.quarter)) {
    return;
  }
  contest.quarterResults.push(result);
  contest.status = statusAfterQuarter[result.quarter] ?? contest.status;
}

function upsertParticipant(state: LiveContestState, participant: Participant) {
  const index = state.participants.findIndex((p) => p.id === participant.id);
  if (index === -1) {
    state.participants.push(participant);
  } else {
    state.participants[index] = participant;
  }
}

function removeParticipant(state: LiveContestState, userId: string) {
  state.participants = state.participants.filter((p) => p.userId !== userId);
}

type EventHandler<T extends ContestEventType> = (
  state: LiveContestState,
  event: ContestEventOf<T>
) => void;

// one handler per event type; the mapped type makes a missing handler a compile error
function applySnapshot(state: LiveContestState, snapshot: ContestSnapshot) {
  state.contest = snapshot.contest;
  state.participants = snapshot.participants ?? [];
  state.activity = seedActivity(snapshot.contest, state.participants);
}

const eventHandlers: { [T in ContestEventType]: EventHandler<T> } = {
  'contest.snapshot': (state, { data }) => applySnapshot(state, data),
  'contest.updated': (state, { data }) => applyContestUpdate(state, data),
  'contest.deleted': (state) => {
    state.ended = 'deleted';
  },
  'square.updated': (state, { data }) => upsertSquare(state, data),
  'quarter.recorded': (state, { data }) => addQuarterResult(state, data),
  'participant.joined': (state, { data }) => upsertParticipant(state, data),
  'participant.updated': (state, { data }) => upsertParticipant(state, data),
  'participant.removed': (state, { data }) => removeParticipant(state, data.userId),
  'access.revoked': (state) => {
    state.ended = 'revoked';
  },
};

function applyEvent<T extends ContestEventType>(state: LiveContestState, event: ContestEventOf<T>) {
  (eventHandlers[event.type] as EventHandler<T>)(state, event);
}

const { endpoints } = contestsApi;

const liveContestSlice = createSlice({
  name: 'liveContest',
  initialState,
  reducers: {
    streamOpened: (_, action: PayloadAction<string>) => ({
      ...initialState,
      contestId: action.payload,
    }),
    streamClosed: () => initialState,
    streamStatusChanged(state, action: PayloadAction<StreamStatus>) {
      state.status = action.payload;
    },
    streamEnded(state, action: PayloadAction<StreamEnd>) {
      state.ended = action.payload;
    },
    eventReceived(state, action: PayloadAction<{ id: string | null; event: ContestEvent }>) {
      const { id, event } = action.payload;
      // copied out before the event is applied, since applying it changes the draft in place
      const square =
        event.type === 'square.updated'
          ? state.contest?.squares.find((s) => s.id === event.data.id)
          : undefined;
      const before = {
        status: state.contest?.status,
        square: square && { owner: square.owner, value: square.value },
      };

      applyEvent(state, event);

      const entry = describeEvent(event, id ?? `${event.type}-${event.timestamp}`, before);
      if (entry) {
        state.activity.push(entry);
        state.activity = state.activity.slice(-MAX_ACTIVITY);
      }
    },
  },
  extraReducers: (builder) => {
    // a write's response lands before its event, so the grid updates without waiting on the stream
    builder
      .addMatcher(endpoints.getContest.matchFulfilled, (state, action) => {
        if (action.meta.arg.originalArgs === state.contestId) {
          applySnapshot(state, action.payload);
        }
      })
      .addMatcher(
        isAnyOf(endpoints.claimSquare.matchFulfilled, endpoints.clearSquare.matchFulfilled),
        (state, action) => upsertSquare(state, action.payload)
      )
      .addMatcher(endpoints.claimRandomSquares.matchFulfilled, (state, action) => {
        action.payload.squares.forEach((square) => upsertSquare(state, square));
      })
      .addMatcher(endpoints.clearMySquares.matchFulfilled, (state, action) => {
        action.payload.forEach((square) => upsertSquare(state, square));
      })
      .addMatcher(endpoints.updateParticipant.matchFulfilled, (state, action) =>
        upsertParticipant(state, action.payload)
      )
      .addMatcher(endpoints.removeParticipant.matchFulfilled, (state, action) => {
        const { contestId, userId } = action.meta.arg.originalArgs;
        if (contestId === state.contestId) {
          removeParticipant(state, userId);
        }
      });
  },
});

export const { streamOpened, streamClosed, streamStatusChanged, streamEnded, eventReceived } =
  liveContestSlice.actions;
export const liveContestReducer = liveContestSlice.reducer;
