#!/usr/bin/env python3
"""
Mini Crossword Puzzle Generator - Hybrid Engine

Uses a two-stage approach:
1. Python Backtracking Solver fills the grid with valid English words
2. Gemini AI generates witty clues for the completed grid

This solves the constraint satisfaction problem that LLMs cannot handle.
"""

import json
import os
import random
import time
import urllib.request
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# =============================================================================
# Configuration
# =============================================================================

# Tiered word lists for quality + solvability
# Tier 1: Google's 10,000 most common English words (no swears)
# Tier 2: Full dictionary as fallback for letter combinations
COMMON_WORDS_URL = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt"
COMMON_WORDS_PATH = Path(__file__).parent / "google-10000-english.txt"
FULL_DICT_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
FULL_DICT_PATH = Path(__file__).parent / "words_alpha.txt"
GRID_SIZE = 5

# Grid templates (# = black square, . = letter cell)
# Weekly Pack: Each day has a template verified for crossword rules (min length 3, fully connected)
GRID_TEMPLATES = {
    # MONDAY: 8 blocks. Very easy. Two 3x3 areas connected by the center.
    "monday": {
        "id": "monday",
        "name": "Monday",
        "description": "Very easy. Two 3x3 areas connected by the center (8 blocks)",
        "layout": [
            "...##",
            "...##",
            ".....",
            "##...",
            "##...",
        ],
    },
    # TUESDAY: 4 blocks. Easy. Standard corners.
    "tuesday": {
        "id": "tuesday",
        "name": "Tuesday",
        "description": "Easy. Standard corners (4 blocks)",
        "layout": [
            "#...#",
            ".....",
            ".....",
            ".....",
            "#...#",
        ],
    },
    # WEDNESDAY: 2 blocks. Moderate. The 'Stairstep'.
    "wednesday": {
        "id": "wednesday",
        "name": "Wednesday",
        "description": "Moderate. The Stairstep (2 blocks)",
        "layout": [
            "#....",
            ".....",
            ".....",
            ".....",
            "....#",
        ],
    },
    # THURSDAY: 3 blocks. Asymmetric twist.
    "thursday": {
        "id": "thursday",
        "name": "Thursday",
        "description": "Asymmetric twist (3 blocks)",
        "layout": [
            "#....",
            ".....",
            ".....",
            ".....",
            "#...#",
        ],
    },
    # FRIDAY: 2 blocks. Hard. The 'Fingers'.
    "friday": {
        "id": "friday",
        "name": "Friday",
        "description": "Hard. The Fingers (2 blocks)",
        "layout": [
            "....#",
            ".....",
            ".....",
            ".....",
            "#....",
        ],
    },
    # SATURDAY: 0 blocks. Expert. The Open Field.
    "saturday": {
        "id": "saturday",
        "name": "Saturday",
        "description": "Expert. The Open Field (0 blocks)",
        "layout": [
            ".....",
            ".....",
            ".....",
            ".....",
            ".....",
        ],
    },
    # SUNDAY: 4 blocks. The 'H-Frame'.
    "sunday": {
        "id": "sunday",
        "name": "Sunday",
        "description": "The H-Frame (4 blocks)",
        "layout": [
            "#...#",
            ".....",
            "#...#",
            ".....",
            "#...#",
        ],
    },
}


# =============================================================================
# Data Structures
# =============================================================================


@dataclass
class Slot:
    """Represents a word slot in the crossword grid."""
    index: int           # Clue number
    direction: str       # 'across' or 'down'
    positions: list      # List of (row, col) tuples
    length: int          # Word length
    intersections: list  # List of (slot_index, my_pos, their_pos) tuples

    def __repr__(self):
        return f"Slot({self.index}-{self.direction}, len={self.length})"


# =============================================================================
# Dictionary Management
# =============================================================================


def download_file(url: str, path: Path) -> bool:
    """Download a file if not present locally."""
    if path.exists():
        return True
    print(f"  Downloading {path.name}...")
    try:
        urllib.request.urlretrieve(url, path)
        print(f"    Downloaded ({path.stat().st_size / 1024:.1f} KB)")
        return True
    except Exception as e:
        print(f"    Failed: {e}")
        return False


