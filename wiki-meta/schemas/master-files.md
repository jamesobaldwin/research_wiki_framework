# Primary files schema

The primary tables (`CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`, `REFERENCENOTES.md`) mirror their source folders and provide flat plain-English tables of contents. This fragment covers their format, sort order, and update rules.

---

Four primary tables live at the vault root and provide scrollable, plain-English overviews of the wiki's contents:

- `CONCEPTS.md` -- one row per page in `Concepts/`
- `LITERATURENOTES.md` -- one row per page in `LiteratureNotes/`
- `DATASETS.md` -- one row per page in `Datasets/`
- `REFERENCENOTES.md` -- one row per page in `ReferenceNotes/`

Each is a three-column markdown table with a `**Last updated**: YYYY-MM-DD` line above it.

**Columns**:

1. **Display name** -- a piped wiki-link to the source page, with the display text in plain English (not the slugified filename or citekey).
   - `CONCEPTS.md` / `DATASETS.md`: `[[slug\|Plain English name]]`
   - `LITERATURENOTES.md`: `[[citekey\|Paper title in plain English]] -- Author Year` (lowercase after the first word, in the form of a readable sentence)
2. **Description** -- one sentence in plain English about what the page is or does. Two sentences only when genuinely necessary.
3. **Cross-links** -- piped wiki-links to the most directly related pages:
   - `CONCEPTS.md`: literature notes cited as key references on the concept page (author-year display text)
   - `LITERATURENOTES.md`: concept pages the paper touches
   - `DATASETS.md`: literature notes that use the dataset (author-year display text)
   - `REFERENCENOTES.md`: `Datasets/` pages introduced or used by the reference paper (dataset slug display text)

**`REFERENCENOTES.md` columns**:

`REFERENCENOTES.md` uses a five-column table (wider than the standard three, because datasets are the primary cross-link):

| Column | Content |
|---|---|
| `citekey` | `[[citekey\|Author Year]]` — piped wiki-link to the reference note |
| `title` | Short plain-English title (may be truncated) |
| `authors` | First author et al. |
| `year` | Publication year (integer) |
| `datasets` | Comma-separated piped wiki-links to `Datasets/` pages introduced or used: `[[dataset-slug\|Name]], [[dataset-slug-2\|Name 2]]` |
| `status` | `queued` or `processed` |

Sort order: chronological by year, ties broken by first-author surname.

**Sort order**:

- `CONCEPTS.md`, `DATASETS.md`, `REFERENCENOTES.md`: alphabetical by display name (REFERENCENOTES.md: by first-author surname)
- `LITERATURENOTES.md`: chronological by publication year (ties broken by date or first-author surname); surfaces the methodological lineage as the reader scrolls

**Formatting notes**:

- Escape pipes inside wiki-links as `\|` so the table renders correctly: `[[citekey\|Display]]`.
- Math in cells is fine -- MathJax renders inside Obsidian tables.
- Update the `**Last updated**: YYYY-MM-DD` line whenever you add or revise a row.

**When to update**:

- New concept, dataset, or literature note created -> add its row to the corresponding master file.
- A page's summary or scope changes substantively -> revise its row.
- A concept gains a new key reference, or a dataset gains a new user paper -> update the cross-links column on that row.
- A page is removed -> remove its row.
