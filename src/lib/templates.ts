/**
 * Grid Templates for the Mini Crossword Engine
 *
 * Each template is a 5x5 array of strings:
 * - '.' = playable cell
 * - '#' = black square (block)
 *
 * Templates enable dynamic puzzle shapes while maintaining
 * consistent grid dimensions.
 */

export interface GridTemplate {
  id: string;
  name: string;
  description: string;
  layout: string[];
}

export const GRID_TEMPLATES: Record<string, GridTemplate> = {
  'open-field': {
    id: 'open-field',
    name: 'The Open Field',
    description: 'Classic 5x5 grid with no blocks',
    layout: [
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
    ],
  },

  'stairstep': {
    id: 'stairstep',
    name: 'The Stairstep',
    description: 'Diagonal blocks at opposite corners (0,0 and 4,4)',
    layout: [
      '#....',
      '.....',
      '.....',
      '.....',
      '....#',
    ],
  },

  'fingers': {
    id: 'fingers',
    name: 'The Fingers',
    description: 'Anti-diagonal blocks at corners (0,4 and 4,0)',
    layout: [
      '....#',
      '.....',
      '.....',
      '.....',
      '#....',
    ],
  },

  'corner-cut': {
    id: 'corner-cut',
    name: 'The Corner Cut',
    description: 'Three corners blocked, one open',
    layout: [
      '#...#',
      '.....',
      '.....',
      '.....',
      '#....',
    ],
  },

  'h-frame': {
    id: 'h-frame',
    name: 'The H-Frame',
    description: 'Blocks at middle-left and middle-right edges',
    layout: [
      '.....',
      '.....',
      '#...#',
      '.....',
      '.....',
    ],
  },
};

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): GridTemplate | undefined {
  return GRID_TEMPLATES[templateId];
}

/**
 * Check if a cell is a block in the given template
 */
export function isBlockInTemplate(
  templateId: string,
  row: number,
  col: number
): boolean {
  const template = GRID_TEMPLATES[templateId];
  if (!template) return false;
  return template.layout[row]?.[col] === '#';
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): string[] {
  return Object.keys(GRID_TEMPLATES);
}
