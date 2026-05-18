# Queue processing workflow

This workflow describes how to process many queued Zotero-imported papers in sequence. The per-paper steps live in `wiki-meta/workflows/paper-ingest.md`; this fragment covers the batch-level coordination. Note: clippings are not auto-detected as part of the queue — they must be named explicitly by the user (see `wiki-meta/workflows/clipping-ingest.md`).

---

When the user asks to "process all queued papers", "work through the queue", or similar:

1. Enumerate all literature notes with `status: queued` by running `scripts/.venv/bin/python scripts/ingest.py --queued --dry-run` (or by scanning `LiteratureNotes/` directly).
2. Report the list to the user (citekey, title, year) and wait for confirmation or scope adjustments before proceeding. The user may want to skip some or reorder.
3. Run the queue: `scripts/.venv/bin/python scripts/ingest.py --queued --batch [--model <override>]`. The default for queue runs is `--batch` to capture the 50% Batch API discount (stacks with prompt caching). Use `--queued` without `--batch` only if you need synchronous (immediate) results. The script prints the batch ID and a resume command at submission time; if disconnected, run `scripts/.venv/bin/python scripts/ingest.py --batch-resume <batch_id>` to pick up where it left off.
4. After the run completes, report the summary output from the script (cost per paper, total cost, new pages created, cache hit rates), then hand back to the user for review and any follow-up.
5. For long queues (5+ papers) consider processing in small batches so the user can review output between batches.

**Batch reading-board question**: Before processing the first paper, ask once whether any papers should be marked TBDR. See `wiki-meta/workflows/reading-board.md` (Batch processing section) for the protocol.
