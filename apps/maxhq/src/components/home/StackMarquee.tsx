import { Box } from '@mui/material';

const rows: string[][] = [
  [
    'Java',
    'TypeScript',
    'Go',
    'Python',
    'SQL',
    'Spring Boot',
    'Gin',
    'GORM',
    'JPA',
    'React',
    'Angular',
    'Vite',
    'PrimeNG',
    'Material UI',
    'PostgreSQL',
    'Redis',
    'Valkey',
    'Server-sent events',
    'Bash',
  ],
  [
    'Kubernetes',
    'k3s',
    'Docker',
    'Helm',
    'Argo CD',
    'Terraform',
    'AWS',
    'EKS',
    'Lambda',
    'DynamoDB',
    'GitHub Actions',
    'Jenkins',
    'Renovate',
    'Prometheus',
    'Grafana',
    'Loki',
    'Datadog',
    'Dex',
    'Envoy Gateway',
    'Sealed Secrets',
    'CloudNativePG',
    'Cloudflare',
    'Tailscale',
  ],
];

function Pill({ name, loop = false }: { name: string; loop?: boolean }) {
  return (
    <Box
      component="li"
      aria-hidden={loop || undefined}
      sx={{
        flexShrink: 0,
        px: 2,
        py: 1,
        borderRadius: '10px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontSize: '0.92rem',
        fontWeight: 520,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </Box>
  );
}

export default function StackMarquee() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)',
        '@media (prefers-reduced-motion: reduce)': { maskImage: 'none' },
      }}
    >
      {rows.map((row, i) => (
        <Box key={i} sx={{ overflow: 'hidden' }}>
          {/* the row is printed twice so sliding by half its width loops seamlessly */}
          <Box
            component="ul"
            aria-label={i === 0 ? 'Languages and frameworks' : 'Platforms and operations'}
            sx={{
              display: 'flex',
              width: 'max-content',
              gap: 1.5,
              m: 0,
              p: 0,
              listStyle: 'none',
              animation: `stack-slide ${44 + i * 8}s linear infinite`,
              animationDirection: i % 2 ? 'reverse' : 'normal',
              '&:hover': { animationPlayState: 'paused' },
              '@keyframes stack-slide': {
                to: { transform: 'translateX(calc(-50% - 6px))' },
              },
              '@media (prefers-reduced-motion: reduce)': {
                width: 'auto',
                flexWrap: 'wrap',
                justifyContent: 'center',
                animation: 'none',
                '& [aria-hidden]': { display: 'none' },
              },
            }}
          >
            {row.map((name) => (
              <Pill key={name} name={name} />
            ))}
            {row.map((name) => (
              <Pill key={`${name}-loop`} name={name} loop />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
