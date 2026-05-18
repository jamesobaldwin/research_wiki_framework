# Research Wiki Framework

A framework for building a personal research wiki where an LLM agent is the first reader of every paper. Inspired by [Andrej Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), adapted for academic literature: PDFs come in from Zotero (or web articles from a Chrome clipping extension), Claude Code extracts structured notes, and a small set of primary tables and cross-links keep everything navigable.

This repository is the **scaffolding** — schemas, workflows, scripts, Claude instructions, an Obsidian plugin, and an empty folder layout. The notes themselves live in your own private vault.

## Why

- **LLM as first reader.** Papers get read by Claude before they get read by you. The wiki is the artifact of that first pass — structured, dense in cross-links, and good enough to skim before you commit to a deep read.
- **Primary tables as source of truth.** Every literature note, reference note, concept page, and dataset page has exactly one row in a primary table (`LITERATURENOTES.md`, `REFERENCENOTES.md`, `CONCEPTS.md`, `DATASETS.md`). Citekey lookups and tier decisions resolve there, not by scanning the filesystem.
- **Hybrid retrieval.** Citekey queries route to `rg`; conceptual queries route to Smart Connections (embeddings) or `obsidian-hybrid-search` (BM25 + embeddings via MCP). The two retrieval modes are documented in `wiki-meta/retrieval.md` and benchmarked in `wiki-meta/retrieval-benchmark.md`.
- **Cost engineering.** Paper ingest uses Anthropic prompt caching with a fixed instruction prefix, so the per-paper cost is dominated by the PDF itself (typically <$0.50 for a 30-page paper). Batched runs reuse the cache across papers.
- **Typed note schemas.** Literature notes, reference notes (cited for datasets/infrastructure only), concept pages, glossary entries, dataset pages, projects, and questions each have a fixed frontmatter schema and required body sections — Claude's job is to fill them, not invent new shapes.

## What's in here

| Path | What it does |
|---|---|
| `CLAUDE.md` | Project-level instructions Claude Code loads on every session. Routing table for task-specific fragments. |
| `wiki-meta/rules.md` | Consolidated invariants Claude must respect (immutable frontmatter, no touching source PDFs, etc.). |
| `wiki-meta/schemas/` | Frontmatter and body-section schemas for every page type. |
| `wiki-meta/workflows/` | Step-by-step procedures for paper ingest, clipping ingest, linting, queue processing, etc. |
| `wiki-meta/style/linking.md` | Dense inline-linking conventions used in every note. |
| `wiki-meta/retrieval.md` | How `rg`, Smart Connections, and `obsidian-hybrid-search` are composed for search. |
| `wiki-meta/agents.md` | The two specialist subagents (`wiki-linter`, `wiki-librarian`) and when to delegate. |
| `scripts/ingest.py` | Paper-ingest CLI. Drives the Anthropic API end-to-end: PDF → analytical literature note + supporting concept/dataset pages + master-table rows + log entry. |
| `scripts/requirements.txt` | Python dependencies for `ingest.py`. |
| `.claude/agents/` | Subagent definitions for `wiki-linter` and `wiki-librarian`. |
| `.claude/settings.json` | A minimal baseline Claude Code permission allowlist. |
| `.obsidian/plugins/zotero_lit_wiki/` | The Zotero Literature Importer Obsidian plugin (source). Wraps Zotero's local API, generates the literature-note skeleton, and copies the PDF into `Assets/`. |
| `preamble.sty` | LaTeX preamble for the `obsidian-latex` plugin (math macros consistent across notes). |
| `LiteratureNotes/`, `ReferenceNotes/`, `Concepts/`, `Glossary/`, `Datasets/`, `Projects/`, `Questions/`, `Clippings/`, `Assets/` | Empty folder skeletons. |

## What's NOT in here

- Actual notes, papers, clippings, or images.
- Filled-in primary tables, indexes, or logs.
- Retrieval indexes (Smart Connections `.smart-env/`, obsidian-hybrid-search `.db`).
- Third-party Obsidian plugins (install via Obsidian's community-plugin UI).
- Personal Claude Code settings (`.claude/settings.local.json`).

This is the scaffolding. The content is mine, and it lives in a separate private repo.

## Getting started

1. **Clone this repo into a new Obsidian vault**, or copy its contents into an existing vault.

   ```bash
   git clone https://github.com/<your-handle>/research_wiki_framework.git my_research_wiki
   cd my_research_wiki
   ```

2. **Install Python dependencies for the ingest script.**

   ```bash
   cd scripts
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Set your Anthropic API key** in the environment used by Claude Code (or export it before running `scripts/ingest.py`):

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Install the Zotero Literature Importer plugin.** In Obsidian: Settings → Community plugins → Browse → enable Community plugins, then drop the `.obsidian/plugins/zotero_lit_wiki/` folder into your vault and toggle it on under "Installed plugins". Configure the Zotero local API URL (default `http://127.0.0.1:23119/api/users/0`).

5. **Install the retrieval plugins.** From Obsidian community plugins, install:
   - **Smart Connections** — semantic search via local embeddings.
   - **obsidian-hybrid-search** — BM25 + embedding hybrid retrieval, exposed via MCP. Configure exclusions (`OBSIDIAN_IGNORE_PATTERNS`) for `Assets/**`, `.claude/**`, `wiki-meta/**`, `scripts/**`, `.obsidian/**`. See `wiki-meta/retrieval.md`.

6. **(Optional) Install supporting plugins** that the workflows reference: `pdf-plus` (PDF annotation), `obsidian-kanban` (the Reading board), `obsidian-latex` (math macros via `preamble.sty`).

7. **Start ingesting papers.** Drop a PDF in `Assets/` and a corresponding note skeleton in `LiteratureNotes/` via the Zotero plugin, then run:

   ```bash
   scripts/.venv/bin/python scripts/ingest.py --citekey <your-citekey>
   ```

## Status

Personal project, not a polished product. No guaranteed support. Used by exactly one person (me) on one machine, so things that aren't important to me are unlikely to work — Windows paths, multi-vault setups, alternative LLM providers, etc.

Pull requests welcome but not promised to be reviewed. Issues helpful as feedback but I won't necessarily fix them.

## Credits

- [Andrej Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original idea: a wiki where the LLM is the curator.
- [Anthropic Claude](https://www.anthropic.com/) — the model doing the reading and writing.
- [Claude Code](https://claude.com/claude-code) — CLI runtime for the agent.
- [Obsidian](https://obsidian.md/) — the editor and graph.
- [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) — local-embedding semantic search.
- [obsidian-hybrid-search](https://github.com/) — hybrid BM25 + embedding retrieval exposed over MCP.

## License

[MIT](LICENSE).
