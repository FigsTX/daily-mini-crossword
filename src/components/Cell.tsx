import { memo } from 'react';

export type CellStatus = 'selected' | 'related' | 'none';

interface CellProps {
  row: number;
  col: number;
  value: string;
  clueIndex?: number;
  status: CellStatus;
  isBlack: boolean;
  onClick: () => void;
}

export const Cell = memo(function Cell({
  value,
  clueIndex,
  status,
  isBlack,
  onClick,
}: CellProps) {
  if (isBlack) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 dark:bg-gray-800" />
    );
  }

  const statusClasses = {
    selected: 'bg-yellow-300 dark:bg-yellow-500',
    related: 'bg-blue-100 dark:bg-blue-900',
    none: 'bg-white dark:bg-gray-700',
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14
        border border-gray-400 dark:border-gray-600
        ${statusClasses[status]}
        cursor-pointer
        flex items-center justify-center
        select-none
        transition-colors duration-100
      `}
    >
      {/* Clue number in top-left corner */}
      {clueIndex && (
        <span className="absolute top-0.5 left-1 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
          {clueIndex}
        </span>
      )}

      {/* Letter value */}
      <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase">
        {value}
      </span>
    </div>
  );
});
