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
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../../../api/errors';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import type { FeedRole, FeedStatus } from '../../../../types/contest';
import { fonts } from '../../../../app/theme';
import { useGetContestFeedInfiniteQuery } from '../../api';
import ContestsTable from './ContestsTable';
import ContestsTableSkeleton from './ContestsTableSkeleton';

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

interface HeroProps {
  action: ReactNode;
  children: ReactNode;
}

function Hero({ action, children }: HeroProps) {
  return (
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
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.4rem', sm: '3.2rem' },
                fontFamily: fonts.display,
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                lineHeight: 1,
              }}
            >
              Contests
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.5, fontSize: '0.9rem' }}>
              Everything you created or joined, in one place
            </Typography>
          </Box>
          {action}
        </Box>
        {children}
      </Container>
    </Box>
  );
}

const pageSx = { py: 3, px: { xs: 2, sm: 3 } };

export function ContestsBrowserSkeleton() {
  return (
    <Box>
      <Hero
        action={<Skeleton variant="rectangular" width={148} height={40} sx={{ borderRadius: 1 }} />}
      >
        <Skeleton variant="rectangular" height={40} sx={{ maxWidth: 640, borderRadius: 1 }} />
      </Hero>
      <Container maxWidth="lg" sx={pageSx}>
        <ContestsTableSkeleton title="" rowCount={4} />
      </Container>
    </Box>
  );
}

export default function ContestsBrowser() {
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const { data, error, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useGetContestFeedInfiniteQuery({
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
      search: search || undefined,
    });

  const contests = data?.pages.flatMap((page) => page.contests ?? []) ?? [];
  const canLoadMore = hasNextPage && !isFetchingNextPage;
  const sentinelRef = useInfiniteScroll<HTMLDivElement>(() => void fetchNextPage(), canLoadMore);

  // the previous results stay on screen, dimmed, while new filters load
  const refreshing = (isFetching && !isFetchingNextPage) || searchInput.trim() !== search;
  const filtered = role !== 'all' || status !== 'all' || !!search;

  if (isLoading) {
    return <ContestsBrowserSkeleton />;
  }

  return (
    <Box>
      <Hero
        action={
          <Button
            component={Link}
            to="/contests/create"
            variant="contained"
            startIcon={<Add />}
            sx={{ flexShrink: 0 }}
          >
            Create Contest
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search contests..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }} />
                  </InputAdornment>
                ),
                endAdornment: refreshing ? (
                  <InputAdornment position="end">
                    <CircularProgress
                      size={16}
                      thickness={5}
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    />
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
            aria-label="Status"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="open">Open</ToggleButton>
            <ToggleButton value="live">Live</ToggleButton>
            <ToggleButton value="finished">Finished</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Hero>

      <Container maxWidth="lg" sx={pageSx}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage(error, 'Error fetching contests')}
          </Alert>
        )}

        <Box
          sx={{
            opacity: refreshing ? 0.5 : 1,
            transition: 'opacity 0.25s ease',
            pointerEvents: refreshing ? 'none' : 'auto',
          }}
        >
          <ContestsTable
            contests={contests}
            emptyTitle={filtered ? 'No contests match these filters' : undefined}
            footer={
              <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center' }}>
                {isFetchingNextPage && <CircularProgress size={22} sx={{ my: 2 }} />}
                {canLoadMore && typeof IntersectionObserver === 'undefined' && (
                  <Button onClick={() => void fetchNextPage()} sx={{ my: 1 }}>
                    Load more
                  </Button>
                )}
              </Box>
            }
          />
        </Box>
      </Container>
    </Box>
  );
}
