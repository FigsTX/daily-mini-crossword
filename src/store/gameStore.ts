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

  // Timer state
  timerStarted: boolean;
  timerStartTime: number | null;
  solveTimeSeconds: number | null;

  // Streak state (persisted)
  currentStreak: number;
  lastSolvedDate: string | null;

  // Check/Reveal tools
  cheated: boolean;
  errorCells: string[]; // Array of "row,col" keys for error highlighting

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

  // Timer actions
  startTimer: () => void;
  stopTimer: () => void;
  getElapsedSeconds: () => number;

  // Check/Reveal tools
  checkSquare: () => void;
  checkWord: () => void;
  revealSquare: () => void;
  clearErrors: () => void;

  // Helpers
  isBlackSquare: (row: number, col: number) => boolean;
  isValidCell: (row: number, col: number) => boolean;
  findFirstValidCell: () => Cursor;
  isSolved: () => boolean;
  getCurrentWordCells: () => string[];
}

const GRID_SIZE = 5;

const initialCursor: Cursor = { row: 0, col: 0 };
const initialDirection: Direction = 'across';

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper to check if a date string is yesterday
function isYesterday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      puzzle: null,
      userGrid: {},
      cursor: initialCursor,
      direction: initialDirection,
      clues: null,
      grid: null,

      // Timer state (not persisted - resets on page load)
      timerStarted: false,
      timerStartTime: null,
      solveTimeSeconds: null,

      // Streak state (persisted)
      currentStreak: 0,
      lastSolvedDate: null,

      // Check/Reveal tools
      cheated: false,
      errorCells: [],

      setPuzzle: (puzzle) => {
        const firstValid = findFirstValidCellInGrid(puzzle.grid);
        const currentState = get();
        const isNewPuzzle = currentState.puzzle?.meta.date !== puzzle.meta.date;

        set({
          puzzle,
          clues: puzzle.clues,
          grid: puzzle.grid,
          cursor: firstValid,
          // Reset state for new puzzle, preserve for same puzzle
          userGrid: isNewPuzzle ? {} : currentState.userGrid,
          // Reset timer for new puzzle
          timerStarted: isNewPuzzle ? false : currentState.timerStarted,
          timerStartTime: isNewPuzzle ? null : currentState.timerStartTime,
          solveTimeSeconds: isNewPuzzle ? null : currentState.solveTimeSeconds,
          // Reset cheated flag for new puzzle
          cheated: isNewPuzzle ? false : currentState.cheated,
          errorCells: [],
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
        const { isBlackSquare, timerStarted, solveTimeSeconds, startTimer } = get();
        if (isBlackSquare(row, col)) return;

        // Start timer on first move (if not already started and not already solved)
        if (!timerStarted && solveTimeSeconds === null) {
          startTimer();
        }

        const key = `${row},${col}`;
        set((state) => ({
          userGrid: {
            ...state.userGrid,
            [key]: value.toUpperCase().slice(0, 1),
          },
          // Clear error highlighting when user types
          errorCells: state.errorCells.filter((k) => k !== key),
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

      // Timer actions
      startTimer: () => {
        set({
          timerStarted: true,
          timerStartTime: Date.now(),
        });
      },

      stopTimer: () => {
        const { timerStartTime, lastSolvedDate, currentStreak, puzzle } = get();
        if (!timerStartTime) return;

        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        const today = getTodayDateString();

        // Calculate new streak
        let newStreak = 1;
        if (lastSolvedDate) {
          if (isYesterday(lastSolvedDate)) {
            // Continue streak
            newStreak = currentStreak + 1;
          } else if (lastSolvedDate === today) {
            // Already solved today, keep current streak
            newStreak = currentStreak;
          }
          // Otherwise reset to 1 (gap in days)
        }

        set({
          timerStarted: false,
          solveTimeSeconds: elapsed,
          lastSolvedDate: puzzle?.meta.date || today,
          currentStreak: newStreak,
        });
      },

      getElapsedSeconds: () => {
        const { timerStartTime, solveTimeSeconds } = get();
        if (solveTimeSeconds !== null) return solveTimeSeconds;
        if (!timerStartTime) return 0;
        return Math.floor((Date.now() - timerStartTime) / 1000);
      },

      // Check/Reveal tools
      checkSquare: () => {
        const { puzzle, userGrid, cursor } = get();
        if (!puzzle) return;

        const key = `${cursor.row},${cursor.col}`;
        const cell = puzzle.grid[key];
        const userAnswer = userGrid[key] || '';

        // Mark as cheated
        set({ cheated: true });

        // If wrong or empty, add to error cells
        if (userAnswer.toUpperCase() !== cell?.char?.toUpperCase()) {
          set((state) => ({
            errorCells: state.errorCells.includes(key)
              ? state.errorCells
              : [...state.errorCells, key],
          }));
        }
      },

      checkWord: () => {
        const { puzzle, userGrid, getCurrentWordCells } = get();
        if (!puzzle) return;

        const wordCells = getCurrentWordCells();
        const errors: string[] = [];

        for (const key of wordCells) {
          const cell = puzzle.grid[key];
          const userAnswer = userGrid[key] || '';
          if (userAnswer.toUpperCase() !== cell?.char?.toUpperCase()) {
            errors.push(key);
          }
        }

        // Mark as cheated
        set((state) => ({
          cheated: true,
          errorCells: [...new Set([...state.errorCells, ...errors])],
        }));
      },

      revealSquare: () => {
        const { puzzle, cursor } = get();
        if (!puzzle) return;

        const key = `${cursor.row},${cursor.col}`;
        const cell = puzzle.grid[key];
        if (!cell?.char) return;

        // Mark as cheated and set the correct letter
        set((state) => ({
          cheated: true,
          userGrid: {
            ...state.userGrid,
            [key]: cell.char!.toUpperCase(),
          },
          errorCells: state.errorCells.filter((k) => k !== key),
        }));
      },

      clearErrors: () => {
        set({ errorCells: [] });
      },

      // Get all cells in the current word
      getCurrentWordCells: () => {
        const { cursor, direction, isBlackSquare } = get();
        const cells: string[] = [];
        const { row, col } = cursor;

        if (direction === 'across') {
          // Find start of word
          let startCol = col;
          while (startCol > 0 && !isBlackSquare(row, startCol - 1)) {
            startCol--;
          }
          // Find end and collect cells
          let c = startCol;
          while (c < GRID_SIZE && !isBlackSquare(row, c)) {
            cells.push(`${row},${c}`);
            c++;
          }
        } else {
          // Find start of word
          let startRow = row;
          while (startRow > 0 && !isBlackSquare(startRow - 1, col)) {
            startRow--;
          }
          // Find end and collect cells
          let r = startRow;
          while (r < GRID_SIZE && !isBlackSquare(r, col)) {
            cells.push(`${r},${col}`);
            r++;
          }
        }

        return cells;
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
        // Persist streak data
        currentStreak: state.currentStreak,
        lastSolvedDate: state.lastSolvedDate,
        // Persist cheated flag (per session, resets with new puzzle)
        cheated: state.cheated,
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
