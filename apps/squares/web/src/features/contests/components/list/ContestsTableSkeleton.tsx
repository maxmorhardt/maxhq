import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

interface ContestsTableSkeletonProps {
  title?: string;
  rowCount?: number;
}

export default function ContestsTableSkeleton({
  title = 'My Contests',
  rowCount = 2,
}: ContestsTableSkeletonProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ p: { xs: 0, sm: 1 } }}>
      {/* section title */}
      <Typography
        sx={{
          color: 'white',
          fontWeight: 800,
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          mb: 2,
        }}
      >
        {title}
      </Typography>

      {/* skeleton table container */}
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        {isMobile ? (
          /* mobile card skeleton */
          <Box sx={{ p: 1.5 }}>
            {[...Array(rowCount)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  '&:not(:last-child)': {
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  },
                }}
              >
                {/* row 1: name + action icons */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Skeleton variant="text" width="55%" height={20} />
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="circular" width={24} height={24} />
                  </Box>
                </Box>
                {/* row 2: status chip + teams */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 3 }} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          /* desktop table skeleton */
          <TableContainer>
            <Table sx={{ tableLayout: 'fixed' }}>
              {/* header row: Name 35% | Matchup 30% | Status 20% | Actions 15% */}
              <TableHead>
                <TableRow sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <TableCell sx={{ width: '35%' }}>
                    <Skeleton variant="text" width={60} />
                  </TableCell>
                  <TableCell sx={{ width: '30%' }}>
                    <Skeleton variant="text" width={70} />
                  </TableCell>
                  <TableCell sx={{ width: '20%' }}>
                    <Skeleton variant="text" width={50} />
                  </TableCell>
                  <TableCell sx={{ width: '15%' }}>
                    <Skeleton variant="text" width={55} sx={{ ml: 'auto' }} />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(rowCount)].map((_, index) => (
                  <TableRow key={index} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Skeleton variant="text" width="60%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="70%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton
                        variant="rectangular"
                        width={68}
                        height={24}
                        sx={{ borderRadius: 3 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
