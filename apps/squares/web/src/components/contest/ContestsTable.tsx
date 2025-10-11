import {
  Box,
  Link as MuiLink,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import type { Contest } from '../../types/contest';

interface ContestsTableProps {
  contests: Contest[];
}

export default function ContestsTable({ contests }: ContestsTableProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
        Contests Overview
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>X Labels</TableCell>
              <TableCell>Y Labels</TableCell>
              <TableCell>Created By</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {contests.map((contest) => (
              <TableRow key={contest.id}>
                <TableCell>
                  <MuiLink component={Link} to={`/contests/${contest.id}`} underline="hover">
                    {contest.name}
                  </MuiLink>
                </TableCell>
                <TableCell>{contest.xLabels.join(', ')}</TableCell>
                <TableCell>{contest.yLabels.join(', ')}</TableCell>
                <TableCell>{contest.createdBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
