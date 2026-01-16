#!/usr/bin/env python3
"""
Mini Crossword Puzzle Generator

Uses Gemini AI to generate daily crossword puzzles with valid English words.
Output matches the schema_v1 format for the React frontend.
"""

import json
import os
import random
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Grid templates (mirrored from src/lib/templates.ts)
# '.' = playable cell, '#' = black square (block)
GRID_TEMPLATES = {
    "open-field": {
        "id": "open-field",
        "name": "The Open Field",
        "description": "Classic 5x5 grid with no blocks",
        "layout": [
            ".....",
            ".....",
            ".....",
            ".....",
            ".....",
        ],
    },
    "stairstep": {
        "id": "stairstep",
        "name": "The Stairstep",
        "description": "Diagonal blocks at opposite corners (0,0 and 4,4)",
        "layout": [
            "#....",
            ".....",
            ".....",
            ".....",
            "....#",
        ],
    },
    "fingers": {
        "id": "fingers",
        "name": "The Fingers",
        "description": "Anti-diagonal blocks at corners (0,4 and 4,0)",
        "layout": [
            "....#",
            ".....",
            ".....",
            ".....",
            "#....",
        ],
    },
    "corner-cut": {
        "id": "corner-cut",
        "name": "The Corner Cut",
        "description": "Three corners blocked, one open",
        "layout": [
            "#...#",
            ".....",
            ".....",
            ".....",
            "#....",
        ],
    },
    "h-frame": {
        "id": "h-frame",
        "name": "The H-Frame",
        "description": "Blocks at middle-left and middle-right edges",
        "layout": [
            ".....",
            ".....",
            "#...#",
            ".....",
            ".....",
        ],
    },
}

GRID_SIZE = 5


def get_template_visual(template_id: str) -> str:
    """Convert template to a visual representation for the prompt."""
    template = GRID_TEMPLATES[template_id]
    lines = []
    for row_idx, row in enumerate(template["layout"]):
        row_chars = []
        for col_idx, char in enumerate(row):
            if char == "#":
                row_chars.append("[BLACK]")
            else:
                row_chars.append(f"({row_idx},{col_idx})")
        lines.append(" ".join(row_chars))
    return "\n".join(lines)


def calculate_clue_numbers(template_id: str) -> dict:
    """
    Calculate which cells should have clue numbers.
    A cell gets a number if it starts an Across or Down word.
    Returns dict mapping (row, col) -> clue_number
    """
    template = GRID_TEMPLATES[template_id]
    layout = template["layout"]
    clue_numbers = {}
    current_number = 1

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if layout[row][col] == "#":
                continue

            starts_across = False
            starts_down = False

            # Check if starts an Across word (left edge or after black)
            if col == 0 or layout[row][col - 1] == "#":
                # Must have at least one more cell to the right
                if col < GRID_SIZE - 1 and layout[row][col + 1] != "#":
                    starts_across = True

            # Check if starts a Down word (top edge or after black)
            if row == 0 or layout[row - 1][col] == "#":
                # Must have at least one more cell below
                if row < GRID_SIZE - 1 and layout[row + 1][col] != "#":
                    starts_down = True

            if starts_across or starts_down:
                clue_numbers[(row, col)] = current_number
                current_number += 1

    return clue_numbers


def get_word_positions(template_id: str) -> tuple[list, list]:
    """
    Get the positions for Across and Down words.
    Returns (across_words, down_words) where each is a list of:
    (clue_number, [(row, col), ...])
    """
    template = GRID_TEMPLATES[template_id]
    layout = template["layout"]
    clue_numbers = calculate_clue_numbers(template_id)

    across_words = []
    down_words = []

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if layout[row][col] == "#":
                continue

            # Check for Across word start
            if col == 0 or layout[row][col - 1] == "#":
                if col < GRID_SIZE - 1 and layout[row][col + 1] != "#":
                    # This starts an Across word
                    positions = []
                    c = col
                    while c < GRID_SIZE and layout[row][c] != "#":
                        positions.append((row, c))
                        c += 1
                    if len(positions) > 1:
                        clue_num = clue_numbers.get((row, col))
                        if clue_num:
                            across_words.append((clue_num, positions))

            # Check for Down word start
            if row == 0 or layout[row - 1][col] == "#":
                if row < GRID_SIZE - 1 and layout[row + 1][col] != "#":
                    # This starts a Down word
                    positions = []
                    r = row
                    while r < GRID_SIZE and layout[r][col] != "#":
                        positions.append((r, col))
                        r += 1
                    if len(positions) > 1:
                        clue_num = clue_numbers.get((row, col))
                        if clue_num:
                            down_words.append((clue_num, positions))

    return across_words, down_words


