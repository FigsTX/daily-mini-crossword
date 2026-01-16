import { useEffect, useCallback } from 'react';
import { useGameStore } from './store/gameStore';
import { DailyPuzzleSchema } from './types';
import { Grid } from './components/Grid';
import { ClueList } from './components/ClueList';

/**
 * Parse YYYY-MM-DD string to local Date (avoids timezone shift issues)
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function App() {
  const {
    puzzle,
    setPuzzle,
    cursor,
    direction,
    setCell,
    clearCell,
    moveToNextCell,
    moveToPrevCell,
    moveInDirection,
    toggleDirection,
    isSolved,
    userGrid,
  } = useGameStore();

  // Load puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      try {
        const response = await fetch('/daily.json');
        const data = await response.json();
        const parsed = DailyPuzzleSchema.parse(data);
        setPuzzle(parsed);
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      }
    }
    loadPuzzle();
  }, [setPuzzle]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if no puzzle loaded
      if (!puzzle) return;

      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { key } = event;

      // Arrow keys for navigation
      if (key === 'ArrowUp') {
        event.preventDefault();
        moveInDirection(-1, 0);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        moveInDirection(1, 0);
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        moveInDirection(0, -1);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        moveInDirection(0, 1);
      }
      // Tab to toggle direction
      else if (key === 'Tab') {
        event.preventDefault();
        toggleDirection();
      }
      // Backspace to delete
      else if (key === 'Backspace') {
        event.preventDefault();
        const currentValue = userGrid[`${cursor.row},${cursor.col}`];
        if (currentValue) {
          // If current cell has a value, clear it
          clearCell(cursor.row, cursor.col);
        } else {
          // If current cell is empty, move back and clear that cell
          moveToPrevCell();
          // Note: We clear after moving, so we need to get the new cursor position
          // This is a bit tricky with Zustand, so we'll just move for now
        }
      }
      // Delete key to clear current cell
      else if (key === 'Delete') {
        event.preventDefault();
        clearCell(cursor.row, cursor.col);
      }
      // Letter keys to type
      else if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        setCell(cursor.row, cursor.col, key.toUpperCase());
        moveToNextCell();
      }
    },
    [
      puzzle,
      cursor,
      userGrid,
      setCell,
      clearCell,
      moveToNextCell,
      moveToPrevCell,
      moveInDirection,
      toggleDirection,
    ]
  );

  // Register keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const solved = isSolved();

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Title */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Mini Crossword
        </h1>
        {puzzle?.meta.date && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {parseLocalDate(puzzle.meta.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
        {puzzle?.meta.theme && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Theme: {puzzle.meta.theme}
          </p>
        )}
      </header>

      {/* Win message */}
      {solved && (
        <div className="mb-4 px-4 py-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-lg font-medium">
          Congratulations! You solved it!
        </div>
      )}

      {/* Direction indicator */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Direction:{' '}
        <span className="font-semibold capitalize">{direction}</span>
        <span className="text-xs ml-2">(Tab to switch)</span>
      </div>

      {/* Grid */}
      <div className="mb-8">
        <Grid />
      </div>

      {/* Clues */}
      <ClueList />

      {/* Help text */}
      <footer className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center">
        <p>Use arrow keys to navigate, type letters to fill, backspace to delete</p>
        <p>Click a cell to select, click again to toggle direction</p>
      </footer>
    </div>
  );
}

export default App;
