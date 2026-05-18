# Math conventions

Shared macros live in `preamble.sty` at the vault root, loaded by the Extended MathJax plugin. After editing `preamble.sty`, reload Obsidian to pick up changes.

---

Equations render via MathJax. Common macros are defined in `preamble.sty` at the vault root, loaded by the Extended MathJax plugin. After editing `preamble.sty`, reload Obsidian to pick up changes.

- Inline math: `$...$`. Display math: `$$...$$` on its own lines, with blank lines above and below.
- Multi-line derivations: use `\begin{aligned}...\end{aligned}` inside `$$...$$`. Avoid `\begin{equation}` -- aligned is more reliable in MathJax.
- For shared notation (`\LambdaCDM`, `\OmegaM`, `\Cl`, `\E`, `\KL`, etc.), use the macros from `preamble.sty`. Do not redefine these inline. When a notation shows up on three or more pages, add it to the preamble rather than retyping it.
- Macro names use no underscores even when the rendered form does: `\LambdaCDM`, not `\Lambda_CDM`. The macro definition handles the underscoring.
- Units: thin space before upright unit. The `\Mpc`, `\hMpc` macros already follow this; for one-offs write `\,\mathrm{eV}`, `\,\mathrm{km\,s^{-1}}`, etc.
- Upright subscripts for non-variable labels: use `\mathrm{}`, not `\text{}` — `\text{}` fails when subscripts contain commas or math commands in Obsidian MathJax. Simple example: `T_\mathrm{CMB}`, not `T_{CMB}`. The cosmology macros already follow this. Group multi-label subscripts in one `\mathrm{}` separated by commas: `\Sigma_\mathrm{sub,pop}`. When a math variable must follow a labeled subscript, place it outside `\mathrm{}`, comma-separated within a braced group: `\Sigma_{\mathrm{sub,pop},\sigma}` — never inside `\mathrm{}`.
- Number equations within a single note using `\tag{}` when they will be referenced later in the same note: `$$ \dots \tag{1} $$`. MathJax does not support cross-note `\ref{}` in Obsidian -- reference equations in other notes as plain text: `Eq. (6) of [[song2021scoresbe]]`.
- When transcribing an equation from a paper, include the source equation number as an HTML comment immediately after: `$$ \dots $$  <!-- Song et al. 2021, Eq. 6 -->`. This makes later verification trivial.
