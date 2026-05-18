# scripts/ingest.py — LLM Wiki paper ingest

Processes Zotero-imported papers and Chrome-clipped articles using the Anthropic API.
Makes a single API call per paper with two-block prompt caching, writes the full note,
creates supporting pages, and updates all master files in one shot.

Claude Code invokes this script when the user says "process this paper" or similar.
Direct terminal invocation is equally supported.

---

## Setup

Requires [uv](https://github.com/astral-sh/uv). Run once from the vault root:

```bash
uv venv scripts/.venv
uv pip install -r scripts/requirements.txt --python scripts/.venv/bin/python
```

Set your API key — either as an environment variable or as a file (the script checks both):

```bash
# Option A: environment variable (per-session)
export ANTHROPIC_API_KEY=sk-ant-...

# Option B: key file (persistent — read once at startup, no activation step needed)
mkdir -p ~/.anthropic && echo "sk-ant-..." > ~/.anthropic/api_key
```

The venv lives at `scripts/.venv` and is gitignored. All invocations below use its Python directly; no activation step needed.

---

## Usage

```
scripts/.venv/bin/python scripts/ingest.py --citekey <key>              # process one paper (auto-detects reference vs literature)
scripts/.venv/bin/python scripts/ingest.py --reference <key>            # process one reference note (targets ReferenceNotes/)
scripts/.venv/bin/python scripts/ingest.py --queued                     # process all queued notes (literature + reference, mixed OK)
scripts/.venv/bin/python scripts/ingest.py --queued --batch             # process mixed queue via Batch API (50% off)
scripts/.venv/bin/python scripts/ingest.py --clipping <filename>        # process a clipping from Clippings/
scripts/.venv/bin/python scripts/ingest.py --citekey <key> --dry-run    # preview without writing
scripts/.venv/bin/python scripts/ingest.py --citekey <key> --deep       # mark Reading.md card as TBDR (literature notes only)
scripts/.venv/bin/python scripts/ingest.py --citekey <key> --model claude-haiku-4-5-20251001
scripts/.venv/bin/python scripts/ingest.py --queued --vault-root /path/to/vault
scripts/.venv/bin/python scripts/ingest.py --batch-resume msgbatch_abc123   # resume a disconnected batch
```

Equivalent with `uv run`:
```
uv run --python scripts/.venv/bin/python scripts/ingest.py --citekey <key>
```

### Examples

```bash
# Process a single paper (auto-detects literature vs reference by checking both folders)
scripts/.venv/bin/python scripts/ingest.py --citekey song2021scoresbe

# Process a reference note explicitly (targets ReferenceNotes/)
scripts/.venv/bin/python scripts/ingest.py --reference villaescusa-navarro2021CAMELS

# Process the full queue (all status: queued notes, literature and reference mixed)
scripts/.venv/bin/python scripts/ingest.py --queued

# Process a Chrome-clipped article
scripts/.venv/bin/python scripts/ingest.py --clipping "some-article-2024-05-01.md"

# Preview what would happen (no API call, no writes)
scripts/.venv/bin/python scripts/ingest.py --citekey bfn_xue2024 --dry-run
scripts/.venv/bin/python scripts/ingest.py --reference camels2021 --dry-run

# Use Haiku for a cheaper pass
scripts/.venv/bin/python scripts/ingest.py --citekey bfn_xue2024 --model claude-haiku-4-5-20251001
```

---

## Batch processing

Pass `--batch` with `--queued` (or `--citekey` for testing) to submit via the Anthropic Batch API instead of the synchronous messages endpoint. The Batch API applies a **50% discount** on all token costs; prompt caching discounts stack on top for additional savings. Target cost: ~$0.10–0.15/paper for batch queue runs vs ~$0.20–0.30 synchronous.

```bash
# Process the full queue via Batch API
scripts/.venv/bin/python scripts/ingest.py --queued --batch

# Resume a batch job after disconnecting
scripts/.venv/bin/python scripts/ingest.py --batch-resume msgbatch_abc123
```

**SLA**: Batches typically complete in minutes for small queues but may take up to 24 hours under load. The script polls every 60 seconds (override with `--batch-poll-interval`) and prints a progress line each poll. If the process is killed, the batch continues on Anthropic's infrastructure — use `--batch-resume <id>` to pick up. The batch ID and resume command are printed at submission time.

**Batch vs synchronous**: Use batch for queues of 3+ papers where ~1-minute latency per paper is acceptable. Single-paper interactive ingest should remain synchronous (no `--batch`). Clippings always run synchronously; `--clipping --batch` is an error.

**Polling and timeout**: `--batch-poll-interval <sec>` (default 60) and `--batch-timeout <sec>` (default 86400 = 24h). If timeout is reached, the batch ID is printed and the process exits — use `--batch-resume` to continue.

---

## What it does

For each paper, the script:

1. Loads the workflow prefix (CLAUDE.md + workflow files + schemas) as a **cached Block 1**. Literature notes and reference notes use separate prefixes (different schema files); both are loaded lazily only if the corresponding type appears in the queue.
2. Loads the PDF as an Anthropic document content block with `cache_control: ephemeral` as **cached Block 2**.
3. Sends the current note state + wiki context (index.md, CONCEPTS.md, Glossary slugs) as **uncached Block 3**.
4. Makes one API call. The model returns:
   - **Literature notes**: full note body (abstract + five analytical sections + connections/related) plus JSON with relevance, topics, new pages, and master-file update data.
   - **Reference notes**: lighter note body (abstract + datasets + methods/techniques if central + "Cited by my work") plus JSON with datasets, new `Datasets/` pages, and conservative `Concepts/` rows.
5. Writes to disk: updated note, any new Concept/Glossary/Dataset/Question pages, primary-table row, log.md entry, and index.md updates.
   - **Literature notes only**: Reading.md card appended, LITERATURENOTES.md row added.
   - **Reference notes only**: REFERENCENOTES.md row added; no Reading.md card.

Hard invariants: source-supplied frontmatter fields are never modified, the PDF++ section is preserved, `read_status` is never set on reference notes, Assets/ and Clippings/ are never written.

---

## Cost and caching

Default model is `claude-sonnet-4-6`. At the end of each run the script prints a cost summary with token counts and cache hit rate. The workflow prefix (Block 1) stays warm across all papers in a single `--queued` run; the PDF (Block 2) stays warm within a single paper's call.

To reduce cost on simpler papers, pass `--model claude-haiku-4-5-20251001`.

Pricing constants are in `MODEL_PRICING` near the top of `ingest.py`. Update them if rates change.

---

## Output format contract

The model must respond with exactly:

```xml
<note-body>
... full note content ...
</note-body>

<structured-output>
{ JSON object with relevance, topics, new_pages, index_entries, ... }
</structured-output>
```

If the model omits or malforms the `<structured-output>` section the script warns and continues (the note body is written, master file updates are skipped for the malformed fields). Check the summary for any warnings.

---

## Adding new models

Add a pricing entry to `MODEL_PRICING` in `ingest.py`:

```python
"claude-new-model-id": {
    "input": X.XX / 1_000_000,
    "output": X.XX / 1_000_000,
    "cache_write": X.XX / 1_000_000,
    "cache_read": X.XX / 1_000_000,
},
```
