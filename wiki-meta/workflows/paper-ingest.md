
# Paper ingest workflow

This workflow covers ingesting a single Zotero-imported literature note. For the per-paper schemas (frontmatter fields, body sections, status semantics), see `wiki-meta/schemas/literature-notes.md`. For batch processing of many queued papers, see `wiki-meta/workflows/queue-processing.md`.

---

## Implementation

Paper ingest is executed by `scripts/ingest.py`, invoked via shell by Claude Code when the user requests paper processing. The script makes a single Anthropic API call per paper with two-block prompt caching (workflow prefix + PDF as a native document content block), then writes the full note, creates supporting pages, and updates all master files without further calls. The rest of this document — the steps, the rules, the schemas referenced — is the specification that script implements.

Claude Code's role in paper ingest:
1. Tell the user which paper is about to be processed (brief 1–2 sentence characterisation of type and central claim, derived from the PDF or from context).
2. Shell out: `scripts/.venv/bin/python scripts/ingest.py --citekey <citekey> [--deep] [--model <override>]`
3. Report the script's summary output (cost, cache hit rate, new pages created) back to the user.

Single-paper invocations stay synchronous by default. Pass `--batch` only when intentionally queuing a single paper for later (e.g. for testing the batch path).

Direct terminal invocation without Claude Code is fully supported; see `scripts/README.md`.

---

**Framing**: In this wiki the typical flow is *the script reads the paper first and produces the note*; the user reads the paper later (sometimes much later, sometimes not at all). The note functions as a structured first-reader output and reference-quality summary. If the user signals prior familiarity before invoking the script, Claude Code can discuss the paper first (Discussion mode below) before shelling out.

---

## Model and cost

**Default model: `claude-sonnet-4-6`.** Estimated cost per paper: ~$0.40–$0.80 with prompt caching enabled (Block 1 = workflow prefix cached across the run; Block 2 = PDF cached per paper).

**Cheaper alternative**: Pass `--model claude-haiku-4-5-20251001` for routine papers where depth is less critical (~5× cheaper).

**Reprocessing**: If the output is unsatisfactory, re-invoke the script. The script will overwrite the note (the PDF++ section is preserved).

---

## Steps

The user runs `Import Zotero paper into current vault` in Obsidian and gets a stub literature note. They then ask Claude to process it. All steps use the same model (Haiku 4.5 by default).

1. **Check `status` in the frontmatter.** (For the full state model, see `wiki-meta/schemas/literature-notes.md`.)
   - `status: queued` (first processing): skip reading the note -- the body is empty placeholders and the frontmatter duplicates the PDF metadata. Go straight to step 2.
   - `status: processed` (subsequent operation on an already-filled note): read the note first to preserve user edits and existing content. The "PDF++ highlights and notes" section is off-limits regardless.

2. **Read the PDF** at the path in the note's `pdf:` frontmatter field. Extract the central claim (1–2 sentences), paper type (theoretical / methods / empirical / review / software / etc.), key claims (3–6 specific, falsifiable claims), methods summary, results (quantitative where possible with metric and benchmark names), and caveats. Also identify candidate wiki terms that might warrant new Concept/Glossary/Dataset/Question pages.

3. **Brief report, then continue without gating.** In one short message, state the kind of paper and the central claim in 1-2 sentences -- this is a status update, not a request for input. **Do not ask the user to confirm before continuing**; immediately proceed to step 4 in the same turn. The user can interrupt to specify focus areas if they want to redirect; otherwise full standard processing happens by default. Do **not** ask the user what's novel, what's standard, what the central claim is, or what's suspicious -- those are questions Claude answers, not asks.

