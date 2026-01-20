import { useCallback } from 'react';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function Keyboard({ onKeyPress, onBackspace }: KeyboardProps) {
  const handleKeyClick = useCallback(
    (key: string) => {
      onKeyPress(key);
    },
    [onKeyPress]
  );

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 mb-1">
          {/* Add backspace on the last row */}
          {rowIndex === 2 && (
            <button
              type="button"
              onClick={onBackspace}
              className="flex items-center justify-center px-2 sm:px-4 py-3 sm:py-4 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded font-semibold text-xs sm:text-sm hover:bg-gray-400 dark:hover:bg-gray-500 active:bg-gray-500 dark:active:bg-gray-400 transition-colors min-w-[3rem] sm:min-w-[4rem]"
              aria-label="Backspace"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                />
              </svg>
            </button>
          )}

          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className="flex items-center justify-center w-8 h-12 sm:w-10 sm:h-14 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded font-semibold text-sm sm:text-base hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 transition-colors"
            >
              {key}
            </button>
          ))}

          {/* Add spacer on last row for symmetry */}
          {rowIndex === 2 && (
            <div className="min-w-[3rem] sm:min-w-[4rem]" />
          )}
        </div>
      ))}
    </div>
  );
}