def load_word_lists() -> tuple[set[str], set[str]]:
    """
    Load both common words and full dictionary.
    Returns: (common_words, full_dictionary)
    """
    # Download files if needed
    download_file(COMMON_WORDS_URL, COMMON_WORDS_PATH)
    download_file(FULL_DICT_URL, FULL_DICT_PATH)

    # Load common words (high quality)
    common_words = set()
    if COMMON_WORDS_PATH.exists():
        with open(COMMON_WORDS_PATH, "r", encoding="utf-8") as f:
            common_words = {line.strip().lower() for line in f if line.strip()}
        print(f"  Common words loaded: {len(common_words):,}")

    # Load full dictionary (fallback)
    full_dict = set()
    if FULL_DICT_PATH.exists():
        with open(FULL_DICT_PATH, "r", encoding="utf-8") as f:
            full_dict = {line.strip().lower() for line in f if line.strip()}
        print(f"  Full dictionary loaded: {len(full_dict):,}")

    return common_words, full_dict


def organize_by_length(word_set: set[str], min_len: int = 3, max_len: int = 5) -> dict[int, list[str]]:
    """
    Organize dictionary words by length for efficient lookup.
    """
    by_length = {i: [] for i in range(min_len, max_len + 1)}

    for word in word_set:
        if min_len <= len(word) <= max_len:
            by_length[len(word)].append(word.upper())

    # Shuffle for variety in puzzle generation
    for length in by_length:
        random.shuffle(by_length[length])

    return by_length


def create_tiered_word_list(
    common_words: set[str],
    full_dict: set[str],
    tier: int = 1,
    min_len: int = 3,
    max_len: int = 5
) -> dict[int, list[str]]:
    """
    Create word list based on tier level:
    - Tier 1: Common words only (highest quality)
    - Tier 2: Common words + 5K supplemental words per length
    - Tier 3: Common words + 15K supplemental words per length
    - Tier 4: Full dictionary (maximum solvability)
    """
    if tier == 1:
        words = organize_by_length(common_words, min_len, max_len)
        tier_name = "Common only"
    elif tier == 4:
        words = organize_by_length(full_dict, min_len, max_len)
        tier_name = "Full dictionary"
    else:
        # Tiered: common words + sample from remaining dictionary
        supplement_per_length = 5000 if tier == 2 else 15000
        combined = set()

        # Start with all common words
        for word in common_words:
            if min_len <= len(word) <= max_len:
                combined.add(word)

        # Add supplemental words from full dictionary (not in common)
        remaining = full_dict - common_words
        remaining_by_length = organize_by_length(remaining, min_len, max_len)

        for length in range(min_len, max_len + 1):
            sample_size = min(supplement_per_length, len(remaining_by_length[length]))
            sample = remaining_by_length[length][:sample_size]
            combined.update(w.lower() for w in sample)

        words = organize_by_length(combined, min_len, max_len)
        tier_name = f"Common + {supplement_per_length:,}/length"

    print(f"  Tier {tier} ({tier_name}): {', '.join(f'{k}L={len(v):,}' for k, v in sorted(words.items()))}")
    return words


def build_letter_index(words_by_length: dict[int, list[str]]) -> dict:
    """
    Build an index for fast pattern matching.
    Returns: index[length][position][letter] = set of words
    """
    index = {}
    for length, words in words_by_length.items():
        index[length] = {}
        for pos in range(length):
            index[length][pos] = {}
            for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                index[length][pos][letter] = set()

        for word in words:
            for pos, letter in enumerate(word):
                index[length][pos][letter].add(word)

    return index


# =============================================================================
# Slot Extraction
# =============================================================================


