# Non-paper tasks: concept creation and question answering

This file covers two related but distinct workflows that arise outside of paper ingest: (a) creating a concept page when explicitly requested or as a spinout from a completed paper, and (b) answering a user's question by reading wiki pages, with the option to file the answer back as a new page. For page templates and tier criteria, see `wiki-meta/schemas/wiki-pages.md`. For dense linking conventions, see `wiki-meta/style/linking.md`.

---

## Creating a concept page

Only create when:
- The concept came up in a paper or clipping being processed (the note-drafter subagent creates supporting pages directly during ingest; see `wiki-meta/workflows/paper-ingest.md`, step 4 and `wiki-meta/workflows/clipping-ingest.md`, step 3), OR
- The user explicitly requested a new concept page outside of ingest.

**For ad-hoc concept creation (outside ingest workflows): propose before creating.** Do not auto-spawn concept pages from non-ingest interactions. Get explicit user approval first.

Concept pages should have inbound links from at least one literature note. A concept with no papers behind it is a question, not a concept -- file it under `Questions/` instead (see the Question page template in `wiki-meta/schemas/wiki-pages.md`).

When a new concept or dataset page is created outside of the paper-ingest workflow, add a row to `CONCEPTS.md` / `DATASETS.md` as part of the same change; see `wiki-meta/schemas/master-files.md` for format.

## Answering questions

1. Read `index.md` to locate relevant pages.
2. Read those pages and synthesize an answer.
3. Cite specific wiki pages with wiki-links.
4. If the answer is not in the wiki, say so clearly. Only crawl PDFs in `Assets/` if the user explicitly asks.
5. If the answer is non-trivial, offer to file it back into the wiki -- as a new concept page, a section in an existing page, or a question (if it raised more than it answered). See `wiki-meta/schemas/wiki-pages.md` for the relevant templates.
