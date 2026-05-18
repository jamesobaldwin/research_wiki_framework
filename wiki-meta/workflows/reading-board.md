# Reading board workflow

This workflow covers all Claude interactions with `Reading.md`. Cards are appended here as the final step of the ingest pipelines for papers (`wiki-meta/workflows/paper-ingest.md`) and clippings (`wiki-meta/workflows/clipping-ingest.md`), performed by the note-finisher subagent. For the `read_status` field values on individual notes, see `wiki-meta/schemas/literature-notes.md`.

---

`Reading.md` is a Kanban-format file at the vault root, managed by the Obsidian Kanban plugin. It has five columns -- TBDR, TBR, Reading, Done, Dropped -- tracking the user's engagement intent for each literature note. It is loosely coupled with the `read_status` field on each note: Claude only touches it at processing time, never reconciles later.

**When to append a card**: after successfully processing a paper or clipping (setting `status: processed`), the note-finisher subagent appends exactly one card to either TBR or TBDR based on user signal at processing time. This is part of the final step in the ingest pipeline (step 8 of paper-ingest.md).

- **Default: TBR.** If the user said nothing specific about engagement level, the card goes in TBR. The note's `read_status` also stays at the import default of `TBR`.
- **TBDR on explicit request.** If the user said something like "mark for deep read", "this is a TBDR one", "deep-read this", or "high priority" at processing time, set `read_status: TBDR` in the note frontmatter AND append the card to the TBDR column. The two stay consistent at creation time.

**Card format**: `- [ ] [[citekey|Author Year]]`, e.g. `- [ ] [[filippRobustnessNeuralRatio2025|Filipp et al. 2025]]`. Append at the end of the relevant column section, before the next `##` heading.

**Batch processing**: When processing multiple queued papers ("process all queued papers"), ask once at the start whether any should be marked TBDR. The user can name specific citekeys, say "all TBR", or say "I'll decide later". If "I'll decide later", default everything to TBR; the user promotes manually afterward.

**Logging**: The `log.md` entry for a batch should mention how many cards went to TBR vs TBDR. For single-paper processing, the entry naturally records which column was used.

**Restrictions**:

- Never add a card to the Reading, Done, or Dropped columns. Those reflect user state transitions.
- Never move a card between columns once placed. Card position is user-managed after creation. (If the user later decides a TBR paper should be TBDR, they move the card themselves; Claude does not retroactively reconcile.)
- Never remove a card from any column.
- If `Reading.md` does not exist or does not have the expected columns, report this and skip the card-add step. Do not create the file or columns -- that is a setup task, not an ingest task.
