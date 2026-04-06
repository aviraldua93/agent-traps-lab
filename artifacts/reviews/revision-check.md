# Revision Verification Check — "From Taxonomy to Testbed"

**Role:** Revision Checker
**Date:** 2026-04-06
**Meta-Review Reference:** `artifacts/reviews/meta-review.md`
**Paper Version:** Pre-revision (original submission draft)

---

## Summary

This verification check assesses the current paper draft against all 18 required changes identified in the meta-review. **All items fail.** No revisions have been made since the specialist reviews were completed. The paper remains in its original draft state with all ~327 TBD placeholders, no structural reorganization, and no statistical methodology corrections. A full revision cycle is required before resubmission.

---

## Verification Checklist

### CRITICAL Items

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-1 | Populate all experimental data (~327 TBD cells) | **FAIL** | `results/` directory is empty. All section files still contain TBD: results-content-injection.tex (16 lines), results-semantic-manipulation.tex (12), results-cognitive-state.tex (8), results-behavioural-control.tex (8), results-systemic.tex (8), results-human-in-the-loop.tex (6), compound-analysis.tex (16), mitigations-ablation.tex (10). methodology.tex has 1 `\placeholder{X}` for GPU-hours. Zenodo DOI remains `XX.XXXX/zenodo.XXXXXXX`. | **Gating blocker.** No experiments have been executed. The entire `results/` directory is empty. Must run `bun run src/harness/runner.ts` (or equivalent) to generate data. |
| RC-2 | Address page limit (~18pp vs 13pp USENIX limit) | **FAIL** | Paper structure unchanged: 15 numbered sections (§1–§15), 6 separate results sections (§5–§10), 11+ tables, 2 figures. No consolidation or appendix migration visible. | Recommend merging §5–§10 into a single "Results" section with subsections, moving per-scenario detail tables to an appendix. |
| RC-3 | Add 95% CI columns to all results tables | **FAIL** | `grep` for `\ci{` across all section files returns 0 matches. No table contains a confidence interval column. The `\ci` macro is defined in main.tex but never used in the paper body. | Every results table needs a CI column. Use Wilson intervals for proportion data. |
| RC-4 | Define super-additivity test procedure in §4.4 and §11 | **FAIL** | compound-analysis.tex mentions "super-additive" 5 times and references a "†" significance marker, but no formal test specification exists. No definition of paired differences, no one-sided test specification, no Bonferroni correction for k=15 compound comparisons. §4.4 in methodology.tex does not reference compound tests at all. | Must add to §4.4: "For compound pairs, we compute d_i = τ_{A+B,i} − max(τ_{A,i}, τ_{B,i}) and test H₀: median(d) ≤ 0 using one-sided Wilcoxon with Bonferroni k=15." |

### MAJOR Items

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-5 | Add power analysis subsection | **FAIL** | `grep` for "power analysis" and "sample size justification" in methodology.tex returns 0 matches. No §4.5 or equivalent subsection exists. | Must add post-hoc or a priori power calculation. At n=10, α=0.00227: power ≈ 12–15% for d=0.5. Consider increasing n or switching to Holm-Bonferroni/BH FDR. |
| RC-6 | Add p-value and Cohen's d columns to per-category tables | **FAIL** | `grep` for `\pval{` and `\cohend{` across section files returns 0 matches. Per-category results tables (§5–§10) show only mean±std columns with no paired comparison statistics. | Each table needs Wilcoxon p-value and Cohen's d columns for baseline vs. hardened. |
| RC-7 | Address hardened condition confound (add prompt-only condition or acknowledge) | **FAIL** | `grep` for "prompt-only" and "prompt only" returns 0 matches. §4.2 describes only 3 conditions (baseline, hardened, ablated). Discussion §13.4 does not mention the confound. | Either add a 4th "prompt-only" condition or add explicit confound acknowledgment to limitations. |
| RC-8 | Define Bonferroni correction families explicitly | **FAIL** | methodology.tex describes Bonferroni with k=22 scenarios but does not specify: (a) whether correction is per-model or pooled across models, (b) separate family for compound (k=15), (c) separate family for ablation (k=7). | Must define each comparison family explicitly in §4.4. |
| RC-9 | Fix numerical inconsistencies in related-work.tex | **FAIL** | related-work.tex:182 still reads "2,640 main runs, plus 600 compound" — both numbers are incorrect (should be 1,760 and 1,200 respectively). | Simple text fix: 2,640→1,760, 600→1,200. Cross-check: 1,760+6,160+1,200=9,120 ✓. |
| RC-10 | Add missing seminal references | **FAIL** | `grep` for "Wallace", "Zeng", "Shen", "Shafahi" in paper/ returns 0 matches. None of the 4 identified missing references have been added. `deng2024masterkey` remains uncited in the body text. | Add Wallace et al. 2019, Zeng et al. 2024, Shen et al. 2024, Shafahi et al. 2018 to bibliography and cite in §14. |
| RC-11 | Address tool-use attack gap | **FAIL** | related-work.tex:170 mentions AgentDojo's "tool-use scenarios" in passing. results-content-injection.tex:101 mentions "LLM tool-use" once. No explicit scoping discussion or new scenarios added. | Must either add tool-use scenarios or add a paragraph in §3 or §13 explicitly scoping the paper to environmental/contextual attacks and justifying exclusion of tool-use. |
| RC-12 | Use exact Wilcoxon test for n=10 | **FAIL** | No changes detected to `src/harness/metrics.ts`. The implementation still uses the normal approximation (z-score) without continuity correction or exact permutation tables. Tie-handling still uses consecutive ranks instead of average ranks. | Must implement exact permutation p-values or add continuity correction. Fix tie-handling to use average ranks. |

