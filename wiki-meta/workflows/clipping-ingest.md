# Clipping ingest workflow

This workflow covers ingesting a Chrome-clipped web article from `Clippings/`. For the clipping frontmatter schema (slug rules, field definitions), see `wiki-meta/schemas/literature-notes.md` (clipping section). For batch queuing, note that clippings are triggered explicitly by the user, not auto-detected; see below.

**Never modify files in `Clippings/`.** They are sources of record, same as `Assets/`.

---

Web-article clippings (Distill papers, blog posts, web essays) saved by the Chrome extension to `Clippings/` follow a parallel path to Zotero papers. The analytical-note body is identical in structure; only the metadata handling and naming convention differ.

**Triggered explicitly by user.** Unlike Zotero papers, Claude does not auto-detect new clippings during a generic queue command. The user names the clipping ("process the new clipping `X.md`") or includes it in a mixed request ("process any queued papers and the new clippings in X.md and Y.md").

---

## Implementation

Clipping ingest is executed by `scripts/ingest.py --clipping <filename>`, invoked via shell by Claude Code. The script reads the clipping from `Clippings/`, auto-derives the citekey-style slug, makes a single API call with two-block caching (Block 1 = clipping workflow prefix; Block 2 = clipping markdown as a cached text block), and writes all outputs. The steps below are the specification the script implements.

Claude Code's role:
1. Briefly characterise the piece and the central claim (1–2 sentences) as a status update.
2. Shell out: `scripts/.venv/bin/python scripts/ingest.py --clipping <filename> [--deep]`
3. Report the summary (cost, new pages, slug used) back to the user.

The slug is printed by the script before any writes; in dry-run mode no files are touched.

---

## Model and cost

**Default model: `claude-sonnet-4-6`.** Clippings are typically smaller than PDFs, so costs run ~$0.20–$0.50 per clipping. Pass `--model claude-haiku-4-5-20251001` for shorter or less technical pieces.

---

## Steps

1. **Read the clipping from `Clippings/`.** It's already markdown — no extraction needed. Locate its frontmatter to extract author, title, year, source URL.

2. **Derive a citekey-style slug** from the clipping's frontmatter (see `wiki-meta/schemas/literature-notes.md`, clipping section, for the slug format). **Propose the slug to the user before creating the note.** They may want to adjust it.

3. **Brief report, then continue without gating.** In one short message, characterize the piece (research blog post / Distill-style explainer / opinion essay / technical tutorial / etc.) and the central claim in 1-2 sentences -- this is a status update, not a request for input. **Do not ask the user to confirm before continuing**; immediately proceed to step 4 in the same turn. The user can interrupt to specify focus areas if they want to redirect; otherwise full standard processing happens by default. Discussion mode (see `wiki-meta/workflows/paper-ingest.md`) is available if the user signals prior familiarity.

4. **Create the literature note** at `LiteratureNotes/<slug>.md` with `source_type: clipping` and the clipping-specific frontmatter. Strip wiki-link syntax from author names when copying -- `[[Chris Olah]]` becomes `Chris Olah`.

5. **Draft the body sections** (My summary, Key claims, Methods / technical details, Results, Caveats / limitations). "Methods / technical details" and "Results" may be light or empty for conceptual pieces. Aim for the same density and precision as paper ingest (see `wiki-meta/workflows/paper-ingest.md`, step 4). **Never touch the "PDF++ highlights and notes" section** (this body section exists in the shared schema even for clippings; leave it empty).

6. **Create supporting pages directly** if warranted. Use tier criteria from `wiki-meta/schemas/wiki-pages.md` (default to Glossary for definitional terms unless analytical depth clearly warrants Concept). Create Concept, Glossary, Dataset, or Question pages as appropriate.

7. **Write "Connections to my work" and "Related pages".** Ground connections in actual wiki content -- existing concept pages, related literature notes, themes from project and question pages. Do not fabricate connections by inventing user research interests. If the wiki is too thin to support meaningful connections for this clipping, write something modest rather than padding with weak or speculative claims.

8. **Decide relevance and topics.** Based on the full note content and wiki context, choose `relevance` (high | medium | low) and `topics` (list of tag-style labels, e.g. `[cosmology/gravitational-waves, ml/inference]`).

9. **Insert dense wiki-links throughout the note, including the abstract.** Link all named methods, algorithms, frameworks, datasets, papers (with citations), and technical terms on their first appearance in each section. Use `[[...]]` syntax. For the abstract: add links without changing any wording, punctuation, or structure. Target density: 20–50 outgoing links for a fully processed literature note.

10. **Set frontmatter fields**: `status: processed`, `relevance: <value from step 8>`, `topics: <list from step 8>`. Leave `read_status` at the import default of `TBR` unless the user explicitly requested `TBDR`. Never modify other frontmatter fields.

11. **Append a row to `LITERATURENOTES.md`** with the citation, one-sentence summary, and related concept slugs. Note explicitly that it's a clipping. Read the file first to find the chronological insertion point (rows are sorted by year). Update the `Last updated:` line.

12. **Append a TBR (or TBDR) card to `Reading.md`** using the format `- [ ] [[citekey|Author Year]]`. Append at the end of the relevant column section.

13. **Prepend a new `log.md` entry** (newest-first order). Format:
    ```
    ## <YYYY-MM-DD> -- Processed <slug> [clipping] (<Author(s)> <Year>)

    **Trigger**: clipping ingest workflow.

    **Literature note** (`LiteratureNotes/<slug>.md`):
    - <one-line description of sections written and frontmatter set>
    - Abstract linked.
    - Source URL: <source_url from frontmatter>

    **Updates**:
    - `LITERATURENOTES.md` — row added (clipping).
    - `Reading.md` — TBR card appended.
    <if new pages created: - New pages: <comma-separated list>. - `CONCEPTS.md` / `index.md` updated accordingly.>
    ```

14. **Update `index.md`** if new pages were created. Add bullets to the appropriate sections and bump the `**Last updated**:` line.

15. **Update `CONCEPTS.md`, `DATASETS.md`, or `Questions.md`** if pages of those types were created. Add rows with the slug, one-sentence summary, and source citation. Update `Last updated:` lines.

On completion the note is in the state `status: processed`, `read_status: TBR` (or `TBDR` if explicitly requested). The user updates `read_status` manually as they engage with the clipping.

A single clipping may touch 3-10 pages. That is normal.

See also: `wiki-meta/rules.md`.
