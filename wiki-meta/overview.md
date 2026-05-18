# Wiki overview

This fragment covers the cross-cutting concepts shared by every workflow: how things are named, how they're tagged, and how the master tables relate to source folders. For the canonical folder map, see the vault root `CLAUDE.md`.

---

## Identifiers and wiki-links

Papers are referenced by **citekey**: `[[song2021scoresbe]]` or, with display text, `[[song2021scoresbe|Song et al. 2021]]`. The citekey is durable; titles can change.

Concepts, datasets, projects, and questions are referenced by slugified filename: `[[score-matching]]`, `[[planck-2018]]`, `[[diffusion-for-cmb-foregrounds]]`.


## Tagging

Tags carry topic information so the type-based folder structure doesn't have to. Use a hierarchy:

- `ml/...` -- `ml/diffusion`, `ml/normalizing-flows`, `ml/sbi`, `ml/transformers`
- `cosmo/...` -- `cosmo/cmb`, `cosmo/lss`, `cosmo/inflation`
- `method/...` -- `method/score-matching`, `method/mcmc`, `method/vi`, `method/emulators`
- `dataset/...` -- `dataset/planck`, `dataset/quijote`

Add new tag subtrees as needed. Ask the user before introducing a new top-level prefix.

Type tags are one per page: `paper`, `concept`, `glossary`, `dataset`, `project`, `question`. The plugin already sets `paper` on literature notes.


## Note types

- **Literature notes** (`LiteratureNotes/`) — papers read analytically; `source_type: zotero` or `clipping`; full analytical body sections and `read_status` tracking. Schema: `wiki-meta/schemas/literature-notes.md`.
- **Reference notes** (`ReferenceNotes/`) — papers cited only for their datasets or infrastructure; `source_type: reference`; no analytical sections, no reading queue. Schema: `wiki-meta/schemas/reference-notes.md`.

## Primary files overview

Four primary tables live at the vault root — `CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`, `REFERENCENOTES.md` — and mirror their respective source folders. Each is a markdown table providing a flat, plain-English table of contents. For the full row format, sort order, and update rules, see `wiki-meta/schemas/master-files.md`.