def extract_slots(template_id: str) -> list[Slot]:
    """
    Extract all word slots from a template.
    Returns list of Slot objects with positions and metadata.
    """
    template = GRID_TEMPLATES[template_id]
    layout = template["layout"]
    slots = []
    clue_number = 1
    cell_to_clue = {}  # Maps (row, col) to clue number if it starts a word

    # First pass: identify which cells get clue numbers
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if layout[row][col] == "#":
                continue

            starts_across = False
            starts_down = False

            # Check if starts an Across word
            if (col == 0 or layout[row][col - 1] == "#"):
                if col < GRID_SIZE - 1 and layout[row][col + 1] != "#":
                    starts_across = True

            # Check if starts a Down word
            if (row == 0 or layout[row - 1][col] == "#"):
                if row < GRID_SIZE - 1 and layout[row + 1][col] != "#":
                    starts_down = True

            if starts_across or starts_down:
                cell_to_clue[(row, col)] = clue_number
                clue_number += 1

    # Second pass: extract slot details
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if layout[row][col] == "#":
                continue

            # Check for Across slot start
            if (col == 0 or layout[row][col - 1] == "#"):
                positions = []
                c = col
                while c < GRID_SIZE and layout[row][c] != "#":
                    positions.append((row, c))
                    c += 1
                if len(positions) >= 2:
                    slot = Slot(
                        index=cell_to_clue.get((row, col), 0),
                        direction="across",
                        positions=positions,
                        length=len(positions),
                        intersections=[]
                    )
                    slots.append(slot)

            # Check for Down slot start
            if (row == 0 or layout[row - 1][col] == "#"):
                positions = []
                r = row
                while r < GRID_SIZE and layout[r][col] != "#":
                    positions.append((r, col))
                    r += 1
                if len(positions) >= 2:
                    slot = Slot(
                        index=cell_to_clue.get((row, col), 0),
                        direction="down",
                        positions=positions,
                        length=len(positions),
                        intersections=[]
                    )
                    slots.append(slot)

    # Third pass: compute intersections between slots
    for i, slot_a in enumerate(slots):
        pos_set_a = set(slot_a.positions)
        for j, slot_b in enumerate(slots):
            if i >= j or slot_a.direction == slot_b.direction:
                continue
            # Find intersecting cell
            common = pos_set_a & set(slot_b.positions)
            if common:
                cell = common.pop()
                pos_a = slot_a.positions.index(cell)
                pos_b = slot_b.positions.index(cell)
                slot_a.intersections.append((j, pos_a, pos_b))
                slot_b.intersections.append((i, pos_b, pos_a))

    return slots


def sort_slots_by_difficulty(slots: list[Slot]) -> list[Slot]:
    """
    Sort slots for optimal solving order.
    Strategy: Fill shorter slots first (more candidate options in common word list),
    then by fewer intersections (less constrained).
    """
    return sorted(slots, key=lambda s: (s.length, len(s.intersections)))


# =============================================================================
# Backtracking Solver (The Architect)
# =============================================================================


