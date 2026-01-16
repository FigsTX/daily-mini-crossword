# Schema Proposal v1 - Daily Crossword JSON

**Status:** APPROVED (2026-01-16)

## Overview

Zod schema for `public/daily.json` - the contract between the Python generator and React frontend.

---

## Zod Schema Definition

```typescript
import { z } from 'zod';

// Metadata schema
const MetaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  author: z.string().default('AI Generated'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  theme: z.string().optional(), // e.g., "Sports", "Movies", "Science"
  templateId: z.string(), // References GRID_TEMPLATES (e.g., "stairstep", "open-field")
});

// Dimensions schema (fixed 5x5)
const DimensionsSchema = z.object({
  rows: z.literal(5),
  cols: z.literal(5),
});

// Individual cell schema
const CellSchema = z.object({
  char: z.string().length(1).nullable(), // null = black square
  clueIndex: z.number().int().positive().optional(), // numbered cells only
});

// Grid schema - keyed by "row,col" (e.g., "0,0", "2,3")
const GridSchema = z.record(
  z.string().regex(/^[0-4],[0-4]$/), // validates "row,col" format for 5x5
  CellSchema
);

// Clues schema
const CluesSchema = z.object({
  across: z.record(z.string(), z.string()), // { "1": "Clue text", "4": "..." }
  down: z.record(z.string(), z.string()),
});

// Complete puzzle schema
export const DailyPuzzleSchema = z.object({
  meta: MetaSchema,
  dimensions: DimensionsSchema,
  grid: GridSchema,
  clues: CluesSchema,
});

// TypeScript type inference
export type DailyPuzzle = z.infer<typeof DailyPuzzleSchema>;
export type Cell = z.infer<typeof CellSchema>;
export type Clues = z.infer<typeof CluesSchema>;
```

---

## Example JSON

```json
{
  "meta": {
    "date": "2026-01-16",
    "author": "AI Generated",
    "difficulty": "medium",
    "theme": "Word Games"
  },
  "dimensions": {
    "rows": 5,
    "cols": 5
  },
  "grid": {
    "0,0": { "char": "S", "clueIndex": 1 },
    "0,1": { "char": "T" },
    "0,2": { "char": "A", "clueIndex": 2 },
    "0,3": { "char": "R" },
    "0,4": { "char": "T", "clueIndex": 3 },
    "1,0": { "char": "H", "clueIndex": 4 },
    "1,1": { "char": null },
    "1,2": { "char": "R" },
    "1,3": { "char": null },
    "1,4": { "char": "O" },
    "2,0": { "char": "O", "clueIndex": 5 },
    "2,1": { "char": "R" },
    "2,2": { "char": "E" },
    "2,3": { "char": "O", "clueIndex": 6 },
    "2,4": { "char": "N" },
    "3,0": { "char": "P" },
    "3,1": { "char": null },
    "3,2": { "char": "A" },
    "3,3": { "char": null },
    "3,4": { "char": "E" },
    "4,0": { "char": "S", "clueIndex": 7 },
    "4,1": { "char": "P", "clueIndex": 8 },
    "4,2": { "char": "M" },
    "4,3": { "char": "A" },
    "4,4": { "char": "S" }
  },
  "clues": {
    "across": {
      "1": "Begin a race",
      "5": "Cookie's filling, maybe",
      "7": "Unwanted email"
    },
    "down": {
      "1": "Mall stops",
      "2": "Zone",
      "3": "Sound quality"
    }
  }
}
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `char: null` for black squares | Explicit over implicit; easy null checks |
| Grid keyed by `"row,col"` string | Matches implementation plan; O(1) lookup |
| `clueIndex` optional | Only numbered cells need it |
| `difficulty` enum added | User requirement; enables future filtering |
| `theme` optional | Enables themed puzzles without breaking existing data |
| Solution embedded in `grid.char` | Reduces sync errors from AI generator |
| Zod over plain TS interface | Runtime validation + type inference |

---

## Usage in Frontend

```typescript
// src/lib/schema.ts
import { DailyPuzzleSchema } from './schema';

export async function fetchPuzzle(): Promise<DailyPuzzle> {
  const res = await fetch('/daily.json');
  const data = await res.json();
  return DailyPuzzleSchema.parse(data); // throws on invalid
}
```

---

## Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Solution storage | Embedded in `grid.char` | Reduces sync errors from AI generator |
| Theme field | Added as optional `theme` in meta | Enables themed puzzles |

---

**Schema approved and ready for implementation.**
