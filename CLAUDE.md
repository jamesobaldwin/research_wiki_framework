# LLM Wiki — Research Edition

A personal knowledge base for PhD research at the intersection of machine learning and cosmology. Maintained by Claude Code, curated by the user. Patterned on Andrej Karpathy's LLM Wiki idea, adapted for academic literature.

Two sources feed literature notes: the Zotero Literature Importer plugin (PDFs of papers, dropped in `Assets/`) and a Chrome extension that saves web articles as markdown (dropped in `Clippings/`). Claude's job is to enrich the resulting notes, extract concepts, link everything together, and keep the wiki coherent.


## Folder structure

```
LiteratureNotes/    -- plugin-managed; one .md per paper, named by citekey (Zotero) or citekey-style slug (clipping)
ReferenceNotes/     -- script-managed; one .md per reference paper (datasets/infrastructure only), named by Zotero citekey
Assets/              -- plugin-managed; PDFs, named by citekey. Treat as immutable.
Clippings/           -- Chrome extension drops web-article markdown files here.
                        Treat as immutable, same as Assets/.
Concepts/            -- Claude-managed; one .md per method, idea, or entity
Glossary/            -- Claude-managed; short definitional pages for the lexicon
Datasets/            -- Claude-managed; one .md per dataset or simulation suite
Projects/            -- Claude-managed; one .md per active research thread
Questions/           -- Claude-managed; one .md per open question
index.md             -- Claude-maintained map of the wiki
log.md               -- Claude-maintained append-only change record
CONCEPTS.md          -- Claude-maintained primary table of all concept pages
LITERATURENOTES.md   -- Claude-maintained primary table of all literature notes
DATASETS.md          -- Claude-maintained primary table of all dataset pages
REFERENCENOTES.md    -- Claude-maintained primary table of all reference notes
Reading.md           -- user-managed Kanban board (Obsidian Kanban plugin); Claude only appends cards in TBR/TBDR on paper processing
```

The all-caps filenames flag the three master tables; see `wiki-meta/schemas/master-files.md` for the format. `Reading.md` is the reading-intent Kanban board; see `wiki-meta/workflows/reading-board.md`.

All folders sit at the vault root. Page filenames are lowercase with hyphens, except literature notes (which use a Zotero citekey or a citekey-style slug for clippings).


## State model

Every literature note has three independent state fields. Their ownership and allowed values:

| Field | Values | Owner | When Claude may set it |
|---|---|---|---|
| `source_type` | `zotero`, `clipping` | Import process | Set by import; immutable thereafter. Required on every literature note. |
| `status` | `queued`, `processed` | Claude | Set to `processed` after filling in analytical sections. |
| `read_status` | `TBR`, `TBDR`, `skimmed`, `read`, `deep-read` | User | Only at initial processing: leave at the import default `TBR`, or set to `TBDR` on explicit user request. Never modify afterwards. |

Full schema: `wiki-meta/schemas/literature-notes.md`.

Reference notes (papers cited only for their datasets or infrastructure) use a two-property variant of this model — `source_type` and `status` only; no `read_status`. See `wiki-meta/schemas/reference-notes.md`.


## Hard rules — never violate these

- Never modify files in `Assets/` or `Clippings/`. They are sources of record.
- Never overwrite a literature note's source-supplied frontmatter once set. (Full list of source-supplied fields per source_type: `wiki-meta/schemas/literature-notes.md`.)
- Never touch the "PDF++ highlights and notes" section of a literature note.
- Never modify `read_status` after initial paper processing.
- Never modify `Reading.md` except to append a card to TBR or TBDR after processing a paper. Card movement and removal are user-managed.
- Every literature note must have a `source_type` field (`zotero` or `clipping`).
- Always update `index.md`, `log.md`, and the relevant master file after substantive changes.
- During paper and clipping ingest: create supporting concept, dataset, and question pages directly when warranted, using tier criteria from `wiki-meta/schemas/wiki-pages.md`. Outside ingest workflows: propose new pages before creating them.

Full rules with rationale and cross-references: `wiki-meta/rules.md`.


## Paper processing

Paper and clipping ingest run via `scripts/ingest.py`. Claude Code's role is to:
1. Talk to the user, characterise the paper in 1–2 sentences, handle any pre-processing discussion.
2. Invoke the script via shell: `scripts/.venv/bin/python scripts/ingest.py --citekey <key>` (or `--queued` / `--clipping <file>`).
3. Report the script's summary output (cost, new pages, cache hit rate) back to the user.

The script handles all API calls, file writes, and master-file updates. Claude Code does not re-implement any of that logic. See `scripts/README.md` for CLI usage and `wiki-meta/workflows/paper-ingest.md` for the full specification the script implements.


## Working in this wiki

For task-specific guidance, load the relevant fragment:

| Task | Fragment |
|---|---|
| Wiki layout, identifiers, tagging, master-files overview | `wiki-meta/overview.md` |
| Ingesting a Zotero-imported paper | `wiki-meta/workflows/paper-ingest.md` |
| Ingesting a Chrome-clipped web article | `wiki-meta/workflows/clipping-ingest.md` |
| Processing many papers in sequence (the queue) | `wiki-meta/workflows/queue-processing.md` |
| Reading-board (`Reading.md`) card management | `wiki-meta/workflows/reading-board.md` |
| Creating a concept page outside paper ingest, or answering a user question | `wiki-meta/workflows/non-paper-tasks.md` |
| Linting / auditing the wiki | `wiki-meta/workflows/linting.md` |
| Literature-note schema (frontmatter, body sections, source_type variants) | `wiki-meta/schemas/literature-notes.md` |
| Concept / glossary / dataset / project / question page schemas + tier decisions | `wiki-meta/schemas/wiki-pages.md` |
| Master-files schema (`CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`) | `wiki-meta/schemas/master-files.md` |
| Dense inline linking + citation format | `wiki-meta/style/linking.md` |
| Math conventions | `wiki-meta/style/math.md` |
| Reference-note schema (frontmatter, body sections, ingest behavior) | `wiki-meta/schemas/reference-notes.md` |
| Subagents (wiki-linter, wiki-librarian) and delegation | `wiki-meta/agents.md` |
| Consolidated rules list | `wiki-meta/rules.md` |
| Semantic and hybrid retrieval (Smart Connections, obsidian-hybrid-search) | `wiki-meta/retrieval.md` |
| Retrieval quality benchmark and rerun criteria | `wiki-meta/retrieval-benchmark.md` |
