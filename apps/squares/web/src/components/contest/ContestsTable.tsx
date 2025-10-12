import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Tooltip,
  Chip,
} from '@mui/material';
import { Edit, Add, Visibility } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Contest } from '../../types/contest';

interface ContestsTableProps {
  contests: Contest[];
}

export default function ContestsTable({ contests }: ContestsTableProps) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 10; // Fixed rows per page;
  const navigate = useNavigate();

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowClick = (contestId: string) => {
    navigate(`/contests/${contestId}`);
  };

  const paginatedContests = contests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box
      sx={{
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: 'white',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Contests
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/contests/create')}
          sx={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 600,
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            '&:hover': {
              background: 'rgba(255,255,255,0.15)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Create
        </Button>
      </Box>

      {/* Table */}
      <Paper
        sx={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <TableCell
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Home Team
                </TableCell>
                <TableCell
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Away Team
                </TableCell>
                <TableCell
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Created By
                </TableCell>
                <TableCell
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContests.map((contest, index) => (
                <TableRow
                  key={contest.id}
                  onClick={() => handleRowClick(contest.id)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <TableCell sx={{ color: 'white', fontWeight: 500 }}>{contest.name}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {contest.homeTeam || ''}
                  </TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {contest.awayTeam || ''}
                  </TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>{contest.createdBy}</TableCell>
                  <TableCell>
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title="View Contest">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(contest.id);
                          }}
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': {
                              color: 'white',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Contest">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add edit functionality
                            console.log('Edit contest:', contest.id);
                          }}
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': {
                              color: 'white',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={contests.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={() => {}} // Disabled
          rowsPerPageOptions={[]}
          sx={{
            color: 'rgba(255,255,255,0.8)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            '& .MuiTablePagination-actions button': {
              color: 'rgba(255,255,255,0.8)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
              '&.Mui-disabled': {
                color: 'rgba(255,255,255,0.3)',
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
}
