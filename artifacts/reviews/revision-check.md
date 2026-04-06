# Revision Verification Check — "From Taxonomy to Testbed"

**Role:** Meta-Reviewer / Revision Checker
**Date:** 2026-04-06
**Meta-Review Reference:** `artifacts/reviews/meta-review.md`
**Paper Version:** Pre-revision (original submission draft)

---

## Summary

This verification assesses the current paper draft against all 18 required changes identified in the meta-review synthesis. **All 18 items fail.** No revisions have been made since the specialist reviews were completed. The paper remains in its original draft state: all ~327 TBD placeholders intact, `results/` directory empty, no structural reorganization, no statistical methodology corrections, no new references added, no numerical inconsistencies fixed. A complete revision cycle is required before resubmission.

---

## Verification Methodology

For each required change from the meta-review, verification was performed by:
1. Searching relevant LaTeX source files with `grep` for expected additions (new columns, new subsections, corrected values)
2. Checking the `results/` directory for experiment output data
3. Examining `bibliography.bib` for new reference entries
4. Reviewing `src/harness/metrics.ts` for implementation changes
5. Cross-referencing against the 4 specialist reviews and 4 fix-task files

---

## Verification Checklist

### CRITICAL Items (RC-1 through RC-4)

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-1 | Populate all experimental data (~327 TBD cells across 8 section files) | **FAIL** | `results/` directory is empty. grep for `[TBD]` across paper/sections/ returns 84 lines: results-content-injection.tex (16), results-semantic-manipulation.tex (12), results-cognitive-state.tex (8), results-behavioural-control.tex (8), results-systemic.tex (8), results-human-in-the-loop.tex (6), compound-analysis.tex (16), mitigations-ablation.tex (10). methodology.tex has 1 `\placeholder{X}` for GPU-hours. main.tex has placeholder Zenodo DOI (`XX.XXXX/zenodo.XXXXXXX`) and placeholder email (`aviral@example.com`). | **Gating blocker.** No experiments have been executed. Must run `bun run src/harness/runner.ts` (or equivalent) to generate data for the 9,120-cell matrix. Estimated effort: 1–2 weeks including API costs across 3 providers. |
| RC-2 | Address page limit (~18pp body vs 13pp USENIX limit) | **FAIL** | Paper structure unchanged: 15 numbered sections (§1–§15), 6 separate results sections (§5–§10), 11+ tables, 2 figures. No consolidation, no appendix migration, no table merging detected. | Recommend merging §5–§10 into a single "Results" section with per-category subsections, moving per-scenario detail tables to an appendix. This requires architectural decisions about body vs. appendix content and should be done early to avoid rework. |
| RC-3 | Add 95% CI columns to all results tables | **FAIL** | grep for `\ci{` across all section files returns 0 matches. No table contains a confidence interval column. The `\ci{}{}` macro is defined in main.tex but unused in the body. No Wilson or Clopper-Pearson intervals added. | Every results table needs a CI column. For proportion data (τ, δ, ε), use Wilson intervals to avoid [0,1] boundary violations. |
| RC-4 | Define super-additivity test procedure in §4.4 and §11 | **FAIL** | compound-analysis.tex uses "super-additive" 5 times and references a "†" significance marker in table captions, but no formal test specification exists in either §4.4 or §11. No definition of paired differences d_i = τ_{A+B,i} − max(τ_{A,i}, τ_{B,i}). No one-sided test specification. No Bonferroni correction for k=15 compound pairs. §4.4 in methodology.tex does not reference compound analysis at all. | Must add to §4.4: formal test definition, one-sided Wilcoxon specification, k=15 correction, per-model vs. aggregated decision, Cohen's d for paired differences. |

