import { Add, Delete, Edit } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { setCurrentContest } from '../../features/contests/contestSlice';
import { useAppDispatch } from '../../hooks/reduxHooks';
import type { Contest } from '../../types/contest';
import { getStatusLabel, getStatusOption } from '../../utils/contestStatus';
import DeleteContest from './DeleteContest';
import EditContest from './EditContest';

interface ContestsTableProps {
  contests: Contest[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  title?: string;
  hideCreateButton?: boolean;
}

export default function ContestsTable({
  contests,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  title = 'My Contests',
  hideCreateButton = false,
}: ContestsTableProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAuth();

  // modal state for delete and edit dialogs
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // shared styling for table headers
  const headerSx = {
    color: 'white',
    fontWeight: 600,
    fontSize: { xs: '0.75rem', md: '0.875rem' },
  };

  // navigate to contest detail page
  const handleRowClick = (owner: string, name: string) => {
    navigate(`/contests/owner/${owner}/name/${name}`);
  };

  // set contest in redux and open delete modal
  const handleDelete = (contest: Contest) => {
    dispatch(setCurrentContest(contest));
    setDeleteModalOpen(true);
  };

  // set contest in redux and open edit modal
  const handleEdit = (contest: Contest) => {
    dispatch(setCurrentContest(contest));
    setEditModalOpen(true);
  };

  return (
    <>
      {/* main container */}
      <Box sx={{ p: 3 }}>
        {/* header with title and create button */}
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
            {title}
          </Typography>
          {!hideCreateButton && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/contests/create')}
            >
              Create Contest
            </Button>
          )}
        </Box>

        {/* table container */}
        <Paper
          sx={{
            background: theme.palette.grey[900],
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          }}
        >
          <TableContainer>
            <Table>
              {/* table header row */}
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>Name</TableCell>
                  <TableCell
                    sx={{
                      ...headerSx,
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    Home Team
                  </TableCell>
                  <TableCell
                    sx={{
                      ...headerSx,
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    Away Team
                  </TableCell>
                  <TableCell sx={headerSx}>Created By</TableCell>
                  <TableCell sx={headerSx}>Status</TableCell>
                  <TableCell
                    sx={{
                      ...headerSx,
                      textAlign: 'right',
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              {/* table body with contest rows */}
              <TableBody>
                {contests.map((contest, index) => (
                  <TableRow
                    key={contest.id}
                    onClick={() => handleRowClick(contest.owner, contest.name)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: index % 2 === 0 ? '' : 'rgba(255,255,255,0.02)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <TableCell
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        fontWeight: 500,
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                      }}
                    >
                      {contest.name}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        display: { xs: 'none', md: 'table-cell' },
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                      }}
                    >
                      {contest.homeTeam || ''}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        display: { xs: 'none', md: 'table-cell' },
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                      }}
                    >
                      {contest.awayTeam || ''}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                      }}
                    >
                      {contest.createdBy}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(contest.status)}
                        size="small"
                        sx={{
                          bgcolor: getStatusOption(contest.status).color,
                          color: 'white',
                          fontWeight: 500,
                          fontSize: { xs: '0.65rem', md: '0.75rem' },
                          '& .MuiChip-label': {
                            fontSize: { xs: '0.65rem', md: '0.75rem' },
                          },
                        }}
                      />
                    </TableCell>
                    {/* action buttons (edit/delete) for owner only */}
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: { xs: 0.5, md: 1 },
                          justifyContent: 'flex-end',
                        }}
                      >
                        {auth.user?.profile?.preferred_username === contest.owner && (
                          <Tooltip title="Edit Contest">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(contest);
                              }}
                              sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: { xs: '1rem', md: '1.25rem' },
                                padding: { xs: '4px', md: '8px' },
                                '&:hover': {
                                  color: 'white',
                                  backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                              }}
                            >
                              <Edit fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {auth.user?.profile?.preferred_username === contest.owner && (
                          <Tooltip title="Delete Contest">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(contest);
                              }}
                              sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: { xs: '1rem', md: '1.25rem' },
                                padding: { xs: '4px', md: '8px' },
                                '&:hover': {
                                  color: '#ff4444',
                                  backgroundColor: 'rgba(255,68,68,0.1)',
                                },
                              }}
                            >
                              <Delete fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
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
            count={totalCount}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      </Box>

      {/* delete and edit modals */}
      <DeleteContest open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
      <EditContest open={editModalOpen} onClose={() => setEditModalOpen(false)} />
    </>
  );
}
