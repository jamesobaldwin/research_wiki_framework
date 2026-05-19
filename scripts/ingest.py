#!/usr/bin/env python3
"""
LLM Wiki paper ingest script.

Processes Zotero-imported papers and Chrome-clipped articles using the Anthropic API
with two-block prompt caching:
  Block 1 (cached, ephemeral): workflow prefix — all schema/workflow documentation.
  Block 2 (cached, ephemeral): the PDF as a native document content block, or the
                                clipping markdown as a text block.
  Block 3 (uncached):          per-paper instruction with current note state and
                                wiki context (existing index, concept list).

A single API call per paper produces the full note body plus structured JSON metadata
for all downstream file updates. The script then writes everything to disk without
further API calls.

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python scripts/ingest.py --citekey song2021scoresbe
  python scripts/ingest.py --queued
  python scripts/ingest.py --clipping "some-article.md"
  python scripts/ingest.py --citekey song2021scoresbe --dry-run

API key resolution order:
  1. ANTHROPIC_API_KEY environment variable
  2. ~/.anthropic/api_key (plain text file, whitespace stripped)

Requirements: anthropic>=0.40.0, python-frontmatter>=1.0.0, pyyaml>=6.0
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

try:
    import anthropic
except ImportError:
    sys.exit("anthropic package not found. Run: pip install -r scripts/requirements.txt")

try:
    import frontmatter as fm
except ImportError:
    sys.exit("python-frontmatter not found. Run: pip install -r scripts/requirements.txt")

try:
    import yaml
except ImportError:
    sys.exit("pyyaml not found. Run: pip install -r scripts/requirements.txt")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MODEL = "claude-sonnet-4-6"
MAX_OUTPUT_TOKENS = 16384

# Per-token USD pricing. Update if Anthropic changes rates.
MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-6": {
        "input": 3.00 / 1_000_000,
        "output": 15.00 / 1_000_000,
        "cache_write": 3.75 / 1_000_000,
        "cache_read": 0.30 / 1_000_000,
    },
    "claude-haiku-4-5-20251001": {
        "input": 0.80 / 1_000_000,
        "output": 4.00 / 1_000_000,
        "cache_write": 1.00 / 1_000_000,
        "cache_read": 0.08 / 1_000_000,
    },
    "claude-opus-4-7": {
        "input": 15.00 / 1_000_000,
        "output": 75.00 / 1_000_000,
        "cache_write": 18.75 / 1_000_000,
        "cache_read": 1.50 / 1_000_000,
    },
}

# Files concatenated into Block 1 (cached workflow prefix) for paper ingest
PAPER_PREFIX_FILES = [
    "CLAUDE.md",
    "wiki-meta/workflows/paper-ingest.md",
    "wiki-meta/schemas/literature-notes.md",
    "wiki-meta/schemas/wiki-pages.md",
    "wiki-meta/style/linking.md",
    "wiki-meta/rules.md",
]

# Files concatenated into Block 1 for clipping ingest
CLIPPING_PREFIX_FILES = [
    "CLAUDE.md",
    "wiki-meta/workflows/clipping-ingest.md",
    "wiki-meta/schemas/literature-notes.md",
    "wiki-meta/schemas/wiki-pages.md",
    "wiki-meta/style/linking.md",
    "wiki-meta/rules.md",
]

# Files concatenated into Block 1 for reference-note ingest
REFERENCE_PREFIX_FILES = [
    "CLAUDE.md",
    "wiki-meta/schemas/reference-notes.md",
    "wiki-meta/schemas/wiki-pages.md",
    "wiki-meta/style/linking.md",
    "wiki-meta/rules.md",
]

# Beta features for all API calls (sync and batch). PDF support + extended output (64K tokens).
BATCH_BETAS: list[str] = ["pdfs-2024-09-25", "output-128k-2025-02-19"]

# Batch API discount: 50% off all token costs (input, output, cache write, cache read).
BATCH_DISCOUNT = 0.5


# ---------------------------------------------------------------------------
# Output format prompt (injected into Block 3)
# ---------------------------------------------------------------------------

OUTPUT_FORMAT = """\
REQUIRED OUTPUT FORMAT — respond with EXACTLY these two XML sections and nothing else:

<note-body>
Complete note content. Start with the title heading "# {title}".
Sections in order:
  ## Abstract       (for Zotero papers: verbatim abstract text with wiki-links added, NO other changes)
  ## Summary
  ## Key claims
  ## Methods / technical details
  ## Results
  ## Caveats / limitations
  ## Connections to my work
  ## Related pages
Do NOT include the "## PDF++ highlights and notes" section.
Do NOT include YAML frontmatter.
</note-body>

<structured-output>
A single JSON object (no Markdown fences, no trailing commas):
{{
  "relevance": "high|medium|low",
  "topics": ["tag1", "tag2"],
  "literaturenotes_description": "One sentence for the LITERATURENOTES.md row.",
  "literaturenotes_concepts": ["concept-slug-1", "concept-slug-2"],
  "new_pages": [
    {{
      "path": "Glossary/term-name.md",
      "content": "---\\ntype: glossary\\ntopics: []\\ntags:\\n  - glossary\\nlast_updated: {today}\\n---\\n\\n# Term\\n\\n..."
    }}
  ],
  "index_entries": [
    {{
      "section": "Glossary > ML / generative models",
      "entry": "- [[slug]] — one-line description"
    }}
  ],
  "concepts_rows": [
    "| [[slug\\\\|Display Name]] | One-sentence description. | [[citekey\\\\|Author Year]] |"
  ],
  "datasets_rows": [
    "| [[slug\\\\|Dataset Name]] | One-sentence description. | [[citekey\\\\|Author Year]] |"
  ]
}}
Use [] for any empty arrays. Escape backslash-pipe in wiki-links as \\\\| inside JSON strings.
</structured-output>"""


# Output format for reference notes (narrower: no analytical sections)
REFERENCE_OUTPUT_FORMAT = """\
REQUIRED OUTPUT FORMAT — respond with EXACTLY these two XML sections and nothing else:

<note-body>
Complete note content. Start with the title heading "# {title}".
Sections in order:
  ## Abstract        (verbatim abstract text with wiki-links added, NO other changes)
  ## Datasets / simulations   (bullet per dataset/suite; link each to [[Datasets/slug|Name]]; be aggressive — include every dataset/suite introduced or significantly described)
  ## Methods or techniques introduced  (bullet per method; ONLY if central to this paper AND likely to be referenced elsewhere in the wiki; write "None." if none qualify)
  ## Cited by my work   (write exactly "None yet." — populated by later runs)
Do NOT include Summary, Key claims, Methods / technical details, Results,
Caveats / limitations, Connections to my work, or Related pages sections.
Do NOT include the "## PDF++ highlights and notes" section.
Do NOT include YAML frontmatter.
</note-body>

