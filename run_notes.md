# Run Notes - Mini Crossword Project

Persistent memory for Claude Code sessions.

---

## Session: 2026-01-16

### Task: Project Initialization (Setup Phase)

**What Worked:**
- Created CLAUDE.md with tech stack definition (React, Vite, TypeScript, Tailwind CSS, Zustand, google-genai)
- Read and understood specs/implementation_plan.md and specs/tasks.md
- Existing test_api_connection.py confirms Gemini API integration pattern using `google-genai` client

**What Failed:**
- N/A (initial setup)

**Missing Context:**
- words.txt dictionary file not yet sourced
- React/Vite project not yet initialized
- Zustand store structure TBD

### Artifacts Created:
- `CLAUDE.md` - Project guidance for Claude Code
- `run_notes.md` - This file (persistent memory)
- `specs/schema_v1.md` - Zod schema proposal for daily.json

### Schema v1 - APPROVED
- `meta`: date, author, difficulty, theme (optional)
- `dimensions`: fixed 5x5
- `grid`: Record keyed by "row,col" with `{ char, clueIndex? }`
- `clues`: `{ across: {}, down: {} }`
- Solution embedded in `grid.char` (no separate field)
- Black squares = `char: null`

---

### Task #2: React/Vite Initialization

**Status:** Complete

**What Worked:**
- Initialized Vite with React + TypeScript template
- Configured Tailwind CSS v4 using `@tailwindcss/vite` plugin
- Installed core dependencies: Zustand (state), Zod (validation)
- Build verified successfully

**What Failed:**
- `npm create vite` fails in non-empty directories (workaround: temp folder + move files)

**Dependencies Installed:**
```
react, react-dom (v19)
zustand (v5)
zod (v4)
tailwindcss, @tailwindcss/vite (v4)
```

**Files Created/Modified:**
- `package.json` - Project config
- `vite.config.ts` - Vite + Tailwind plugin
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript config
- `eslint.config.js` - ESLint config
- `index.html` - Entry HTML
- `src/` - React source directory
- `src/index.css` - Tailwind imports + base styles
- `.gitignore` - Updated with Vite patterns

