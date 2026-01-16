import { useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Cell } from './Cell';
import type { CellStatus } from './Cell';

const GRID_SIZE = 5;

export function Grid() {
  const {
    grid,
    userGrid,
    cursor,
    direction,
    setCursor,
    toggleDirection,
    isBlackSquare,
  } = useGameStore();

  // Find all cells that are part of the same word as the cursor
  const relatedCells = useMemo(() => {
    if (!grid) return new Set<string>();

    const related = new Set<string>();
    const { row, col } = cursor;

    if (direction === 'across') {
      // Find start of word (go left until black square or edge)
      let startCol = col;
      while (startCol > 0 && !isBlackSquare(row, startCol - 1)) {
        startCol--;
      }
      // Find end of word (go right until black square or edge)
      let endCol = col;
      while (endCol < GRID_SIZE - 1 && !isBlackSquare(row, endCol + 1)) {
        endCol++;
      }
      // Add all cells in the word
      for (let c = startCol; c <= endCol; c++) {
        if (!isBlackSquare(row, c)) {
          related.add(`${row},${c}`);
        }
      }
    } else {
      // direction === 'down'
      // Find start of word (go up until black square or edge)
      let startRow = row;
      while (startRow > 0 && !isBlackSquare(startRow - 1, col)) {
        startRow--;
      }
      // Find end of word (go down until black square or edge)
      let endRow = row;
      while (endRow < GRID_SIZE - 1 && !isBlackSquare(endRow + 1, col)) {
        endRow++;
      }
      // Add all cells in the word
      for (let r = startRow; r <= endRow; r++) {
        if (!isBlackSquare(r, col)) {
          related.add(`${r},${col}`);
        }
      }
    }

    return related;
  }, [grid, cursor, direction, isBlackSquare]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isBlackSquare(row, col)) return;

      // If clicking on the already selected cell, toggle direction
      if (cursor.row === row && cursor.col === col) {
        toggleDirection();
      } else {
        setCursor({ row, col });
      }
    },
    [cursor, setCursor, toggleDirection, isBlackSquare]
  );

  const getCellStatus = useCallback(
    (row: number, col: number): CellStatus => {
      if (cursor.row === row && cursor.col === col) {
        return 'selected';
      }
      if (relatedCells.has(`${row},${col}`)) {
        return 'related';
      }
      return 'none';
    },
    [cursor, relatedCells]
  );

  if (!grid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading puzzle...</p>
      </div>
    );
  }

  return (
    <div
      className="inline-grid gap-0 border-2 border-gray-800 dark:border-gray-300"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
    >
      {Array.from({ length: GRID_SIZE }, (_, row) =>
        Array.from({ length: GRID_SIZE }, (_, col) => {
          const key = `${row},${col}`;
          const cell = grid[key];
          const isBlack = cell?.char === null;
          const userValue = userGrid[key] || '';

          return (
            <Cell
              key={key}
              row={row}
              col={col}
              value={userValue}
              clueIndex={cell?.clueIndex}
              status={getCellStatus(row, col)}
              isBlack={isBlack}
              onClick={() => handleCellClick(row, col)}
            />
          );
        })
      )}
    </div>
  );
}
