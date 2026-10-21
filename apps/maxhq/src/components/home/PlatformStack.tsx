import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useRef, type ReactNode } from 'react';
import { easing, fonts, primaryTint, secondaryTint } from '../../theme';

// the edge of each layer's square, in px
const SIZE = 280;
// one full pass of the light, top to bottom and a rest
const CYCLE_S = 5.2;
// the light enters the top layer and leaves the bottom one at these points in the cycle
const ENTER = 0.06;
const TRAVEL = 0.66;

const plane = (theme: Theme) =>
  `color-mix(in srgb, ${(theme.vars ?? theme).palette.background.paper} 78%, transparent)`;

const mono = { fontFamily: fonts.mono, fontSize: 12, lineHeight: 1 } as const;

function Monitoring() {
  const bars = [38, 52, 44, 61, 47, 72, 58, 40, 55, 66, 49, 35];

  return (
    <Box sx={{ display: 'grid', gap: 1.25, flex: 1, gridTemplateRows: 'auto 1fr' }}>
      <Box sx={{ ...mono, display: 'flex', gap: 2, color: 'text.secondary' }}>
        <span>latency</span>
        <span>errors</span>
        <Box component="span" sx={{ ml: 'auto', color: 'success.main' }}>
          ● healthy
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.75,
          px: 1,
          pb: 1,
          borderRadius: '8px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        {bars.map((height, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: `${height}%`,
              borderRadius: '3px 3px 0 0',
              bgcolor: i === 5 ? 'primary.main' : (theme) => secondaryTint(theme, 0.45),
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function Infra() {
  const services = ['eks', 'ec2', 'efs', 's3', 'lambda', 'dynamodb'];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, flex: 1 }}>
      {services.map((name, i) => (
        <Box
          key={name}
          sx={{
            ...mono,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 1,
            borderRadius: '8px',
            border: 1,
            borderColor: i === 0 ? (theme) => primaryTint(theme, 0.5) : 'divider',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              boxShadow: '0 0 10px currentColor',
              color: 'success.main',
            }}
          />
          {name}
        </Box>
      ))}
    </Box>
  );
}

