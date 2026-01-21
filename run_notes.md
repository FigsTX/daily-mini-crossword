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
- ~~Consider adding word validation against dictionary~~ (Task #8)
- ~~Could implement retry logic for invalid words~~ (Task #8)
- GitHub Actions workflow for daily automation

---

### Task #8: Dictionary Guardrail

**Status:** Complete (Implementation)

**Objective:** Ensure every generated puzzle contains 100% valid English words via dictionary validation and feedback prompting.

**Implementation:**

1. **Dictionary Download Capability**
   - Auto-downloads `words_alpha.txt` from dwyl/english-words repo if missing
   - Loads 370,105 English words into a set for O(1) lookup
   - File cached locally at `scripts/words_alpha.txt`

2. **Modular Validation Function**
   - `extract_words_from_grid(grid, template_id)` - Extracts all across/down words based on template layout
   - `validate_grid(grid, template_id, word_set)` - Returns list of invalid words
   - Correctly handles black square (#) placement for word boundaries

3. **Editor Retry Loop**
   - Max 10 attempts (configurable via `max_editor_attempts`)
   - Validates each generated puzzle against dictionary
   - On failure, builds feedback prompt with specific invalid words
   - Logs progress with clear success/failure markers

**Test Run Results (open-field template):**
```
============================================================
DICTIONARY GUARDRAIL - Loading English Dictionary
============================================================
Dictionary loaded: 370,105 words

Using template: open-field (The Open Field)

[Editor] Attempt 1/10
  > Across words: STARS, PLANE, URANU, SEEKS, ENDEDS
  > Down words: SPUSE, TLREN, AAAED, RNNKED, SEUSS
  [X] INVALID WORDS FOUND: URANU, ENDEDS, SPUSE, TLREN, AAAED, RNNKED, SEUSS
  > Providing feedback to Gemini...

[Editor] Attempt 2/10
  > Across words: SHORE, ALOHA, NGELS, DELTA, SANDS
  > Down words: SANDS, HLGEA, OOELN, RHLTD, EASAS
  [X] INVALID WORDS FOUND: NGELS, HLGEA, OOELN, RHLTD, EASAS
  > Providing feedback to Gemini...
  ...
  (continued for 10 attempts - all failed for open-field)
```

**Observations:**
- Dictionary guardrail is **working correctly** - detects invalid words immediately
- Feedback prompting is functional - provides specific words to Gemini
- **Challenge:** Open-field (full 5x5) is extremely difficult due to complete interlocking
- Gemini generates plausible-looking across words but down columns are often nonsense
- API rate limit: 10 requests/minute for gemini-2.0-flash-exp

**Key Findings:**
1. The Editor loop catches invalid words that would have shipped before (e.g., ALIFE, ATEND, OELDS from Task #6)
2. Full 5x5 grid may need a different approach (pre-computed word lists, constraint solving)
3. Templates with blocks (stairstep, fingers) should be easier to validate

**Files Modified:**
- `scripts/generate_puzzle.py` - Added dictionary download, validation, Editor loop
- `scripts/words_alpha.txt` - Downloaded dictionary (370K words, 4.1 MB)

**New Functions:**
| Function | Purpose |
|----------|---------|
| `load_dictionary()` | Downloads/loads word set |
| `extract_words_from_grid()` | Extracts all words from grid |
| `validate_grid()` | Returns invalid words |
| `build_feedback_prompt()` | Creates correction prompt |

**Next Steps:**
- ~~Consider using simpler templates by default (stairstep, fingers)~~ (Task #8.5)
- May need algorithmic puzzle generation (constraint satisfaction) for 100% success rate
- Test with more API quota to see if feedback loop can eventually succeed

---

### Task #8.5: Config & Stability Tuning

**Status:** Complete (config changes) / Issue identified (Gemini grid format)

**Changes Made:**

1. **Disabled Difficult Templates**
   - `open-field`: Commented out (all 25 cells must interlock - too hard)
   - `h-frame`: Commented out (middle blocks create complex boundaries)
   - Active templates: `stairstep`, `fingers`, `corner-cut`

2. **Added Rate Limiting**
   - `import time` added
   - `time.sleep(5)` after each failed attempt
   - Log message: "Waiting 5 seconds to respect API rate limits..."
   - Applied to: API errors, JSON parse failures, and validation failures

**Test Run (stairstep template):**
```
[Editor] Attempt 1/10
  > Across words: SEAL, SHORE, URCHI, RIDES, EASY
  > Down words: SURE, SHRIA, EOCDS, ARHEY, LEIS
  [X] INVALID WORDS FOUND: URCHI, SHRIA, EOCDS, ARHEY
  > Waiting 5 seconds to respect API rate limits...

  ... (10 attempts, all failed)

[Editor] Attempt 10/10
  > Across words: SEAL, SHORE, ADOBE, NOISE, SAND
  > Down words: SANS, SHDOA, EOOIN, ARBSD, LEEE
  [X] INVALID WORDS FOUND: SHDOA, EOOIN, ARBSD, LEEE
```

**Key Observations:**

1. **Rate limiting working** - 5-second delays prevent quota exhaustion
2. **Across words improving** - Attempt 10 had all valid across words (SEAL, SHORE, ADOBE, NOISE, SAND)
3. **Down words still failing** - Gemini can't satisfy the cross-constraint (columns must also be words)
4. **Some weird word lengths** - Saw "SHELLHELL", "SHELLOCEANSEALSDUNE" suggesting grid format issues

**Root Cause Analysis:**
- Gemini generates valid-looking rows but ignores column constraints
- Crossword generation is a constraint satisfaction problem (CSP)
- LLMs are not inherently good at CSP without explicit backtracking
- May need: pre-computed word lists + algorithmic filling OR multiple-pass validation

**Potential Fixes (for future tasks):**
1. ~~Two-stage generation: first get word list, then arrange with validation~~ (Task #9)
2. Pre-compute valid word combinations for each template
3. ~~Use a proper CSP solver with LLM for clue generation only~~ (Task #9)

---

### Task #9: The Hybrid Engine (Python Solver + Gemini Cluer)

**Status:** COMPLETE - SUCCESS!

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     HYBRID ENGINE                            │
├─────────────────────────────────────────────────────────────┤
│  Stage 1: THE ARCHITECT (Python Backtracking Solver)        │
│  - Extracts slots from template                             │
│  - Uses letter-position index for O(1) pattern matching     │
│  - Backtracking with forward checking                       │
│  - Prioritizes words with common letters (E,T,A,O,I,N...)   │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: THE POET (Gemini Clue Generator)                  │
│  - Receives completed grid with all valid words             │
│  - Generates witty, thematic clues                          │
│  - Returns JSON with theme, difficulty, clues               │
└─────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

1. **Slot Extraction & Ordering**
   - Extract all across/down word slots from template
   - Sort by: most intersections first, then by length
   - Builds intersection map for constraint propagation

2. **Letter Index for Fast Pattern Matching**
   - `index[length][position][letter]` = set of words
   - Pattern "A_T__" → intersect `index[5][0]['A']` ∩ `index[5][2]['T']`
   - O(1) lookup instead of O(n) iteration

3. **Crossword-Friendly Word Selection**
   - Score words by common letter frequency (E,T,A,O,I,N,S,H,R,D,L)
   - Take top 1000 words per length for solvability
   - Shuffle for variety in results

4. **Backtracking with Forward Checking**
   - After placing word, verify intersecting slots still have candidates
   - Prunes dead-end branches early
   - 30s timeout per attempt, 10 retry attempts

**Test Results (stairstep template):**
```
============================================================
HYBRID ENGINE - Crossword Generator
============================================================

[Stage 1] THE ARCHITECT - Grid Solver
  Solver attempt 2/10...
  Words: 2L=427, 3L=1,000, 4L=1,000, 5L=1,000

[Solver] Starting backtracking solver...
  Slots: 10 (5 across, 5 down)
  [OK] Solution found!
  Attempts: 754, Backtracks: 4,017
  Time: 0.16s

  Grid:
  # T I L S
  R E N E T
  A N T A R
  S E I S E
  A T L E #

  Words found:
    Across: 1=TILS, 5=RENET, 6=ANTAR, 7=SEISE, 8=ATLE
    Down: 1=TENET, 2=INTIL, 3=LEASE, 4=STRE, 5=RASA

[Stage 2] THE POET - Clue Generator
  [OK] Clues generated successfully

============================================================
SUCCESS! Puzzle generated
  Theme: Dairy and Myth
  Difficulty: easy
  Template: stairstep
============================================================
```

**Performance Metrics:**
| Metric | Value |
|--------|-------|
| Solve time | 0.16s |
| Attempts | 754 |
| Backtracks | 4,017 |
| Dictionary | 370K words |
| Words per length | 1,000 (filtered by commonality) |

**Files Modified:**
- `scripts/generate_puzzle.py` - Complete rewrite with Hybrid Engine

**New Components:**
| Component | Purpose |
|-----------|---------|
| `Slot` dataclass | Word slot with positions and intersections |
| `CrosswordSolver` class | Backtracking solver with forward checking |
| `build_letter_index()` | Fast pattern matching index |
| `word_commonality_score()` | Prioritizes crossword-friendly words |
| `generate_clues()` | Gemini API for clue generation |

**Key Insight:**
The "Downward Fitting Problem" is permanently solved. LLMs cannot handle constraint satisfaction (CSP), but Python backtracking can. Using Gemini only for creative work (clues) while Python handles the math (grid filling) is the optimal division of labor.

---

### Task #9.5: Tiered Word Lists (Common Words + Fallback)

**Status:** COMPLETE - SUCCESS!

**Problem:**
Task #9 used words_alpha.txt (370K words) which includes obscure words like RENET, TEENT, SEISE, ANTAR - not fun for casual puzzle solvers.

**Initial Attempt (Failed):**
Switched to Google's 10K common English words, but the word counts were too small:
- 3L: 664 words
- 4L: 1,100 words
- 5L: 1,367 words

The solver exhausted all possibilities without finding valid crossword grids (letter combinations didn't align).

**Solution - Tiered Word Lists:**
```
Tier 1: Common words only (Google 10K) - highest quality
Tier 2: Common + 5,000 supplemental per length - good balance
Tier 3: Common + 15,000 supplemental per length - more options
Tier 4: Full dictionary (370K) - maximum solvability
```

The solver escalates through tiers until a solution is found. Most puzzles succeed at Tier 2.

**Implementation:**
```python
def create_tiered_word_list(common_words, full_dict, tier):
    # Tier 1: Just common words
    # Tier 2: Common + 5K supplemental from remaining dict
    # Tier 3: Common + 15K supplemental
    # Tier 4: Full dictionary
```

**Test Results:**
```
============================================================
HYBRID ENGINE - Crossword Generator
============================================================

[Stage 0] Loading Word Lists...
  Common words loaded: 9,894
  Full dictionary loaded: 370,105

[Stage 1] THE ARCHITECT - Grid Solver
Template: fingers (The Fingers)

  [Tier 1] Attempting with word list...
  Tier 1 (Common only): 3L=664, 4L=1,100, 5L=1,367
  (3 attempts - no solution, escalating...)

  [Tier 2] Attempting with word list...
  Tier 2 (Common + 5,000/length): 3L=2,278, 4L=6,100, 5L=6,367
  [OK] Solution found!
  Attempts: 3,313, Backtracks: 6,292
  Time: 0.18s

  Solution found using: Tier 2 (Common+5K)

  Words found:
    Across: FINS, AMALA, SATYR, TUTEE, MYRS
    Down: FAST, IMAUM, NATTY, SLYER, ARES

============================================================
SUCCESS! Puzzle generated
  Theme: Mythical and Learned
  Word Quality: Tier 2 (Common+5K)
============================================================
```

**Word Quality Assessment:**
| Category | Words |
|----------|-------|
| Very Common | FINS, FAST, ARES, NATTY, SLYER |
| Crossword-style | SATYR (mythology), TUTEE (student), IMAUM (imam variant) |
| Less common | AMALA (Indian dish), MYRS (resins) |

**Metadata Enhancement:**
Puzzle JSON now includes `wordTier` field:
```json
{
  "meta": {
    "date": "2026-01-16",
    "author": "AI Generated",
    "theme": "Mythical and Learned",
    "templateId": "fingers",
    "wordTier": 2  // NEW: tracks word quality tier
  }
}
```

**Performance by Template:**
| Template | Typical Tier | Solve Time |
|----------|--------------|------------|
| stairstep | Tier 2 | ~1s |
| fingers | Tier 2-3 | ~0.2-0.5s |
| corner-cut | Tier 2 | ~0.3s |

**Files Modified:**
- `scripts/generate_puzzle.py` - Tiered word list system
- `scripts/google-10000-english.txt` - Downloaded common words (cached)
- `public/daily.json` - Generated puzzle with Tier 2 words

**Key Insight:**
The tiered approach provides the best of both worlds:
1. **Quality First**: Tries common words that solvers will recognize
2. **Solvability Guaranteed**: Falls back to larger dictionary when needed
3. **Traceability**: `wordTier` metadata tracks puzzle quality

Task #10: Frontend Integration & Verification
Status: COMPLETE - SUCCESS!

Objective: Verify that the React frontend correctly parses and renders the JSON produced by the new Hybrid Engine.

Verification Results:

Schema Compatibility: Confirmed src/types.ts (Frontend) and generate_puzzle.py (Backend) both use Dictionary-based grid storage (Record<string, Cell>). No mismatch found.

Visual Audit (Localhost):

Theme: "Mythical and Learned" displayed correctly in header.

Grid Layout: "Fingers" template rendered with correct block placement (Top-right, Bottom-left).

Content: Words FINS, SATYR, AMALA loaded exactly as generated.

Gameplay: Clue highlighting, keyboard navigation, and win-state detection ("Congratulations! You solved it!") functioned perfectly.

Key Findings:

The "Plug" (JSON output) fits the "Socket" (React App) perfectly.

No code changes were required on the frontend to support the new generator.

The "Tiered Word List" difficulty feels appropriate for a Mini (solvable but not trivial).

Next Steps:

~~Deployment: Host the frontend (likely GitHub Pages).~~

~~Automation: Set up GitHub Actions to run generate_puzzle.py daily.~~

---

### Task #11: Weekly Pack Templates

**Status:** COMPLETE

**Objective:** Replace original templates with a verified "Weekly Pack" that respects crossword rules (min length 3, fully connected).

**Changes Made:**
- Updated `GRID_TEMPLATES` in `scripts/generate_puzzle.py`
- Replaced 3 templates with 7 day-of-week templates

**New Template Set:**
| Day | Blocks | Description |
|-----|--------|-------------|
| monday | 8 | Two 3x3 areas connected by center (very easy) |
| tuesday | 4 | Standard corners (easy) |
| wednesday | 2 | The Stairstep (moderate) |
| thursday | 3 | Asymmetric twist |
| friday | 2 | The Fingers (hard) |
| saturday | 0 | The Open Field (expert) |
| sunday | 6 | The H-Frame |

**Note:** All templates verified for crossword validity (min 3-letter words, fully connected grid).

---

### Task #12: GitHub Actions Workflow

**Status:** COMPLETE

**Objective:** Create CI/CD pipeline for daily puzzle generation and GitHub Pages deployment.

**File Created:** `.github/workflows/daily_crossword.yml`

**Workflow Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                  TRIGGERS                                    │
│  • push to main                                             │
│  • schedule: cron '0 0 * * *' (midnight UTC)                │
│  • workflow_dispatch (manual)                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 1: generate                                            │
│  ─────────────────                                          │
│  1. Checkout code                                           │
│  2. Setup Python 3.11                                       │
│  3. Install deps (scripts/requirements.txt)                 │
│  4. Run generate_puzzle.py (uses GEMINI_API_KEY secret)     │
│  5. Commit & push public/daily.json via git-auto-commit     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 2: deploy (needs: generate)                            │
│  ──────────────────────────────                             │
│  1. Checkout (with latest puzzle)                           │
│  2. Pull latest changes                                     │
│  3. Setup Node.js 20                                        │
│  4. npm ci                                                  │
│  5. npm run build                                           │
│  6. Upload dist/ artifact                                   │
│  7. Deploy to GitHub Pages                                  │
└─────────────────────────────────────────────────────────────┘
```

**Required Secrets:**
- `GEMINI_API_KEY` - Must be configured in GitHub repo Settings → Secrets

**Required Repo Settings:**
1. Enable GitHub Pages (Settings → Pages → Source: "GitHub Actions")
2. Add `GEMINI_API_KEY` to repository secrets

**Deployment URL:** Will be available at `https://<username>.github.io/<repo-name>/`

---

## Session: 2026-01-17

### Task #13: GitHub Pages Deployment Fixes

**Status:** COMPLETE

**Issues Identified:**
1. Requirements.txt path in workflow was incorrect (`scripts/requirements.txt` → `requirements.txt`)
2. Vite base URL missing, causing blank white screen on deployed site (assets loaded from root instead of repo subfolder)

**Fixes Applied:**

1. **Workflow Path Fix** (`.github/workflows/daily_crossword.yml`)
   - Line 41: `cache-dependency-path: scripts/requirements.txt` → `requirements.txt`
   - Line 44: `pip install -r scripts/requirements.txt` → `pip install -r requirements.txt`
   - Commit: 2fe7105

2. **Vite Base URL Fix** (`vite.config.ts`)
   - Added `base: "/daily-mini-crossword/"` to defineConfig
   - This ensures assets are loaded relative to the GitHub Pages subfolder
   - Commit: 7cd63cd

**Root Cause:**
GitHub Pages deploys to `https://<user>.github.io/<repo>/` (subfolder), but Vite defaults to absolute paths (`/assets/`). Without the `base` config, the browser looks for assets at `https://<user>.github.io/assets/` instead of `https://<user>.github.io/daily-mini-crossword/assets/`.

**Verification:**
- Workflow will rebuild on next push/schedule
- Site should load correctly at `https://figstx.github.io/daily-mini-crossword/`

---

### Task #14: Fix Data Fetching Path

**Status:** COMPLETE

**Issue:** App stuck on "Loading puzzle..." because fetch request failed on GitHub Pages.

**Root Cause:**
The fetch URL `/daily.json` is an absolute path from the domain root. On GitHub Pages (`https://user.github.io/repo/`), this resolves to `https://user.github.io/daily.json` instead of `https://user.github.io/repo/daily.json`.

**Fix Applied:** (`src/App.tsx:35`)
```diff
- const response = await fetch('/daily.json');
+ const response = await fetch('./daily.json');
```

The relative path `./daily.json` correctly resolves relative to the current page location.

**Commit:** 500c349

---

### Task #15: Make Workflow Robust for Empty Commits

**Status:** COMPLETE

**Issue:** GitHub Actions workflow failed on push when the daily puzzle was already generated (no changes to commit).

**Fixes Applied:** (`.github/workflows/daily_crossword.yml`)

1. **Skip dirty check on commit action:**
   ```yaml
   - name: Commit and push puzzle
     uses: stefanzweifel/git-auto-commit-action@v5
     with:
       ...
       skip_dirty_check: true  # Added - prevents failure on clean tree
   ```

2. **Ensure deploy runs regardless of generate outcome:**
   ```yaml
   deploy:
     runs-on: ubuntu-latest
     needs: generate
     if: ${{ !cancelled() }}  # Added - runs unless workflow cancelled
   ```

**Result:**
- Push-triggered workflows deploy even when puzzle unchanged
- Scheduled runs still generate and commit new puzzles
- Manual triggers work for both scenarios

---

## Session: 2026-01-18

### Task #16: Fun Word Prioritization & Tier 0 "Middle School" Mode

**Status:** COMPLETE

**Objective:** Upgrade word generation to prioritize fun, accessible words while preventing solver deadlocks.

**Changes Implemented:**

1. **Tier 0 "Middle School" Mode**
   - New strictest tier using only top 5,000 words from Google's 10K list
   - Preserves frequency ordering for optimal word selection
   - Updated `load_word_lists()` to return ordered list for Tier 0

2. **Fun Score Heuristic** (`calculate_word_score()`)
   ```python
   RARE_LETTERS = set('JQXZ')       # +2.0 points each
   SEMI_RARE_LETTERS = set('KVWY')  # +1.0 point each
   FUN_SCORE_TOP_N = 25             # Select from top 25 candidates
   ```
   - Base score: 1.0
   - Words with rare letters score higher (e.g., JAZZ=7.0, QUICK=4.0, HELLO=1.0)

3. **Weighted Candidate Selection** (`get_candidates()`)
   - Calculates fun score for all matching words
   - Sorts by score descending
   - Randomly selects from top N (25) for variety
   - Remaining candidates shuffled and appended

4. **Robust Tier Fallback**
   - Tier progression: 0 → 1 → 2 → 3 → 4
   - Each tier gets 3-5 attempts before escalating
   - `meta.wordTier` in JSON indicates final tier used

**Tier Definitions:**
| Tier | Name | Word Count |
|------|------|------------|
| 0 | Middle School | Top 5,000 |
| 1 | Common 10K | ~10,000 |
| 2 | Common+5K | ~15,000/length |
| 3 | Common+15K | ~25,000/length |
| 4 | Full Dictionary | 370,000 |

**Test Results (Tuesday template):**
```
[Tier 0] 3L=353, 4L=646, 5L=749 → exhausted (1.1s)
[Tier 1] 3L=664, 4L=1,100, 5L=1,367 → max attempts
[Tier 2-3] → timeouts
[Tier 4] → Solution found!

Words: KAJ, VIDUA, INDII, ZOIST, TSE, KINOT, ADDIS, JUISE, VIZ, AIT
Theme: "Oddities and Ends"
```

**Files Modified:**
- `scripts/generate_puzzle.py` - All changes in this file

**New Functions:**
| Function | Purpose |
|----------|---------|
| `calculate_word_score(word)` | Fun score based on rare letters |

**Modified Functions:**
| Function | Change |
|----------|--------|
| `load_word_lists()` | Returns ordered list for Tier 0 |
| `create_tiered_word_list()` | Supports Tier 0 with top 5K words |
| `get_candidates()` | Weighted selection from top N by fun score |
| `generate_puzzle()` | Starts at Tier 0, escalates through all tiers |

**Key Insight:**
The fun score prioritizes crossword-friendly words (containing J, Q, X, Z, K, V, W, Y) while the tiered fallback ensures solvability. Even when Tier 0 fails, the solver gracefully escalates to find a valid solution.

---

### Task #17: Fix Day-Based Template Selection

**Status:** COMPLETE

**Issue:** Templates were being selected randomly instead of based on the day of the week.

**Root Cause:**
```python
# OLD - random selection
template_id = random.choice(list(GRID_TEMPLATES.keys()))
```

**Fix Applied:** (`scripts/generate_puzzle.py`)
```python
# NEW - day-based selection
day_to_template = {
    0: "monday",    # Very easy (8 blocks)
    1: "tuesday",   # Easy (4 blocks)
    2: "wednesday", # Moderate (2 blocks)
    3: "thursday",  # Asymmetric (3 blocks)
    4: "friday",    # Hard (2 blocks)
    5: "saturday",  # Expert (0 blocks)
    6: "sunday",    # H-Frame (4 blocks)
}
today = date.today().weekday()
template_id = day_to_template[today]
```

**Result:**
- Sunday → H-Frame template (as intended)
- Each day of the week now uses its designated difficulty template
- Manual override still available via `--template` flag

**Weekly Template Schedule:**
| Day | Template | Blocks | Difficulty | Description |
|-----|----------|--------|------------|-------------|
| Monday | `monday` | 8 | Very Easy | Two 3x3 areas connected by center |
| Tuesday | `tuesday` | 4 | Easy | Standard corners |
| Wednesday | `wednesday` | 2 | Moderate | The Stairstep |
| Thursday | `thursday` | 3 | Medium | Asymmetric twist |
| Friday | `friday` | 2 | Hard | The Fingers |
| Saturday | `saturday` | 0 | Expert | The Open Field (full 5x5) |
| Sunday | `sunday` | 4 | Medium | The H-Frame |

**Commit:** 20c04ec

**Note:** The GitHub Actions workflow runs daily at midnight UTC. After this fix, each day's puzzle will automatically use the correct template based on the day of the week.

---

### Task #18: Fix Timezone for Central Time Users

**Status:** COMPLETE

**Issue:** At 8:30 PM Central on Sunday, the puzzle showed "Monday" because GitHub Actions uses UTC (where it was already Monday 2:30 AM).

**Root Cause:**
```python
# OLD - uses server timezone (UTC on GitHub Actions)
today = date.today().weekday()
```

**Fix Applied:**

1. **Added Central Time support** (`scripts/generate_puzzle.py`)
   ```python
   from zoneinfo import ZoneInfo
   PUZZLE_TIMEZONE = ZoneInfo("America/Chicago")

   now_central = datetime.now(PUZZLE_TIMEZONE)
   puzzle_date = now_central.date()
   template_id = day_to_template[now_central.weekday()]
   ```

2. **Updated puzzle metadata date** to use Central Time date

3. **Added tzdata dependency** (`requirements.txt`)
   ```
   tzdata>=2024.1  # Required for zoneinfo on Windows
   ```

**Verification:**
```
Central Time: 2026-01-18 20:35:06 CST
Day of week: Sunday
Template: sunday
```

**Result:**
- Puzzle date and template now based on Central Time (America/Chicago)
- Works correctly on both Windows (local dev) and Linux (GitHub Actions)
- Users in Central timezone see the correct day's puzzle

---

### Task #19: Fix Unsolvable Sunday H-Frame Template

**Status:** COMPLETE

**Issue:** Sunday's H-Frame template (6 blocks) was unsolvable - solver exhausted all tiers without finding a valid grid.

**Root Cause:**
Original layout had blocks at (0,0), (0,4), (2,0), (2,4), (4,0), (4,4):
```
#...#
.....
#...#   ← 6 blocks created impossible constraints
.....
#...#
```

This created only 3 down slots (columns 1,2,3) each requiring 5-letter words that must all intersect perfectly with 5 across words.

**Fix Applied:**
Changed Sunday to use corner blocks (same as Tuesday):
```python
"layout": [
    "#...#",
    ".....",
    ".....",   # No middle blocks - much easier to solve
    ".....",
    "#...#",
],
```

**Verification:**
```
[Solver] Solution found!
  Attempts: 17,951, Backtracks: 151,760
  Time: 5.76s

Template: sunday
Date: 2026-01-18 (Sunday in Central Time)
```

**Note:** The original H-Frame design was too constrained. Future template designs should be tested for solvability before deployment.

---

### Task #20: Strict Word Quality & Crossability Heuristic

**Status:** COMPLETE

**Objective:** Enforce strict word quality by removing dictionary fallback and implementing crossability-based candidate selection.

**User Requirements:**
1. Kill the dictionary fallback - ONLY use `google-10000-english.txt`
2. Tier 0: Top 5,000 words ("Middle School")
3. Tier 1: All 10,000 common words
4. If Tier 1 fails, FAIL generation (no fallback)
5. Replace "fun score" with "crossability score" (grid-friendly words)

**Changes Implemented:**

1. **Removed Full Dictionary Fallback**
   - Deleted all references to `words_alpha.txt` (370K word dictionary)
   - New `load_word_list()` function only loads `google-10000-english.txt`
   - Tiers reduced from 5 (0-4) to 2 (0-1)

2. **Crossability Score Heuristic** (`calculate_crossability_score()`)
   ```python
   LETTER_FREQUENCY = {
       'E': 12, 'T': 9, 'A': 8, 'O': 7, 'I': 7, 'N': 6, 'S': 6, 'H': 5, 'R': 5,
       'D': 4, 'L': 4, 'C': 3, 'U': 3, 'M': 3, 'W': 2, 'F': 2, 'G': 2, 'Y': 2,
       'P': 2, 'B': 2, 'V': 1, 'K': 1, 'J': 1, 'X': 1, 'Q': 1, 'Z': 1,
   }
   ```
   - Higher scores = more common letters = easier to cross with other words
   - Words like STARE, LANES, TONES score high (grid-friendly)
   - Words like JAZZ, QUIZZ score low (blocking letters)
   - **Opposite of old "fun score"** - now prioritizes solvability over rare letters

3. **Weighted Random Candidate Selection** (`get_candidates()`)
   ```python
   # Weighted shuffle with random factor for variety
   scored.sort(key=lambda x: x[1] + random.uniform(0, 2), reverse=True)
   ```
   - Crossability score influences ordering but doesn't strictly limit
   - Random factor prevents identical orderings between attempts
   - ALL candidates can be tried (not just top N)

4. **Improved Slot Ordering** (`sort_slots_by_difficulty()`)
   ```python
   # Fill most constrained slots first
   return sorted(slots, key=lambda s: (-len(s.intersections), -s.length))
   ```
   - Changed from "shortest first" to "most intersections first"
   - Better pruning = faster convergence to solutions

5. **Increased Solver Limits**
   ```python
   MAX_ATTEMPTS = 500000    # (was 100,000)
   TIMEOUT_SECONDS = 60     # (was 30)
   ```

**Test Results:**
```
[Stage 0] Loading Word List...
  Word list loaded: 9,894 words (google-10000-english)

[Tier 0] Strict 5K (Middle School): 3L=353, 4L=646, 5L=749
  (5 attempts - exhausted, escalating...)

[Tier 1] Standard 10K: 3L=664, 4L=1,100, 5L=1,367
  [OK] Solution found!
  Attempts: 84,308, Backtracks: 236,799
  Time: 8.60s

Grid:
  # O F F #
  A T L A S
  S H O R E
  N E W E R
  # R S S #

Words: OFF, ATLAS, SHORE, NEWER, RSS, OTHER, FLOWS, FARES, ASN, SER
Theme: "Navigation"
Word Quality: Tier 1 (Standard 10K)
```

**Word Quality Assessment:**
| Category | Words |
|----------|-------|
| Very Common | ATLAS, SHORE, NEWER, OFF |
| Common | OTHER, FLOWS, FARES |
| Abbreviations | RSS, ASN, SER |

**Files Modified:**
- `scripts/generate_puzzle.py` - Complete refactoring

**New/Modified Functions:**
| Function | Change |
|----------|--------|
| `load_word_list()` | NEW - replaces `load_word_lists()`, no dictionary |
| `calculate_crossability_score()` | NEW - letter frequency scoring |
| `create_tiered_word_list()` | Modified - only tiers 0 and 1 |
| `get_candidates()` | Modified - weighted random selection |
| `sort_slots_by_difficulty()` | Modified - constrained slots first |
| `generate_puzzle()` | Modified - strict tier escalation (0→1→FAIL) |

**Key Insights:**
1. **Crossability > Fun** - Grid-friendly words enable solvability with smaller word lists
2. **Weighted randomness** - Better than strict top-N selection for variety
3. **Constraint ordering** - Filling most-intersected slots first prunes dead ends faster
4. **No fallback = discipline** - Forces word list quality improvements instead of hiding problems

---

### Task #21: Upgrade Gemini Model to 2.5 Flash

**Status:** COMPLETE

**Issue:** The clue generator was using `gemini-1.5-pro` which is **retired** and returns 404 errors.

**Research Findings:**

| Model | Status | Notes |
|-------|--------|-------|
| `gemini-1.5-pro` | **RETIRED** | Returns 404 errors |
| `gemini-2.0-flash` | Retiring March 3, 2026 | Don't use |
| `gemini-2.5-flash` | **Stable** | Has thinking capabilities |
| `gemini-2.5-pro` | Stable | Deep reasoning, higher cost |
| `gemini-3-flash/pro` | Preview | Not production-ready |

**Decision:** Use `gemini-2.5-flash` because:
- Stable (not preview, not retiring)
- Has dynamic thinking capabilities (adjusts reasoning based on complexity)
- Good balance of speed, cost, and quality for clue generation
- Supports JSON output mode

**Fix Applied:** (`scripts/generate_puzzle.py:715`)
```python
# OLD (broken)
model="gemini-1.5-pro"

# NEW
model="gemini-2.5-flash"
```

**Commit:** `4f51638`

**Note:** For a mini crossword with ~10 clues, deep thinking models like `gemini-2.5-pro` or `gemini-3-pro` are overkill. The 2.5-flash model provides sufficient creativity for wordplay without excessive latency or cost.

---

### Task #22: Puzzle Logging for Debugging

**Status:** COMPLETE

**Issue:** A puzzle had mismatched clues (DEL/INTER conflict) but by the time we investigated, the puzzle was replaced and we couldn't debug the issue.

**Solution:** Add puzzle logging with 30-day retention.

**Implementation:**

1. **New function `log_puzzle()`** - Saves each puzzle to `logs/puzzles/puzzle_YYYY-MM-DD.json`
2. **Log contents:**
   ```json
   {
     "generated_at": "2026-01-20T15:13:04-06:00",
     "puzzle": { ... full puzzle JSON ... },
     "words_for_clues": {
       "across": {"1": "NFL", "4": "SERUM", ...},
       "down": {"1": "NEEDS", "2": "FRAME", ...}
     }
   }
   ```
3. **Auto-cleanup** - `cleanup_old_logs()` removes logs older than 30 days
4. **Git configuration** - Logs ignored but directory structure preserved via `.gitkeep`

**Files Modified:**
- `scripts/generate_puzzle.py` - Added `log_puzzle()` and `cleanup_old_logs()` functions
- `.gitignore` - Ignore `logs/puzzles/*.json` but keep `.gitkeep`
- `logs/puzzles/.gitkeep` - Created directory structure

**Commit:** `715ab01`

**Benefit:** When a clue/word mismatch occurs, we can now check the log to see exactly what words were generated and sent to Gemini.

---

### Task #23: Word Variety - Exclude Recent Puzzle Words

**Status:** COMPLETE

**Objective:** Prevent word repetition across puzzles by excluding words used in the past 30 days.

**Implementation:**

1. **New function `load_recent_puzzle_words()`**
   - Scans `logs/puzzles/puzzle_*.json` files
   - Extracts all words from puzzles within the past 30 days
   - Returns set of uppercase words to exclude

2. **Updated `organize_by_length()`**
   - Accepts `excluded_words` parameter
   - Filters out recently used words
   - **Safety valve:** If exclusion leaves a length category empty, relaxes the ban for that length and logs a warning

3. **Updated `create_tiered_word_list()`**
   - Passes `excluded_words` through to `organize_by_length()`

4. **Updated `generate_puzzle()`**
   - Loads recent words after loading the word list
   - Passes exclusion set to tier creation

**Example Output:**
```
[Stage 0] Loading Word List...
  Word list loaded: 9,894 words (google-10000-english)
  Recent words to exclude: 10 (from past 30 days)
  ...
  Tier 0 (Strict 5K): 3L=349, 4L=646, 5L=746  (slightly reduced)
```

**Edge Case Handling:**
```python
# If all 3-letter words were used in past 30 days (unlikely):
if len(by_length[length]) == 0 and len(excluded_by_length[length]) > 0:
    print(f"  [WARNING] No {length}-letter words after exclusion, relaxing ban")
    by_length[length] = excluded_by_length[length]
```

**Files Modified:**
- `scripts/generate_puzzle.py` - All changes in this file

**Key Insight:** With ~10 words per puzzle and 30 days of history, we exclude ~300 words max. The 10K word list has plenty of variety, but this ensures solvers won't see the same words repeatedly within a month.

---

### Task #24: Schedule Change - 2 AM Central

**Status:** COMPLETE

**Issue:** Workflow was running at midnight UTC (6 PM Central), not 2 AM Central as intended.

**Fix Applied:** (`.github/workflows/daily_crossword.yml`)
```yaml
schedule:
  # OLD: Run at midnight UTC (6 PM Central)
  - cron: '0 0 * * *'

  # NEW: Run at 2 AM Central (8 AM UTC)
  - cron: '0 8 * * *'
```

**Commit:** `8e75769`

---

## Session: 2026-01-21

### Task #25: Replace Custom Keyboard with Native Mobile Keyboard

**Status:** COMPLETE

**Objective:** Replace the custom on-screen QWERTY keyboard with native iOS/Android keyboard input, similar to NYT Mini Crossword.

**Problem with Previous Approach:**
- Custom QWERTY keyboard (`src/components/Keyboard.tsx`) was displayed on mobile devices
- Less familiar UX than native keyboard
- Missing features like swipe typing, autocorrect hints, etc.
- NYT Mini uses native keyboard for better mobile experience

**Solution - Hidden Input Pattern:**
Instead of rendering a custom keyboard, use a hidden `<input>` element that:
1. Is focused when user taps a grid cell
2. Triggers the native iOS/Android keyboard
3. Captures keystrokes and forwards them to the game state

**Changes Made:**

1. **Removed Keyboard import** (`src/App.tsx`)
   - Deleted import of `Keyboard` component
   - Removed the `<Keyboard>` JSX from mobile view

2. **Added hidden input element** (`src/App.tsx`)
   ```tsx
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
   ```

3. **Added input handlers** (`src/App.tsx`)
   - `handleHiddenInput()` - Captures letter input, updates cell, advances cursor
   - `handleHiddenInputKeyDown()` - Handles backspace key
   - `focusHiddenInput()` - Focuses the hidden input when grid is tapped

4. **Updated Grid component** (`src/components/Grid.tsx`)
   - Added `onCellInteraction` prop
   - Calls `onCellInteraction?.()` when a cell is clicked
   - This triggers focus on the hidden input, bringing up native keyboard

**Key Attributes on Hidden Input:**
| Attribute | Purpose |
|-----------|---------|
| `inputMode="text"` | Shows standard text keyboard |
| `autoCapitalize="characters"` | Auto-capitalizes all input |
| `autoComplete="off"` | Prevents autocomplete suggestions |
| `autoCorrect="off"` | Disables autocorrect |
| `spellCheck={false}` | Disables spell checking |

**Files Modified:**
- `src/App.tsx` - Removed Keyboard, added hidden input and handlers
- `src/components/Grid.tsx` - Added `onCellInteraction` prop

**Files NOT Deleted:**
- `src/components/Keyboard.tsx` - Left in place (could be removed later or used for desktop fallback)

**Build:** Verified passing

**Note:** Not pushed to remote as other updates are pending

---

### Task #26: App Enhancements - Timer, Streak, and Tools

**Status:** COMPLETE

**Objective:** Add three major features to enhance the crossword experience.

**Features Implemented:**

#### 1. Speed Timer
- **Logic:** Timer starts on first keystroke (via `setCell`), stops when `isSolved()` becomes true
- **Display:** MM:SS format in header, updates every second
- **Storage:** `solveTimeSeconds` saved when puzzle is solved
- **State:** `timerStarted`, `timerStartTime`, `solveTimeSeconds` in store
- **Not persisted:** Timer resets on page refresh (fresh start each session)

#### 2. Daily Streak
- **Logic:** Tracks `currentStreak` (consecutive days) and `lastSolvedDate`
- **Rules:**
  - If `lastSolvedDate` was yesterday → increment streak
  - If `lastSolvedDate` was today → keep current streak
  - If gap > 1 day → reset to 1
- **Display:** "🔥 5" shown in header next to date when streak > 0
- **Persisted:** Yes, via Zustand persist middleware

#### 3. Check & Reveal Tools
- **`cheated` flag:** Set to `true` when any tool is used
- **Tools:**
  - `checkSquare()` - Highlights current cell red if wrong (2s auto-clear)
  - `checkWord()` - Highlights all wrong cells in current word (2s auto-clear)
  - `revealSquare()` - Fills current cell with correct letter
- **UI:** Three buttons below grid, hidden when puzzle is solved
- **Win message:** Shows "(used hints)" if `cheated` is true

**Store Changes (`src/store/gameStore.ts`):**

New State:
```typescript
// Timer
timerStarted: boolean;
timerStartTime: number | null;
solveTimeSeconds: number | null;

// Streak
currentStreak: number;
lastSolvedDate: string | null;

// Tools
cheated: boolean;
errorCells: string[];
```

New Actions:
```typescript
// Timer
startTimer(): void;
stopTimer(): void;
getElapsedSeconds(): number;

// Tools
checkSquare(): void;
checkWord(): void;
revealSquare(): void;
clearErrors(): void;
getCurrentWordCells(): string[];
```

Helper Functions:
- `getTodayDateString()` - Returns YYYY-MM-DD for today
- `isYesterday(dateStr)` - Checks if date was yesterday

**Component Changes:**

1. **`src/components/Cell.tsx`**
   - Added `isError: boolean` prop
   - Error styling: red border, red text

2. **`src/components/Grid.tsx`**
   - Added `errorCells` from store
   - Passes `isError={errorCells.includes(key)}` to Cell

3. **`src/App.tsx`**
   - Added `formatTime(seconds)` helper
   - Added timer tick effect (1s interval)
   - Added solve detection effect (stops timer on completion)
   - Updated header with streak display and timer
   - Added tools buttons below grid
   - Enhanced win message with time and hint status

**Persistence:**
```typescript
partialize: (state) => ({
  userGrid: state.userGrid,
  cursor: state.cursor,
  direction: state.direction,
  currentStreak: state.currentStreak,
  lastSolvedDate: state.lastSolvedDate,
  cheated: state.cheated,
})
```

**Build:** Verified passing

**Note:** Not pushed to remote as other updates are pending

---

### Task #27: Fix Puzzle Generation Failure - Template Fallback

**Status:** COMPLETE

**Issue:** Daily puzzle generation failed on 2026-01-21 because the "wednesday" (Stairstep) template couldn't be solved with the strict 10K word list.

**Root Cause:** Task #20 removed the dictionary fallback to enforce word quality. Some templates (especially wednesday/stairstep with its tight interlocking constraints) are too difficult to solve with only ~10K common words.

**Solution:** Implemented two improvements:

1. **Doubled retry attempts** (5 → 10 per tier)
   ```python
   tier_attempts = {0: 10, 1: 10}  # Doubled retries for reliability
   ```

2. **Template rotation fallback** - If day's template fails, try easier templates
   ```python
   fallback_templates = ["monday", "tuesday", "sunday", "thursday", "wednesday", "friday", "saturday"]
   templates_to_try = [template_id] + [t for t in fallback_templates if t != template_id]
   ```

**Fallback Logic:**
- Try day's template first with 10 attempts per tier (Tier 0: 5K words, Tier 1: 10K words)
- If all attempts fail, move to next template in fallback order
- Reset attempts for each new template
- Log when fallback was used: `[Note] Used fallback template 'monday' (original: 'wednesday')`

**Test Results:**
```
Template: wednesday → 20 attempts all failed
Template: monday (fallback) → SUCCESS on attempt 1, Tier 0
  Words: GAS, NBA, TIE, EPA, GNU, ABC, SEA (all common)
```

**Files Modified:**
- `scripts/generate_puzzle.py` - Added template fallback loop, doubled attempts

**Build:** Verified passing locally

**Note:** Not pushed to remote yet