### MINOR Items

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-13 | Report failure/timeout rates per scenario | **FAIL** | No exclusion rate table or discussion found in methodology or results sections. | Add table showing timeout/error rates per scenario. Discuss MCAR vs. systematic missingness. |
| RC-14 | Clarify seeding vs. LLM determinism | **FAIL** | methodology.tex still implies "deterministic seed" ensures reproducibility without clarifying that T=0.7 makes LLM outputs non-deterministic. | Add clarification sentence: "Seeds ensure reproducible assignment; LLM outputs are stochastic at T=0.7." |
| RC-15 | Fix Perez & Ribeiro attribution | **FAIL** | related-work.tex:20-21 still attributes formalization of prompt injection to Perez & Ribeiro (HackAPrompt competition). | Correct attribution; HackAPrompt is a competition, not a formalization. |
| RC-16 | Remove duplicate bibliography entries | **FAIL** | No changes to bibliography.bib. `carroll2024ai` and `park2024ai` still both present. Orphaned entries remain. | Remove duplicates, clean up uncited entries. |
| RC-17 | Vary results section openings | **FAIL** | All six results sections (§5–§10) still open with the identical pattern "This section reports results for the N [category] scenarios...". | Vary the opening structure across sections for readability. |
| RC-18 | Use defined semantic macros in data tables | **FAIL** | `\pval{}`, `\cohend{}`, `\ci{}{}`, `\meanstd{}{}`, and `\sig` remain unused. All data cells are `\textcolor{red}{[TBD]}`. | When populating data, use these macros for consistency. |

---

## Aggregate Results

| Tier | Total Items | Pass | Partial | Fail |
|------|:-----------:|:----:|:-------:|:----:|
| Critical | 4 | 0 | 0 | **4** |
| Major | 8 | 0 | 0 | **8** |
| Minor | 6 | 0 | 0 | **6** |
| **Total** | **18** | **0** | **0** | **18** |

---

## Final Assessment

**The paper is NOT ready for resubmission.** A complete revision cycle is required.

### Priority Order for Revision

1. **Run experiments** (RC-1) — This unblocks RC-3, RC-6, RC-18, and enables evaluation of all empirical claims. Estimated effort: significant (9,120 API calls across 3 providers).
2. **Restructure for page limit** (RC-2) — This requires architectural decisions about what goes in the body vs. appendix. Should be done early to avoid rework.
3. **Fix statistical methodology** (RC-4, RC-5, RC-8, RC-12) — These can be done in parallel: define super-additivity test, add power analysis, define correction families, fix Wilcoxon implementation.
4. **Address experimental design issues** (RC-7) — Add prompt-only condition or acknowledge confound.
5. **Fix text issues** (RC-9, RC-10, RC-11, RC-13–RC-17) — These are straightforward edits that can be batched.
6. **Populate tables with data and CI columns** (RC-3, RC-6, RC-18) — After experiments run, format data using semantic macros with CI columns.

### Estimated Revision Effort

- **Experiments:** 1–2 weeks (API costs, 9,120 calls, 3 providers, potential rate limiting)
- **Statistical methodology fixes:** 2–3 days
- **Paper restructuring:** 3–5 days
- **Text/reference fixes:** 1–2 days
- **Total:** ~3–4 weeks for a thorough revision

---

## Deliverable Summary

**Summary:** Verified 18 required changes from meta-review against current paper draft. All 18 items fail — no revisions have been made. Paper requires a full revision cycle estimated at 3–4 weeks before resubmission.

**Acceptance Criteria Status:**
- ☑ Verification file exists at `artifacts/reviews/revision-check.md` with checklist table: Item | Status | Evidence | Notes
- ☑ Every required change from meta-review.md is present as a checklist item (18/18) with explicit pass/fail assessment
- ☑ For each failed item, specific guidance provided on what remains to be done with section references
- ☑ Final summary states the paper is not ready for resubmission and needs another revision cycle, with prioritized revision order and effort estimate
