import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Clues, Cursor, DailyPuzzle, Direction, Grid, UserGrid } from '../types';

interface GameState {
  // Puzzle data (loaded from JSON)
  puzzle: DailyPuzzle | null;

  // User's current answers
  userGrid: UserGrid;

  // Current cursor position
  cursor: Cursor;

  // Current direction
  direction: Direction;

  // Derived from puzzle
  clues: Clues | null;
  grid: Grid | null;

  // Actions
  setPuzzle: (puzzle: DailyPuzzle) => void;
  setCursor: (cursor: Cursor) => void;
  setDirection: (direction: Direction) => void;
  toggleDirection: () => void;
  setCell: (row: number, col: number, value: string) => void;
  clearCell: (row: number, col: number) => void;
  resetGame: () => void;

  // Navigation helpers
  moveToNextCell: () => void;
  moveToPrevCell: () => void;
  moveInDirection: (deltaRow: number, deltaCol: number) => void;

  // Helpers
  isBlackSquare: (row: number, col: number) => boolean;
  isValidCell: (row: number, col: number) => boolean;
  findFirstValidCell: () => Cursor;
  isSolved: () => boolean;
}

const GRID_SIZE = 5;

const initialCursor: Cursor = { row: 0, col: 0 };
const initialDirection: Direction = 'across';

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      puzzle: null,
      userGrid: {},
      cursor: initialCursor,
      direction: initialDirection,
      clues: null,
      grid: null,

      setPuzzle: (puzzle) => {
        const firstValid = findFirstValidCellInGrid(puzzle.grid);
        set({
          puzzle,
          clues: puzzle.clues,
          grid: puzzle.grid,
          cursor: firstValid,
          // Don't reset userGrid if we have persisted progress for this date
          userGrid: get().puzzle?.meta.date === puzzle.meta.date ? get().userGrid : {},
        });
      },

      setCursor: (cursor) => {
        const { isValidCell } = get();
        // Only allow cursor on valid (non-black, in-bounds) cells
        if (isValidCell(cursor.row, cursor.col)) {
          set({ cursor });
        }
      },

      setDirection: (direction) => set({ direction }),

      toggleDirection: () => {
        set((state) => ({
          direction: state.direction === 'across' ? 'down' : 'across',
        }));
      },

      setCell: (row, col, value) => {
        const { isBlackSquare } = get();
        if (isBlackSquare(row, col)) return;

        const key = `${row},${col}`;
        set((state) => ({
          userGrid: {
            ...state.userGrid,
            [key]: value.toUpperCase().slice(0, 1),
          },
        }));
      },

      clearCell: (row, col) => {
        const key = `${row},${col}`;
        set((state) => {
          const newGrid = { ...state.userGrid };
          delete newGrid[key];
          return { userGrid: newGrid };
        });
      },

      resetGame: () => {
        const { findFirstValidCell } = get();
        set({
          userGrid: {},
          cursor: findFirstValidCell(),
          direction: initialDirection,
        });
      },

      // Move to next cell in current direction, skipping black squares
      moveToNextCell: () => {
        const { cursor, direction, isValidCell } = get();
        const deltaRow = direction === 'down' ? 1 : 0;
        const deltaCol = direction === 'across' ? 1 : 0;

        let newRow = cursor.row + deltaRow;
        let newCol = cursor.col + deltaCol;

        // Skip black squares
        while (
          newRow >= 0 && newRow < GRID_SIZE &&
          newCol >= 0 && newCol < GRID_SIZE &&
          !isValidCell(newRow, newCol)
        ) {
          newRow += deltaRow;
          newCol += deltaCol;
        }

        // Only move if still in bounds and valid
        if (isValidCell(newRow, newCol)) {
          set({ cursor: { row: newRow, col: newCol } });
        }
      },

      // Move to previous cell in current direction, skipping black squares
      moveToPrevCell: () => {
        const { cursor, direction, isValidCell } = get();
        const deltaRow = direction === 'down' ? -1 : 0;
        const deltaCol = direction === 'across' ? -1 : 0;

        let newRow = cursor.row + deltaRow;
        let newCol = cursor.col + deltaCol;

        // Skip black squares
        while (
          newRow >= 0 && newRow < GRID_SIZE &&
          newCol >= 0 && newCol < GRID_SIZE &&
          !isValidCell(newRow, newCol)
        ) {
          newRow += deltaRow;
          newCol += deltaCol;
        }

        // Only move if still in bounds and valid
        if (isValidCell(newRow, newCol)) {
          set({ cursor: { row: newRow, col: newCol } });
        }
      },

      // Move in any direction (for arrow keys), skipping black squares
      moveInDirection: (deltaRow, deltaCol) => {
        const { cursor, isValidCell } = get();

        let newRow = cursor.row + deltaRow;
        let newCol = cursor.col + deltaCol;

        // Skip black squares in the movement direction
        while (
          newRow >= 0 && newRow < GRID_SIZE &&
          newCol >= 0 && newCol < GRID_SIZE &&
          !isValidCell(newRow, newCol)
        ) {
          newRow += deltaRow;
          newCol += deltaCol;
        }

        // Only move if still in bounds and valid
        if (isValidCell(newRow, newCol)) {
          set({ cursor: { row: newRow, col: newCol } });
        }
      },

      isBlackSquare: (row, col) => {
        const { grid } = get();
        if (!grid) return false;
        const cell = grid[`${row},${col}`];
        return cell?.char === null;
      },

      isValidCell: (row, col) => {
        const { grid } = get();
        if (!grid) return false;
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
        const cell = grid[`${row},${col}`];
        return cell?.char !== null;
      },

      findFirstValidCell: () => {
        const { grid } = get();
        return findFirstValidCellInGrid(grid);
      },

      isSolved: () => {
        const { puzzle, userGrid } = get();
        if (!puzzle) return false;

        for (let row = 0; row < puzzle.dimensions.rows; row++) {
          for (let col = 0; col < puzzle.dimensions.cols; col++) {
            const key = `${row},${col}`;
            const cell = puzzle.grid[key];

            // Skip black squares
            if (cell?.char === null) continue;

            // Check if user's answer matches solution
            const userAnswer = userGrid[key] || '';
            if (userAnswer.toUpperCase() !== cell?.char?.toUpperCase()) {
              return false;
            }
          }
        }
        return true;
      },
    }),
    {
      name: 'crossword-game-storage',
      partialize: (state) => ({
        userGrid: state.userGrid,
        cursor: state.cursor,
        direction: state.direction,
      }),
    }
  )
);

// Helper function to find first valid cell in a grid
function findFirstValidCellInGrid(grid: Grid | null): Cursor {
  if (!grid) return { row: 0, col: 0 };

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[`${row},${col}`];
      if (cell?.char !== null) {
        return { row, col };
      }
    }
  }
  return { row: 0, col: 0 };
}