def build_prompt(template_id: str) -> str:
    """Build the prompt for Gemini to generate a crossword puzzle."""
    template = GRID_TEMPLATES[template_id]
    across_words, down_words = get_word_positions(template_id)

    # Build word requirement descriptions with example words
    across_desc = []
    for clue_num, positions in across_words:
        length = len(positions)
        across_desc.append(f"  - {clue_num}-Across: {length}-letter word")

    down_desc = []
    for clue_num, positions in down_words:
        length = len(positions)
        down_desc.append(f"  - {clue_num}-Down: {length}-letter word")

    # Build example grid showing expected format
    example_cells = []
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if template["layout"][row][col] == "#":
                example_cells.append(f'    "{row},{col}": null')
            else:
                example_cells.append(f'    "{row},{col}": "X"')

    example_grid = ",\n".join(example_cells[:6]) + ",\n    ..."

    prompt = f"""You are an expert crossword puzzle creator. Generate a valid 5x5 mini crossword puzzle.

TEMPLATE: "{template['name']}" ({template_id})
Grid layout (# = black square, . = letter cell):
{chr(10).join(template['layout'])}

WORDS NEEDED:
Across: {', '.join([f'{num}-Across ({len(pos)} letters)' for num, pos in across_words])}
Down: {', '.join([f'{num}-Down ({len(pos)} letters)' for num, pos in down_words])}

STEP-BY-STEP PROCESS (Chain of Thought):

Step 1: Choose a fun theme (e.g., "Kitchen", "Sports", "Nature", "Music").

Step 2: Pick valid common English words for each ACROSS slot that fit the letter count.
   - All words must be real, common English words (no abbreviations, no proper nouns)

Step 3: CHECK THE DOWN COLUMNS - this is critical!
   - Look at the vertical columns formed by your across words
   - Each column must ALSO spell a valid English word
   - If a column doesn't form a real word, go back and change your across words

Step 4: Verify ALL intersections work - every across/down pair must share the same letter.

Step 5: Write clever, concise clues for each word.

Step 6: Output ONLY the final JSON (no explanation, no markdown).

OUTPUT FORMAT (raw JSON only):
{{
  "theme": "Your Theme",
  "difficulty": "easy",
  "grid": {{
{example_grid}
  }},
  "clues": {{
    "across": {{"1": "Clue for 1-Across", ...}},
    "down": {{"1": "Clue for 1-Down", ...}}
  }}
}}

CRITICAL: Each cell value is a SINGLE LETTER like "A", "B", "C". Black squares are null.

Generate the puzzle now (JSON only, no other text):"""

    return prompt


def parse_gemini_response(response_text: str, template_id: str) -> dict | None:
    """Parse Gemini's response into our schema format."""
    try:
        # Try to extract JSON from the response
        text = response_text.strip()

        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Find start and end of JSON
            start_idx = 1 if lines[0].startswith("```") else 0
            end_idx = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
            text = "\n".join(lines[start_idx:end_idx])
            if text.startswith("json"):
                text = text[4:].strip()

        data = json.loads(text)

        # Validate required fields
        if "grid" not in data or "clues" not in data:
            print("Missing required fields in response")
            return None

        return data

    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        print(f"Response was: {response_text[:500]}...")
        return None