function Routes() {
  const routes = [
    { method: 'POST', path: '/workspaces' },
    { method: 'GET', path: '/workspaces/{id}' },
    { method: 'PATCH', path: '/workspaces/{id}' },
    { method: 'DELETE', path: '/workspaces/{id}' },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 1.25, flex: 1, alignContent: 'center' }}>
      {routes.map((route) => (
        <Box
          key={route.method}
          sx={{ ...mono, display: 'flex', gap: 1.25, color: 'text.secondary', py: 0.5 }}
        >
          <Box
            component="span"
            sx={{
              width: 50,
              fontWeight: 700,
              color: route.method === 'GET' ? 'secondary.main' : 'primary.main',
            }}
          >
            {route.method}
          </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>
            {route.path}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function Interface() {
  const workspaces = [
    { name: 'vs code', status: 'running' },
    { name: 'jupyterlab', status: 'running' },
    { name: 'rstudio', status: 'starting' },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 1, flex: 1, alignContent: 'center' }}>
      {workspaces.map((workspace, i) => (
        <Box
          key={workspace.name}
          sx={{
            ...mono,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1.1,
            borderRadius: '8px',
            border: 1,
            borderColor: i === 0 ? 'primary.main' : 'divider',
            bgcolor: i === 0 ? (theme) => primaryTint(theme, 0.14) : 'background.default',
            color: 'text.primary',
          }}
        >
          {workspace.name}
          <Box
            component="span"
            sx={{
              ml: 'auto',
              px: 0.75,
              py: 0.4,
              borderRadius: 999,
              fontSize: 10,
              color: workspace.status === 'running' ? 'success.main' : 'warning.main',
              border: 1,
              borderColor: 'currentColor',
            }}
          >
            {workspace.status}
          </Box>
        </Box>
      ))}
      <Box
        sx={{
          height: 8,
          mt: 0.5,
          width: '46%',
          borderRadius: 4,
          bgcolor: 'primary.main',
          opacity: 0.8,
        }}
      />
    </Box>
  );
}

interface Layer {
  name: string;
  detail: string;
  content: ReactNode;
}

// bottom to top, the way a request lands
const layers: Layer[] = [
  { name: 'monitoring', detail: 'datadog · grafana', content: <Monitoring /> },
  { name: 'infra', detail: 'aws · eks · terraform', content: <Infra /> },
  { name: 'api', detail: 'spring boot · openapi', content: <Routes /> },
  { name: 'interface', detail: 'angular · primeng', content: <Interface /> },
];

const top = layers.length - 1;

// when in the cycle the light reaches layer i
const hitAt = (i: number) => (ENTER + (TRAVEL * (top - i)) / top) * CYCLE_S;

const motion = '@media (prefers-reduced-motion: no-preference)';

// the platform drawn as an exploded stack; a light runs down through it, and the layers fan out as the page scrolls on
export default function PlatformStack() {
  const scene = useRef<HTMLDivElement>(null);

  // the stack leans a little toward the pointer
  useEffect(() => {
    const element = scene.current;
    const fine = window.matchMedia?.('(hover: hover) and (prefers-reduced-motion: no-preference)');

    if (!element || !fine?.matches) {
      return;
    }

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty('--tilt-x', x.toFixed(3));
      element.style.setProperty('--tilt-y', y.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      if (!frame) {
        frame = requestAnimationFrame(apply);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <Box
      role="img"
      aria-label="A platform as a stack of layers: interface, API, infrastructure, and monitoring"
      sx={{
        // the gap between layers widens with the hero's scroll progress
        '--gap': 'calc(132px + var(--progress, 0) * 70px)',
        [`@media (prefers-reduced-motion: reduce)`]: { '--gap': '132px' },
        position: 'relative',
        width: 480,
        height: 660,
        mx: 'auto',
        zoom: { xs: 0.66, sm: 0.85, md: 1 },
      }}
    >
      <Box
        ref={scene}
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 10,
          width: SIZE,
          height: SIZE,
          ml: `${-SIZE / 2}px`,
          transformStyle: 'preserve-3d',
          transform:
            'rotateX(calc(56deg - var(--tilt-y, 0) * 10deg)) rotateZ(calc(-42deg + var(--tilt-x, 0) * 14deg))',
          transition: `transform 900ms ${easing.reveal}`,
        }}
      >
        {/* the core the request travels down */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 2,
            ml: '-1px',
            height: `calc(var(--gap) * ${top})`,
            transformOrigin: 'top center',
            transform: 'rotateX(90deg)',
            background: (theme) =>
              `linear-gradient(to bottom, ${secondaryTint(theme, 0.1)}, ${primaryTint(theme, 0.7)})`,
          }}
        />

        {layers.map((layer, i) => (
          <Box
            key={layer.name}
            sx={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              transform: `translateZ(calc(var(--gap) * ${i}))`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                p: 2.25,
                borderRadius: '22px',
                border: 1,
                borderColor: i === top ? (theme) => primaryTint(theme, 0.45) : 'divider',
                bgcolor: plane,
                boxShadow: (theme) =>
                  `0 30px 60px -30px ${primaryTint(theme, 0.35)}, inset 0 1px 0 ${primaryTint(theme, 0.08)}`,
                [motion]: {
                  animation: `stack-land 1s ${easing.reveal} ${0.15 + i * 0.12}s both`,
                },
                '@keyframes stack-land': {
                  from: { opacity: 0, transform: 'translateZ(120px)' },
                  to: { opacity: 1, transform: 'none' },
                },
              }}
            >
              <Box sx={{ ...mono, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {String(layers.length - i).padStart(2, '0')} {layer.name}
                </Box>
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {layer.detail}
                </Box>
              </Box>
              {layer.content}

              {/* the layer lights as the request passes through it */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: 'inherit',
                  border: 1,
                  borderColor: 'primary.main',
                  boxShadow: (theme) =>
                    `0 0 0 4px ${primaryTint(theme, 0.12)}, 0 0 48px ${primaryTint(theme, 0.4)}`,
                  opacity: 0,
                  pointerEvents: 'none',
                  [motion]: {
                    animation: `stack-hit ${CYCLE_S}s linear ${hitAt(i).toFixed(2)}s infinite`,
                  },
                  '@keyframes stack-hit': {
                    '0%': { opacity: 1 },
                    '14%, 100%': { opacity: 0 },
                  },
                }}
              />
            </Box>
          </Box>
        ))}

        {/* the request itself: a ring of light sinking through the layers */}
        <Box
          aria-hidden
          sx={{
            display: 'none',
            [motion]: {
              display: 'block',
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: 2,
              borderColor: 'primary.main',
              boxShadow: (theme) =>
                `0 0 24px ${primaryTint(theme, 0.8)}, inset 0 0 16px ${primaryTint(theme, 0.5)}`,
              animation: `stack-ring ${CYCLE_S}s linear infinite`,
            },
            '@keyframes stack-ring': {
              '0%': {
                opacity: 0,
                transform: `translate3d(-50%, -50%, calc(var(--gap) * ${top} + 60px))`,
              },
              [`${ENTER * 100}%`]: {
                opacity: 1,
                transform: `translate3d(-50%, -50%, calc(var(--gap) * ${top}))`,
              },
              [`${(ENTER + TRAVEL) * 100}%`]: {
                opacity: 1,
                transform: 'translate3d(-50%, -50%, 0)',
              },
              [`${(ENTER + TRAVEL + 0.08) * 100}%, 100%`]: {
                opacity: 0,
                transform: 'translate3d(-50%, -50%, -30px)',
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}
