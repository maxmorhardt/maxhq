// pinned height of the static app bar per breakpoint
export const HEADER_HEIGHT = { xs: 56, sm: 64 };

// rendered width of the contest grid paper per breakpoint
export const CONTEST_GRID_WIDTH = { xs: 350, sm: 609, md: 687 };

// grid width plus the 8px horizontal padding on the stack container
export const CONTEST_STACK_MAX_WIDTH = {
  xs: CONTEST_GRID_WIDTH.xs + 16,
  sm: CONTEST_GRID_WIDTH.sm + 16,
  md: CONTEST_GRID_WIDTH.md + 16,
};
