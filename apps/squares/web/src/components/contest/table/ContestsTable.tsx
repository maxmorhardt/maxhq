import { Add, Delete, Edit, EmojiEvents } from '@mui/icons-material';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { setCurrentContest } from '../../../features/contests/contestSlice';
import { useAppDispatch } from '../../../hooks/reduxHooks';
import type { Contest } from '../../../types/contest';
import { getStatusLabel, getStatusOption } from '../../../utils/contestStatus';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
          {contests.length === 0 ? (
            /* empty state */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 6, md: 10 },
                px: 3,
              }}
            >
              <EmojiEvents
                sx={{
                  fontSize: { xs: 48, md: 64 },
                  color: 'rgba(255,255,255,0.15)',
                  mb: 2,
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 600,
                  mb: 1,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                No contests yet
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.3)',
                  textAlign: 'center',
                  maxWidth: 320,
                }}
              >
                Create your first contest to get started
              </Typography>
            </Box>
          ) : isMobile ? (
            /* mobile card layout */
            <Box sx={{ p: 1.5 }}>
              {contests.map((contest, index) => (
                <Box
                  key={contest.id}
                  onClick={() => handleRowClick(contest.owner, contest.name)}
                  sx={{
                    cursor: 'pointer',
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    transition: 'background-color 0.2s',
                    '&:not(:last-child)': {
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mr: 1,
                      }}
                    >
                      {contest.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {auth.user?.profile?.preferred_username === contest.owner && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(contest);
                            }}
                            sx={{
                              color: 'rgba(255,255,255,0.7)',
                              padding: '4px',
                              '&:hover': {
                                color: 'white',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                              },
                            }}
                          >
                            <Edit sx={{ fontSize: '1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contest);
                            }}
                            sx={{
                              color: 'rgba(255,255,255,0.7)',
                              padding: '4px',
                              '&:hover': {
                                color: '#ff4444',
                                backgroundColor: 'rgba(255,68,68,0.1)',
                              },
                            }}
                          >
                            <Delete sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Chip
                      label={getStatusLabel(contest.status)}
                      size="small"
                      sx={{
                        bgcolor: getStatusOption(contest.status).color,
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.65rem',
                        height: 22,
                        '& .MuiChip-label': { fontSize: '0.65rem' },
                      }}
                    />
                    {(contest.homeTeam || contest.awayTeam) && (
                      <Typography
                        sx={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {[contest.homeTeam, contest.awayTeam].filter(Boolean).join(' vs ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            /* desktop table layout */
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerSx}>Name</TableCell>
                    <TableCell sx={headerSx}>Home Team</TableCell>
                    <TableCell sx={headerSx}>Away Team</TableCell>
                    <TableCell sx={headerSx}>Created By</TableCell>
                    <TableCell sx={headerSx}>Status</TableCell>
                    <TableCell sx={{ ...headerSx, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contests.map((contest, index) => (
                    <TableRow
                      key={contest.id}
                      onClick={() => handleRowClick(contest.owner, contest.name)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: index % 2 === 0 ? '' : 'rgba(255,255,255,0.02)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <TableCell
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                      >
                        {contest.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {contest.homeTeam || ''}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {contest.awayTeam || ''}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '0.875rem',
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
                            fontSize: '0.75rem',
                            '& .MuiChip-label': { fontSize: '0.75rem' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
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
                                  '&:hover': {
                                    color: 'white',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
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
                                  '&:hover': {
                                    color: '#ff4444',
                                    backgroundColor: 'rgba(255,68,68,0.1)',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
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
          )}

          {/* Pagination - only show when there are contests */}
          {contests.length > 0 && (
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={onPageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          )}
        </Paper>
      </Box>

      {/* delete and edit modals */}
      <DeleteContest open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
      <EditContest open={editModalOpen} onClose={() => setEditModalOpen(false)} />
    </>
  );
}