<structured-output>
A single JSON object (no Markdown fences, no trailing commas):
{{
  "topics": ["tag1", "tag2"],
  "referencenotes_datasets": ["dataset-slug-1", "dataset-slug-2"],
  "new_pages": [
    {{
      "path": "Datasets/dataset-name.md",
      "content": "---\\ntags:\\n  - dataset\\ntopics: []\\nlast_updated: {today}\\n---\\n\\n# Dataset Name\\n\\n**Summary**: One-sentence description.\\n\\n## Access\\n..."
    }}
  ],
  "index_entries": [
    {{
      "section": "Datasets and simulations",
      "entry": "- [[slug]] — one-line description"
    }}
  ],
  "datasets_rows": [
    "| [[slug\\\\|Dataset Name]] | One-sentence description. | [[{citekey}\\\\|Author {year}]] |"
  ],
  "concepts_rows": []
}}
Use [] for any empty arrays. Escape backslash-pipe in wiki-links as \\\\| inside JSON strings.
concepts_rows: include ONLY techniques that are central to this paper's contribution
AND likely to be referenced throughout the wiki. When uncertain, use [].
</structured-output>"""


# ---------------------------------------------------------------------------
# File loading utilities
# ---------------------------------------------------------------------------

def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_workflow_prefix(vault_root: Path, source_type: str = "zotero") -> str:
    """Concatenate workflow prefix files into a single cached-block string.
    source_type: 'zotero', 'clipping', or 'reference'."""
    if source_type == "clipping":
        files = CLIPPING_PREFIX_FILES
    elif source_type == "reference":
        files = REFERENCE_PREFIX_FILES
    else:
        files = PAPER_PREFIX_FILES
    parts = []
    for fname in files:
        p = vault_root / fname
        if not p.exists():
            print(f"  Warning: workflow file missing: {fname}", file=sys.stderr)
            continue
        parts.append(f"# === {fname} ===\n\n{p.read_text(encoding='utf-8')}")
    return "\n\n---\n\n".join(parts)


def load_wiki_context(vault_root: Path) -> str:
    """Load index.md, CONCEPTS.md, and Glossary slug list for wiki-link guidance."""
    parts = []
    for fname, header in [
        ("index.md", "WIKI INDEX (index.md)"),
        ("CONCEPTS.md", "CONCEPT PAGES (CONCEPTS.md)"),
    ]:
        text = load_text(vault_root / fname)
        if text:
            parts.append(f"## {header}\n\n{text}")

    glossary_dir = vault_root / "Glossary"
    if glossary_dir.exists():
        slugs = sorted(p.stem for p in glossary_dir.glob("*.md"))
        if slugs:
            parts.append("## EXISTING GLOSSARY SLUGS\n\n" + "\n".join(slugs))

    return "\n\n".join(parts)


def load_pdf_b64(pdf_path: Path) -> str:
    return base64.standard_b64encode(pdf_path.read_bytes()).decode("ascii")


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def build_paper_user_text(
    note_post: fm.Post, citekey: str, wiki_context: str, deep: bool
) -> str:
    meta = dict(note_post.metadata)
    fm_yaml = yaml.dump(meta, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    title = str(meta.get("title", citekey))
    today = date.today().isoformat()
    output_fmt = OUTPUT_FORMAT.format(title=title, today=today)

    return f"""\
You are processing a Zotero-imported literature note for the LLM Wiki.
The wiki schemas, workflow steps, linking rules, and hard constraints are in your system prompt.

CURRENT NOTE — citekey: {citekey}

Existing frontmatter (source-supplied fields are IMMUTABLE; do not include them in output):
```yaml
{fm_yaml}
```

Reading.md card will be set to: {"TBDR" if deep else "TBR"}

EXISTING WIKI CONTEXT (for accurate wiki-links — do not create pages that already exist):
{wiki_context}

TASK:
1. Read the attached PDF.
2. Fill all five analytical sections per the paper-ingest workflow.
3. Add dense wiki-links throughout, including the abstract (links only, no text changes).
4. Create Concept/Glossary/Dataset/Question pages directly in new_pages when warranted.
   Default to Glossary unless analytical depth clearly warrants Concept tier.
5. Do not propose pages — create them.

{output_fmt}"""


def build_clipping_user_text(
    slug: str, new_meta: dict, wiki_context: str, deep: bool
) -> str:
    fm_yaml = yaml.dump(new_meta, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    title = str(new_meta.get("title", slug))
    today = date.today().isoformat()

    # Clippings don't have an Abstract section
    output_fmt = OUTPUT_FORMAT.format(title=title, today=today).replace(
        "  ## Abstract       (for Zotero papers: verbatim abstract text with wiki-links added, NO other changes)\n",
        "",
    )

    return f"""\
You are processing a Chrome-clipped web article for the LLM Wiki.
The wiki schemas, workflow steps, linking rules, and hard constraints are in your system prompt.

NEW NOTE — slug: {slug}

Frontmatter for the new note (will be written by the script; do not include in output):
```yaml
{fm_yaml}
```

Reading.md card will be set to: {"TBDR" if deep else "TBR"}

EXISTING WIKI CONTEXT (for accurate wiki-links — do not create pages that already exist):
{wiki_context}

TASK:
1. Read the attached article clipping.
2. Fill all analytical sections per the clipping-ingest workflow.
3. Add dense wiki-links throughout.
4. Create supporting pages directly in new_pages when warranted.

{output_fmt}"""


def build_reference_user_text(
    note_post: fm.Post, citekey: str, wiki_context: str
) -> str:
    meta = dict(note_post.metadata)
    fm_yaml = yaml.dump(meta, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    title = str(meta.get("title", citekey))
    year = str(meta.get("year", ""))
    today = date.today().isoformat()
    output_fmt = REFERENCE_OUTPUT_FORMAT.format(title=title, citekey=citekey, year=year, today=today)

    return f"""\
You are processing a Zotero-imported reference note for the LLM Wiki.
Reference notes are lighter than literature notes: no analytical sections, no reading queue.
The primary goal is to extract datasets/simulations (aggressive) and central techniques (conservative).
The wiki schemas, linking rules, and hard constraints are in your system prompt.

CURRENT NOTE — citekey: {citekey}

Existing frontmatter (source-supplied fields are IMMUTABLE; do not include in output):
```yaml
{fm_yaml}
```

EXISTING WIKI CONTEXT (for accurate wiki-links — do not create pages that already exist):
{wiki_context}

TASK:
1. Read the attached PDF.
2. Copy the abstract verbatim into ## Abstract; add wiki-links only.
3. Identify every dataset, simulation suite, or benchmark the paper introduces or significantly describes.
   Create a Datasets/ page for each one that does not already exist. Be aggressive.
4. Identify methods or techniques ONLY if they are central to the paper's contribution AND
   likely to be cited elsewhere in the wiki. When in doubt, omit. Default to empty.
5. Leave "## Cited by my work" as "None yet."

