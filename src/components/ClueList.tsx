import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

export function ClueList() {
  const { clues, grid, cursor, direction, isBlackSquare } = useGameStore();

  // Find the active clue number for the current cursor position and direction
  const activeClue = useMemo(() => {
    if (!grid) return null;

    const { row, col } = cursor;

    if (direction === 'across') {
      // Find the start of the across word
      let startCol = col;
      while (startCol > 0 && !isBlackSquare(row, startCol - 1)) {
        startCol--;
      }
      // Get the clue index from the starting cell
      const startCell = grid[`${row},${startCol}`];
      return { direction: 'across' as const, index: startCell?.clueIndex };
    } else {
      // Find the start of the down word
      let startRow = row;
      while (startRow > 0 && !isBlackSquare(startRow - 1, col)) {
        startRow--;
      }
      // Get the clue index from the starting cell
      const startCell = grid[`${startRow},${col}`];
      return { direction: 'down' as const, index: startCell?.clueIndex };
    }
  }, [grid, cursor, direction, isBlackSquare]);

  if (!clues) {
    return null;
  }

  const sortedAcrossKeys = Object.keys(clues.across).sort(
    (a, b) => Number(a) - Number(b)
  );
  const sortedDownKeys = Object.keys(clues.down).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full max-w-2xl">
      {/* Across clues */}
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">
          Across
        </h3>
        <ul className="space-y-1">
          {sortedAcrossKeys.map((key) => {
            const isActive =
              activeClue?.direction === 'across' &&
              activeClue?.index === Number(key);
            return (
              <li
                key={`across-${key}`}
                className={`
                  text-sm px-2 py-1 rounded transition-colors
                  ${
                    isActive
                      ? 'bg-yellow-200 dark:bg-yellow-600 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <span className="font-semibold mr-2">{key}.</span>
                {clues.across[key]}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Down clues */}
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">
          Down
        </h3>
        <ul className="space-y-1">
          {sortedDownKeys.map((key) => {
            const isActive =
              activeClue?.direction === 'down' &&
              activeClue?.index === Number(key);
            return (
              <li
                key={`down-${key}`}
                className={`
                  text-sm px-2 py-1 rounded transition-colors
                  ${
                    isActive
                      ? 'bg-yellow-200 dark:bg-yellow-600 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <span className="font-semibold mr-2">{key}.</span>
                {clues.down[key]}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