def build_puzzle_json(gemini_data: dict, template_id: str) -> dict:
    """Build the final puzzle JSON matching schema_v1."""
    template = GRID_TEMPLATES[template_id]
    clue_numbers = calculate_clue_numbers(template_id)

    # Build the grid with proper structure
    grid = {}
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            key = f"{row},{col}"
            if template["layout"][row][col] == "#":
                grid[key] = {"char": None}
            else:
                char = gemini_data["grid"].get(key, "")
                if char is None or char == "null" or char == "":
                    char = "?"
                else:
                    # Extract only the first letter if multiple were provided
                    char = str(char).strip().upper()
                    if len(char) > 1:
                        char = char[0]
                    elif len(char) == 0:
                        char = "?"

                cell = {"char": char}

                # Add clue index if this cell starts a word
                if (row, col) in clue_numbers:
                    cell["clueIndex"] = clue_numbers[(row, col)]

                grid[key] = cell

    # Build the final puzzle
    puzzle = {
        "meta": {
            "date": date.today().isoformat(),
            "author": "AI Generated",
            "difficulty": gemini_data.get("difficulty", "medium"),
            "theme": gemini_data.get("theme", "Daily Puzzle"),
            "templateId": template_id,
        },
        "dimensions": {
            "rows": 5,
            "cols": 5,
        },
        "grid": grid,
        "clues": {
            "across": gemini_data.get("clues", {}).get("across", {}),
            "down": gemini_data.get("clues", {}).get("down", {}),
        },
    }

    return puzzle


def generate_puzzle(template_id: str | None = None, max_retries: int = 3) -> dict | None:
    """
    Generate a crossword puzzle using Gemini AI with retry logic.

    Args:
        template_id: Specific template to use, or None for random selection
        max_retries: Maximum number of attempts if JSON parsing fails

    Returns:
        Puzzle dictionary matching schema_v1, or None on failure
    """
    # Get API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment")
        return None

    # Select template
    if template_id is None:
        template_id = random.choice(list(GRID_TEMPLATES.keys()))
    elif template_id not in GRID_TEMPLATES:
        print(f"Error: Unknown template '{template_id}'")
        return None

    print(f"Using template: {template_id} ({GRID_TEMPLATES[template_id]['name']})")

    # Build prompt
    prompt = build_prompt(template_id)

    # Initialize Gemini client
    client = genai.Client(api_key=api_key)

    # Retry loop
    for attempt in range(1, max_retries + 1):
        print(f"Attempt {attempt}/{max_retries}...")

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
            )
            response_text = response.text
        except Exception as e:
            print(f"  Gemini API error: {e}")
            if attempt < max_retries:
                print("  Retrying...")
                continue
            return None

        # Parse response
        gemini_data = parse_gemini_response(response_text, template_id)
        if gemini_data:
            print(f"  Success! Valid JSON received.")
            break
        else:
            print(f"  Failed to parse JSON response.")
            if attempt < max_retries:
                print("  Retrying...")
            else:
                print(f"  Raw response: {response_text[:500]}...")
                return None
    else:
        # All retries exhausted
        return None

    # Build final puzzle JSON
    puzzle = build_puzzle_json(gemini_data, template_id)

    return puzzle


def save_puzzle(puzzle: dict, output_path: str | Path) -> bool:
    """Save puzzle to JSON file."""
    try:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(puzzle, f, indent=2)

        print(f"Puzzle saved to: {output_path}")
        return True
    except Exception as e:
        print(f"Failed to save puzzle: {e}")
        return False


def main():
    """Main entry point for puzzle generation."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate a mini crossword puzzle")
    parser.add_argument(
        "--template",
        "-t",
        choices=list(GRID_TEMPLATES.keys()),
        help="Specific template to use (default: random)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="public/daily.json",
        help="Output file path (default: public/daily.json)",
    )
    parser.add_argument(
        "--dry-run",
        "-n",
        action="store_true",
        help="Print puzzle to stdout instead of saving",
    )

    args = parser.parse_args()

    # Generate puzzle
    puzzle = generate_puzzle(args.template)

    if not puzzle:
        print("Failed to generate puzzle")
        return 1

    # Output
    if args.dry_run:
        print(json.dumps(puzzle, indent=2))
    else:
        # Resolve path relative to script location
        script_dir = Path(__file__).parent.parent
        output_path = script_dir / args.output
        if not save_puzzle(puzzle, output_path):
            return 1

    print(f"\nPuzzle generated successfully!")
    print(f"  Date: {puzzle['meta']['date']}")
    print(f"  Theme: {puzzle['meta']['theme']}")
    print(f"  Difficulty: {puzzle['meta']['difficulty']}")
    print(f"  Template: {puzzle['meta']['templateId']}")

    return 0


if __name__ == "__main__":
    exit(main())