class CrosswordSolver:
    """
    Backtracking solver for crossword grid filling.
    Uses constraint propagation and MRV heuristic.
    """

    # Solver configuration (tuned for Google 10K common words)
    MAX_CANDIDATES = 5000     # Smaller word list = fewer candidates
    MAX_ATTEMPTS = 100000     # Give up after this many attempts
    TIMEOUT_SECONDS = 30      # Per-attempt timeout

    def __init__(self, template_id: str, words_by_length: dict[int, list[str]], letter_index: dict):
        self.template_id = template_id
        self.template = GRID_TEMPLATES[template_id]
        self.layout = self.template["layout"]
        self.words_by_length = words_by_length
        self.letter_index = letter_index  # For fast pattern matching
        self.slots = extract_slots(template_id)
        self.slots = sort_slots_by_difficulty(self.slots)

        # Grid state: None = unfilled, letter = filled
        self.grid = [[None for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]

        # Mark black squares
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if self.layout[row][col] == "#":
                    self.grid[row][col] = "#"

        # Track used words to avoid duplicates
        self.used_words = set()

        # Stats and limits
        self.attempts = 0
        self.backtracks = 0
        self.start_time = None

    def get_current_pattern(self, slot: Slot) -> str:
        """Get the current letter pattern for a slot (e.g., 'S_E__')."""
        pattern = []
        for row, col in slot.positions:
            cell = self.grid[row][col]
            pattern.append(cell if cell and cell != "#" else "_")
        return "".join(pattern)

    def get_candidates(self, slot: Slot) -> list[str]:
        """Get candidate words that match the current pattern using fast index."""
        matching = self.get_matching_words_fast(slot)

        # Convert to list, shuffle for variety, and limit size
        candidates = list(matching)
        random.shuffle(candidates)  # Critical: randomize search order
        if len(candidates) > self.MAX_CANDIDATES:
            candidates = candidates[:self.MAX_CANDIDATES]

        return candidates

    def place_word(self, slot: Slot, word: str):
        """Place a word in the grid."""
        for i, (row, col) in enumerate(slot.positions):
            self.grid[row][col] = word[i]
        self.used_words.add(word)

    def remove_word(self, slot: Slot, word: str):
        """Remove a word from the grid (backtrack)."""
        # Clear cells, but preserve letters at intersections with earlier slots
        for i, (row, col) in enumerate(slot.positions):
            # Check if this cell is an intersection with an earlier (already filled) slot
            is_shared = False
            for other_slot_idx, my_pos, their_pos in slot.intersections:
                if other_slot_idx < self.slots.index(slot):
                    # This intersection is with an earlier slot - preserve the letter
                    if my_pos == i:
                        is_shared = True
                        break

            if not is_shared:
                self.grid[row][col] = None

        self.used_words.discard(word)

    def is_timed_out(self) -> bool:
        """Check if we've exceeded the time limit."""
        return time.time() - self.start_time > self.TIMEOUT_SECONDS

    def get_matching_words_fast(self, slot: Slot) -> set[str]:
        """
        Use letter index for fast pattern matching.
        Returns set of words matching the current pattern.
        """
        pattern = self.get_current_pattern(slot)
        length = slot.length

        if length not in self.letter_index:
            return set()

        # Start with all words of this length
        result = None

        for pos, char in enumerate(pattern):
            if char != "_":
                # Intersect with words having this letter at this position
                matching = self.letter_index[length][pos].get(char, set())
                if result is None:
                    result = matching.copy()
                else:
                    result &= matching

                # Early exit if no matches
                if not result:
                    return set()

        # If no constraints, return all words of this length
        if result is None:
            result = set(self.words_by_length.get(length, []))

        # Remove used words
        return result - self.used_words

    def has_any_candidate(self, slot: Slot) -> bool:
        """Quick check if a slot has at least one valid candidate."""
        if self.is_timed_out():
            return False
        matching = self.get_matching_words_fast(slot)
        return len(matching) > 0

    def forward_check(self, current_slot: Slot) -> bool:
        """
        Check if intersecting slots still have at least one valid candidate.
        Only checks slots that share letters with the one we just filled.
        """
        for other_slot_idx, _, _ in current_slot.intersections:
            other_slot = self.slots[other_slot_idx]
            # Only check if not fully filled
            pattern = self.get_current_pattern(other_slot)
            if "_" in pattern:
                if not self.has_any_candidate(other_slot):
                    return False
        return True

    def solve(self, slot_index: int = 0) -> bool:
        """
        Recursively solve the crossword using backtracking with forward checking.
        Returns True if a solution is found.
        """
        self.attempts += 1

        # Check limits
        if self.attempts > self.MAX_ATTEMPTS:
            return False
        if time.time() - self.start_time > self.TIMEOUT_SECONDS:
            return False

        # Base case: all slots filled
        if slot_index >= len(self.slots):
            return True

        slot = self.slots[slot_index]
        candidates = self.get_candidates(slot)

        # Try each candidate word
        for word in candidates:
            self.place_word(slot, word)

            # Forward checking: prune if intersecting slots have no valid candidates
            if self.forward_check(slot):
                if self.solve(slot_index + 1):
                    return True

            # Backtrack
            self.remove_word(slot, word)
            self.backtracks += 1

        return False

    def get_solution(self) -> list[list[str]] | None:
        """
        Run the solver and return the completed grid.
        Returns None if no solution found.
        """
        print(f"\n[Solver] Starting backtracking solver...")
        print(f"  Template: {self.template_id}")
        print(f"  Slots: {len(self.slots)} ({sum(1 for s in self.slots if s.direction == 'across')} across, {sum(1 for s in self.slots if s.direction == 'down')} down)")
        print(f"  Limits: {self.MAX_ATTEMPTS:,} attempts, {self.TIMEOUT_SECONDS}s timeout")

        self.start_time = time.time()
        success = self.solve()
        elapsed = time.time() - self.start_time

        if success:
            print(f"  [OK] Solution found!")
            print(f"  Attempts: {self.attempts:,}, Backtracks: {self.backtracks:,}")
            print(f"  Time: {elapsed:.2f}s")
            return self.grid
        else:
            reason = "timeout" if elapsed >= self.TIMEOUT_SECONDS else "max attempts" if self.attempts >= self.MAX_ATTEMPTS else "exhausted"
            print(f"  [X] No solution found ({reason})")
            print(f"  Attempts: {self.attempts:,}, Backtracks: {self.backtracks:,}, Time: {elapsed:.2f}s")
            return None

    def get_words(self) -> dict[str, dict[int, str]]:
        """Extract the placed words organized by direction and clue number."""
        words = {"across": {}, "down": {}}

        for slot in self.slots:
            word = "".join(self.grid[r][c] for r, c in slot.positions)
            words[slot.direction][slot.index] = word

        return words

    def print_grid(self):
        """Print the current grid state."""
        print("\n  Grid:")
        for row in self.grid:
            line = "  "
            for cell in row:
                if cell == "#":
                    line += "# "
                elif cell:
                    line += f"{cell} "
                else:
                    line += ". "
            print(line)


# =============================================================================
# Gemini Clue Generator (The Poet)
# =============================================================================


def generate_clues(words: dict[str, dict[int, str]], theme_hint: str = None) -> dict | None:
    """
    Use Gemini to generate witty crossword clues for the given words.

    Args:
        words: Dict with 'across' and 'down' keys, each containing {clue_num: word}
        theme_hint: Optional theme suggestion

    Returns:
        Dict with 'across' and 'down' clues, plus theme and difficulty
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found")
        return None

    # Build word list for prompt
    across_list = [f"  {num}-Across: {word}" for num, word in sorted(words["across"].items())]
    down_list = [f"  {num}-Down: {word}" for num, word in sorted(words["down"].items())]

    theme_instruction = ""
    if theme_hint:
        theme_instruction = f"\nSuggested theme: {theme_hint}"

    prompt = f"""You are an expert crossword puzzle clue writer. Write clever, concise clues for these words.

WORDS TO CLUE:
Across:
{chr(10).join(across_list)}

Down:
{chr(10).join(down_list)}
{theme_instruction}

GUIDELINES:
- Clues should be 3-10 words each
- Mix of straightforward definitions and wordplay
- Avoid using the answer word in the clue
- Keep difficulty appropriate for a "mini" puzzle (accessible but clever)
- Choose a fun, cohesive theme based on the words

OUTPUT FORMAT (JSON only, no markdown):
{{
  "theme": "Your Theme Name",
  "difficulty": "easy",
  "clues": {{
    "across": {{"1": "Clue for 1-Across", "5": "Clue for 5-Across", ...}},
    "down": {{"1": "Clue for 1-Down", "2": "Clue for 2-Down", ...}}
  }}
}}

Generate clues now (JSON only):"""

    print("\n[Clue Generator] Calling Gemini API...")

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
        )
        response_text = response.text.strip()

        # Parse JSON response
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            start = 1 if lines[0].startswith("```") else 0
            end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
            response_text = "\n".join(lines[start:end])
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()

        data = json.loads(response_text)
        print("  [OK] Clues generated successfully")
        return data

    except json.JSONDecodeError as e:
        print(f"  [X] Failed to parse JSON: {e}")
        print(f"  Response: {response_text[:300]}...")
        return None
    except Exception as e:
        print(f"  [X] Gemini API error: {e}")
        return None


# =============================================================================
# Puzzle Assembly
# =============================================================================


def build_puzzle_json(grid: list[list[str]], clue_data: dict, template_id: str) -> dict:
    """
    Build the final puzzle JSON matching schema_v1.
    """
    template = GRID_TEMPLATES[template_id]
    slots = extract_slots(template_id)

    # Build clue index map
    clue_indices = {}
    for slot in slots:
        start_pos = slot.positions[0]
        if start_pos not in clue_indices:
            clue_indices[start_pos] = slot.index

    # Build grid structure
    grid_data = {}
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            key = f"{row},{col}"
            cell_value = grid[row][col]

            if cell_value == "#":
                grid_data[key] = {"char": None}
            else:
                cell = {"char": cell_value}
                if (row, col) in clue_indices:
                    cell["clueIndex"] = clue_indices[(row, col)]
                grid_data[key] = cell

    puzzle = {
        "meta": {
            "date": date.today().isoformat(),
            "author": "AI Generated",
            "difficulty": clue_data.get("difficulty", "easy"),
            "theme": clue_data.get("theme", "Daily Puzzle"),
            "templateId": template_id,
        },
        "dimensions": {
            "rows": GRID_SIZE,
            "cols": GRID_SIZE,
        },
        "grid": grid_data,
        "clues": clue_data.get("clues", {"across": {}, "down": {}}),
    }

    return puzzle


def save_puzzle(puzzle: dict, output_path: str | Path) -> bool:
    """Save puzzle to JSON file."""
    try:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(puzzle, f, indent=2)

        print(f"\nPuzzle saved to: {output_path}")
        return True
    except Exception as e:
        print(f"Failed to save puzzle: {e}")
        return False


# =============================================================================
# Main Pipeline
# =============================================================================


def generate_puzzle(template_id: str | None = None, max_solver_retries: int = 10) -> dict | None:
    """
    Generate a crossword puzzle using the Hybrid Engine.

    Stage 1: Python backtracking solver fills the grid (tiered word lists)
    Stage 2: Gemini generates clues for the completed words
    """
    print("\n" + "=" * 60)
    print("HYBRID ENGINE - Crossword Generator")
    print("=" * 60)

    # Load word lists
    print("\n[Stage 0] Loading Word Lists...")
    common_words, full_dict = load_word_lists()

    # Select template
    if template_id is None:
        template_id = random.choice(list(GRID_TEMPLATES.keys()))
    elif template_id not in GRID_TEMPLATES:
        print(f"Error: Unknown template '{template_id}'")
        print(f"Available: {', '.join(GRID_TEMPLATES.keys())}")
        return None

    print(f"\n[Stage 1] THE ARCHITECT - Grid Solver")
    print("-" * 40)
    print(f"Template: {template_id} ({GRID_TEMPLATES[template_id]['name']})")

    # Tiered solving: try common words first, escalate if needed
    tier_attempts = {1: 3, 2: 3, 3: 3, 4: 5}  # attempts per tier
    grid = None
    solver = None
    final_tier = 1

    for tier in [1, 2, 3, 4]:
        attempts_for_tier = tier_attempts[tier]
        print(f"\n  [Tier {tier}] Attempting with word list...")

        words_by_length = create_tiered_word_list(common_words, full_dict, tier)
        letter_index = build_letter_index(words_by_length)

        for attempt in range(1, attempts_for_tier + 1):
            print(f"\n    Attempt {attempt}/{attempts_for_tier}...")

            solver = CrosswordSolver(template_id, words_by_length, letter_index)
            grid = solver.get_solution()

            if grid:
                final_tier = tier
                break

        if grid:
            break
        print(f"  [Tier {tier}] No solution found, escalating...")

    if not grid:
        print("\n[X] Failed to generate valid grid after all attempts")
        return None

    solver.print_grid()
    words = solver.get_words()

    tier_names = {1: "Common words", 2: "Common+5K", 3: "Common+15K", 4: "Full dictionary"}
    print(f"\n  Solution found using: Tier {final_tier} ({tier_names[final_tier]})")
    print(f"\n  Words found:")
    print(f"    Across: {', '.join(f'{k}={v}' for k, v in sorted(words['across'].items()))}")
    print(f"    Down: {', '.join(f'{k}={v}' for k, v in sorted(words['down'].items()))}")

    # Generate clues
    print(f"\n[Stage 2] THE POET - Clue Generator")
    print("-" * 40)

    clue_data = generate_clues(words)

    if not clue_data:
        print("\n[X] Failed to generate clues, using placeholder clues")
        clue_data = {
            "theme": "Daily Puzzle",
            "difficulty": "easy",
            "clues": {
                "across": {str(k): f"Clue for {v}" for k, v in words["across"].items()},
                "down": {str(k): f"Clue for {v}" for k, v in words["down"].items()},
            }
        }

    # Build final puzzle
    print(f"\n[Stage 3] Assembly")
    print("-" * 40)
    puzzle = build_puzzle_json(grid, clue_data, template_id)

    # Add word quality tier to metadata
    puzzle["meta"]["wordTier"] = final_tier

    print("\n" + "=" * 60)
    print("SUCCESS! Puzzle generated")
    print("=" * 60)
    print(f"  Theme: {puzzle['meta']['theme']}")
    print(f"  Difficulty: {puzzle['meta']['difficulty']}")
    print(f"  Template: {template_id}")
    print(f"  Word Quality: Tier {final_tier} ({tier_names[final_tier]})")

    return puzzle


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate a mini crossword puzzle (Hybrid Engine)")
    parser.add_argument(
        "--template", "-t",
        choices=list(GRID_TEMPLATES.keys()),
        help="Specific template to use (default: random)",
    )
    parser.add_argument(
        "--output", "-o",
        default="public/daily.json",
        help="Output file path (default: public/daily.json)",
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Print puzzle to stdout instead of saving",
    )

    args = parser.parse_args()

    puzzle = generate_puzzle(args.template)

    if not puzzle:
        print("\nFailed to generate puzzle")
        return 1

    if args.dry_run:
        print("\n" + "-" * 40)
        print("DRY RUN - Puzzle JSON:")
        print("-" * 40)
        print(json.dumps(puzzle, indent=2))
    else:
        script_dir = Path(__file__).parent.parent
        output_path = script_dir / args.output
        if not save_puzzle(puzzle, output_path):
            return 1

    return 0


if __name__ == "__main__":
    exit(main())
