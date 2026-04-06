# Audit: Page Limit & Structure (RC-2, RC-17, RC-18)

**Reviewer:** Editorial Reviewer (Re-review)
**Date:** 2026-04-06
**Scope:** Page budget, section opening variety, semantic macro usage

---

## Summary

The paper compiles to 15 PDF pages. With references (~1.5pp) and appendix (~0.5pp) excluded, the body is approximately **13 pages** — right at the USENIX Security limit. RC-17 (section openings) is fully addressed with varied, descriptive openings. RC-18 (semantic macros) remains unaddressed: all five statistical macros are defined but unused.

---

## RC-2: Page Limit — EFFECTIVELY ADDRESSED

**Verdict: Body is ~13 pages, at the USENIX 13-page limit.**

Compiled PDF (`main.pdf`) is **15 pages** (from `main.log:1599: Output written on main.pdf (15 pages, 312659 bytes)`).

| Section | Estimated pages |
|---------|:--------------:|
| Body (Abstract through Conclusion + Acknowledgments) | ~13 |
| References (50 cited entries in `plain` style) | ~1.5 |
| Appendix (3 short sections) | ~0.5 |
| **Total** | **~15** |

The original meta-review estimated ~18 pages. The paper was appropriately scoped down:
- 1 model (GPT-4o-mini) instead of 4
- 220 cells (22 x 2 x 5) instead of 9,120
- Compound analysis: short future-work section (~35 lines)
- Ablation: short future-work note (~8 lines)
- 6 results sections kept but compact (49-57 lines each with 1 table)

**Caveat:** At 13 pages, there is no room for additions (failure rate table for RC-13, expanded power analysis). Any additions require compensating cuts.

**Severity: LOW** — No longer blocking.

---

## RC-17: Results Section Openings — ADDRESSED

**Verdict: Openings are now varied and descriptive.**

The meta-review flagged mechanical pattern: *"This section reports results for the N [category] scenarios: ..."*

Current openings:

| Section | Opening |
|---------|---------|
| CI | "The four content injection scenarios target hidden instructions embedded in rendered content." |
| SM | "The four semantic manipulation scenarios bias agent decision-making through framing effects rather than explicit injected instructions." |
| CS | "The four cognitive state scenarios target the agent's knowledge retrieval pipeline rather than its instruction processing." |
| BC | "The four behavioural control scenarios exploit the agent's interaction with UI elements and structured interfaces." |
| SY | "The three systemic scenarios exploit multi-agent topologies enabled by the A2A protocol..." |
| HitL | "The three human-in-the-loop scenarios test whether the agent produces biased outputs..." |

Each opening characterizes the attack mechanism distinctively. The pattern "The N [category] scenarios [verb]..." is present but with varied verbs (target, bias, exploit, test) and descriptive qualifiers.

**Severity: NONE** — Fully addressed.

---

## RC-18: Semantic Macro Usage — NOT ADDRESSED

**Verdict: All five statistical macros are defined but unused.**

`main.tex` defines:
- `\pval{}`: p-value formatting (line 54)
- `\cohend{}`: Cohen's d formatting (line 55)
- `\ci{}{}`: Confidence interval (line 56)
- `\meanstd{}{}`: Mean +/- std (line 57)
- `\sig`: Significance marker (line 58)

**Usage count across all .tex files: ZERO.** Every table uses raw LaTeX:
- Cohen's d: `1.03`, `$\infty$`, `$-.63` instead of `\cohend{1.03}`
- p-values: `0.033`, `1.000` instead of `\pval{0.033}`
- Discussion prose: ` = 1.03$` instead of `\cohend{1.03}`

Semantic macros enable global formatting changes without per-file edits.

**Severity: LOW** — Tables render correctly; this is a maintainability concern.

---

## Additional Formatting Observations

1. **No compilation warnings:** 0 undefined citation or reference warnings
2. **Author email:** Fixed (`aviral.dua@proton.me`, was placeholder)
3. **Zenodo DOI:** Fixed (`10.5281/zenodo.15186230`, was placeholder)
4. **No remaining TBD placeholders** in any .tex file
5. **bibliography.bib end comment** says "53 entries total" — actually 65 entries

---

## Acceptance Criteria Status

- [x] **RC-2**: Body is ~13 pages at USENIX limit (major improvement from ~18pp estimate)
- [x] **RC-17**: Results section openings are varied with descriptive phrasing
- [ ] **RC-18**: Semantic macros remain unused — all tables use raw LaTeX
- [x] **No remaining [TBD] placeholders** in any .tex file
- [x] **Zenodo DOI and author email** populated
