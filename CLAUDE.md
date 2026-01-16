# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Mini Crossword - A 5x5 crossword puzzle web app with AI-generated clues. Puzzles are auto-generated daily via GitHub Actions.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **AI Integration**: google-genai (Gemini API via proxy)
- **Puzzle Generator**: Python with Gemini AI

## Architecture

### Data Flow
1. Python script selects random template from 5 layouts
2. Gemini API generates words that fit the template + clues
3. Output written to `public/daily.json`
4. React frontend fetches and renders the puzzle
5. User progress persisted to localStorage

### Template System
Templates defined in `src/lib/templates.ts` (JS) and `scripts/generate_puzzle.py` (Python):
- `open-field`: No blocks (full 5x5)
- `stairstep`: Blocks at (0,0) and (4,4)
- `fingers`: Blocks at (0,4) and (4,0)
- `corner-cut`: Blocks at 3 corners
- `h-frame`: Blocks at middle-left/right

### Key Data Contract
Puzzle JSON at `public/daily.json` follows `DailyPuzzle` interface:
- `meta`: date (YYYY-MM-DD), author, difficulty, theme, templateId
- `dimensions`: fixed 5x5
- `grid`: cell data keyed by "row,col" with char and optional clueIndex
- `clues`: across/down objects mapping index to clue text

### Grid Navigation Logic
- Click active cell: toggle direction (across/down)
- Click other cell: move focus
- Typing: update cell, auto-advance skipping black squares
- Backspace: clear current or move back
- Arrows: 2D navigation

## Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check

# Puzzle Generator
pip install -r requirements.txt
python scripts/generate_puzzle.py                    # Random template
python scripts/generate_puzzle.py -t stairstep      # Specific template
python scripts/generate_puzzle.py --dry-run          # Preview only

# Test API Connection
python tests/test_api_connection.py
```

## Environment Variables

- `GEMINI_API_KEY`: Required for puzzle clue generation (stored in `.env` locally, GitHub Secrets for CI)

## GitHub Actions

`daily-puzzle.yml` runs at 8:00 UTC (2:00 AM CST) to generate and commit new puzzles.
