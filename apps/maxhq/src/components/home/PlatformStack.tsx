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

// each layer's picture is drawn in a 240 × 72 box, in the theme's colors
const pictureSx = {
  display: 'block',
  width: '100%',
  height: 60,
  color: 'primary.main',
  '& .muted': { stroke: 'var(--mui-palette-divider)' },
  '& .fill': { fill: 'var(--mui-palette-background-default)' },
  '& .ok': { fill: 'var(--mui-palette-success-main)' },
  '& .accent': { fill: 'currentColor' },
} as const;

// a browser window with a sidebar and a page of content
function InterfacePicture() {
  return (
    <Box component="svg" viewBox="0 0 240 72" sx={pictureSx}>
      <rect className="fill muted" x="1" y="1" width="238" height="70" rx="8" strokeWidth="1.5" />
      <line className="muted" x1="1" y1="14" x2="239" y2="14" strokeWidth="1.5" />
      <circle cx="10" cy="8" r="2.2" fill="#ff5f57" />
      <circle cx="18" cy="8" r="2.2" fill="#febc2e" />
      <circle cx="26" cy="8" r="2.2" fill="#28c840" />
      <rect
        className="muted"
        x="8"
        y="21"
        width="44"
        height="43"
        rx="4"
        fill="none"
        strokeWidth="1.5"
      />
      <rect className="accent" x="60" y="21" width="74" height="7" rx="3.5" />
      <rect
        className="muted"
        x="60"
        y="34"
        width="172"
        height="12"
        rx="4"
        fill="none"
        strokeWidth="1.5"
      />
      <rect
        className="muted"
        x="60"
        y="52"
        width="80"
        height="12"
        rx="4"
        fill="none"
        strokeWidth="1.5"
      />
      <rect className="accent" x="146" y="52" width="40" height="12" rx="6" opacity="0.85" />
    </Box>
  );
}

// a request going out and a response coming back
function ApiPicture() {
  return (
    <Box component="svg" viewBox="0 0 240 72" sx={pictureSx}>
      <rect className="fill muted" x="1" y="10" width="84" height="52" rx="8" strokeWidth="1.5" />
      <text
        x="12"
        y="31"
        fontFamily={fonts.mono}
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
      >
        GET
      </text>
      <text
        x="12"
        y="48"
        fontFamily={fonts.mono}
        fontSize="9"
        fill="var(--mui-palette-text-secondary)"
      >
        /api/v1
      </text>
      <path d="M92 28 H146" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M141 23 L147 28 L141 33" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M146 46 H92" className="muted" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M97 41 L91 46 L97 51" className="muted" strokeWidth="1.5" fill="none" />
      <rect className="fill muted" x="155" y="10" width="84" height="52" rx="8" strokeWidth="1.5" />
      <text
        x="166"
        y="31"
        fontFamily={fonts.mono}
        fontSize="10"
        fontWeight="700"
        fill="var(--mui-palette-success-main)"
      >
        200
      </text>
      <text
        x="166"
        y="48"
        fontFamily={fonts.mono}
        fontSize="9"
        fill="var(--mui-palette-text-secondary)"
      >
        {'{ "ok": true }'}
      </text>
    </Box>
  );
}

// three server racks, each with its lights on
function InfraPicture() {
  return (
    <Box component="svg" viewBox="0 0 240 72" sx={pictureSx}>
      {[0, 1, 2].map((rack) => (
        <g key={rack} transform={`translate(${rack * 82 + 1} 1)`}>
          <rect className="fill muted" width="74" height="70" rx="8" strokeWidth="1.5" />
          {[0, 1, 2].map((unit) => (
            <g key={unit} transform={`translate(8 ${10 + unit * 19})`}>
              <rect className="muted" width="58" height="13" rx="3" fill="none" strokeWidth="1.5" />
              <circle
                className={unit === 2 && rack === 1 ? 'accent' : 'ok'}
                cx="50"
                cy="6.5"
                r="2.4"
              />
              <line className="muted" x1="7" y1="6.5" x2="30" y2="6.5" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      ))}
    </Box>
  );
}

// a metric over time, with the latest reading marked
function MonitoringPicture() {
  const line = 'M4 52 L28 44 L52 48 L76 30 L100 36 L124 22 L148 28 L172 14 L196 24 L220 18 L236 20';

  return (
    <Box component="svg" viewBox="0 0 240 72" sx={pictureSx}>
      <defs>
        <linearGradient id="stack-metric" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect className="fill muted" x="1" y="1" width="238" height="70" rx="8" strokeWidth="1.5" />
      {[24, 42, 60].map((y) => (
        <line
          key={y}
          className="muted"
          x1="1"
          y1={y}
          x2="239"
          y2={y}
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}
      <path d={`${line} L236 70 L4 70 Z`} fill="url(#stack-metric)" />
      <path d={line} stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <circle className="accent" cx="172" cy="14" r="3.5" />
    </Box>
  );
}

function Skills({ names }: { names: string[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {names.map((name) => (
        <Box
          key={name}
          sx={{
            ...mono,
            px: 1,
            py: 0.8,
            borderRadius: 999,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
            color: 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Box>
      ))}
    </Box>
  );
}

interface Layer {
  name: string;
  picture: ReactNode;
  skills: string[];
}

// bottom to top, the way a request lands
const layers: Layer[] = [
  {
    name: 'monitoring',
    picture: <MonitoringPicture />,
    skills: ['Prometheus', 'Grafana', 'Loki', 'Datadog', 'Alerting', 'Dashboards'],
  },
  {
    name: 'infra',
    picture: <InfraPicture />,
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'Helm', 'Argo CD'],
  },
  {
    name: 'api',
    picture: <ApiPicture />,
    skills: ['Java', 'Spring Boot', 'Go', 'Gin', 'PostgreSQL', 'Valkey'],
  },
  {
    name: 'interface',
    picture: <InterfacePicture />,
    skills: ['React', 'Angular', 'TypeScript', 'PrimeNG', 'Material UI', 'Vite'],
  },
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
        '--gap': 'calc(150px + var(--progress, 0) * 60px)',
        [`@media (prefers-reduced-motion: reduce)`]: { '--gap': '150px' },
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
              <Box component="span" sx={{ ...mono, color: 'primary.main', fontWeight: 700 }}>
                {String(layers.length - i).padStart(2, '0')} {layer.name}
              </Box>
              {/* the front of the layer, which the one above doesn't cover */}
              <Box sx={{ mt: 'auto', display: 'grid', gap: 1.5 }}>
                {layer.picture}
                <Skills names={layer.skills} />
              </Box>

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
