Tasks: Daily Mini Crossword
 
Project Setup
 Initialize Git repository
 Create directory structure (/public, /src, /scripts, /.github)
 Create words.txt file (placeholder or instructions to download)
 
Generator Script (Python)
 Create scripts/generate_puzzle.py
 Implement Grid Templates (Hardcoded 5x5 binary arrays)
 Implement Backtracking Algorithm (Fill grid using words.txt)
 Implement Gemini API Integration (Clue generation)
 Implement JSON formatting (daily.json schema)
 
Frontend (React/Vite)
 Initialize React Vite project with TypeScript & Tailwind
 Implement DailyPuzzle TypeScript interface
 Create Grid component with navigation logic (skip black squares, toggle direction)
 Create Clues component
 Implement State Management (Fetch daily.json, LocalStorage persistence)
 Implement Validation & Win State
 Style with responsive/mobile-friendly CSS

Automation (GitHub Actions)
 Create .github/workflows/daily-puzzle.yml
 Configure Python environment and dependencies
 Configure Gemini API Key secret
 Configure commit/push changes

Documentation & Verification
 Create README.md
 Verify daily.json generation
 Verify Frontend gameplay logic