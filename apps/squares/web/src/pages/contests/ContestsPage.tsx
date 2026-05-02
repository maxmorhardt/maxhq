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
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import ContestsTable from '../../components/contest/table/ContestsTable';
import ContestsTableSkeleton from '../../components/contest/table/ContestsTableSkeleton';
import LoadingScreen from '../../components/common/LoadingScreen';
import {
  selectContestError,
  selectContestLoading,
  selectContests,
  selectMyContests,
} from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestsByOwner, fetchMyContests } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { gradients } from '../../types/gradients';
import type { PaginatedContestsResponse } from '../../types/contest';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // owned contests state
  const [ownedPage, setOwnedPage] = useState(0);
  const [ownedRowsPerPage, setOwnedRowsPerPage] = useState(5);
  const [ownedPagination, setOwnedPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  // search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // track whether the first successful fetch has completed
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setOwnedPage(0);
    }, 1000);
  };

  // clear pending debounce on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  // joined contests state
  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const ownedContests = useAppSelector(selectContests);
  const joinedContests = useAppSelector(selectMyContests);

  // fetch owned contests when authenticated and pagination changes
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const owner = auth.user?.profile?.preferred_username;
    if (owner) {
      dispatch(
        fetchContestsByOwner({
          owner,
          pagination: {
            page: ownedPage + 1,
            limit: ownedRowsPerPage,
            search: debouncedSearch || undefined,
          },
        })
      ).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          const payload = result.payload as PaginatedContestsResponse;
          setOwnedPagination({
            page: payload.page,
            limit: payload.limit,
            total: payload.total,
            totalPages: payload.totalPages,
            hasNext: payload.hasNext,
            hasPrevious: payload.hasPrevious,
          });
        }
        // mark first load complete
        setHasLoadedOnce(true);
      });
    }
  }, [
    auth.isAuthenticated,
    auth.user,
    dispatch,
    isInterceptorReady,
    ownedPage,
    ownedRowsPerPage,
    debouncedSearch,
  ]);

  // fetch joined contests
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    dispatch(fetchMyContests(debouncedSearch || undefined));
  }, [auth.isAuthenticated, dispatch, isInterceptorReady, debouncedSearch]);

  // handle owned contests pagination
  const handleOwnedPageChange = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setOwnedPage(newPage);
  };

  const handleOwnedRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOwnedRowsPerPage(parseInt(event.target.value, 10));
    setOwnedPage(0);
  };

  // show redirecting component while signin redirect is in progress
  if (auth.isLoading && auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  const isSearching = hasLoadedOnce && (searchInput.trim() !== debouncedSearch || loading);

  // hero section shared between all states
  const heroSection = (skeletonMode = false) => (
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
              Manage and track your football squares contests
            </Typography>
          </Box>
          {skeletonMode ? (
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

        {skeletonMode ? (
          <Skeleton
            variant="rectangular"
            height={40}
            sx={{ maxWidth: 380, borderRadius: 1, width: '100%' }}
          />
        ) : (
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
                endAdornment: isSearching ? (
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
            sx={{
              width: { xs: '100%', sm: 380 },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.05)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputBase-input': {
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                '&::placeholder': { color: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
        )}
      </Container>
    </Box>
  );

  // show full-page skeleton only on the very first load. After the initial
  // fetch completes, in-flight refetches (search, pagination) show an inline
  // spinner in the search bar instead of unmounting the table.
  if (
    !hasLoadedOnce &&
    ((auth.isLoading && auth.activeNavigator !== 'signoutSilent') ||
      (auth.isAuthenticated && (!isInterceptorReady || loading)))
  ) {
    return (
      <Box>
        {heroSection(true)}
        <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
          <ContestsTableSkeleton title="My Contests" rowCount={2} />
          <Box sx={{ mt: 3 }}>
            <ContestsTableSkeleton title="Joined Contests" rowCount={2} />
          </Box>
        </Container>
      </Box>
    );
  }

  // show warning if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <Box>
        {heroSection()}
        <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Sign in to view your contests
          </Alert>
          <ContestsTable
            contests={[]}
            totalCount={0}
            page={0}
            rowsPerPage={5}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            title="My Contests"
          />
          <Box sx={{ mt: 3 }}>
            <ContestsTable
              contests={[]}
              totalCount={0}
              page={0}
              rowsPerPage={5}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              title="Joined Contests"
            />
          </Box>
        </Container>
      </Box>
    );
  }

  // filter out owned contests from joined list to avoid duplicates
  // (search is handled server-side now)
  const ownedIds = new Set(ownedContests.map((c) => c.id));
  const joinedOnly = joinedContests.filter((c) => !ownedIds.has(c.id));

  return (
    <Box>
      {heroSection()}

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" onClose={() => dispatch(clearError())} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            opacity: isSearching ? 0.5 : 1,
            transition: 'opacity 0.25s ease',
            pointerEvents: isSearching ? 'none' : 'auto',
          }}
        >
          <ContestsTable
            contests={ownedContests}
            totalCount={ownedPagination.total}
            page={ownedPage}
            rowsPerPage={ownedRowsPerPage}
            onPageChange={handleOwnedPageChange}
            onRowsPerPageChange={handleOwnedRowsPerPageChange}
            title="My Contests"
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              opacity: isSearching ? 0.5 : 1,
              transition: 'opacity 0.25s ease',
              pointerEvents: isSearching ? 'none' : 'auto',
            }}
          >
            <ContestsTable
              contests={joinedOnly}
              totalCount={joinedOnly.length}
              page={0}
              rowsPerPage={joinedOnly.length || 5}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              title="Joined Contests"
              hidePagination
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
