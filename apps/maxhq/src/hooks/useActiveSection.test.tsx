import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveSection } from './useActiveSection';

function Probe() {
  const active = useActiveSection(['one', 'two', 'three']);

  return (
    <>
      <section id="one" />
      <section id="two" />
      <section id="three" />
      <output>{active}</output>
    </>
  );
}

function placeSection(id: string, top: number) {
  vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockReturnValue({
    top,
  } as DOMRect);
}

function scrollTo(y: number, pageHeight: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: pageHeight,
  });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useActiveSection', () => {
  it('starts on the first section', () => {
    render(<Probe />);

    expect(screen.getByRole('status')).toHaveTextContent('one');
  });

  it('follows the last section past the reading line', () => {
    render(<Probe />);
    placeSection('one', -400);
    placeSection('two', 100);
    placeSection('three', 900);

    scrollTo(500, 5000);

    expect(screen.getByRole('status')).toHaveTextContent('two');
  });

  it('lands on the final section at the end of the page', () => {
    render(<Probe />);
    placeSection('one', -900);
    placeSection('two', -300);
    placeSection('three', 600);

    // jsdom's viewport is 768 tall, so this is the bottom of a 2000px page
    scrollTo(1232, 2000);

    expect(screen.getByRole('status')).toHaveTextContent('three');
  });
});
