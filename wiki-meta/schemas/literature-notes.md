# Literature note schema

This is the canonical schema for files in `LiteratureNotes/`. The body schema is shared across both `source_type` values; frontmatter differs by source. For the `LITERATURENOTES.md` row format, see `wiki-meta/schemas/master-files.md`.

Papers cited only for their datasets or infrastructure — never for analytical reading — use a separate, lighter schema: see `wiki-meta/schemas/reference-notes.md`. The `source_type` field on a literature note is restricted to `zotero` or `clipping`; the value `reference` belongs exclusively to reference notes in `ReferenceNotes/`.

---

Literature notes live in `LiteratureNotes/` and cover any kind of paper-shaped reading -- Zotero-imported journal articles and web-clipped essays alike. Every note carries a required `source_type` field with two allowed values: `zotero` or `clipping`. The body schema is the same for both; the frontmatter differs.

**Body sections** (both source types): Abstract (Zotero) or the article's first heading (clipping), My summary, Key claims, Methods / technical details, Results, Caveats / limitations, Connections to my work, Related pages, PDF++ highlights and notes. For clippings, "Methods / technical details" and "Results" may be light or empty when the piece is conceptual rather than experimental -- that is expected.

Body prose in all sections follows the dense linking conventions; see `wiki-meta/style/linking.md`.

**User-managed fields** (both source types): `status`, `read_status`, `relevance`, `topics`, `tags`.

- `status` is Claude-owned. Values: `queued` (note exists, Claude has not filled in analytical sections yet) or `processed` (Claude has filled them in). Claude sets this during processing.
- `read_status` is user-owned. Values: `TBR` (to be read), `TBDR` (to be deep-read), `skimmed`, `read`, `deep-read`. Claude never modifies this field after initial processing. Default at import is `TBR`.

## `source_type: zotero` frontmatter

Produced by the Zotero Literature Importer plugin from a template stored in plugin settings.

- Frontmatter: `title`, `citekey`, `zotero_item_key`, `zotero_attachment_key`, `source_type: zotero`, `authors`, `year`, `date`, `publication`, `doi`, `url`, `pdf`, `status`, `read_status`, `relevance`, `topics`, `tags: [paper]`
- Filename: the Zotero citekey, e.g. `LiteratureNotes/song2021scoresbe.md`.

The plugin-supplied fields (title, citekey, zotero_*, source_type, authors, year, date, publication, doi, url, pdf) are immutable. Claude fills section bodies (except PDF++ highlights) and the empty user-managed fields `status` (set to `processed`), `relevance`, and `topics` during processing.

## `source_type: clipping` frontmatter

For web articles saved by the Chrome extension to `Clippings/`.

- Frontmatter: `title`, `slug` (citekey-style identifier, see below), `source_type: clipping`, `authors` (plain string -- wiki-link syntax stripped), `year` (publication year if known, else the year from the clipping's `created:` field), `clipping: "[[Clippings/<filename>]]"` (analog of `pdf:`), `source_url` (from the clipping's `source:` field), `accessed` (date from the clipping's `created:` field -- when the user clipped it), `status`, `read_status`, `relevance`, `topics`, `tags: [paper]`
- Filename: `LiteratureNotes/<slug>.md`, matching the citekey-style naming used for Zotero papers.

The slug is a citekey-style identifier: lowercase first-author surname + key title word(s) + year. Example: `olahZoomInCircuits2020` for "Zoom In: An Introduction to Circuits" by Chris Olah, year 2020. If multiple authors, use the first. If no publication year is available, fall back to the year from `created:`. Claude proposes the slug before creating the note. Strip wiki-link syntax from author names when copying -- `[[Chris Olah]]` becomes `Chris Olah`.

Once set, the source-supplied frontmatter (everything above except `status`, `read_status`, `relevance`, `topics`, `tags`) is immutable.
