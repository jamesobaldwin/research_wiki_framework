# Dense inline linking and citation format

This fragment covers two concerns: dense inline linking (how thickly to wiki-link prose) and citation format (how to cite specific papers within prose). For decisions about whether a new term becomes a Concept page or a Glossary entry, see `wiki-meta/schemas/wiki-pages.md`.

---

## Dense inline linking

Every meaningful technical term gets a wiki-link on its **first appearance in a section**. The rule applies to any prose page in the wiki: literature notes, concept pages, glossary entries, project pages, and question pages. The aim is navigability: a reader should be able to follow links from any page to reach any concept it touches.

### What gets linked

- Named methods and algorithms: `[[score-based-generative-models|score matching]]`, `[[simulation-based-inference|NPE]]`
- Named datasets and surveys: `[[slacs-survey|SLACS]]`, `[[cosmos-galaxy-dataset|COSMOS]]`
- Named software and frameworks: `[[sbi-software-frameworks|sbi]]`, `[[sbi-software-frameworks|lampe]]`
- Named concepts with an existing page or a natural Glossary candidate: `[[variational-inference|variational inference]]`
- Named papers when making a specific attributable claim: `[[song2019scorebased|Song & Ermon 2019]]`

### What does not get linked

- Generic technical words not tied to a specific named concept: "model", "network", "prior", "latent"
- Terms already linked earlier in the same section (link once per section, not every occurrence)
- Inline math symbols

### Density expectation

- Literature note (fully processed): ~20--50 outgoing wiki-links
- Clipping: ~10--30 outgoing wiki-links
- Concept page: link to every related concept and every paper that introduces or substantively uses the concept
- Glossary entry: link to parent or sibling concepts and any papers that define or apply the term
- Project / question page: link to every concept, paper, and dataset the page draws on

Concept and glossary pages especially benefit from dense linking — they are the canonical pages for their terms, and their outgoing links are the primary way readers traverse the conceptual graph.

### Outgoing links to nonexistent pages

Links to pages that do not yet exist are intentional -- they mark "build this later." The linter tracks them. Do not remove them.

---

## Citation format

Inside a wiki page, cite a paper with a piped wiki-link, author-year display text, and an optional section or equation pointer:

- `[[song2021scoresbe|Song et al. 2021]], §3.2`
- `[[planck2018cosmology|Planck Collaboration 2018]], Eq. 12`

If two sources disagree, note the contradiction explicitly and link both.
If a claim has no source, mark it as `[needs verification]`.
