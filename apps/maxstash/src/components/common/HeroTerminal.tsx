import { Box } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { fonts, layout, primaryTint } from '../../theme';

type Kind = 'cmd' | 'out' | 'ok';

interface LineLink {
  text: string;
  href: string;
}

interface ScriptLine {
  text: string;
  kind: Kind;
  link?: LineLink;
  label?: string;
}

interface RenderedLine {
  text: string;
  kind: Kind;
  typing: boolean;
  link?: LineLink;
  label?: string;
  menu?: boolean;
}

interface NavItem {
  label: string;
  to: string;
  external: boolean;
}

// the terminal keeps its own github-dark palette in both color schemes
const term = {
  bg: '#0d1117',
  bar: '#161b22',
  barBorder: '#21262d',
  cmd: '#e6edf3',
  out: '#8b949e',
  ok: '#27c93f',
  link: '#58a6ff',
  prompt: '#a855f7',
  hint: '#56607a',
};

const KIND_COLOR: Record<Kind, string> = {
  cmd: term.cmd,
  out: term.out,
  ok: term.ok,
};

const EMAIL = 'max@maxstash.io';
const GITHUB = 'https://github.com/maxmorhardt';
const LINKEDIN = 'https://www.linkedin.com/in/max-morhardt-60b9121b8/';

const STACK = [
  { label: 'languages', value: 'java · typescript · go · python · sql' },
  { label: 'backend', value: 'spring boot · gin · gorm · jpa' },
  { label: 'frontend', value: 'react · angular · primeng · material ui' },
  { label: 'cloud', value: 'aws · eks · ec2 · s3 · efs · lambda · dynamodb' },
  { label: 'platform', value: 'kubernetes · docker · helm · terraform · envoy · dex · nats' },
  { label: 'ops', value: 'gha · jenkins · argo cd · prometheus · grafana · datadog' },
];

const MOBILE_STACK = [
  { label: 'languages', value: 'java · ts · go · py · sql' },
  { label: 'backend', value: 'spring · gin · gorm · jpa' },
  { label: 'frontend', value: 'react · ng · mui' },
  { label: 'cloud', value: 'aws · eks · s3 · lambda' },
  { label: 'platform', value: 'k8s · docker · helm · terraform' },
  { label: 'ops', value: 'gha · argo cd · prometheus · datadog' },
];

const WHOAMI = 'Max Morhardt, software engineer @ Fidelity';

const nav: NavItem[] = [
  { label: 'projects', to: '/projects', external: false },
  { label: 'apps', to: '/apps', external: false },
  { label: 'about', to: '/about', external: false },
  { label: 'contact', to: '/contact', external: false },
  { label: 'github', to: GITHUB, external: true },
  { label: 'linkedin', to: LINKEDIN, external: true },
];

const matches = (query: string) =>
  typeof window !== 'undefined' && (window.matchMedia?.(query)?.matches ?? false);

