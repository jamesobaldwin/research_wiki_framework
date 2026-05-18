


# Rules

This fragment is the consolidated authoritative list of all hard and soft rules for maintaining the wiki. Many rules are duplicated inline at the workflow or schema where they fire; this list is the canonical reference. Cross-references indicate where each rule is most likely to apply.

---

- Never modify files in `Assets/`. They are sources of record.
- Never modify files in `Clippings/`. They are sources of record, same as `Assets/`. → `wiki-meta/workflows/clipping-ingest.md`
- Never overwrite a literature note's source-supplied frontmatter once set. For Zotero notes that means title, citekey, zotero_*, source_type, authors, year, date, publication, doi, url, pdf. For clippings that means title, slug, source_type, authors, year, clipping, source_url, accessed. User-managed fields (`status`, `read_status`, `relevance`, `topics`, `tags`) are the exceptions, each governed by its own rule. → `wiki-meta/schemas/literature-notes.md`
- Every literature note has a `source_type` field (`zotero` or `clipping`). Never omit it. → `wiki-meta/schemas/literature-notes.md`
- For clippings, derive the filename from a citekey-style slug (lowercase first-author surname + title keywords + year). Strip wiki-link syntax from author names when copying the `authors:` field into the literature note. → `wiki-meta/workflows/clipping-ingest.md`
- Never touch the "PDF++ highlights and notes" section of a literature note. → `wiki-meta/workflows/paper-ingest.md`
- The abstract body of a literature note is **not immutable**. Adding wiki-links to the abstract is required (dense-linking rule applies from the abstract onward). Do not alter the abstract's wording, punctuation, or structure — only insert `[[...]]` links. The source-frontmatter immutability rule covers frontmatter fields only, not the abstract body. → `wiki-meta/workflows/paper-ingest.md` step 5
- Never modify the `read_status` field on a literature note after initial paper processing. At processing time, set it to `TBDR` only when the user explicitly directs it (see `wiki-meta/workflows/reading-board.md`); otherwise leave it at the import default of `TBR`. After that, the field is user-managed. → `wiki-meta/workflows/paper-ingest.md`, `wiki-meta/workflows/clipping-ingest.md`, `wiki-meta/workflows/reading-board.md`
- Never modify `Reading.md` except to append a card to TBR or TBDR after processing a paper. Card movement between columns is user-managed. (If the user later decides a TBR paper should be TBDR, they move the card themselves; Claude does not retroactively reconcile.) → `wiki-meta/workflows/reading-board.md`
- Reference notes (`source_type: reference`, in `ReferenceNotes/`) never have a `read_status` field, never receive a `Reading.md` card on ingest, and never contain analytical sections (no "Connections to my work," no "My summary," no "Key claims," etc.). → `wiki-meta/schemas/reference-notes.md`
- Always update `index.md` and `log.md` after changes.
- Always update the relevant master file (`CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`) when a page is added, removed, or substantively revised. See `wiki-meta/schemas/master-files.md` for format.
- Page filenames are lowercase with hyphens. Literature notes are the exception: Zotero notes use the citekey, clippings use a citekey-style slug. → `wiki-meta/overview.md`
- During paper ingest, create supporting Concept, Glossary, Dataset, and Question pages directly when warranted. Default new definitional pages to Glossary tier unless analytical depth clearly warrants Concepts. Report what was created, but do not wait for user approval. → `wiki-meta/workflows/paper-ingest.md`, `.claude/agents/note-drafter.md`
- When uncertain about categorization or tagging, ask. → `wiki-meta/overview.md`
- Write in clear, plain language. Math is welcome where it earns its place.
- **Link densely**: every meaningful technical term gets a wiki-link on its first appearance in a section. See `wiki-meta/style/linking.md`.
- **Default new definitional pages to Glossary/** unless analytical depth clearly warrants Concepts/. Promote or demote later. → `wiki-meta/schemas/wiki-pages.md`
- **Architecture variants stay inside the parent Concept page** as subsections, even when they have their own Glossary entry. Never spawn a Concept page for a subset of an existing architecture or method family. → `wiki-meta/schemas/wiki-pages.md`
- **Outgoing links to nonexistent pages are intentional.** Do not remove them; they are a build queue for future pages. → `wiki-meta/style/linking.md`
