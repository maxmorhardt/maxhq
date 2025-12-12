import { Add } from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function ContestsTableSkeleton() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{
            color: 'white',
            fontWeight: 800,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          My Contests
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/contests/create')}
        >
          Create Contest
        </Button>
      </Box>
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" /></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                  <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