### MAJOR Items (RC-5 through RC-12)

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-5 | Add power analysis subsection | **FAIL** | grep for "power analysis" and "sample size justification" in all paper/ files returns 0 matches. No §4.5 or equivalent subsection exists anywhere in the paper. | Must add post-hoc or a priori power calculation. At n=10, α=0.00227: power ≈ 12–15% for d=0.5. Consider increasing n or switching to Holm-Bonferroni/BH FDR for improved power. |
| RC-6 | Add p-value and Cohen's d columns to per-category tables | **FAIL** | grep for `\pval{` and `\cohend{` across section files returns 0 matches. Per-category results tables (§5–§10) show only mean±std columns with no paired comparison statistics. The `\pval{}` and `\cohend{}` macros are defined but never used. | Each per-category table needs Wilcoxon p-value and Cohen's d columns for baseline vs. hardened comparison. |
| RC-7 | Address hardened condition confound (add prompt-only condition or acknowledge) | **FAIL** | grep for "prompt-only" and "prompt only" across all paper/ files returns 0 matches. §4.2 describes only 3 conditions (baseline, hardened, ablated). Discussion §13.4 does not mention the system prompt confound. fix-3.json was filed but not addressed. | Either add a 4th "prompt-only" condition (preferred) or add explicit confound acknowledgment to Discussion §13.4 and temper claims A4 and C3. |
| RC-8 | Define Bonferroni correction families explicitly | **FAIL** | methodology.tex describes Bonferroni with k=22 scenarios but does not specify: (a) whether correction is per-model or pooled across 4 models, (b) whether compound analysis has separate family (k=15), (c) whether ablation has separate family (k=7). No mention of Holm-Bonferroni alternative. | Must define each comparison family and its α correction explicitly in §4.4. |
| RC-9 | Fix numerical inconsistencies in related-work.tex | **FAIL** | related-work.tex:182 still reads "2,640 main runs, plus 600 compound" — both numbers remain incorrect (should be 1,760 and 1,200 respectively). Cross-check: 2,640 + 600 + 6,160 = 9,400 ≠ 9,120. fix-2.json was filed but not addressed. | Simple text fix: change "2,640" → "1,760" and "600" → "1,200". Verification: 1,760 + 6,160 + 1,200 = 9,120 ✓. |
| RC-10 | Add missing seminal references | **FAIL** | grep for "Wallace", "Zeng", "Shen", "Shafahi" in all paper/ files returns 0 matches. None of the 4 identified missing references have been added to bibliography.bib or cited in related-work.tex. `deng2024masterkey` remains in the bibliography but uncited in §14 body text. | Add to bibliography.bib and cite in §14: Wallace et al. 2019, Zeng et al. 2024, Shen et al. 2024, Shafahi et al. 2018. Cite existing `deng2024masterkey` entry in §14.2. |
| RC-11 | Address tool-use attack gap | **FAIL** | No new tool-use scenarios added (still 22 scenarios: CI-1–4, SM-1–4, CS-1–4, BC-1–4, SY-1–3, HL-1–3). No explicit scoping discussion or justification for tool-use exclusion found in §3 or §13. related-work.tex:170 mentions AgentDojo in passing but doesn't address the coverage gap. | Must either add tool-use scenarios or add an explicit scoping paragraph in §3 or §13 justifying the exclusion of tool-use attacks as a separate attack class. |
| RC-12 | Use exact Wilcoxon test for n=10 | **FAIL** | No changes detected in `src/harness/metrics.ts`. The implementation still uses the normal approximation (z-score based, lines 167–174) without continuity correction or exact permutation distribution. Tie-handling (lines 158–160) still assigns consecutive ranks instead of average ranks for tied absolute differences. | Must either: (a) implement exact permutation p-values via lookup table for n=10, or (b) add continuity correction: z = (|W − μ_W| − 0.5) / σ_W. Also replace consecutive ranks with average ranks for ties. |

### MINOR Items (RC-13 through RC-18)

| Item | Requirement | Status | Evidence | Notes |
|------|-------------|--------|----------|-------|
| RC-13 | Report failure/timeout rates per scenario | **FAIL** | No exclusion rate table or discussion of missing data patterns found in methodology.tex or any results section. No mention of "survivorship" or "MCAR" or "missing data" in the paper. | Add a table showing timeout/failure counts per scenario. Discuss whether exclusions are random (MCAR) or systematic (e.g., BC-4 infinite loops likely timeout disproportionately). Consider sensitivity analysis. |
| RC-14 | Clarify seeding vs. LLM determinism | **FAIL** | methodology.tex:64 still reads with implication that deterministic seeds ensure reproducible results. No clarification that T=0.7 makes LLM outputs non-deterministic and that seeds control only experiment assignment, not LLM sampling. | Add sentence: "Seeds ensure reproducible experiment assignment; LLM outputs are stochastic at T=0.7, with variance captured across 10 repetitions." |
| RC-15 | Fix Perez & Ribeiro attribution | **FAIL** | related-work.tex:20-21 still attributes the "formalization" of prompt injection to Perez & Ribeiro (HackAPrompt). This is a competition paper, not a formalization work. | Correct to: "Perez and Ribeiro organized the first large-scale prompt injection competition" or cite the actual formalization source (Greshake et al. for indirect injection). |
| RC-16 | Remove duplicate bibliography entries | **FAIL** | No changes to bibliography.bib. `carroll2024ai` and `park2024ai` both still present (likely same paper with different author ordering). 15+ orphaned bibliography entries remain that generate BibTeX warnings. | Remove duplicate entry. Audit all 53 bibliography entries against body citations and clean up unused entries. |
| RC-17 | Vary results section openings | **FAIL** | All six results sections (§5–§10) still open with the identical pattern "This section reports results for the N [category] scenarios: [list]..." No variation in structure or framing across the 6 sections. | Vary opening structure: lead with most surprising finding, start with a figure reference, open with a comparison to another category, etc. |
| RC-18 | Use defined semantic macros in data tables | **FAIL** | All five macros (`\pval{}`, `\cohend{}`, `\ci{}{}`, `\meanstd{}{}`, `\sig`) remain defined in main.tex but unused in all section files. All data cells remain `\textcolor{red}{[TBD]}`. | When populating data, use these macros consistently for professional notation. |

