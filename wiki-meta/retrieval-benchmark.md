# Retrieval benchmark

A reproducible test suite for the wiki's hybrid retrieval system. Rerun after:
- Batch ingests of ~10 or more new papers.
- Any change to the retrieval backend (exclusions, embedding model, MCP config).
- Any update to `wiki-meta/retrieval.md`.

For each query: run it through the specified backend, confirm the expected results appear in the top 5. If they don't, reindex and retry; if the problem persists, update `wiki-meta/retrieval.md` and consider advancing to Phase 3.

---

## Query 1 — Citekey exact lookup

**Query**: `filipp2025`  
**Backend route**: `rg` (matches citekey pattern `^[a-z]+[a-z0-9_]*\d{4}[a-z0-9_]*$`)  
**Expected in top 5**:
- `LiteratureNotes/robsutness_nre_npe_filipp2025.md`
- `Concepts/prior-misspecification.md` (mentions citekey in body)
- `Concepts/simulation-based-inference.md`

**What this tests**: Basic citekey-to-filename resolution via `rg`. This query should NOT go to MCP `search` — validates the routing rule fires on a bare year-suffix token.

---

## Query 2 — Exact concept slug

**Query**: `prior-misspecification`  
**Backend route**: MCP `search` (no citekey token; fuzzy-title + BM25 channels carry the load)  
**Expected in top 5**:
- `Concepts/prior-misspecification.md`
- `LiteratureNotes/distrib_shift_barco2025.md`
- `LiteratureNotes/robsutness_nre_npe_filipp2025.md`
- `LiteratureNotes/info_gap_legin2025.md`

**What this tests**: Exact slug match via the fuzzy-title channel. The concept page should rank first; the literature notes that link to it should cluster immediately behind it.

---

## Query 3 — Open-ended conceptual fan-out

**Query**: `iterative prior correction misspecified Bayesian inverse problem`  
**Backend route**: MCP `search` (no citekey token; semantic channel carries the load)  
**Expected in top 5**:
- `LiteratureNotes/distrib_shift_barco2025.md`
- `Concepts/prior-misspecification.md`
- `LiteratureNotes/info_gap_legin2025.md`
- `LiteratureNotes/robsutness_nre_npe_filipp2025.md`

**What this tests**: Semantic recall over conceptual prose — a paraphrase of the paper's core contribution that uses neither its title nor its citekey. Validates that embedding recall is broad enough for the prior-misspecification cluster.

---

## Query 4 — Fuzzy title / near-miss spelling

**Query**: `TARP coverage test posterior calibration`  
**Backend route**: MCP `search` (no citekey token)  
**Expected in top 5**:
- `LiteratureNotes/tarp_lemos2023.md`
- `Concepts/statistical-tests-for-distributions.md`
- `LiteratureNotes/detect_model_miss_schmitt2024.md`
- `LiteratureNotes/pqmass_lemos2025.md`

**What this tests**: Fuzzy title + BM25 resilience when the user writes a partial title or synonym ("calibration" rather than "accuracy testing"). Also validates multi-paper fan-out across the diagnostic cluster.

---

## Query 5 — Citekey token inside a longer query

**Query**: `cranmer2020 review simulation based inference`  
**Backend route**: `rg` (contains token `cranmer2020` matching the citekey pattern)  
**Expected in top 5**:
- `LiteratureNotes/cranmer2020FrontierSimulationbasedInference.md`
- `Concepts/simulation-based-inference.md`
- `Concepts/sbi-software-frameworks.md`

**What this tests**: Mixed query where a citekey token triggers `rg` routing even though the surrounding words are conceptual. Validates that the token-level pattern check fires correctly inside a natural-language query, not just for bare-citekey inputs.

---

## Query 6 — Reference note lookup (pending first reference ingest)

**Query**: `camels2021`  
**Backend route**: `rg` (matches citekey pattern)  
**Expected in top 5**:
- `ReferenceNotes/camels2021.md` (marked as `[reference]`)
- Any concept or literature notes that cite the CAMELS suite

**What this tests**: Basic reference-note retrieval and labeling. This query is marked pending until the first reference note is ingested (see `ReferenceNotes/` folder). Once reference notes are available, run this query and verify that (1) the reference note appears in results, (2) it is labeled `[reference]` to distinguish it from literature notes, and (3) it verifies against `REFERENCENOTES.md` rather than `LITERATURENOTES.md`.
