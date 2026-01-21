import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { DailyPuzzleSchema } from './types';
import { Grid } from './components/Grid';
import { ClueList } from './components/ClueList';

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
    // Timer
    timerStarted,
    solveTimeSeconds,
    getElapsedSeconds,
    stopTimer,
    // Streak
    currentStreak,
    // Tools
    cheated,
    checkSquare,
    checkWord,
    revealSquare,
    clearErrors,
  } = useGameStore();

  // Local state for live timer display
  const [displayTime, setDisplayTime] = useState(0);

  // Load puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      try {
        const response = await fetch('./daily.json');
        const data = await response.json();
        const parsed = DailyPuzzleSchema.parse(data);
        setPuzzle(parsed);
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      }
    }
    loadPuzzle();
  }, [setPuzzle]);

  // Timer tick effect - updates display every second while timer is running
  useEffect(() => {
    if (!timerStarted) {
      // If timer stopped, show final time
      setDisplayTime(getElapsedSeconds());
      return;
    }

    // Update immediately
    setDisplayTime(getElapsedSeconds());

    // Then update every second
    const interval = setInterval(() => {
      setDisplayTime(getElapsedSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, getElapsedSeconds]);

  // Check for puzzle completion and stop timer
  const solved = isSolved();
  const prevSolvedRef = useRef(false);

  useEffect(() => {
    // Only stop timer on transition from unsolved to solved
    if (solved && !prevSolvedRef.current && timerStarted) {
      stopTimer();
    }
    prevSolvedRef.current = solved;
  }, [solved, timerStarted, stopTimer]);

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

  // Hidden input ref for mobile native keyboard
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input when grid is interacted with (for mobile)
  const focusHiddenInput = useCallback(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, []);

  // Handle input from the hidden input (mobile native keyboard)
  const handleHiddenInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!puzzle) return;
      const value = e.target.value;
      if (value && /^[a-zA-Z]$/.test(value)) {
        setCell(cursor.row, cursor.col, value.toUpperCase());
        moveToNextCell();
      }
      // Clear the input for the next character
      e.target.value = '';
    },
    [puzzle, cursor, setCell, moveToNextCell]
  );

  // Handle special keys from hidden input (backspace, etc.)
  const handleHiddenInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!puzzle) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const currentValue = userGrid[`${cursor.row},${cursor.col}`];
        if (currentValue) {
          clearCell(cursor.row, cursor.col);
        } else {
          moveToPrevCell();
        }
      }
    },
    [puzzle, cursor, userGrid, clearCell, moveToPrevCell]
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Title */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Mini Crossword
        </h1>

        {/* Date and Streak Row */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {puzzle?.meta.date && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {parseLocalDate(puzzle.meta.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {currentStreak > 0 && (
            <span className="text-sm font-medium text-orange-500" title={`${currentStreak} day streak`}>
              🔥 {currentStreak}
            </span>
          )}
        </div>

        {/* Timer */}
        <div className="mt-2 text-2xl font-mono text-gray-700 dark:text-gray-300">
          {formatTime(displayTime)}
        </div>

        {puzzle?.meta.theme && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Theme: {puzzle.meta.theme}
          </p>
        )}
      </header>

      {/* Win message */}
      {solved && (
        <div className="mb-4 px-4 py-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-lg font-medium text-center">
          <p>Congratulations! You solved it!</p>
          <p className="text-sm mt-1">
            Time: {formatTime(solveTimeSeconds || displayTime)}
            {cheated && <span className="ml-2 text-yellow-600 dark:text-yellow-400">(used hints)</span>}
          </p>
        </div>
      )}

      {/* Direction indicator */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Direction:{' '}
        <span className="font-semibold capitalize">{direction}</span>
        <span className="text-xs ml-2">(Tab to switch)</span>
      </div>

      {/* Hidden input for mobile native keyboard */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        style={{ position: 'absolute', left: '-9999px' }}
        onChange={handleHiddenInput}
        onKeyDown={handleHiddenInputKeyDown}
        aria-label="Crossword input"
      />

      {/* Grid */}
      <div className="mb-4">
        <Grid onCellInteraction={focusHiddenInput} />
      </div>

      {/* Tools - Check & Reveal (hidden when solved) */}
      {!solved && (
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              checkSquare();
              // Auto-clear errors after 2 seconds
              setTimeout(clearErrors, 2000);
            }}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Check Square
          </button>
          <button
            onClick={() => {
              checkWord();
              // Auto-clear errors after 2 seconds
              setTimeout(clearErrors, 2000);
            }}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Check Word
          </button>
          <button
            onClick={revealSquare}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Reveal Square
          </button>
        </div>
      )}

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
