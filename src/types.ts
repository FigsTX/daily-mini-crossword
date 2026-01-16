import { z } from 'zod';

// Metadata schema
export const MetaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  author: z.string().default('AI Generated'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  theme: z.string().optional(),
  templateId: z.string(), // References a template in GRID_TEMPLATES
});

// Dimensions schema (fixed 5x5)
export const DimensionsSchema = z.object({
  rows: z.literal(5),
  cols: z.literal(5),
});

// Individual cell schema
export const CellSchema = z.object({
  char: z.string().length(1).nullable(), // null = black square
  clueIndex: z.number().int().positive().optional(), // numbered cells only
});

// Grid schema - keyed by "row,col" (e.g., "0,0", "2,3")
export const GridSchema = z.record(z.string(), CellSchema);

// Clues schema
export const CluesSchema = z.object({
  across: z.record(z.string(), z.string()),
  down: z.record(z.string(), z.string()),
});

// Complete puzzle schema
export const DailyPuzzleSchema = z.object({
  meta: MetaSchema,
  dimensions: DimensionsSchema,
  grid: GridSchema,
  clues: CluesSchema,
});

// TypeScript types inferred from Zod schemas
export type Meta = z.infer<typeof MetaSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type Cell = z.infer<typeof CellSchema>;
export type Grid = z.infer<typeof GridSchema>;
export type Clues = z.infer<typeof CluesSchema>;
export type DailyPuzzle = z.infer<typeof DailyPuzzleSchema>;

// Game-specific types
export type Direction = 'across' | 'down';

export interface Cursor {
  row: number;
  col: number;
}

// User's current answers (keyed by "row,col")
export type UserGrid = Record<string, string>;
