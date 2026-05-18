# Wiki page schemas

This fragment covers the schemas for non-literature wiki pages. It has two parts: (1) tier decisions — which page type to use for a new term or concept; (2) per-page-type templates. Body prose for all page types follows the dense linking conventions; see `wiki-meta/style/linking.md`. For the master-file row format that accompanies new concept and dataset pages, see `wiki-meta/schemas/master-files.md`.

---

## Concepts/ vs Glossary/ tier

| | Glossary/ | Concepts/ |
|---|---|---|
| Length | One paragraph + optional equation | Multi-paragraph analytical treatment |
| Contents | Definition, notation, one or two key references | Motivation, mechanism, variants, open questions |
| Default | Yes -- when uncertain, file here | Only when depth is clearly warranted |

**Architecture variants and method-family subsets** (e.g. SNPE within NPE, SNRE within NRE, FMPE within flow matching) never get a standalone Concept page. A Glossary entry is acceptable for the short-form lookup, but the parent Concept page must also gain a subsection describing the variant: what it changes vs the parent, when to prefer it, and key references. The comparison and analytical treatment lives in one place; the Glossary entry is just a navigation handle.

Promote a Glossary page to Concepts/ when it grows beyond ~6 paragraphs or when a paper analysis requires it. Demote a Concepts/ stub to Glossary/ if it never grows past two paragraphs.

---

## Concept page

Body prose follows the dense linking conventions; see `wiki-meta/style/linking.md`.

````markdown
---
type: concept
topics: [ml/diffusion]
tags:
  - concept
last_updated: YYYY-MM-DD
---

# Concept Name

**Summary**: One to two sentences.
**Status**: stub | active | comprehensive

---

## What it is

Plain-language definition. Math is fine but should be motivated.

## Why it matters

Why this concept is relevant to research at the ML/cosmology intersection.

## Key references

- [[citekey|Author Year]] -- what this paper contributes to the concept
- [[citekey|Author Year]] -- ...

## Related concepts

- [[other-concept]]

## Open questions

- [[question-page]]
````

## Glossary entry

Body prose follows the dense linking conventions; see `wiki-meta/style/linking.md`.

````markdown
---
type: glossary
topics: []
tags:
  - glossary
last_updated: YYYY-MM-DD
---

# Term

**Definition**: One sentence.

---

One paragraph. Math is welcome where it earns its place.

$$
\text{equation if applicable}
$$

## Key references

- [[citekey|Author Year]] -- what this source contributes to the term

## Related

- [[concept-page]]
- [[other-glossary-term]]
````

## Dataset page

````markdown
---
type: dataset
topics: [cosmo/cmb]
tags:
  - dataset
last_updated: YYYY-MM-DD
---

# Dataset Name

**Summary**: One sentence.
**Access**: URL or instructions.
**Size / format**: ...

---

## Overview

What this dataset is, who produced it, what it covers.

## What it's used for in the literature

- [[citekey|Author Year]] -- application

## Gotchas / known issues

Sample-variance limits, selection effects, masking, calibration quirks, etc.

## Related concepts

- [[concept-page]]
````

## Project page

Body prose follows the dense linking conventions; see `wiki-meta/style/linking.md`.

````markdown
---
type: project
status: active   # active | paused | done | shelved
topics: []
tags:
  - project
started: YYYY-MM-DD
last_updated: YYYY-MM-DD
---

# Project Name

**Goal**: One sentence.
**Current status**: One paragraph.

---

## Background

## Approach

## Relevant papers

- [[citekey|Author Year]] -- why relevant

## Relevant concepts

- [[concept-page]]

## Open questions

- [[question-page]]

## Log

- YYYY-MM-DD: what happened
````

## Question page

Body prose follows the dense linking conventions; see `wiki-meta/style/linking.md`.

````markdown
---
type: question
status: open    # open | answered | abandoned
topics: []
tags:
  - question
created: YYYY-MM-DD
---

# Question phrased as a question

**Context**: Where this came from -- which paper, which conversation, which project.

---

## Why I care

## What I've considered so far

## Related material

- [[citekey|Author Year]]
- [[concept-page]]

## Resolution

(Fill in if/when answered.)
````
