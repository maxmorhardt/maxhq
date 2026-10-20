import { useEffect, useState } from 'react';

// the reading line, as a fraction of the viewport height from the top
const READING_LINE = 0.35;

// the id of the last section whose top has passed the reading line, or the final one at the page end
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join('|');

  useEffect(() => {
    const sectionIds = key.split('|');
    let frame = 0;

    const update = () => {
      frame = 0;
      const { scrollY, innerHeight } = window;
      const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;

      if (atEnd && scrollY > 0) {
        setActive(sectionIds[sectionIds.length - 1]);
        return;
      }

      let current = sectionIds[0];
      for (const id of sectionIds) {
        const element = document.getElementById(id);

        if (element && element.getBoundingClientRect().top <= innerHeight * READING_LINE) {
          current = id;
        }
      }

      setActive(current);
    };

    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [key]);

  return active;
}
