# Reference note schema

This is the canonical schema for files in `ReferenceNotes/`. Reference notes are a lighter counterpart to literature notes, designed for papers that exist in the wiki as citable sources for their datasets, simulation suites, or infrastructure — not as objects of close analytical reading. For the `REFERENCENOTES.md` row format, see `wiki-meta/schemas/master-files.md`. For the full literature-note schema, see `wiki-meta/schemas/literature-notes.md`.

---

## Purpose

Reference notes cover papers cited in the wiki primarily because they introduce or describe a dataset, simulation suite, or research infrastructure (examples: CAMELS, DESI, IllustrisTNG, the LtU-ILI framework). The key distinction from literature notes is intent: a reference note exists so the wiki can link to the paper as provenance for a `Datasets/` or `Concepts/` page, not because the paper is a subject of reading or analysis. Reference notes never receive analytical sections, reading-queue entries, or `read_status` tracking. If a paper later warrants close reading, it can be promoted to a literature note (see the promotion path below).

Create a reference note when: a paper is cited in the wiki solely or primarily for its dataset or infrastructure contribution; no analytical engagement is expected; and a full literature note would be overkill.

## Folder and naming

- **Folder**: `ReferenceNotes/` (vault root, sibling of `LiteratureNotes/`).
- **Filename**: the Zotero citekey, e.g. `ReferenceNotes/villaescusa-navarro2021CAMELS.md`. Same convention as Zotero literature notes.
- All reference notes come from Zotero. There is no clipping variant.

## Frontmatter schema

### Source-supplied fields (immutable after import)

Set by the import process; must never be overwritten.

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Full paper title |
| `authors` | string | yes | Plain string, e.g. `"Villaescusa-Navarro et al."` |
| `year` | integer | yes | Publication year |
| `citekey` | string | yes | Zotero citekey; matches filename |
| `source_type` | `reference` | yes | Always `reference` for this schema |
| `doi` | string | no | DOI if available |
| `arxiv_id` | string | no | arXiv ID if available |
| `url` | string | no | Canonical URL |
| `venue` | string | no | Journal, conference, or preprint server |

### Script-managed fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | `queued` \| `processed` | yes | Set to `processed` after body sections are filled in |
| `topics` | list | no | Subject tags; same vocabulary as literature notes |
| `tags` | list | no | Type tag; should be `[reference]` |

### Fields NOT present on reference notes

Do not add these to a reference note:
- `read_status` — not applicable; reference notes are never queued for reading
- `relevance` — not applicable
- Any paraphrased-abstract field — the abstract goes verbatim in the body

## Body sections

Sections appear in this order. All body prose follows the dense-linking conventions in `wiki-meta/style/linking.md`.

### 1. Abstract

The verbatim abstract as extracted from the PDF. Do not paraphrase or summarize. Insert `[[wiki-links]]` for the first occurrence of each meaningful technical term within this section, but do not otherwise alter the wording, punctuation, or structure.

### 2. Datasets / simulations

**First-class section** — this is the primary value of a reference note. List each dataset or simulation suite the paper introduces or significantly describes. Each entry links to a `Datasets/` page. If the page does not yet exist, create it during ingest.

```
- [[dataset-slug|Dataset Name]] — one sentence describing what it is and why it matters.
```

Ingest is aggressive here: create a `Datasets/` page for every distinct dataset or suite mentioned that does not already have one.

### 3. Methods or techniques introduced

**Second-class section** — populate only if the paper introduces a method or technique that is central to its contribution AND likely to be referenced elsewhere in the wiki. Each entry links to a `Concepts/` or `Glossary/` page. Be conservative: standard background techniques (MCMC, ΛCDM, N-body integration) do not belong here.

```
- [[concept-or-glossary-slug|Name]] — one sentence describing what it is.
```

If this section is empty, write `None.`

### 4. Cited by my work

A list of literature notes that cite this reference note. Populated automatically by ingest when a processed literature note references this paper; starts empty for a newly imported reference.

```
- [[citekey|Author Year]] — one phrase giving context for why it is cited
```

If no literature notes cite it yet, write `None yet.`

### 5. PDF++ highlights and notes

User-only. Never modified by Claude. Placeholder for annotations made in the PDF++ Obsidian plugin. Leave empty on creation.

## What the body must NOT contain

- A "Connections to my work" section
- An analytical summary, key claims, or methods-section analysis
- A "Caveats / limitations" section
- Any paraphrased or synthetic abstract
- Reading-queue or reading-status annotations

## State model

Reference notes use a two-property model — a strict subset of the literature-note three-property model:

| Field | Values | Owner | Notes |
|---|---|---|---|
| `source_type` | `reference` | Import process | Set on import; immutable thereafter |
| `status` | `queued` \| `processed` | Script (Claude) | Set to `processed` after body sections are filled in |

`read_status` is absent by design. Reference notes are never queued for reading and never appear on `Reading.md`.

## Immutability rules

- Source-supplied frontmatter (title, authors, year, citekey, source_type, doi, arxiv_id, url, venue) is immutable once set by the import process.
- The "PDF++ highlights and notes" section is user-only and must never be modified by Claude.
- Files in `Assets/` (the associated PDFs) remain immutable as always.

## Promotion path

If a reference paper later warrants close analytical reading, promote it to a literature note (manual operation, not automated):

1. Move `ReferenceNotes/<citekey>.md` to `LiteratureNotes/<citekey>.md`.
2. Change `source_type: reference` to `source_type: zotero`.
3. Add `read_status: TBR` (or `TBDR` on explicit user request).
4. Add the analytical body sections that a full literature note requires: My summary, Key claims, Methods / technical details, Results, Caveats / limitations, Connections to my work, Related pages.
5. Append a `Reading.md` card to TBR (or TBDR).
6. Update `LITERATURENOTES.md` (add the row) and `REFERENCENOTES.md` (remove the row).
7. Log the change in `log.md`.
