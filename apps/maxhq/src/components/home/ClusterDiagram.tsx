import { Box } from '@mui/material';
import { fonts } from '../../theme';

interface DiagramNode {
  id: string;
  label: string;
  detail?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: boolean;
}

interface DiagramLayout {
  width: number;
  height: number;
  frame: { x: number; y: number; w: number; h: number };
  group: { x: number; y: number; w: number; h: number };
  nodes: DiagramNode[];
  edges: string[];
}

// a horizontal s-curve between two points
const hCurve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2;

  return `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

// a vertical s-curve between two points
const vCurve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (y1 + y2) / 2;

  return `M${x1} ${y1} C${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
};

const wide: DiagramLayout = {
  width: 980,
  height: 500,
  frame: { x: 200, y: 16, w: 764, h: 468 },
  group: { x: 460, y: 212, w: 222, h: 252 },
  nodes: [
    { id: 'cf', label: 'Cloudflare', detail: 'dns · edge', x: 20, y: 214, w: 150, h: 64 },
    { id: 'dex', label: 'Dex', detail: 'google · github', x: 236, y: 80, w: 170, h: 64 },
    {
      id: 'envoy',
      label: 'Envoy Gateway',
      detail: 'one front door',
      x: 236,
      y: 214,
      w: 170,
      h: 64,
      accent: true,
    },
    { id: 'argo', label: 'Argo CD', detail: 'syncs from git', x: 236, y: 348, w: 170, h: 64 },
    { id: 'maxhq', label: 'maxhq', x: 476, y: 60, w: 190, h: 56 },
    { id: 'web', label: 'squares web', x: 476, y: 132, w: 190, h: 56 },
    { id: 'contests', label: 'contests', x: 476, y: 246, w: 190, h: 44 },
    { id: 'games', label: 'games', x: 476, y: 300, w: 190, h: 44 },
    { id: 'accounts', label: 'accounts', x: 476, y: 354, w: 190, h: 44 },
    { id: 'realtime', label: 'realtime', x: 476, y: 408, w: 190, h: 44 },
    { id: 'pg', label: 'PostgreSQL', detail: 'cloudnativepg', x: 748, y: 214, w: 190, h: 64 },
    { id: 'valkey', label: 'Valkey', detail: 'cache · streams', x: 748, y: 330, w: 190, h: 64 },
  ],
  edges: [
    hCurve(170, 246, 236, 246),
    vCurve(321, 214, 321, 144),
    hCurve(406, 246, 476, 88),
    hCurve(406, 246, 476, 160),
    hCurve(406, 246, 460, 338),
    hCurve(682, 300, 748, 246),
    hCurve(682, 380, 748, 362),
  ],
};

const tall: DiagramLayout = {
  width: 360,
  height: 664,
  frame: { x: 8, y: 96, w: 344, h: 554 },
  group: { x: 24, y: 300, w: 312, h: 158 },
  nodes: [
    { id: 'cf', label: 'Cloudflare', detail: 'dns · edge', x: 24, y: 12, w: 180, h: 56 },
    {
      id: 'envoy',
      label: 'Envoy Gateway',
      detail: 'one front door',
      x: 24,
      y: 124,
      w: 180,
      h: 56,
      accent: true,
    },
    { id: 'dex', label: 'Dex', detail: 'sign-in', x: 220, y: 124, w: 116, h: 56 },
    { id: 'maxhq', label: 'maxhq', x: 24, y: 220, w: 150, h: 48 },
    { id: 'web', label: 'squares web', x: 186, y: 220, w: 150, h: 48 },
    { id: 'contests', label: 'contests', x: 40, y: 334, w: 136, h: 44 },
    { id: 'games', label: 'games', x: 184, y: 334, w: 136, h: 44 },
    { id: 'accounts', label: 'accounts', x: 40, y: 392, w: 136, h: 44 },
    { id: 'realtime', label: 'realtime', x: 184, y: 392, w: 136, h: 44 },
    { id: 'pg', label: 'PostgreSQL', detail: 'cloudnativepg', x: 24, y: 490, w: 150, h: 56 },
    { id: 'valkey', label: 'Valkey', detail: 'cache · streams', x: 186, y: 490, w: 150, h: 56 },
    { id: 'argo', label: 'Argo CD', detail: 'syncs from git', x: 24, y: 578, w: 312, h: 52 },
  ],
  edges: [
    vCurve(114, 68, 114, 124),
    hCurve(204, 152, 220, 152),
    vCurve(114, 180, 99, 220),
    vCurve(114, 180, 261, 220),
    vCurve(114, 180, 180, 300),
    vCurve(99, 458, 99, 490),
    vCurve(261, 458, 261, 490),
  ],
};

