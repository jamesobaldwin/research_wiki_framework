# Semantic and hybrid retrieval

The wiki uses a two-tool retrieval system. Smart Connections serves human-facing semantic discovery inside Obsidian; the `obsidian-hybrid-search` MCP server plus `rg` serves the `wiki-librarian` subagent. Both systems are local-only, offline, and zero API cost. Retrieval is never the source of truth — always verify against the master tables (`CONCEPTS.md`, `LITERATURENOTES.md`, `DATASETS.md`) before acting on any result.

## Phase 1 — Smart Connections (human discovery)

Smart Connections provides semantic similarity search directly in the Obsidian sidebar.

**Configuration**:
- **Plugin**: Smart Connections (free tier; Pro features not used).
- **Embedding model**: `transformers - TaylorAI/bge-micro-v2` (local, on-device, zero API cost).
- **Indexed**: vault root plus `LiteratureNotes/`, `Concepts/`, `Glossary/`, `Datasets/`, `Projects/`, `Questions/`.
- **Excluded** (Smart Environment → Manage excluded folders): `Assets/`, `Clippings/`, `.claude/`, `wiki-meta/`, `scripts/`.
- **Known limitation**: Smart Environment cannot exclude individual files at vault root, so the master tables and `index.md`/`log.md` remain indexed. Surface noise from these is tolerable.

**When to use**:
1. Dedup check before creating a Concept or Glossary page — if an existing page scores ~0.80+, link to it instead.
2. Discovery while reading or writing — the sidebar surfaces related notes that explicit wiki-links may have missed.
3. Link-density sanity check — if a freshly processed note's top neighbors don't appear among its outgoing wiki-links, revisit the linking pass.

**When not to use**: As a substitute for the master tables when checking whether a page exists; as a citation-provenance tool; inside `scripts/ingest.py` (the script doesn't call Smart Connections).

**Re-index**: Smart Environment → Sources → Reset data → Re-import. Safe; touches no vault files. Trigger after batch ingests or after changing excluded folders.

## Phase 2 — Librarian backend (`obsidian-hybrid-search` MCP + `rg`)

The `wiki-librarian` subagent uses a two-pronged retrieval backend introduced in May 2026.

### Why hybrid retrieval

BM25 lexical search handles exact slug and citekey-token matches; semantic embedding handles open-ended conceptual queries; RRF (Reciprocal Rank Fusion) merges both ranked lists. Fuzzy title matching adds resilience to near-miss spellings. Pure semantic alone underperforms on short identifiers (citekeys, concept slugs); pure BM25 alone misses paraphrase and synonymy. `obsidian-hybrid-search` provides all three in a single MCP server without requiring a remote API.

### MCP server configuration

- **Config location**: `.mcp.json` at vault root.
- **Embedding model**: `Xenova/all-MiniLM-L6-v2` (local, Transformers.js, zero API cost).
- **Indexed**: `LiteratureNotes/`, `ReferenceNotes/`, `Concepts/`, `Glossary/`, `Datasets/`, `Projects/`, `Questions/`, `Clippings/`. Reference notes are indexed alongside literature notes; Clippings are included for richer source-language retrieval over web-article text.
- **Excluded**: `Assets/`, `.claude/`, `wiki-meta/`, `scripts/`, `.obsidian/`, `*.canvas`, `preamble.sty`.

### Tools the librarian uses

| Tool | Purpose |
|---|---|
| `search` | Hybrid BM25 + semantic + fuzzy-title query across the vault |
| `read` | Fetch full content of one or more files by path |
| `status` | Check index health and last-updated timestamp |
| `reindex` | Rebuild the index — call **only on explicit user request**, never proactively |

### Routing rule: citekey queries go through `rg`

`obsidian-hybrid-search` uses a subword tokeniser that splits on digits and short tokens; citekey patterns like `barco2025` or `distrib_shift_barco2025` tokenise poorly and produce weak BM25 scores. The librarian routes these through `rg` instead.

**Routing decision**: if the query string matches the pattern `^[a-z]+[a-z0-9_]*\d{4}[a-z0-9_]*$`, or if it *contains* a whitespace-delimited token matching that pattern, route through `rg` against `LiteratureNotes/`, `ReferenceNotes/`, `Concepts/`, `Glossary/`, `Datasets/`, `Projects/`, `Questions/`, `Clippings/`. For all other queries, use MCP `search`.

### Mandatory verification

Before returning any result, the librarian must cross-check filenames and citekeys against the master tables (`LITERATURENOTES.md`, `REFERENCENOTES.md`, `CONCEPTS.md`, `DATASETS.md`). Retrieval results name candidates; master tables confirm existence and canonical identity.

**Reference note verification**: Papers found in `ReferenceNotes/` must be verified against `REFERENCENOTES.md` (not `LITERATURENOTES.md`). Reference notes are papers cited for datasets or infrastructure only, not for analytical reading. The librarian must label such results as `[reference]` to distinguish them from literature notes that support analytical discussion.

## Phase 3 — Custom indexer (deferred, ~100 papers)

If `obsidian-hybrid-search` + `rg` proves insufficient at scale — poor recall, latency, or degraded citekey coverage — a custom `scripts/search.py` indexer may be built. This phase is deferred until the vault reaches approximately 100 literature notes, at which point a retrieval benchmark run (see `wiki-meta/retrieval-benchmark.md`) will determine whether an upgrade is warranted.

## Maintenance

### Reindexing

| System | How | When |
|---|---|---|
| Smart Connections | Smart Environment → Sources → Reset data → Re-import | After batch ingests; after exclusion changes; if results look stale |
| obsidian-hybrid-search | User asks Claude to trigger `reindex` via librarian, or restart the MCP server | After batch ingests of ~10+ papers; after MCP server config changes |

### Retrieval benchmark

After any significant change (batch ingest of ~10+ papers, backend or exclusion change, update to this file), rerun the queries in `wiki-meta/retrieval-benchmark.md` and verify that expected top-5 hits still appear. If recall degrades, reindex and retry; if the problem persists, consider advancing to Phase 3.

Retrieval is never the source of truth. Master tables are.