4. **Draft the five analytical body sections** (My summary, Key claims, Methods / technical details, Results, Caveats / limitations):
   - **My summary** (1 paragraph, 4–8 sentences): Central claim, approach, and key result for a reader who has not seen the paper.
   - **Key claims** (3–6 numbered bullets): Specific, falsifiable claims — not restatements of the abstract.
   - **Methods / technical details** (2–4 paragraphs): Approach, key equations (LaTeX), algorithm steps, architecture. Subsections OK for complex methods.
   - **Results** (1–2 paragraphs or a table): Quantitative results where possible; qualitative findings as prose. Include benchmark and metric name for every number.
   - **Caveats / limitations** (3–5 bulleted items): Scope, assumptions, what the paper does not show.

   Write in a precise, third-person academic style. No hedging filler. Prefer active voice. Stay inside what the paper claims — do not editorialize or contextualize beyond it. If you cannot support a claim from the paper, omit it rather than infer.

5. **Create supporting pages directly** if warranted. Use tier criteria from `wiki-meta/schemas/wiki-pages.md` (default to Glossary for definitional terms unless analytical depth clearly warrants Concept). Create any needed Concept, Glossary, Dataset, or Question pages. Do not propose — create directly. **Never touch the "PDF++ highlights and notes" section.**

6. **Write "Connections to my work" and "Related pages".** Ground connections in actual wiki content -- existing concept pages, related literature notes, themes from project and question pages. Do not fabricate connections by inventing user research interests. If the wiki is too thin to support meaningful connections for this paper, write something modest rather than padding with weak or speculative claims.

7. **Decide relevance and topics.** Based on the full note content and wiki context, choose `relevance` (high | medium | low) and `topics` (list of tag-style labels, e.g. `[ml/diffusion, method/flow-matching]`).

8. **Insert dense wiki-links throughout the note, including the abstract.** Link all named methods, algorithms, frameworks, datasets, papers (with citations), and technical terms on their first appearance in each section. Use `[[...]]` syntax. For the abstract: add links without changing any wording, punctuation, or structure. Target density: 20–50 outgoing links for a fully processed literature note.

9. **Set frontmatter fields**: `status: processed`, `relevance: <value from step 7>`, `topics: <list from step 7>`. Leave `read_status` at the import default of `TBR` unless the user explicitly requested `TBDR`. Never modify other frontmatter fields.

10. **Append a row to `LITERATURENOTES.md`** with the citation, one-sentence summary, and related concept slugs. Read the file first to find the chronological insertion point (rows are sorted by year). Update the `Last updated:` line.

11. **Append a TBR (or TBDR) card to `Reading.md`** using the format `- [ ] [[citekey|Author Year]]`. Append at the end of the relevant column section. Use `et al.` for three or more authors; list up to two names otherwise.

12. **Prepend a new `log.md` entry** (newest-first order). Format:
    ```
    ## <YYYY-MM-DD> -- Processed <citekey> (<Author(s)> <Year>)

    **Trigger**: paper ingest workflow.

    **Literature note** (`LiteratureNotes/<citekey>.md`):
    - <one-line description of sections written and frontmatter set>
    - Abstract linked.

    **Updates**:
    - `LITERATURENOTES.md` — row added.
    - `Reading.md` — TBR card appended.
    <if new pages created: - New pages: <comma-separated list>. - `CONCEPTS.md` / `index.md` updated accordingly.>
    ```

13. **Update `index.md`** if new pages were created. Add bullets to the appropriate sections (e.g., `## ML methods`, `## Glossary > Inference`) and bump the `**Last updated**:` line.

14. **Update `CONCEPTS.md`, `DATASETS.md`, or `Questions.md`** if pages of those types were created. Add rows with the slug, one-sentence summary, and source citation. Update `Last updated:` lines.

On completion the note is in the state `status: processed`, `read_status: TBR` (or `TBDR` if explicitly requested). The user updates `read_status` manually as they engage with the paper.

A single paper may touch 5-15 pages. That is normal.

See also: `wiki-meta/rules.md`.

---

## Discussion mode (opt-in)

If at processing time the user signals prior familiarity -- e.g. "I've already read this", "I have specific takeaways", "let's discuss the methods section before writing" -- replace step 3 with a discussion: surface what looks novel, what looks standard, what the central claim is, what's suspicious, then wait for the user's reading and align before writing. Once aligned, proceed to step 4. Discussion mode is opt-in; if the user does not signal familiarity, default mode applies.
