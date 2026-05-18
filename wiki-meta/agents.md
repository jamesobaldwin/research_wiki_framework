# Subagents

This project uses two Claude Code subagents (defined in `.claude/agents/`) to specialize routine work and keep main-agent context focused. The audit checks the wiki-linter runs are defined in `wiki-meta/workflows/linting.md`.

---

- **`wiki-linter`** (Haiku 4.5, read-only): runs the audit checks defined in `wiki-meta/workflows/linting.md`. Invoke when the user asks to lint, audit, or check the wiki. Returns a numbered list of findings.
- **`wiki-librarian`** (Sonnet 4.6, read-only): handles lookup-style questions where the user wants to know what the wiki contains about a topic without requesting new synthesis. Routes citekey queries through `rg`, conceptual queries through hybrid MCP search, and verifies all results against master tables. Distinguishes reference notes from literature notes in response labeling. Invoke for "what does the wiki say about X", "find pages mentioning Y", "list papers tagged Z".

The main agent (Opus 4.7) handles everything else directly:
- Paper enrichment and discussion (the user is collaborating; subagent isolation would break the flow)
- Concept, dataset, project, and question page creation (tightly coupled to paper analysis)
- Hard question answering that requires synthesis across multiple papers
- Link maintenance during paper ingest (the relevant context is already loaded)
- Index and log updates that flow out of any of the above

The librarian returns retrieval-shaped answers (what's already in the wiki); the main agent returns synthesis-shaped answers (what the wiki implies, combined, weighed against the user's research direction). If the librarian's output reveals that the user actually wanted synthesis, the main agent picks it up from there.

When in doubt about whether to delegate, ask the user.