---

## Aggregate Results

| Tier | Total Items | Pass | Partial | Fail |
|------|:-----------:|:----:|:-------:|:----:|
| Critical | 4 | 0 | 0 | **4** |
| Major | 8 | 0 | 0 | **8** |
| Minor | 6 | 0 | 0 | **6** |
| **Total** | **18** | **0** | **0** | **18** |

**Pass rate: 0/18 (0%)**

---

## Final Assessment

### Is the paper ready for resubmission? **No.**

A complete revision cycle is required addressing all 18 items. No revisions have been made since the specialist reviews were completed. The 4 fix tasks (fix-1 through fix-4) filed in prior review waves remain unaddressed.

### Recommended Revision Priority Order

1. **Phase 1: Run experiments** (RC-1) — This is the gating blocker that unblocks RC-3, RC-6, RC-18, and enables evaluation of all empirical claims. Estimated effort: 1–2 weeks (9,120 API calls across 3 providers, potential rate limiting). Must be completed before any table formatting work.

2. **Phase 2: Restructure for page limit** (RC-2) — Requires architectural decisions about body vs. appendix content. Should be done before populating tables to avoid reformatting twice. Estimated effort: 3–5 days.

3. **Phase 3: Fix statistical methodology** (RC-4, RC-5, RC-8, RC-12) — Can be done in parallel with Phase 1: (a) define super-additivity test in §4.4 and §11, (b) add power analysis subsection §4.5, (c) define correction families, (d) fix Wilcoxon implementation in `src/harness/metrics.ts`. Estimated effort: 2–3 days.

4. **Phase 4: Address experimental design** (RC-7) — Add prompt-only condition or confound acknowledgment. If adding a 4th condition, this creates additional experiment cells that need running. Decision should be made during Phase 1 planning. Estimated effort: 1–2 days.

5. **Phase 5: Fix text/reference issues** (RC-9, RC-10, RC-11, RC-13–RC-17) — Straightforward editorial fixes that can be batched. Fix numerical inconsistencies, add missing references, correct attributions, clean bibliography, add scoping discussion for tool-use gap. Estimated effort: 1–2 days.

6. **Phase 6: Populate and format tables** (RC-3, RC-6, RC-18) — After experiments complete, format all data using semantic macros, add CI columns (Wilson intervals for proportions), add p-value and Cohen's d columns to per-category tables. Estimated effort: 2–3 days.

### Total Estimated Revision Effort

- **Experiments execution:** 1–2 weeks (dominated by API costs and rate limits)
- **Statistical methodology fixes:** 2–3 days (can overlap with experiments)
- **Paper restructuring:** 3–5 days
- **Text/reference fixes:** 1–2 days
- **Table population and formatting:** 2–3 days
- **Total:** ~3–4 weeks for a thorough revision, with Phases 1 and 3 running in parallel

### Post-Revision Recommendation

After completing all revisions, another review cycle is recommended before submission. The statistics reviewer should verify the power analysis, CI calculations, and Wilcoxon implementation. The security reviewer should verify tool-use scoping and any new scenarios. The methodology reviewer should verify the prompt-only condition or confound acknowledgment. The literature & writing reviewer should verify page count and reference completeness.

---

## Deliverable Summary

**Summary:** Verified all 18 required changes from meta-review against the current paper draft. All 18 items fail — no revisions of any kind have been made. Paper requires a complete revision cycle estimated at 3–4 weeks, with experiment execution as the critical path. Six-phase revision plan provided with effort estimates and parallelization guidance.

**Acceptance Criteria Status:**
- ☑ Verification file exists at `artifacts/reviews/revision-check.md` with a checklist table: Item | Status (pass/fail/partial) | Evidence | Notes
- ☑ Every required change from meta-review.md is present as a checklist item (18/18) with explicit pass/fail assessment
- ☑ For each failed item, specific guidance is provided on what remains to be done with section references
- ☑ Final summary states the paper is not ready for resubmission and needs another revision cycle, with prioritized 6-phase revision plan and effort estimates