function Diagram({ layout, title }: { layout: DiagramLayout; title: string }) {
  const { frame, group } = layout;

  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={title}>
      <rect className="frame" x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={18} />
      <text className="caption" x={frame.x + 16} y={frame.y + 24}>
        k3s · ha control plane
      </text>

      <rect className="group" x={group.x} y={group.y} width={group.w} height={group.h} rx={14} />
      <text className="caption" x={group.x + 14} y={group.y + 20}>
        squares services
      </text>

      {layout.edges.map((d) => (
        <g key={d}>
          <path className="edge" d={d} />
          <path className="flow" d={d} />
        </g>
      ))}

      {layout.nodes.map((node) => (
        <g key={node.id} className={node.accent ? 'node accent' : 'node'}>
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={12} />
          <text
            className="label"
            x={node.x + node.w / 2}
            y={node.y + node.h / 2 + (node.detail ? -3 : 5)}
          >
            {node.label}
          </text>
          {node.detail ? (
            <text className="detail" x={node.x + node.w / 2} y={node.y + node.h / 2 + 16}>
              {node.detail}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

const title =
  'Traffic enters through Cloudflare to Envoy Gateway, which routes to maxhq, squares web, and the squares services; Dex handles sign-in, Argo CD syncs from git, and the services store data in PostgreSQL and Valkey.';

export default function ClusterDiagram() {
  return (
    <Box
      sx={(theme) => {
        const { palette } = theme.vars ?? theme;

        return {
          '& svg': { display: 'block', width: '100%', height: 'auto', overflow: 'visible' },
          '& .wide': { display: { xs: 'none', md: 'block' } },
          '& .tall': { display: { xs: 'block', md: 'none' }, maxWidth: 420, mx: 'auto' },
          '& .frame': {
            fill: 'none',
            stroke: palette.divider,
            strokeDasharray: '6 6',
          },
          '& .group': { fill: palette.codeBg, stroke: palette.divider },
          '& .caption': {
            fill: palette.text.secondary,
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: '0.04em',
          },
          '& .node rect': { fill: palette.background.paper, stroke: palette.divider },
          '& .node.accent rect': { stroke: palette.primary.main },
          '& .label': {
            fill: palette.text.primary,
            fontSize: 15,
            fontWeight: 600,
            textAnchor: 'middle',
          },
          '& .detail': {
            fill: palette.text.secondary,
            fontFamily: fonts.mono,
            fontSize: 11,
            textAnchor: 'middle',
          },
          '& .edge': { fill: 'none', stroke: palette.divider, strokeWidth: 2 },
          '& .flow': {
            fill: 'none',
            stroke: palette.primary.main,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeDasharray: '3 14',
            animation: 'cluster-flow 1.4s linear infinite',
          },
          '@keyframes cluster-flow': { to: { strokeDashoffset: -34 } },
          '@media (prefers-reduced-motion: reduce)': {
            '& .flow': { animation: 'none', strokeDasharray: 'none', opacity: 0.5 },
          },
        };
      }}
    >
      <Box className="wide">
        <Diagram layout={wide} title={title} />
      </Box>
      <Box className="tall">
        <Diagram layout={tall} title={title} />
      </Box>
    </Box>
  );
}
