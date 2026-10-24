import { Box, Container, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game } from '../../../app/theme';
import Reveal from '../../../components/Reveal';
import { formatCount } from '../../../utils/formatCount';
import { useGetSiteStatsQuery } from '../api';

export default function LandingScoreboard() {
  const { data: stats, isLoading: loading } = useGetSiteStatsQuery();

  const tiles = [
    { label: 'Contests created today', value: stats?.contestsCreatedToday },
    { label: 'Squares claimed today', value: stats?.squaresClaimedToday },
    { label: 'Active contests', value: stats?.totalActiveContests },
  ];

  return (
    <Box component="section" aria-labelledby="scoreboard-title" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Reveal>
          <Box
            sx={{
              borderRadius: '20px',
              border: 1,
              borderColor: game.lineStrong,
              bgcolor: game.night,
              overflow: 'hidden',
              boxShadow: `inset 0 1px 0 ${alpha(game.chalk, 0.05)}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: game.stand,
              }}
            >
              <Typography
                id="scoreboard-title"
                component="h2"
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Today on Squares
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              {tiles.map((tile, i) => (
                <Box
                  key={tile.label}
                  sx={{
                    py: { xs: 3, md: 4.5 },
                    px: 2,
                    textAlign: 'center',
                    borderTop: { xs: i ? 1 : 0, sm: 0 },
                    borderLeft: { sm: i ? 1 : 0 },
                    borderColor: { xs: 'divider', sm: 'divider' },
                  }}
                >
                  {loading ? (
                    <Skeleton
                      variant="rounded"
                      width={110}
                      height={64}
                      sx={{ mx: 'auto' }}
                      data-testid="scoreboard-loading"
                    />
                  ) : (
                    <Typography
                      title={tile.value?.toLocaleString()}
                      sx={{
                        fontFamily: fonts.display,
                        fontWeight: 800,
                        fontSize: 'clamp(3rem, 7vw, 4.6rem)',
                        lineHeight: 1,
                        color: 'secondary.main',
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: `0 0 24px ${alpha(game.gold, 0.25)}`,
                      }}
                    >
                      {tile.value === undefined ? '–' : formatCount(tile.value)}
                    </Typography>
                  )}
                  <Typography
                    sx={{
                      mt: 1.25,
                      fontFamily: fonts.display,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    {tile.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
