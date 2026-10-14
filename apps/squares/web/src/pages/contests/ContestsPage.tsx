import { Add, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContestsTable from '../../components/contest/table/ContestsTable';
import ContestsTableSkeleton from '../../components/contest/table/ContestsTableSkeleton';
import {
  selectContestError,
  selectContestFeed,
  selectContestFeedCursor,
  selectContestFeedFetched,
  selectContestFeedLoading,
  selectContestFeedLoadingMore,
} from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestFeed } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import type { ContestFeedParams, FeedRole, FeedStatus } from '../../types/contest';
import { gradients } from '../../types/gradients';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 500;

type RoleFilter = 'all' | FeedRole;
type StatusFilter = 'all' | FeedStatus;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255,255,255,0.05)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)' },
};

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const contests = useAppSelector(selectContestFeed);
  const fetched = useAppSelector(selectContestFeedFetched);
  const nextCursor = useAppSelector(selectContestFeedCursor);
  const loading = useAppSelector(selectContestFeedLoading);
  const loadingMore = useAppSelector(selectContestFeedLoadingMore);
  const error = useAppSelector(selectContestError);

  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo<ContestFeedParams>(
    () => ({
      limit: PAGE_SIZE,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
      search: search || undefined,
    }),
    [role, status, search]
  );

  const canFetch = auth.isAuthenticated && isInterceptorReady;

  const reload = useCallback(() => {
    dispatch(fetchContestFeed({ params }));
  }, [dispatch, params]);

  useEffect(() => {
    if (canFetch) {
      reload();
    }
  }, [canFetch, reload]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (nextCursor && !loading && !loadingMore) {
      dispatch(fetchContestFeed({ params: { ...params, cursor: nextCursor }, append: true }));
    }
  }, [dispatch, params, nextCursor, loading, loadingMore]);

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(loadMore, canFetch && !!nextCursor);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => setSearch(value.trim()), SEARCH_DEBOUNCE_MS);
  };

  if (auth.isLoading && auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  const firstLoad =
    !fetched &&
    ((auth.isLoading && auth.activeNavigator !== 'signoutSilent') || auth.isAuthenticated);
  const refreshing = fetched && (loading || searchInput.trim() !== search);

  const filters = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <TextField
        size="small"
        placeholder="Search contests..."
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        disabled={!auth.isAuthenticated}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }} />
              </InputAdornment>
            ),
            endAdornment: refreshing ? (
              <InputAdornment position="end">
                <CircularProgress size={16} thickness={5} sx={{ color: 'rgba(255,255,255,0.5)' }} />
              </InputAdornment>
            ) : undefined,
          },
        }}
        sx={{ ...fieldSx, width: { xs: '100%', sm: 300 } }}
      />
      <ToggleButtonGroup
        size="small"
        exclusive
        value={role}
        onChange={(_, value: RoleFilter | null) => value && setRole(value)}
        disabled={!auth.isAuthenticated}
        aria-label="Role"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="owned">Created</ToggleButton>
        <ToggleButton value="joined">Joined</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={status}
        onChange={(_, value: StatusFilter | null) => value && setStatus(value)}
        disabled={!auth.isAuthenticated}
        aria-label="Status"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="open">Open</ToggleButton>
        <ToggleButton value="live">Live</ToggleButton>
        <ToggleButton value="finished">Finished</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const hero = (
    <Box
      sx={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        py: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2.5,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                background: gradients.textGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}
            >
              Contests
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.5, fontSize: '0.9rem' }}>
              Everything you created or joined, in one place
            </Typography>
          </Box>
          {firstLoad ? (
            <Skeleton variant="rectangular" width={148} height={40} sx={{ borderRadius: 1 }} />
          ) : auth.isAuthenticated ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/contests/create')}
              sx={{ flexShrink: 0 }}
            >
              Create Contest
            </Button>
          ) : null}
        </Box>
        {firstLoad ? (
          <Skeleton variant="rectangular" height={40} sx={{ maxWidth: 640, borderRadius: 1 }} />
        ) : (
          filters
        )}
      </Container>
    </Box>
  );

  return (
    <Box>
      <Helmet>
        <title>Contests – Squares</title>
        <meta name="description" content="Browse and manage your NFL football squares contests." />
        <link rel="canonical" href="https://squares.maxstash.io/contests" />
      </Helmet>
      {hero}

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {!auth.isAuthenticated && !firstLoad && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Sign in to view your contests
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => dispatch(clearError())} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {firstLoad ? (
          <ContestsTableSkeleton title="" rowCount={4} />
        ) : (
          <Box
            sx={{
              opacity: refreshing ? 0.5 : 1,
              transition: 'opacity 0.25s ease',
              pointerEvents: refreshing ? 'none' : 'auto',
            }}
          >
            <ContestsTable
              contests={auth.isAuthenticated ? contests : []}
              onLeave={reload}
              emptyTitle={
                params.role || params.status || params.search
                  ? 'No contests match these filters'
                  : undefined
              }
              footer={
                <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center' }}>
                  {loadingMore && <CircularProgress size={22} sx={{ my: 2 }} />}
                  {!loadingMore && nextCursor && typeof IntersectionObserver === 'undefined' && (
                    <Button onClick={loadMore} sx={{ my: 1 }}>
                      Load more
                    </Button>
                  )}
                </Box>
              }
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}
