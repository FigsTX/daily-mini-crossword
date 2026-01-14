Implementation Plan - Daily Mini Crossword
User Review Required
IMPORTANT

Gemini API Key: You must provide a valid Gemini API Key in your GitHub Secrets as GEMINI_API_KEY. Dictionary: A words.txt file is required. We will need to source this (e.g., standard word list) and place it in the repo.

Proposed Changes
Data Schema (Contract)
File: public/daily.json

interface DailyPuzzle {
  meta: {
    date: string; // YYYY-MM-DD
    author: string;
  };
  dimensions: {
    rows: 5;
    cols: 5;
  };
  grid: {
    [key: string]: { // "row,col" -> "0,0"
      char: string | null; // null = black square
      clueIndex?: number;
    };
  };
  clues: {
    across: { [index: string]: string };
    down: { [index: string]: string };
  };
}
Generator Script (Python)
Directory: scripts/

[NEW] 

generate_puzzle.py
Grid Templates: Hardcode 10-15 valid 5x5 binary arrays (0=white, 1=black). Ensure 180-degree symmetry.
Dictionary: Load words.txt.
Backtracking Algorithm:
Select random template.
Seed text with a random 5-letter word in a central position.
Recursively fill remaining white squares using valid words from words.txt.
Constraint checking: Ensure words exist in dictionary.
Retry logic: If fill fails, restart.
Gemini Integration:
Extract final words ("ACROSS" and "DOWN").
Prompt gemini-1.5-flash with the list of words to generate witty clues.
Request JSON response {"WORD": "Clue"}.
Output: Write formatted JSON to public/daily.json.
[NEW] 

requirements.txt
google-generativeai
Frontend (React/Vite)
Directory: src/

[NEW] 

types.ts
Define DailyPuzzle interface.
[NEW] 

App.tsx
State:
puzzleData: DailyPuzzle | null
gridState: {[key: string]: string} (User answers)
meta: status (loading, playing, won)
Init: Fetch daily.json.
Storage: Check localStorage for crossword_progress_${date}. Hydrate if exists.
[NEW] 

Grid.tsx
Props: puzzleData, gridState, onUpdate.
Interaction:
Manage focus (row, col) and direction (across/down).
Clicks: Toggle direction if clicking active cell; otherwise move focus.
Typing: Update cell, auto-advance to next valid cell (skipping black squares).
Backspace: Clear current if not empty, else move back and clear.
Arrows: Standard 2D navigation (skipping black squares optional or stop at edges).
Styles: Mobile-friendly (touch optimized).
[NEW] 

Clues.tsx
Highlight active clue based on cursor position.
[NEW] 

Validation
Compare gridState vs puzzleData solution.
Trigger "Success" modal on 100% match.
Automation (GitHub Actions)
Directory: .github/workflows/

[NEW] 

daily-puzzle.yml
Trigger: Cron 0 8 * * * (2:00 AM CST / 8:00 UTC).
Steps:
Checkout repo.
Setup Python 3.9.
Install google-generativeai.
Run python scripts/generate_puzzle.py.
Commit & Push public/daily.json.
Verification Plan
Automated Tests
Generator: Run python scripts/generate_puzzle.py locally and verify public/daily.json is created with valid schema and JSON structure.
Frontend: npm run dev, verify app loads daily.json.
Manual Verification
Generate Puzzle: Run the python script. Check public/daily.json for:
Valid 5x5 grid structure.
Symmetrical black squares.
Real English words in the solution.
Contextual clues from Gemini.
Gameplay:
Open App.
Click cells -> Toggle direction.
Type words -> Cursor auto-advances, skipping black squares.
Refresh -> State persists (Local Storage).
Complete puzzle -> Win modal appears.