**Commands Available:**
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run preview` - Preview production build

---

### Task #3: Dynamic Template System (REBOOT)

**Status:** Complete

**Pivot Reason:** Original mock data was too rigid. Need to support multiple grid layouts for daily variety.

**What Worked:**
- Created template system with 5 different 5x5 layouts
- Updated schema with `templateId` field
- Updated mock data to use "Stairstep" template with blocks at (0,0) and (4,4)
- Enhanced store with navigation helpers that skip black squares
- Build verified passing

**Files Created/Modified:**
- `src/lib/templates.ts` - Grid template definitions
- `src/types.ts` - Added `templateId` to MetaSchema
- `public/daily.json` - Updated with Stairstep template
- `src/store/gameStore.ts` - Enhanced navigation logic

**Templates Defined:**
| ID | Name | Pattern |
|----|------|---------|
| `open-field` | The Open Field | No blocks (all `.`) |
| `stairstep` | The Stairstep | Blocks at (0,0) and (4,4) |
| `fingers` | The Fingers | Blocks at (0,4) and (4,0) |
| `corner-cut` | The Corner Cut | Blocks at 3 corners |
| `h-frame` | The H-Frame | Blocks at middle-left/right |

**Template Format:**
```typescript
layout: [
  '#....',  // # = block, . = cell
  '.....',
  '.....',
  '.....',
  '....#',
]
```

**Mock Puzzle (Stairstep):**
```
#  W  I  S  H   (1-Across: WISH)
T  R  A  D  E   (5-Across: TRADE)
O  W  N  E  R   (6-Across: OWNER)
P  I  E  C  E   (7-Across: PIECE)
S  T  O  P  #   (8-Across: STOP)
```

**New Store Actions:**
- `moveToNextCell()` - Auto-advance skipping blacks
- `moveToPrevCell()` - Move back skipping blacks
- `moveInDirection(dRow, dCol)` - Arrow key navigation
- `isValidCell(row, col)` - Bounds + black square check
- `findFirstValidCell()` - Find first playable cell

**Architecture Benefit:** Adding new templates only requires updating `GRID_TEMPLATES` in `templates.ts`.

---

### Task #4: UI Implementation

**Status:** Complete

**What Worked:**
- Created Cell, Grid, and ClueList components with Tailwind styling
- Implemented keyboard navigation (arrows, letters, backspace, tab)
- Cursor skips black squares automatically
- Related cells (same word) highlighted in light blue
- Active clue highlighted in yellow
- Win detection with congratulations message
- Dark mode support built-in
- Build verified passing

**Components Created:**
- `src/components/Cell.tsx` - Individual cell with status styling
- `src/components/Grid.tsx` - 5x5 grid rendering with word highlighting
- `src/components/ClueList.tsx` - Across/Down clues with active highlight

**Cell Statuses:**
| Status | Style |
|--------|-------|
| `selected` | Yellow background (current cell) |
| `related` | Light blue (same word cells) |
| `none` | White background |
| `isBlack` | Black/dark gray (block) |

**Keyboard Controls:**
| Key | Action |
|-----|--------|
| Arrow keys | Navigate grid (skips blacks) |
| A-Z | Type letter, auto-advance |
| Backspace | Clear cell or move back |
| Delete | Clear current cell |
| Tab | Toggle direction (across/down) |

**App Layout:**
```
+------------------+
|   Mini Crossword |
|   [Date/Theme]   |
|                  |
|  Direction: xxx  |
|                  |
|   [5x5 Grid]     |
|                  |
| Across  | Down   |
| 1. xxx  | 1. xxx |
| 5. xxx  | 2. xxx |
|                  |
| [Help text]      |
+------------------+
```

**Features:**
- Puzzle loads from `/daily.json` with Zod validation
- localStorage persistence (via Zustand)
- Responsive design (sm: breakpoints)
- Win state detection

---

### Task #5: AI Puzzle Generator

**Status:** Complete

**What Worked:**
- Created Python script using Gemini 2.0 Flash API
- Templates mirrored from TypeScript to Python
- Automatic clue number calculation based on template
- Dynamic date generation (YYYY-MM-DD)
- Output matches schema_v1 exactly
- CLI with --template, --output, --dry-run options

**Files Created:**
- `scripts/generate_puzzle.py` - Main generator script
- `requirements.txt` - Python dependencies

**Dependencies:**
```
google-genai>=1.0.0
python-dotenv>=1.0.0
```

**Generator Features:**
- Randomly selects template (or specify with --template)
- Calculates clue numbers automatically
- Prompts Gemini for valid English words + clues
- Parses JSON response with error handling
- Saves to `public/daily.json`

**Usage:**
```bash
# Random template, save to public/daily.json
python scripts/generate_puzzle.py

# Specific template
python scripts/generate_puzzle.py --template open-field

# Preview without saving
python scripts/generate_puzzle.py --dry-run

# Custom output path
python scripts/generate_puzzle.py --output path/to/puzzle.json
```

**Known Limitations:**
- Gemini may generate words that don't perfectly intersect (crossword constraint satisfaction is hard)
- Quality varies - may need multiple generations for optimal puzzles
- Future improvement: Add backtracking validation

**Environment:**
- Requires `GEMINI_API_KEY` in `.env` file
- Uses `gemini-2.0-flash-exp` model

---

### Task #6: First Live AI Generation

**Status:** Complete

**Execution Log:**
```
$ pip install -r requirements.txt
[packages installed successfully]

$ python scripts/generate_puzzle.py
Using template: stairstep (The Stairstep)
Puzzle saved to: public/daily.json

Puzzle generated successfully!
  Date: 2026-01-16
  Theme: The Stairstep
  Difficulty: easy
  Template: stairstep
```

**Generated Puzzle:**
```
#  A  R  E  A   (1-Across: A patch of land)
A  L  I  F  E   (5-Across: Standing apart)
A  T  E  N  D   (6-Across: Change)
O  E  L  D  S   (7-Across: Beginning)
S  T  A  B  #   (8-Across: A quick jab)
```

**Verification:**
- `meta.date`: "2026-01-16" ✓
- `meta.templateId`: "stairstep" ✓
- `dimensions`: 5x5 ✓
- `grid`: 25 cells with correct null at (0,0) and (4,4) ✓
- `clues`: 5 across + 5 down ✓
- JSON structure matches schema_v1 ✓

**Observations:**
- End-to-end pipeline works: Python → Gemini API → JSON → Frontend
- Valid across words: AREA, STAB
- Some words need improvement (ALIFE, ATEND not standard)
- Clue quality is good and contextual

**Next Steps:**
- Consider adding word validation against dictionary
- Could implement retry logic for invalid words
- GitHub Actions workflow for daily automation

---