{output_fmt}"""


# ---------------------------------------------------------------------------
# API call
# ---------------------------------------------------------------------------

def build_request_params(
    model: str,
    workflow_prefix: str,
    pdf_b64: str | None,
    clipping_text: str | None,
    user_text: str,
) -> dict[str, Any]:
    """Return the messages API params dict shared by sync and batch paths."""
    if pdf_b64:
        block2: dict[str, Any] = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": pdf_b64,
            },
            "cache_control": {"type": "ephemeral"},
        }
    elif clipping_text:
        block2 = {
            "type": "text",
            "text": f"CLIPPING CONTENT:\n\n{clipping_text}",
            "cache_control": {"type": "ephemeral"},
        }
    else:
        raise ValueError("pdf_b64 or clipping_text required")

    return {
        "model": model,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "system": [
            {
                "type": "text",
                "text": workflow_prefix,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [
            {
                "role": "user",
                "content": [
                    block2,
                    {"type": "text", "text": user_text},
                ],
            }
        ],
    }


def _redact_for_debug(obj: Any, max_str: int = 120) -> Any:
    """Recursively truncate long strings for debug printing."""
    if isinstance(obj, dict):
        return {k: _redact_for_debug(v, max_str) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact_for_debug(v, max_str) for v in obj]
    if isinstance(obj, str) and len(obj) > max_str:
        return f"<{len(obj):,} chars>"
    return obj


def call_api(
    client: anthropic.Anthropic,
    model: str,
    workflow_prefix: str,
    pdf_b64: str | None,
    clipping_text: str | None,
    user_text: str,
    dry_run: bool = False,
    debug: bool = False,
) -> anthropic.types.Message | None:
    """Send the two-cached-block request. Returns None in dry-run mode."""
    params = build_request_params(model, workflow_prefix, pdf_b64, clipping_text, user_text)

    if debug:
        request_struct = {"betas": BATCH_BETAS, **params}
        print("\n--- DEBUG: API REQUEST STRUCTURE (data truncated to 120 chars) ---")
        print(json.dumps(_redact_for_debug(request_struct), indent=2))
        print("--- END DEBUG ---\n")

    if dry_run:
        print(f"  [dry-run] Would call {model}")
        print(f"    Block 1 (cached): {len(workflow_prefix):,} chars workflow prefix")
        if pdf_b64:
            print(f"    Block 2 (cached): PDF ~{len(pdf_b64) * 3 // 4 // 1024} KB")
        elif clipping_text:
            print(f"    Block 2 (cached): clipping {len(clipping_text):,} chars")
        print(f"    Block 3 (uncached): {len(user_text):,} chars instruction")
        return None

    try:
        return client.beta.messages.create(**params, betas=BATCH_BETAS)
    except anthropic.BadRequestError as exc:
        msg = str(exc)
        if "document" in msg.lower() or "pdf" in msg.lower() or "cache_control" in msg.lower():
            sys.exit(
                "ERROR: This SDK version does not support PDF document blocks with cache_control.\n"
                "Upgrade: uv pip install --upgrade anthropic --python scripts/.venv/bin/python\n"
                f"Detail: {msg}"
            )
        raise


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _extract_xml(text: str, tag: str) -> str:
    m = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
    if not m:
        raise ValueError(f"<{tag}> section not found in model response")
    return m.group(1).strip()


def parse_response(response_text: str) -> dict[str, Any]:
    """Parse model response into note_body and structured metadata dict."""
    result: dict[str, Any] = {}

    try:
        result["note_body"] = _extract_xml(response_text, "note-body")
    except ValueError as exc:
        raise ValueError(f"Model response missing <note-body>: {exc}") from exc

    try:
        raw_json = _extract_xml(response_text, "structured-output")
        result["structured"] = json.loads(raw_json)
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"  Warning: could not parse <structured-output>: {exc}", file=sys.stderr)
        result["structured"] = {}

    return result


# ---------------------------------------------------------------------------
# Frontmatter writing
# ---------------------------------------------------------------------------

def _preserve_pdf_plus(content: str) -> str:
    """Return the PDF++ section and everything after it, or a blank section."""
    marker = "## PDF++ highlights and notes"
    idx = content.find(marker)
    return content[idx:] if idx != -1 else f"{marker}\n"


def write_note_file(
    note_path: Path,
    metadata: dict,
    note_body: str,
    pdf_plus: str,
    dry_run: bool,
) -> None:
    """Serialise frontmatter + body + PDF++ section to disk."""
    # Remove None-valued keys so YAML doesn't produce 'key: null'
    clean_meta = {k: v for k, v in metadata.items() if v is not None}
    fm_str = yaml.dump(
        clean_meta, allow_unicode=True, default_flow_style=False, sort_keys=False
    )
    content = f"---\n{fm_str}---\n\n{note_body.rstrip()}\n\n{pdf_plus.rstrip()}\n"

    if dry_run:
        print(f"  [dry-run] Would write: {note_path.relative_to(note_path.parent.parent)}")
        return

    note_path.parent.mkdir(parents=True, exist_ok=True)
    note_path.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Master file updates
# ---------------------------------------------------------------------------

def write_new_pages(vault_root: Path, new_pages: list[dict], dry_run: bool) -> list[str]:
    written = []
    for page in new_pages:
        path_rel = page.get("path", "")
        content = page.get("content", "")
        if not path_rel or not content:
            print(f"  Warning: skipping malformed new-page entry: {list(page.keys())}", file=sys.stderr)
            continue
        dest = vault_root / path_rel
        if dry_run:
            print(f"  [dry-run] Would create: {path_rel}")
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
        written.append(path_rel)
    return written


def update_literaturenotes_md(
    vault_root: Path,
    citekey: str,
    authors: str,
    year: str,
    title: str,
    description: str,
    concepts: list[str],
    is_clipping: bool,
    dry_run: bool,
) -> None:
    path = vault_root / "LITERATURENOTES.md"
    if not path.exists():
        print("  Warning: LITERATURENOTES.md not found; skipping", file=sys.stderr)
        return

    # Format the row
    author_list = [a.strip() for a in re.split(r",\s*", authors) if a.strip()]
    if len(author_list) >= 3:
        author_display = author_list[0].split()[-1] + " et al."
    elif len(author_list) == 2:
        author_display = author_list[0].split()[-1] + " & " + author_list[1].split()[-1]
    else:
        author_display = author_list[0].split()[-1] if author_list else citekey

    clipping_tag = " [clipping]" if is_clipping else ""
    concepts_linked = ", ".join(f"[[{c}]]" for c in concepts) if concepts else ""
    row = (
        f"| [[{citekey}\\|{title}]]{clipping_tag} -- {author_display} {year} "
        f"| {description} | {concepts_linked} |"
    )

    content = path.read_text(encoding="utf-8")
    today = date.today().isoformat()
    content = re.sub(
        r"\*\*Last updated\*\*:.*",
        f"**Last updated**: {today} (added {citekey})",
        content,
    )

    # Find chronological insertion point
    target_year = int(year) if str(year).isdigit() else 9999
    lines = content.split("\n")
    row_indices = [i for i, line in enumerate(lines) if line.startswith("| [[")]
    insert_after = row_indices[-1] if row_indices else -1  # default: append at end

    for idx in row_indices:
        m = re.search(r"-- \S+ (\d{4})", lines[idx])
        if m and int(m.group(1)) <= target_year:
            insert_after = idx

    if insert_after >= 0:
        lines.insert(insert_after + 1, row)
    else:
        lines.append(row)

    if dry_run:
        print(f"  [dry-run] Would add row to LITERATURENOTES.md")
        return
    path.write_text("\n".join(lines), encoding="utf-8")


def update_referencenotes_md(
    vault_root: Path,
    citekey: str,
    authors: str,
    year: str,
    title: str,
    dataset_slugs: list[str],
    dry_run: bool,
) -> None:
    path = vault_root / "REFERENCENOTES.md"
    if not path.exists():
        print("  Warning: REFERENCENOTES.md not found; skipping", file=sys.stderr)
        return

    author_list = [a.strip() for a in re.split(r",\s*", authors) if a.strip()]
    if len(author_list) >= 3:
        author_display = author_list[0].split()[-1] + " et al."
    elif len(author_list) == 2:
        author_display = author_list[0].split()[-1] + " & " + author_list[1].split()[-1]
    else:
        author_display = author_list[0].split()[-1] if author_list else citekey

    datasets_linked = ", ".join(f"[[{s}]]" for s in dataset_slugs) if dataset_slugs else ""
    row = (
        f"| [[{citekey}\\|{author_display} {year}]] "
        f"| {title} "
        f"| {author_display} "
        f"| {year} "
        f"| {datasets_linked} "
        f"| processed |"
    )

    content = path.read_text(encoding="utf-8")
    today = date.today().isoformat()
    content = re.sub(
        r"\*\*Last updated\*\*:.*",
        f"**Last updated**: {today} (added {citekey})",
        content,
    )
    content = content.rstrip() + "\n" + row + "\n"

    if dry_run:
        print(f"  [dry-run] Would add row to REFERENCENOTES.md")
        return
    path.write_text(content, encoding="utf-8")


def update_reading_md(
    vault_root: Path, citekey: str, authors: str, year: str, deep: bool, dry_run: bool
) -> None:
    path = vault_root / "Reading.md"
    if not path.exists():
        print("  Warning: Reading.md not found; skipping", file=sys.stderr)
        return

    author_list = [a.strip() for a in re.split(r",\s*", authors) if a.strip()]
    if len(author_list) >= 3:
        display = author_list[0].split()[-1] + " et al. " + year
    elif len(author_list) == 2:
        display = author_list[0].split()[-1] + " & " + author_list[1].split()[-1] + " " + year
    else:
        display = (author_list[0].split()[-1] if author_list else citekey) + " " + year

    card = f"- [ ] [[{citekey}|{display}]]"
    target = "## TBDR" if deep else "## TBR"

    content = path.read_text(encoding="utf-8")
    lines = content.split("\n")

    section_idx = next((i for i, l in enumerate(lines) if l.strip() == target), None)
    if section_idx is None:
        print(f"  Warning: {target} section not found in Reading.md", file=sys.stderr)
        return

    next_section_idx = next(
        (i for i, l in enumerate(lines) if i > section_idx and l.startswith("## ")), len(lines)
    )

    # Find last non-blank line in the section
    insert_at = next_section_idx
    for i in range(next_section_idx - 1, section_idx, -1):
        if i < len(lines) and lines[i].strip():
            insert_at = i + 1
            break

    lines.insert(insert_at, card)

    if dry_run:
        print(f"  [dry-run] Would append card to Reading.md ({target}): {card}")
        return
    path.write_text("\n".join(lines), encoding="utf-8")


def prepend_log_entry(
    vault_root: Path,
    citekey: str,
    source_type: str,
    authors: str,
    year: str,
    new_page_paths: list[str],
    dry_run: bool,
) -> None:
    log_path = vault_root / "log.md"
    if not log_path.exists():
        print("  Warning: log.md not found; skipping", file=sys.stderr)
        return

    today = date.today().isoformat()
    clipping_tag = " [clipping]" if source_type == "clipping" else ""
    pages_line = (
        "\n- New pages: " + ", ".join(f"`{p}`" for p in new_page_paths)
        if new_page_paths
        else ""
    )

    if source_type == "reference":
        entry = (
            f"## {today} -- Processed {citekey} [reference] ({authors} {year})\n\n"
            f"**Trigger**: paper ingest workflow (scripts/ingest.py).\n\n"
            f"**Reference note** (`ReferenceNotes/{citekey}.md`):\n"
            f"- Abstract extracted; datasets/simulations identified; frontmatter updated.\n\n"
            f"**Updates**:\n"
            f"- `REFERENCENOTES.md` — row added.{pages_line}\n\n---\n\n"
        )
    else:
        entry = (
            f"## {today} -- Processed {citekey}{clipping_tag} ({authors} {year})\n\n"
            f"**Trigger**: paper ingest workflow (scripts/ingest.py).\n\n"
            f"**Literature note** (`LiteratureNotes/{citekey}.md`):\n"
            f"- All analytical sections drafted; abstract linked; frontmatter updated.\n\n"
            f"**Updates**:\n"
            f"- `LITERATURENOTES.md` — row added.\n"
            f"- `Reading.md` — TBR card appended.{pages_line}\n\n---\n\n"
        )

    content = log_path.read_text(encoding="utf-8")
    sep = content.find("\n---\n")
    new_content = (
        content[: sep + 5] + "\n" + entry + content[sep + 5 :]
        if sep >= 0
        else entry + content
    )

    if dry_run:
        print(f"  [dry-run] Would prepend log entry for {citekey}")
        return
    log_path.write_text(new_content, encoding="utf-8")


def update_index_md(
    vault_root: Path, index_entries: list[dict], dry_run: bool
) -> None:
    if not index_entries:
        return
    path = vault_root / "index.md"
    if not path.exists():
        print("  Warning: index.md not found; skipping index updates", file=sys.stderr)
        return

    content = path.read_text(encoding="utf-8")
    today = date.today().isoformat()

    for upd in index_entries:
        section = upd.get("section", "")
        entry = upd.get("entry", "").rstrip()
        if not section or not entry:
            continue

        # Find the section header (handle "Parent > Child" notation)
        section_leaf = section.split(" > ")[-1].strip()
        pattern = rf"(##+ {re.escape(section_leaf)}[^\n]*\n)"
        m = re.search(pattern, content, re.IGNORECASE)

        if m:
            # Advance past existing bullet lines in the section
            pos = m.end()
            while pos < len(content) and content[pos:].startswith("- "):
                end = content.find("\n", pos)
                pos = (end + 1) if end != -1 else len(content)
            content = content[:pos] + entry + "\n" + content[pos:]
        else:
            print(
                f"  Warning: section '{section}' not found in index.md; skipping entry",
                file=sys.stderr,
            )

    content = re.sub(r"\*\*Last updated\*\*:.*", f"**Last updated**: {today}", content)

    if dry_run:
        print(f"  [dry-run] Would update index.md ({len(index_entries)} entries)")
        return
    path.write_text(content, encoding="utf-8")


def update_master_table(
    vault_root: Path, filename: str, rows: list[str], dry_run: bool
) -> None:
    if not rows:
        return
    path = vault_root / filename
    if not path.exists():
        print(f"  Warning: {filename} not found; skipping", file=sys.stderr)
        return

    today = date.today().isoformat()
    content = path.read_text(encoding="utf-8")
    content = re.sub(r"\*\*Last updated\*\*:.*", f"**Last updated**: {today}", content)
    for row in rows:
        if row.strip():
            content = content.rstrip() + "\n" + row + "\n"

    if dry_run:
        print(f"  [dry-run] Would add {len(rows)} row(s) to {filename}")
        return
    path.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Cost / cache reporting
# ---------------------------------------------------------------------------

def _tok(usage: Any, field: str) -> int:
    return getattr(usage, field, None) or 0


def compute_cost(usage: Any, model: str, batch: bool = False) -> float:
    pricing = MODEL_PRICING.get(model) or MODEL_PRICING[DEFAULT_MODEL]
    base = (
        _tok(usage, "input_tokens") * pricing["input"]
        + _tok(usage, "output_tokens") * pricing["output"]
        + _tok(usage, "cache_creation_input_tokens") * pricing["cache_write"]
        + _tok(usage, "cache_read_input_tokens") * pricing["cache_read"]
    )
    return base * (BATCH_DISCOUNT if batch else 1.0)


def cache_hit_rate(usage: Any) -> float:
    read = _tok(usage, "cache_read_input_tokens")
    total = (
        _tok(usage, "input_tokens")
        + _tok(usage, "cache_creation_input_tokens")
        + read
    )
    return read / total if total else 0.0


# ---------------------------------------------------------------------------
# Per-paper processing
# ---------------------------------------------------------------------------

def _apply_paper_result(
    *,
    vault_root: Path,
    citekey: str,
    note_post: fm.Post,
    note_body: str,
    structured: dict,
    deep: bool,
    dry_run: bool,
    no_reading_board: bool = False,
) -> dict[str, Any]:
    """Write note + all master-file updates from a parsed API response. Used by both
    the synchronous path and the batch result-processing path."""
    meta = dict(note_post.metadata)
    meta["status"] = "processed"
    if "relevance" in structured:
        meta["relevance"] = structured["relevance"]
    if "topics" in structured:
        meta["topics"] = structured["topics"]
    if deep and meta.get("read_status") == "TBR":
        meta["read_status"] = "TBDR"

    note_path = vault_root / "LiteratureNotes" / f"{citekey}.md"
    pdf_plus = _preserve_pdf_plus(note_post.content)
    write_note_file(note_path, meta, note_body, pdf_plus, dry_run)

    new_page_paths = write_new_pages(vault_root, structured.get("new_pages", []), dry_run)

    authors = str(meta.get("authors", ""))
    year = str(meta.get("year", ""))
    title = str(meta.get("title", citekey))

    update_literaturenotes_md(
        vault_root, citekey, authors, year, title,
        structured.get("literaturenotes_description", ""),
        structured.get("literaturenotes_concepts", []),
        is_clipping=False, dry_run=dry_run,
    )
    if not no_reading_board:
        update_reading_md(vault_root, citekey, authors, year, deep=deep, dry_run=dry_run)
    prepend_log_entry(vault_root, citekey, "zotero", authors, year, new_page_paths, dry_run)
    update_index_md(vault_root, structured.get("index_entries", []), dry_run)
    update_master_table(vault_root, "CONCEPTS.md", structured.get("concepts_rows", []), dry_run)
    update_master_table(vault_root, "DATASETS.md", structured.get("datasets_rows", []), dry_run)

    return {"citekey": citekey, "new_pages": new_page_paths}


def _apply_reference_result(
    *,
    vault_root: Path,
    citekey: str,
    note_post: fm.Post,
    note_body: str,
    structured: dict,
    dry_run: bool,
) -> dict[str, Any]:
    """Write reference note + all master-file updates from a parsed API response."""
    meta = dict(note_post.metadata)
    meta["status"] = "processed"
    # No read_status, no relevance on reference notes
    if "topics" in structured:
        meta["topics"] = structured["topics"]

    note_path = vault_root / "ReferenceNotes" / f"{citekey}.md"
    pdf_plus = _preserve_pdf_plus(note_post.content)
    write_note_file(note_path, meta, note_body, pdf_plus, dry_run)

    new_page_paths = write_new_pages(vault_root, structured.get("new_pages", []), dry_run)

    authors = str(meta.get("authors", ""))
    year = str(meta.get("year", ""))
    title = str(meta.get("title", citekey))
    dataset_slugs = structured.get("referencenotes_datasets", [])

    update_referencenotes_md(
        vault_root, citekey, authors, year, title, dataset_slugs, dry_run
    )
    # No update_reading_md — reference notes never get Reading.md cards
    prepend_log_entry(vault_root, citekey, "reference", authors, year, new_page_paths, dry_run)
    update_index_md(vault_root, structured.get("index_entries", []), dry_run)
    update_master_table(vault_root, "DATASETS.md", structured.get("datasets_rows", []), dry_run)
    update_master_table(vault_root, "CONCEPTS.md", structured.get("concepts_rows", []), dry_run)

    return {"citekey": citekey, "new_pages": new_page_paths, "source_type": "reference"}


def process_paper(
    *,
    vault_root: Path,
    citekey: str,
    client: anthropic.Anthropic,
    model: str,
    workflow_prefix: str,
    wiki_context: str,
    deep: bool,
    dry_run: bool,
    debug: bool = False,
    no_reading_board: bool = False,
) -> dict[str, Any]:
    """Process a single Zotero paper. Returns a result summary dict."""
    note_path = vault_root / "LiteratureNotes" / f"{citekey}.md"
    if not note_path.exists():
        raise FileNotFoundError(f"Literature note not found: {note_path}")

    note_post = fm.load(str(note_path))
    meta = dict(note_post.metadata)

    # Resolve PDF path from frontmatter field like "[[Assets/foo.pdf]]"
    pdf_field = str(meta.get("pdf", ""))
    pdf_rel = re.sub(r"^\[\[|\]\]$", "", pdf_field)
    pdf_path = vault_root / pdf_rel
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"  PDF: {pdf_rel} ({pdf_path.stat().st_size // 1024} KB)")
    pdf_b64 = load_pdf_b64(pdf_path)

    user_text = build_paper_user_text(note_post, citekey, wiki_context, deep=deep)
    print(f"  Calling {model}...")
    response = call_api(
        client=client,
        model=model,
        workflow_prefix=workflow_prefix,
        pdf_b64=pdf_b64,
        clipping_text=None,
        user_text=user_text,
        dry_run=dry_run,
        debug=debug,
    )

    if dry_run:
        return {"citekey": citekey, "dry_run": True}

    parsed = parse_response(response.content[0].text)
    r = _apply_paper_result(
        vault_root=vault_root,
        citekey=citekey,
        note_post=note_post,
        note_body=parsed["note_body"],
        structured=parsed.get("structured", {}),
        deep=deep,
        dry_run=dry_run,
        no_reading_board=no_reading_board,
    )
    usage = response.usage
    r["cost_usd"] = compute_cost(usage, model)
    r["cache_hit_rate"] = cache_hit_rate(usage)
    r["input_tokens"] = _tok(usage, "input_tokens")
    r["output_tokens"] = _tok(usage, "output_tokens")
    r["cache_write_tokens"] = _tok(usage, "cache_creation_input_tokens")
    r["cache_read_tokens"] = _tok(usage, "cache_read_input_tokens")
    return r


def process_reference_paper(
    *,
    vault_root: Path,
    citekey: str,
    client: anthropic.Anthropic,
    model: str,
    workflow_prefix: str,
    wiki_context: str,
    dry_run: bool,
    debug: bool = False,
) -> dict[str, Any]:
    """Process a single reference note. Returns a result summary dict."""
    note_path = vault_root / "ReferenceNotes" / f"{citekey}.md"
    if not note_path.exists():
        raise FileNotFoundError(f"Reference note not found: {note_path}")

    note_post = fm.load(str(note_path))
    meta = dict(note_post.metadata)

    pdf_field = str(meta.get("pdf", ""))
    pdf_rel = re.sub(r"^\[\[|\]\]$", "", pdf_field).strip()
    # Reference notes don't include a pdf: frontmatter field; fall back to Assets/<citekey>.pdf
    if not pdf_rel:
        pdf_rel = f"Assets/{citekey}.pdf"
    pdf_path = vault_root / pdf_rel
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"  PDF: {pdf_rel} ({pdf_path.stat().st_size // 1024} KB)")
    pdf_b64 = load_pdf_b64(pdf_path)

    user_text = build_reference_user_text(note_post, citekey, wiki_context)
    print(f"  Calling {model}...")
    response = call_api(
        client=client,
        model=model,
        workflow_prefix=workflow_prefix,
        pdf_b64=pdf_b64,
        clipping_text=None,
        user_text=user_text,
        dry_run=dry_run,
        debug=debug,
    )

    if dry_run:
        return {"citekey": citekey, "dry_run": True, "source_type": "reference"}

    parsed = parse_response(response.content[0].text)
    r = _apply_reference_result(
        vault_root=vault_root,
        citekey=citekey,
        note_post=note_post,
        note_body=parsed["note_body"],
        structured=parsed.get("structured", {}),
        dry_run=dry_run,
    )
    usage = response.usage
    r["cost_usd"] = compute_cost(usage, model)
    r["cache_hit_rate"] = cache_hit_rate(usage)
    r["input_tokens"] = _tok(usage, "input_tokens")
    r["output_tokens"] = _tok(usage, "output_tokens")
    r["cache_write_tokens"] = _tok(usage, "cache_creation_input_tokens")
    r["cache_read_tokens"] = _tok(usage, "cache_read_input_tokens")
    return r


def process_clipping(
    *,
    vault_root: Path,
    clipping_filename: str,
    client: anthropic.Anthropic,
    model: str,
    workflow_prefix: str,
    wiki_context: str,
    deep: bool,
    dry_run: bool,
    debug: bool = False,
    no_reading_board: bool = False,
) -> dict[str, Any]:
    """Process a single Chrome-clipped article. Returns a result summary dict."""
    clipping_path = vault_root / "Clippings" / clipping_filename
    if not clipping_path.exists():
        raise FileNotFoundError(f"Clipping not found: {clipping_path}")

    clipping_text = clipping_path.read_text(encoding="utf-8")
    clipping_post = fm.loads(clipping_text)
    cm = clipping_post.metadata

    # Derive slug: firstauthorsurname + TitleKeywords + year
    raw_authors = str(cm.get("author", cm.get("authors", "Unknown")))
    raw_authors = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", r"\1", raw_authors)
    first_author = re.split(r"[,;]", raw_authors)[0].strip()
    first_surname = re.sub(r"[^a-z0-9]", "", first_author.split()[-1].lower())

    raw_title = str(cm.get("title", "untitled"))
    stop = {"the", "a", "an", "of", "in", "on", "for", "and", "or", "to", "with", "by", "from"}
    title_words = [
        w for w in re.sub(r"[^a-z0-9 ]", "", raw_title.lower()).split() if w not in stop
    ][:3]
    title_part = "".join(w.capitalize() for w in title_words)

    year_raw = str(cm.get("year", cm.get("date", date.today().year)))
    year_m = re.search(r"\d{4}", year_raw)
    year = year_m.group(0) if year_m else str(date.today().year)

    slug = f"{first_surname}{title_part}{year}"
    print(f"  Derived slug: {slug}")

    accessed = str(cm.get("created", cm.get("accessed", date.today().isoformat())))
    source_url = str(cm.get("source", cm.get("url", "")))

    new_meta: dict[str, Any] = {
        "title": raw_title,
        "slug": slug,
        "source_type": "clipping",
        "authors": raw_authors,
        "year": year,
        "clipping": f"[[Clippings/{clipping_filename}]]",
        "source_url": source_url,
        "accessed": accessed,
        "status": "queued",
        "read_status": "TBR",
        "relevance": None,
        "topics": [],
        "tags": ["paper"],
    }

    user_text = build_clipping_user_text(slug, new_meta, wiki_context, deep=deep)
    print(f"  Calling {model}...")
    response = call_api(
        client=client,
        model=model,
        workflow_prefix=workflow_prefix,
        pdf_b64=None,
        clipping_text=clipping_text,
        user_text=user_text,
        dry_run=dry_run,
        debug=debug,
    )

    if dry_run:
        return {"citekey": slug, "dry_run": True}

    parsed = parse_response(response.content[0].text)
    s = parsed.get("structured", {})

    new_meta["status"] = "processed"
    if "relevance" in s:
        new_meta["relevance"] = s["relevance"]
    if "topics" in s:
        new_meta["topics"] = s["topics"]
    if deep:
        new_meta["read_status"] = "TBDR"

    note_path = vault_root / "LiteratureNotes" / f"{slug}.md"
    write_note_file(note_path, new_meta, parsed["note_body"], "## PDF++ highlights and notes\n", dry_run)

    new_page_paths = write_new_pages(vault_root, s.get("new_pages", []), dry_run)

    update_literaturenotes_md(
        vault_root, slug, raw_authors, year, raw_title,
        s.get("literaturenotes_description", ""),
        s.get("literaturenotes_concepts", []),
        is_clipping=True, dry_run=dry_run,
    )
    if not no_reading_board:
        update_reading_md(vault_root, slug, raw_authors, year, deep=deep, dry_run=dry_run)
    prepend_log_entry(vault_root, slug, "clipping", raw_authors, year, new_page_paths, dry_run)
    update_index_md(vault_root, s.get("index_entries", []), dry_run)
    update_master_table(vault_root, "CONCEPTS.md", s.get("concepts_rows", []), dry_run)
    update_master_table(vault_root, "DATASETS.md", s.get("datasets_rows", []), dry_run)

    usage = response.usage
    return {
        "citekey": slug,
        "new_pages": new_page_paths,
        "cost_usd": compute_cost(usage, model),
        "cache_hit_rate": cache_hit_rate(usage),
        "input_tokens": _tok(usage, "input_tokens"),
        "output_tokens": _tok(usage, "output_tokens"),
        "cache_write_tokens": _tok(usage, "cache_creation_input_tokens"),
        "cache_read_tokens": _tok(usage, "cache_read_input_tokens"),
    }


# ---------------------------------------------------------------------------
# Batch API machinery
# ---------------------------------------------------------------------------

def _sanitize_custom_id(citekey: str) -> str:
    """Enforce batch custom_id constraint: [a-zA-Z0-9_-]{1,64}."""
    return (re.sub(r"[^a-zA-Z0-9_-]", "_", citekey) or "unknown")[:64]


def submit_batch(
    client: anthropic.Anthropic,
    batch_requests: list[dict[str, Any]],
) -> Any:
    """Submit a list of {custom_id, params} dicts to the Batch API."""
    return client.beta.messages.batches.create(
        requests=[{"custom_id": r["custom_id"], "params": r["params"]} for r in batch_requests],
        betas=BATCH_BETAS,
    )


def poll_until_complete(
    client: anthropic.Anthropic,
    batch_id: str,
    poll_interval: int,
    timeout: int,
) -> Any:
    """Poll until processing_status == 'ended'. Prints a progress line each poll."""
    start = time.monotonic()
    while True:
        batch = client.beta.messages.batches.retrieve(batch_id, betas=BATCH_BETAS)
        c = batch.request_counts
        n_total = c.processing + c.succeeded + c.errored + c.canceled + c.expired
        print(
            f"  Batch {batch_id}: {batch.processing_status} | "
            f"processing {c.processing}/{n_total}, "
            f"succeeded {c.succeeded}, errored {c.errored}"
        )
        if batch.processing_status == "ended":
            return batch
        elapsed = time.monotonic() - start
        if elapsed >= timeout:
            print(f"\n  Batch timed out after {timeout}s.")
            print(f"  Resume when ready:")
            print(f"    scripts/.venv/bin/python scripts/ingest.py --batch-resume {batch_id}")
            sys.exit(1)
        time.sleep(poll_interval)


def _locate_note(vault_root: Path, citekey: str) -> tuple[Path, str]:
    """Find a note by citekey in ReferenceNotes/ or LiteratureNotes/.
    Returns (path, source_type). Raises FileNotFoundError if not found."""
    ref_path = vault_root / "ReferenceNotes" / f"{citekey}.md"
    if ref_path.exists():
        return ref_path, "reference"
    lit_path = vault_root / "LiteratureNotes" / f"{citekey}.md"
    if lit_path.exists():
        return lit_path, "zotero"
    raise FileNotFoundError(f"Note not found for citekey '{citekey}' in ReferenceNotes/ or LiteratureNotes/")


def process_batch_results(
    *,
    client: anthropic.Anthropic,
    batch_id: str,
    vault_root: Path,
    citekey_map: dict[str, str],
    model: str,
    deep: bool,
    dry_run: bool,
    source_type_map: dict[str, str] | None = None,
    no_reading_board: bool = False,
) -> list[dict[str, Any]]:
    """Iterate batch results and write notes + master files for each succeeded request.
    Per-request errors are collected and reported rather than aborting the run.
    citekey_map maps custom_id → citekey; if empty (resume path), custom_id IS the citekey.
    source_type_map maps custom_id → source_type; if absent, detected from the file system."""
    results = []

    for item in client.beta.messages.batches.results(batch_id, betas=BATCH_BETAS):
        custom_id = item.custom_id
        citekey = citekey_map.get(custom_id, custom_id)

        result = item.result
        if result.type != "succeeded":
            print(f"  {citekey}: {result.type} — skipped", file=sys.stderr)
            results.append({"citekey": citekey, "error": result.type, "batch": True})
            continue

        message = result.message
        response_text = message.content[0].text
        usage = message.usage

        try:
            parsed = parse_response(response_text)
        except ValueError as exc:
            print(f"  Warning: {citekey}: {exc}", file=sys.stderr)
            results.append({"citekey": citekey, "error": str(exc), "batch": True})
            continue

        # Determine source_type: from map if available, otherwise detect from file system
        if source_type_map and custom_id in source_type_map:
            source_type = source_type_map[custom_id]
            note_path = (
                vault_root / "ReferenceNotes" / f"{citekey}.md"
                if source_type == "reference"
                else vault_root / "LiteratureNotes" / f"{citekey}.md"
            )
        else:
            try:
                note_path, source_type = _locate_note(vault_root, citekey)
            except FileNotFoundError:
                print(f"  Warning: note not found for {citekey}; skipping", file=sys.stderr)
                results.append({"citekey": citekey, "error": "note not found", "batch": True})
                continue

        if not note_path.exists():
            print(f"  Warning: note not found for {citekey}; skipping", file=sys.stderr)
            results.append({"citekey": citekey, "error": "note not found", "batch": True})
            continue

        note_post = fm.load(str(note_path))

        if source_type == "reference":
            r = _apply_reference_result(
                vault_root=vault_root,
                citekey=citekey,
                note_post=note_post,
                note_body=parsed["note_body"],
                structured=parsed.get("structured", {}),
                dry_run=dry_run,
            )
        else:
            r = _apply_paper_result(
                vault_root=vault_root,
                citekey=citekey,
                note_post=note_post,
                note_body=parsed["note_body"],
                structured=parsed.get("structured", {}),
                deep=deep,
                dry_run=dry_run,
                no_reading_board=no_reading_board,
            )
        r["batch"] = True
        r["cost_usd"] = compute_cost(usage, model, batch=True)
        r["cache_hit_rate"] = cache_hit_rate(usage)
        r["input_tokens"] = _tok(usage, "input_tokens")
        r["output_tokens"] = _tok(usage, "output_tokens")
        r["cache_write_tokens"] = _tok(usage, "cache_creation_input_tokens")
        r["cache_read_tokens"] = _tok(usage, "cache_read_input_tokens")
        results.append(r)

    return results


def run_batch(
    *,
    vault_root: Path,
    items: list[dict[str, str]],
    client: anthropic.Anthropic,
    model: str,
    prefixes: dict[str, str],
    wiki_context: str,
    deep: bool,
    dry_run: bool,
    poll_interval: int,
    timeout: int,
    debug: bool,
    no_reading_board: bool = False,
) -> list[dict[str, Any]]:
    """Build, submit, poll, and process a batch of queued papers and/or reference notes.
    items: list of {citekey, source_type}. prefixes: {source_type: workflow_prefix_text}."""
    batch_requests: list[dict[str, Any]] = []
    citekey_map: dict[str, str] = {}
    source_type_map: dict[str, str] = {}

    for item in items:
        citekey = item["citekey"]
        source_type = item.get("source_type", "zotero")

        if source_type == "reference":
            note_path = vault_root / "ReferenceNotes" / f"{citekey}.md"
        else:
            note_path = vault_root / "LiteratureNotes" / f"{citekey}.md"

        if not note_path.exists():
            print(f"  Warning: note not found for {citekey}; skipping", file=sys.stderr)
            continue

        note_post = fm.load(str(note_path))
        meta = dict(note_post.metadata)

        pdf_field = str(meta.get("pdf", ""))
        pdf_rel = re.sub(r"^\[\[|\]\]$", "", pdf_field).strip()
        if not pdf_rel:
            pdf_rel = f"Assets/{citekey}.pdf"
        pdf_path = vault_root / pdf_rel
        if not pdf_path.exists():
            print(f"  Warning: PDF not found for {citekey} ({pdf_rel}); skipping", file=sys.stderr)
            continue

        ref_label = " [ref]" if source_type == "reference" else ""
        print(f"  Preparing {citekey}{ref_label} — PDF {pdf_path.stat().st_size // 1024} KB")
        pdf_b64 = load_pdf_b64(pdf_path)

        item_prefix = prefixes.get(source_type, prefixes.get("zotero", ""))
        if source_type == "reference":
            user_text = build_reference_user_text(note_post, citekey, wiki_context)
        else:
            user_text = build_paper_user_text(note_post, citekey, wiki_context, deep=deep)
        params = build_request_params(model, item_prefix, pdf_b64, None, user_text)

        custom_id = _sanitize_custom_id(citekey)
        citekey_map[custom_id] = citekey
        source_type_map[custom_id] = source_type
        batch_requests.append({"custom_id": custom_id, "params": params})

    if not batch_requests:
        print("No valid papers to batch.")
        return []

    # Debug: show structure of first request (cache_control placement verification)
    if debug:
        first_params = batch_requests[0]["params"]
        request_struct = {"betas": BATCH_BETAS, **first_params}
        label = f"first of {len(batch_requests)}" if len(batch_requests) > 1 else "1"
        print(f"\n--- DEBUG: BATCH REQUEST STRUCTURE ({label} request(s), data truncated to 120 chars) ---")
        print(json.dumps(_redact_for_debug(request_struct), indent=2))
        print("--- END DEBUG ---\n")

    if dry_run:
        for r in batch_requests:
            print(f"  [dry-run] Would batch: {citekey_map[r['custom_id']]}")
        return [{"citekey": citekey_map[r["custom_id"]], "dry_run": True} for r in batch_requests]

    print(f"\nSubmitting batch ({len(batch_requests)} request(s)) ...")
    batch = submit_batch(client, batch_requests)
    print(f"  Batch ID:  {batch.id}")
    print(f"  Expires:   {batch.expires_at}")
    print(f"  To resume if disconnected:")
    print(f"    scripts/.venv/bin/python scripts/ingest.py --batch-resume {batch.id}")
    print()

    batch = poll_until_complete(client, batch.id, poll_interval, timeout)

    return process_batch_results(
        client=client,
        batch_id=batch.id,
        vault_root=vault_root,
        citekey_map=citekey_map,
        model=model,
        deep=deep,
        dry_run=False,
        source_type_map=source_type_map,
        no_reading_board=no_reading_board,
    )


def find_queued_papers(vault_root: Path) -> list[str]:
    """Return citekeys of all literature notes with status: queued."""
    citekeys = []
    ln_dir = vault_root / "LiteratureNotes"
    if not ln_dir.exists():
        return citekeys
    for md_path in sorted(ln_dir.glob("*.md")):
        try:
            post = fm.load(str(md_path))
            if post.get("status") == "queued":
                citekeys.append(md_path.stem)
        except Exception:
            pass
    return citekeys


def find_queued_references(vault_root: Path) -> list[str]:
    """Return citekeys of all reference notes with status: queued."""
    citekeys = []
    rn_dir = vault_root / "ReferenceNotes"
    if not rn_dir.exists():
        return citekeys
    for md_path in sorted(rn_dir.glob("*.md")):
        try:
            post = fm.load(str(md_path))
            if post.get("status") == "queued":
                citekeys.append(md_path.stem)
        except Exception:
            pass
    return citekeys


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def print_summary(results: list[dict]) -> None:
    is_batch = any(r.get("batch") for r in results)
    print("\n" + "=" * 62)
    print("INGEST SUMMARY" + (" (Batch API — 50% discount applied)" if is_batch else ""))
    print("=" * 62)
    total_cost = 0.0
    for r in results:
        key = r.get("citekey", "?")
        if r.get("dry_run"):
            print(f"\n  {key}: [dry-run — no API call made]")
            continue
        if r.get("error"):
            print(f"\n  {key}: ERROR — {r['error']}")
            continue
        cost = r.get("cost_usd", 0.0)
        total_cost += cost
        hit = r.get("cache_hit_rate", 0.0)
        cost_label = "Cost (after 50% batch discount)" if r.get("batch") else "Cost"
        src = r.get("source_type", "")
        src_label = f" [{src}]" if src else ""
        print(f"\n  {key}{src_label}")
        print(f"    {cost_label}: ${cost:.4f}")
        print(f"    Cache hit rate:  {hit:.0%}")
        print(
            f"    Tokens in/out:   "
            f"{r.get('input_tokens', 0):,} / {r.get('output_tokens', 0):,}"
        )
        print(
            f"    Cache write/read: "
            f"{r.get('cache_write_tokens', 0):,} / {r.get('cache_read_tokens', 0):,}"
        )
        pages = r.get("new_pages", [])
        if pages:
            print(f"    New pages:       {', '.join(pages)}")
    if len(results) > 1:
        label = "TOTAL (after 50% batch discount)" if is_batch else "TOTAL"
        print(f"\n  {label}: ${total_cost:.4f}")
    print("=" * 62)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="LLM Wiki paper ingest via Anthropic API with prompt caching.",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--citekey", metavar="KEY", help="Process one paper by citekey (auto-detects reference vs literature).")
    mode.add_argument("--reference", metavar="KEY", help="Process one reference note by citekey (targets ReferenceNotes/).")
    mode.add_argument("--queued", action="store_true", help="Process all status: queued notes (literature + reference).")
    mode.add_argument("--clipping", metavar="FILE", help="Process a clipping by filename in Clippings/.")
    mode.add_argument(
        "--batch-resume", metavar="BATCH_ID",
        help="Resume polling an existing batch job by ID, then write results.",
    )

    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model override (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen; no writes, no API calls.")
    parser.add_argument("--deep", action="store_true", help="Mark Reading.md card as TBDR instead of TBR.")
    parser.add_argument("--no-reading-board", action="store_true", dest="no_reading_board", help="Skip appending a card to Reading.md (e.g. for already-read papers).")
    parser.add_argument("--debug", action="store_true", help="Print the API request structure (data truncated) before sending.")
    parser.add_argument("--batch", action="store_true", help="Submit via Batch API (50%% discount) instead of synchronous.")
    parser.add_argument(
        "--batch-poll-interval", type=int, default=60, metavar="SEC",
        help="Seconds between batch status polls (default: 60).",
    )
    parser.add_argument(
        "--batch-timeout", type=int, default=86400, metavar="SEC",
        help="Max seconds to wait for batch completion (default: 86400 = 24h).",
    )
    parser.add_argument("--vault-root", default=".", metavar="PATH", help="Vault root (default: cwd).")

    args = parser.parse_args()
    vault_root = Path(args.vault_root).resolve()

    if not vault_root.exists():
        sys.exit(f"Vault root not found: {vault_root}")
    _key_file = Path.home() / ".anthropic" / "api_key"
    api_key = os.environ.get("ANTHROPIC_API_KEY") or (
        _key_file.read_text().strip() if _key_file.exists() else None
    )
    if not api_key and not args.dry_run:
        sys.exit(
            "No Anthropic API key found. Either:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-...\n"
            f"  or write the key to {_key_file}"
        )

    client = anthropic.Anthropic(api_key=api_key or "dry-run")

    if args.clipping and args.batch:
        sys.exit("--batch is not supported for --clipping. Clipping ingest always runs synchronously.")

    # --batch-resume needs no prefix/context loading.
    if args.batch_resume:
        print(f"Resuming batch: {args.batch_resume}")
        print("Polling for completion...")
        poll_until_complete(client, args.batch_resume, args.batch_poll_interval, args.batch_timeout)
        results = process_batch_results(
            client=client,
            batch_id=args.batch_resume,
            vault_root=vault_root,
            citekey_map={},
            model=args.model,
            deep=args.deep,
            dry_run=args.dry_run,
            no_reading_board=args.no_reading_board,
            # source_type_map absent: each citekey detected from file system
        )
        print_summary(results)
        return

    # ---------------------------------------------------------------------------
    # Determine which prefix(es) to load based on mode
    # ---------------------------------------------------------------------------

    prefixes: dict[str, str] = {}

    if args.clipping:
        print("Loading workflow prefix...")
        prefixes["clipping"] = load_workflow_prefix(vault_root, source_type="clipping")
        print(f"  {len(prefixes['clipping']):,} chars across {len(CLIPPING_PREFIX_FILES)} files (Block 1, cached)")

    elif args.reference:
        print("Loading workflow prefix...")
        prefixes["reference"] = load_workflow_prefix(vault_root, source_type="reference")
        print(f"  {len(prefixes['reference']):,} chars across {len(REFERENCE_PREFIX_FILES)} files (Block 1, cached)")

    elif args.citekey:
        # Auto-detect source_type from which folder the note lives in
        ref_path = vault_root / "ReferenceNotes" / f"{args.citekey}.md"
        detected_st = "reference" if ref_path.exists() else "zotero"
        print("Loading workflow prefix...")
        prefixes[detected_st] = load_workflow_prefix(vault_root, source_type=detected_st)
        prefix_files = REFERENCE_PREFIX_FILES if detected_st == "reference" else PAPER_PREFIX_FILES
        print(f"  {len(prefixes[detected_st]):,} chars across {len(prefix_files)} files (Block 1, cached)")

    elif args.queued:
        # Pre-scan queues to load only the prefixes that are actually needed
        paper_cks = find_queued_papers(vault_root)
        ref_cks = find_queued_references(vault_root)
        if not paper_cks and not ref_cks:
            print("No queued papers or references found.")
            return
        print(f"\nFound {len(paper_cks)} queued paper(s), {len(ref_cks)} queued reference(s)")
        if paper_cks:
            print("Loading paper workflow prefix...")
            prefixes["zotero"] = load_workflow_prefix(vault_root, source_type="zotero")
            print(f"  {len(prefixes['zotero']):,} chars across {len(PAPER_PREFIX_FILES)} files (Block 1, cached)")
        if ref_cks:
            print("Loading reference workflow prefix...")
            prefixes["reference"] = load_workflow_prefix(vault_root, source_type="reference")
            print(f"  {len(prefixes['reference']):,} chars across {len(REFERENCE_PREFIX_FILES)} files (Block 1, cached)")

    print("Loading wiki context...")
    wiki_ctx = load_wiki_context(vault_root)
    print(f"  {len(wiki_ctx):,} chars (Block 3, uncached)")

    results: list[dict] = []

    if args.citekey:
        ref_path = vault_root / "ReferenceNotes" / f"{args.citekey}.md"
        source_type = "reference" if ref_path.exists() else "zotero"
        item_prefix = prefixes[source_type]

        if args.batch:
            results = run_batch(
                vault_root=vault_root,
                items=[{"citekey": args.citekey, "source_type": source_type}],
                client=client, model=args.model, prefixes=prefixes,
                wiki_context=wiki_ctx, deep=args.deep, dry_run=args.dry_run,
                poll_interval=args.batch_poll_interval, timeout=args.batch_timeout,
                debug=args.debug, no_reading_board=args.no_reading_board,
            )
        elif source_type == "reference":
            print(f"\nProcessing [reference]: {args.citekey}")
            results.append(process_reference_paper(
                vault_root=vault_root, citekey=args.citekey, client=client,
                model=args.model, workflow_prefix=item_prefix, wiki_context=wiki_ctx,
                dry_run=args.dry_run, debug=args.debug,
            ))
        else:
            print(f"\nProcessing: {args.citekey}")
            results.append(process_paper(
                vault_root=vault_root, citekey=args.citekey, client=client,
                model=args.model, workflow_prefix=item_prefix, wiki_context=wiki_ctx,
                deep=args.deep, dry_run=args.dry_run, debug=args.debug,
                no_reading_board=args.no_reading_board,
            ))

    elif args.reference:
        item_prefix = prefixes["reference"]
        print(f"\nProcessing [reference]: {args.reference}")
        if args.batch:
            results = run_batch(
                vault_root=vault_root,
                items=[{"citekey": args.reference, "source_type": "reference"}],
                client=client, model=args.model, prefixes=prefixes,
                wiki_context=wiki_ctx, deep=args.deep, dry_run=args.dry_run,
                poll_interval=args.batch_poll_interval, timeout=args.batch_timeout,
                debug=args.debug, no_reading_board=args.no_reading_board,
            )
        else:
            results.append(process_reference_paper(
                vault_root=vault_root, citekey=args.reference, client=client,
                model=args.model, workflow_prefix=item_prefix, wiki_context=wiki_ctx,
                dry_run=args.dry_run, debug=args.debug,
            ))

    elif args.queued:
        all_items = (
            [{"citekey": ck, "source_type": "zotero"} for ck in paper_cks]
            + [{"citekey": ck, "source_type": "reference"} for ck in ref_cks]
        )
        if args.batch:
            results = run_batch(
                vault_root=vault_root, items=all_items,
                client=client, model=args.model, prefixes=prefixes,
                wiki_context=wiki_ctx, deep=args.deep, dry_run=args.dry_run,
                poll_interval=args.batch_poll_interval, timeout=args.batch_timeout,
                debug=args.debug, no_reading_board=args.no_reading_board,
            )
        else:
            for i, item in enumerate(all_items, 1):
                ck = item["citekey"]
                st = item["source_type"]
                item_prefix = prefixes[st]
                ref_label = " [reference]" if st == "reference" else ""
                print(f"\n[{i}/{len(all_items)}] Processing{ref_label}: {ck}")
                if st == "reference":
                    results.append(process_reference_paper(
                        vault_root=vault_root, citekey=ck, client=client,
                        model=args.model, workflow_prefix=item_prefix, wiki_context=wiki_ctx,
                        dry_run=args.dry_run, debug=args.debug,
                    ))
                else:
                    results.append(process_paper(
                        vault_root=vault_root, citekey=ck, client=client,
                        model=args.model, workflow_prefix=item_prefix, wiki_context=wiki_ctx,
                        deep=args.deep, dry_run=args.dry_run, debug=args.debug,
                        no_reading_board=args.no_reading_board,
                    ))

    elif args.clipping:
        print(f"\nProcessing clipping: {args.clipping}")
        results.append(process_clipping(
            vault_root=vault_root, clipping_filename=args.clipping, client=client,
            model=args.model, workflow_prefix=prefixes["clipping"], wiki_context=wiki_ctx,
            deep=args.deep, dry_run=args.dry_run, debug=args.debug,
            no_reading_board=args.no_reading_board,
        ))

    print_summary(results)


if __name__ == "__main__":
    main()
