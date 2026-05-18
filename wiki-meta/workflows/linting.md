# Linting workflow

This workflow defines the audit checks that run when the user asks to lint, audit, or check the wiki. The checks cover frontmatter completeness, link health, state consistency, staleness, and master-file mirroring. The `wiki-linter` subagent runs this list and returns a numbered findings report; see `wiki-meta/agents.md`.

For required frontmatter fields, see `wiki-meta/schemas/literature-notes.md` and `wiki-meta/schemas/wiki-pages.md`. For master-file format, see `wiki-meta/schemas/master-files.md`.

---

When the user asks to lint or audit:

- Concept pages with zero inbound links -> flag as orphans.
- Concepts mentioned in paper notes but lacking their own page -> list as candidates.
- Two pages making contradictory claims -> flag the contradiction with quoted excerpts and source links.
- Papers older than ~5 years cited as state-of-the-art -> flag for review.
- Pages missing required frontmatter fields -> list. (Required fields: see `wiki-meta/schemas/literature-notes.md` and `wiki-meta/schemas/wiki-pages.md`.)
- Questions open longer than ~6 months -> list for triage (resolve, demote to backlog, or abandon).
- Pages present in `Concepts/`, `LiteratureNotes/`, or `Datasets/` but missing a row in the corresponding master file (`CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`) -> list. Also flag rows in a master file with no matching source page. (Master-file format: `wiki-meta/schemas/master-files.md`.)
- Literature notes with `status: queued` for more than 7 days -> flag as stale imports. Use the most recent dated entry in `log.md` referencing the citekey as a proxy for import time, or fall back to file mtime when available.
- Literature notes with `status: processed` and `read_status: TBR` for more than 90 days -> flag as triage candidates (processed but never engaged). Use the dated `Processed <citekey>` entry in `log.md` as the processing time.
- Literature notes with `status: queued` whose body sections (My summary, Key claims, Methods, Results, Caveats, Connections) contain content beyond the template placeholders -> flag as state mismatch (Claude processed but did not update the `status` field).
- Files in `Clippings/` with file mtime more than 30 days old and no corresponding literature note (no `.md` in `LiteratureNotes/` whose `clipping:` frontmatter field points at them) -> flag as "forgotten clippings: may have been imported but never told Claude to process".
- Literature notes missing the required `source_type` field -> flag.

Report findings as a numbered list with suggested actions.