function buildBoot(stackSource: typeof STACK): ScriptLine[] {
  return [
    { text: 'whoami', kind: 'cmd' },
    { text: WHOAMI, kind: 'out' },
    { text: 'cat stack.txt', kind: 'cmd' },
    ...stackSource.map((s) => ({ text: s.value, kind: 'out' as const, label: s.label })),
    { text: 'kubectl get httproute -A', kind: 'cmd' },
    {
      text: '',
      kind: 'out',
      label: 'maxstash',
      link: { text: 'maxstash.io ↗', href: 'https://maxstash.io' },
    },
    {
      text: '',
      kind: 'out',
      label: 'squares',
      link: { text: 'squares.maxstash.io ↗', href: 'https://squares.maxstash.io' },
    },
    { text: 'ls ~', kind: 'cmd' },
  ];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function HeroTerminal() {
  const navigate = useNavigate();

  const [lines, setLines] = useState<RenderedLine[]>([]);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');

  // index of the launchpad item highlighted by the arrow-key cursor
  const [selected, setSelected] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // only the most recently printed `ls` menu is keyboard-interactive
  const lastMenuIndex = useMemo(() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].menu) {
        return i;
      }
    }

    return -1;
  }, [lines]);

  const out = useCallback((text: string, kind: Kind = 'out', link?: LineLink, label?: string) => {
    setLines((prev) => [...prev, { text, kind, typing: false, link, label }]);
  }, []);

  const printMenu = useCallback(() => {
    setSelected(0);
    setLines((prev) => [...prev, { text: '', kind: 'out', typing: false, menu: true }]);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // keep the newest output in view as lines are appended
  useEffect(() => {
    const body = bodyRef.current;

    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [lines, ready]);

  // boot sequence: type the scripted lines out, then hand control to the user
  useEffect(() => {
    let alive = true;
    const stackSource = matches('(max-width: 880px)') ? MOBILE_STACK : STACK;
    const boot = buildBoot(stackSource);

    // clear any half-typed lines a previous run left behind
    setLines([]);
    setReady(false);
    setSelected(0);

    const enable = () => {
      setReady(true);

      // only grab focus when the terminal is on screen
      const rect = bodyRef.current?.getBoundingClientRect();
      if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
        inputRef.current?.focus({ preventScroll: true });
      }
    };

    // reduced motion skips the animation and prints the whole script at once
    if (matches('(prefers-reduced-motion: reduce)')) {
      setLines(
        boot.map((l) => ({
          text: l.text,
          kind: l.kind,
          typing: false,
          link: l.link,
          label: l.label,
        }))
      );
      printMenu();
      enable();

      return () => {
        alive = false;
      };
    }

    const typeLine = async (line: ScriptLine) => {
      if (line.kind !== 'cmd') {
        setLines((prev) => [
          ...prev,
          { text: line.text, kind: line.kind, typing: false, link: line.link, label: line.label },
        ]);
        return;
      }

      // typing always targets the line just appended, so patch the tail as it grows
      setLines((prev) => [...prev, { text: '', kind: 'cmd', typing: true }]);

      let buffer = '';
      for (const ch of line.text) {
        if (!alive) {
          return;
        }

        buffer += ch;
        const text = buffer;
        setLines((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text };
          return next;
        });

        await sleep(38 + Math.random() * 45);
      }

      setLines((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], typing: false };
        return next;
      });
    };

    const run = async () => {
      for (const line of boot) {
        if (!alive) {
          return;
        }

        await typeLine(line);
        await sleep(line.kind === 'cmd' ? 240 : 120);
      }

      if (alive) {
        printMenu();
        enable();
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [printMenu]);

  const activate = useCallback(
    (item: NavItem) => {
      out(`> ${item.external ? 'opening' : 'cd'} ${item.to}`, 'ok');

      if (item.external) {
        window.open(item.to, '_blank', 'noopener');
      } else {
        void navigate(item.to);
      }
    },
    [navigate, out]
  );

  const help = useCallback(() => {
    out('available commands:');
    out('  help       show this list');
    out('  name       who is this');
    out('  whoami     current role');
    out('  stack      tools i use');
    out('  email      get my email');
    out('  social     github · linkedin · email');
    out('  projects   view my work');
    out('  apps       live apps i run');
    out('  about      more about me');
    out('  contact    reach out');
    out('  clear      clear the screen');
    out(
      matches('(max-width: 880px)')
        ? 'tip: tap a directory to open'
        : 'tip: use the arrow keys to pick a directory, enter to open'
    );
  }, [out]);

  const runCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      const stackSource = matches('(max-width: 880px)') ? MOBILE_STACK : STACK;

      setLines((prev) => [...prev, { text: cmd, kind: 'cmd', typing: false }]);

      switch (cmd.toLowerCase()) {
        case '':
          break;
        case 'help':
        case '?':
          help();
          break;
        case 'name':
          out('Max Morhardt');
          break;
        case 'whoami':
          out(WHOAMI);
          break;
        case 'stack':
        case 'skills':
          stackSource.forEach((s) => out(s.value, 'out', undefined, s.label));
          break;
        case 'email':
          out('', 'out', { text: EMAIL, href: `mailto:${EMAIL}` });
          break;
        case 'social':
          out('', 'out', { text: GITHUB, href: GITHUB }, 'github');
          out('', 'out', { text: LINKEDIN, href: LINKEDIN }, 'linkedin');
          out('', 'out', { text: EMAIL, href: `mailto:${EMAIL}` }, 'email');
          break;
        case 'ls':
          printMenu();
          break;
        case 'projects':
        case 'apps':
        case 'about':
        case 'contact':
        case 'github':
        case 'linkedin': {
          const item = nav.find((n) => n.label === cmd.toLowerCase());
          if (item) {
            activate(item);
          }

          break;
        }
        case 'clear':
          setLines([]);
          break;
        default:
          out(`command not found: ${cmd} (try 'help')`);
      }
    },
    [activate, help, out, printMenu]
  );

  const onKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
    const empty = input.trim() === '';
    const hasMenu = lastMenuIndex >= 0;

    if (empty && hasMenu && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
      e.preventDefault();
      setSelected((prev) => (prev + 1) % nav.length);
      return;
    }

    if (empty && hasMenu && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      setSelected((prev) => (prev <= 0 ? nav.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      if (!empty) {
        runCommand(input);
        setInput('');
      } else if (hasMenu) {
        activate(nav[selected]);
      }
    }
  };

  return (
    <Box
      onClick={focusInput}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 720,
        maxHeight: `calc(100svh - ${layout.headerHeight.lg} - 6.5rem)`,
        overflow: 'hidden',
        borderRadius: 1,
        border: 1,
        borderColor: 'primary.main',
        backgroundColor: term.bg,
        fontFamily: fonts.mono,
        boxShadow: (theme) => `${theme.shadows[8]}, 0 0 100px -18px ${primaryTint(theme, 0.4)}`,
        '@media (max-width: 880px)': {
          maxHeight: `calc(100svh - ${layout.headerHeight.xs} - 3rem)`,
        },
      }}
    >
      {/* title bar: traffic lights + prompt */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          borderBottom: `1px solid ${term.barBorder}`,
          backgroundColor: term.bar,
          px: '0.85rem',
          py: '0.6rem',
        }}
      >
        {['#ff5f56', '#ffbd2e', '#27c93f'].map((color) => (
          <Box key={color} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color }} />
        ))}
        <Box component="span" sx={{ ml: 1, fontSize: '0.78rem', color: term.out }}>
          max@maxstash: ~
        </Box>
      </Box>

      {/* terminal body */}
      <Box
        ref={bodyRef}
        sx={{
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          px: '1.3rem',
          pt: '1.15rem',
          pb: '1.25rem',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          '@media (max-width: 880px)': {
            px: '0.9rem',
            pt: '0.9rem',
            pb: 2,
            fontSize: '0.72rem',
          },
        }}
      >
        {lines.map((l, i) => (
          <Box key={i} sx={{ overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
            {l.menu ? (
              <Box
                component="nav"
                aria-label="Explore the site"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  mt: '0.6rem',
                  mb: '0.2rem',
                  animation: 'term-fade 0.4s ease both',
                  '@keyframes term-fade': {
                    from: { opacity: 0, transform: 'translateY(4px)' },
                    to: { opacity: 1, transform: 'none' },
                  },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              >
                {nav.map((item, idx) => {
                  const active = i === lastMenuIndex && selected === idx;
                  const linkProps = item.external
                    ? {
                        component: 'a' as const,
                        href: item.to,
                        target: '_blank',
                        rel: 'noreferrer',
                      }
                    : { component: Link, to: item.to };

                  return (
                    <Box
                      key={item.label}
                      {...linkProps}
                      onMouseEnter={() => i === lastMenuIndex && setSelected(idx)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        borderRadius: '6px',
                        px: 1,
                        py: '0.18rem',
                        fontSize: '0.86rem',
                        color: active ? 'primary.main' : term.link,
                        backgroundColor: (theme) =>
                          active ? primaryTint(theme, 0.15) : 'transparent',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
                        '@media (max-width: 880px)': {
                          px: '0.4rem',
                          py: '0.15rem',
                          fontSize: '0.72rem',
                        },
                      }}
                    >
                      <Box component="span" sx={{ width: '0.8em', color: 'primary.main' }}>
                        {active ? '❯' : ' '}
                      </Box>
                      <span>
                        {item.label}
                        {item.external ? ' ↗' : '/'}
                      </span>
                    </Box>
                  );
                })}
              </Box>
            ) : l.label ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '12ch 1fr',
                  columnGap: 1.5,
                  '@media (max-width: 880px)': { columnGap: '0.45rem' },
                }}
              >
                <Box component="span" sx={{ minWidth: 0, color: term.out }}>
                  {l.label}
                </Box>
                <Box component="span" sx={{ minWidth: 0, color: term.out }}>
                  {l.text}
                  {l.link ? (
                    <Box
                      component="a"
                      href={l.link.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      sx={{
                        color: term.link,
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {l.link.text}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            ) : (
              <>
                {l.kind === 'cmd' ? (
                  <Box component="span" sx={{ mr: 1, color: term.prompt }}>
                    ~ $
                  </Box>
                ) : null}
                <Box component="span" sx={{ color: KIND_COLOR[l.kind] }}>
                  {l.text}
                </Box>
                {l.link ? (
                  <Box
                    component="a"
                    href={l.link.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    sx={{
                      color: term.link,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {l.link.text}
                  </Box>
                ) : null}
                {l.typing ? (
                  <Box
                    component="span"
                    data-testid="terminal-cursor"
                    sx={{
                      ml: '2px',
                      display: 'inline-block',
                      height: '1.05em',
                      width: 8,
                      backgroundColor: term.prompt,
                      verticalAlign: 'text-bottom',
                      animation: 'term-blink 1s step-end infinite',
                      '@keyframes term-blink': {
                        '0%, 50%': { opacity: 1 },
                        '50.01%, 100%': { opacity: 0 },
                      },
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }}
                  />
                ) : null}
              </>
            )}
          </Box>
        ))}

        {/* command input */}
        {ready ? (
          <Box sx={{ mt: '0.35rem', display: 'flex', alignItems: 'center' }}>
            <Box component="span" sx={{ mr: 1, color: term.prompt }}>
              ~ $
            </Box>
            <Box
              component="input"
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={onKeydown}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              aria-label="Terminal command input"
              sx={{
                minWidth: 0,
                flex: 1,
                border: 'none',
                background: 'transparent',
                p: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: term.cmd,
                caretColor: term.prompt,
                outline: 'none',
                '@media (max-width: 880px)': { fontSize: '16px' },
              }}
            />
          </Box>
        ) : null}

        {/* usage hint */}
        {ready ? (
          <Box
            sx={{
              mt: '0.6rem',
              fontSize: '0.78rem',
              color: term.hint,
              fontStyle: 'italic',
              '@media (max-width: 880px)': { fontSize: '0.68rem' },
            }}
          >
            <Box component="span" sx={{ '@media (max-width: 880px)': { display: 'none' } }}>
              type a command (try 'help') · arrow keys to select · enter to open
            </Box>
            <Box
              component="span"
              sx={{ display: 'none', '@media (max-width: 880px)': { display: 'inline' } }}
            >
              try 'help' · enter to open
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
