# Revision Verification Check — "From Taxonomy to Testbed"

**Role:** Meta-Reviewer (RC-1 through RC-18 Re-Review)
**Date:** 2026-04-06
**Meta-Review Reference:** `artifacts/reviews/meta-review.md`
**Paper Version:** Post-revision (220-cell experiment run-2026-04-06T19-30-14)
**Specialist Audit Sources:**
- Data Validator: `artifacts/validate-table-data.md`, `artifacts/verify-abstract-conclusion-accuracy.md`
- Statistics Auditor: `artifacts/audit-ci-columns.md`, `artifacts/audit-statistical-methodology.md`
- Editorial Reviewer: `artifacts/audit-references-attribution.md`, `artifacts/audit-page-limit-and-structure.md`, `artifacts/audit-remaining-editorial.md`

---

## Summary

This re-review assesses the revised paper against all 18 required changes from the meta-review. The paper has undergone a **major revision cycle**: 220 experiments were executed (descoped from 9,120), all TBD placeholders are populated with real data, the page limit is met, and several methodology/editorial items are addressed. Of 18 items: **10 PASS, 3 PARTIAL, 5 FAIL**. The two most critical remaining issues are (1) systematically incorrect p-values from the normal-approximation Wilcoxon at n=5 (RC-12, BLOCKING) and (2) missing seminal references (RC-10, NON-BLOCKING). The paper is **conditionally ready** for resubmission — fixing the p-values and the appendix CI claim would bring it to acceptable quality.

---

## Verification Methodology

For each of the 18 required changes, this assessment synthesizes findings from three independent specialist audits:
1. **Data Validator** — Cross-referenced all 22 scenario values (88 data points) across 7 tables against `results/run-2026-04-06T19-30-14/analysis.json`. Verified abstract/conclusion claims.
2. **Statistics Auditor** — Reviewed CI methodology, Wilcoxon implementation, power analysis, Bonferroni families, super-additivity deferral. Performed empirical verification of exact permutation p-values.
3. **Editorial Reviewer** — Audited page limit, references, attributions, section openings, macro usage, confound acknowledgment, numerical consistency, seeding, failure rates, tool-use scoping.

All claims below were spot-checked against the actual LaTeX source files.

---

## Experiment Descoping Assessment

The original plan called for **9,120 experiment cells** (22 scenarios × 4 models × {2 main + 7 ablation} conditions × 10 reps + 15 compound × 4 models × 2 × 10). The executed experiment covers **220 cells** (22 scenarios × 2 conditions × 5 reps × 1 model), a **97.6% reduction**.

**Is the descoping adequately justified?**

| Dimension | Original Plan | Executed | Justified? |
|-----------|:------------:|:--------:|:----------:|
| Models | 4 (GPT-4o, GPT-4o-mini, Claude 3.5, Gemini 1.5) | 1 (GPT-4o-mini) | ✅ Explicitly deferred in future work |
| Conditions | 2 main + 7 ablation | 2 main (baseline, hardened) | ✅ Ablation explicitly deferred in §12.4 |
| Compound | 15 pairs × 2 × 10 | 0 | ✅ Explicitly deferred in §11 with formal test spec |
| Repetitions | 10 | 5 | ⚠️ Acknowledged in power limitation paragraph but understates severity |

**Does the descoping weaken key claims?**

- **Aggregate findings (45.5%→25.5%)**: Remain valid for GPT-4o-mini. Paper correctly scopes claims to single model.
- **Category-level patterns**: Remain informative (CI resists, SM mitigated, SY naturally resists).
- **Generalization claims**: Cannot generalize across models. Paper correctly defers multi-model evaluation.
- **Statistical power**: At n=5, Bonferroni significance is **structurally impossible** (p_min=0.0625 >> α_corrected=0.00227). Paper acknowledges this but understates the impossibility.
- **Super-additivity**: Cannot be evaluated. Correctly deferred.
- **Ablation**: Cannot attribute improvements to specific mitigation modules. Correctly deferred.

**Overall**: The descoping is **adequately justified** in the paper. The abstract, methodology, and conclusion correctly reflect the 220-cell scope without overclaiming. Future work paragraphs are explicit about what remains.

---

## Verification Checklist

### CRITICAL Items (RC-1 through RC-4)

#### RC-1: Populate All Experimental Data — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| TBD cells populated | ✅ | Data Validator: 0/327 TBD cells remain. All 22 scenarios × {B%, H%, d, p} = 88 values verified against `analysis.json` with zero discrepancies |
| `results/` has data | ✅ | `results/run-2026-04-06T19-30-14/analysis.json` exists with 220 experiment cells |
| GPU-hours filled | ✅ | `methodology.tex:91`: "0.5 compute-hours" |
| Zenodo DOI filled | ✅ | `main.tex:175`: `10.5281/zenodo.15186230` |
| Author email filled | ✅ | `main.tex:91`: `aviral.dua@proton.me` |
| `\placeholder{}` usage in body | ✅ | 0 matches. Only macro definition at `main.tex:59` remains (dead code) |

**Scope change**: Executed 220 cells (not 9,120). Paper correctly reflects this. **No TBD remnants.**

**Auditor consensus**: Data Validator confirms zero discrepancies across all 7 tables. Abstract claims A1–A8 and conclusion claims C1–C7 all verified as data-supported.

---

#### RC-2: Address Page Limit — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Body ≤ 13 pages | ✅ | Editorial Reviewer: compiled PDF = 15 pages; body ~13pp, references ~1.5pp, appendix ~0.5pp |
| Structure appropriate | ✅ | 6 results sections kept but compact (49–57 lines each with 1 table) |

**Original concern**: ~18 pages estimated. **Now ~13pp body**, at the USENIX limit.

**Caveat**: At 13pp, zero room for additions. Any new content (CI columns, failure rate table, expanded power analysis) requires compensating cuts. This is a **binding constraint** on remaining fixes.

---

#### RC-3: Add 95% CI Columns to Results Tables — **PARTIAL** ⚠️

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| CI columns in tables | ❌ | Statistics Auditor: 0/7 tables include CI columns |
| `\ci{}{}` macro used | ❌ | 0 usage across all section files |
| Methodology no longer claims CI reporting | ✅ | §4.4 revised: CI claim removed from methodology |
| Appendix CI claim | ❌ | `main.tex:167` still says "full confidence intervals" in supplementary materials — misleading since `analysis.json` lacks CIs |

**Why PARTIAL, not FAIL**: The original meta-review concern was that the paper **claimed** CI reporting in §4.4 but provided none. The revised §4.4 **no longer claims** CI reporting — a significant improvement. The paper now frames interpretation through effect sizes (Cohen's d) rather than interval estimates, which is defensible for n=5. However, (a) the appendix still references "full confidence intervals" and (b) CIs would strengthen the paper, especially Wilson score intervals for the summary table.

**Statistics Auditor recommendation**: Add Wilson CIs to `tab:summary-all` only (Option C — respects page limit). Fix appendix claim. The t-distribution CI implementation in `metrics.ts` is buggy (wrong t-critical value 2.262 for df=9 when n=5 requires 2.776 for df=4) and inappropriate for proportion data.

**Required action**: Fix `main.tex:167` appendix claim (BLOCKING). Adding Wilson CIs is recommended but NON-BLOCKING.

---

#### RC-4: Define Super-Additivity Test Procedure — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Compound data collected | N/A | Correctly deferred — 220-cell run covers main matrix only |
| Formal test specification | ✅ | `compound-analysis.tex:30-34`: paired differences, one-sided Wilcoxon, k=15 Bonferroni |
| Explicit deferral | ✅ | `compound-analysis.tex:12`: "Compound experiments were not included in the current run" |
| Infrastructure ready | ✅ | `src/harness/compound.ts` implements all 15 pairs |

**Statistics Auditor verdict**: ADEQUATELY DEFERRED. Acceptable for current paper.

---

### MAJOR Items (RC-5 through RC-12)

#### RC-5: Add Power Analysis — **PARTIAL** ⚠️

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Power limitation acknowledged | ✅ | `methodology.tex:75-83`: explicit paragraph stating <15% power for d=0.5 |
| Effect-size interpretation framing | ✅ | "interpret results primarily through effect sizes rather than null-hypothesis significance testing" |
| No significance overclaiming | ✅ | "no individual scenario comparison reaches Bonferroni significance" |
| Mathematical impossibility stated | ❌ | Does not state that Bonferroni significance is structurally impossible at n=5 (p_min=0.0625 >> α_corrected=0.00227) |
| Required-n calculation | ❌ | Does not state that ~85 per cell needed for 80% power at α=0.00227 |

**Statistics Auditor finding**: The paragraph says "powered only for very large effects (d ≥ 1.5)" — this is **misleading** because even d=∞ cannot achieve Bonferroni significance at n=5 with the Wilcoxon test. The minimum exact two-tailed p-value at n=5 is 2/2^5 = 0.0625, which exceeds α_corrected=0.00227 by 27×.

**Why PARTIAL, not FAIL**: The core acknowledgment exists and the effect-size interpretation is well-framed. But understating the severity risks a reviewer objection. One additional sentence would fully address this.

**NON-BLOCKING** — the paper correctly avoids significance claims.

---

#### RC-6: Add p-value and Cohen's d Columns to Per-Category Tables — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| p-value columns present | ✅ | All 6 per-category tables include a "p" column |
| Cohen's d columns present | ✅ | All 6 per-category tables include a "d" column |
| Values verified | ✅ | Data Validator: all 22 scenario d and p values match `analysis.json` |

**Note**: The table column set is {Scenario, B(%), H(%), Δ, d, p} — includes both paired comparison statistics. This fully addresses RC-6.

---

#### RC-7: Address Hardened Condition Confound — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Methodology acknowledgment | ✅ | `methodology.tex:34-37`: "Confound note" paragraph explicitly naming both confounded variables |
| Discussion acknowledgment | ✅ | `discussion.tex:76-78`: "The hardened condition confounds mitigation modules with the security-hardened prompt" |
| Future work resolution | ✅ | Both locations propose 2×2 factorial decomposition |

**Editorial Reviewer verdict**: Satisfies the meta-review's "minimum fix" requirement. The preferred fix (4th prompt-only condition) was not implemented, but explicit acknowledgment is acceptable.

---

#### RC-8: Define Bonferroni Correction Families — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| k=22 specified | ✅ | `methodology.tex:70-72`: α_corrected = 0.05/22 = 0.00227 |
| Unambiguous for current design | ✅ | With 1 model and no compound/ablation data, k=22 is the only family |

**Statistics Auditor verdict**: Sufficient for the current single-model, main-comparison-only design. Holm-Bonferroni is moot since significance is impossible at n=5.

---

#### RC-9: Fix Numerical Inconsistencies — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Run count consistent | ✅ | Editorial Reviewer: all 6 mentions say "220" — abstract, introduction, methodology, related-work, conclusion, testbed-design |
| Original erroneous figures removed | ✅ | "2,640 main runs" and "600 compound" no longer present |

---

#### RC-10: Add Missing Seminal References — **FAIL** ❌

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Wallace 2019 added | ❌ | Not in bibliography.bib or any .tex file |
| Zeng 2024 added | ❌ | Not in bibliography.bib or any .tex file |
| Shen 2024 added | ❌ | Not in bibliography.bib or any .tex file |
| Shafahi 2018 added | ❌ | Not in bibliography.bib or any .tex file |
| deng2024masterkey cited | ❌ | In bib but never cited |

**Editorial Reviewer verdict**: Fully unaddressed. These are standard seminal references that reviewers will expect. Their absence weakens the related work.

**NON-BLOCKING** — does not affect empirical validity, but a USENIX reviewer familiar with adversarial ML will flag the omissions.

---

#### RC-11: Address Tool-Use Attack Gap — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Explicit scoping | ✅ | `discussion.tex:120-123`: "Tool-use attacks not covered. Following the DeepMind taxonomy scope..." |
| Justification | ✅ | Distinguishes environmental/contextual attacks from tool-use/function-calling |
| Reference | ✅ | Cites AgentDojo (debenedetti2024agentdojo) |

---

#### RC-12: Use Exact Wilcoxon Test — **FAIL** ❌ (BLOCKING)

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Normal approximation replaced | ❌ | `metrics.ts:167-174`: still uses z-score normal approximation |
| Exact permutation implemented | ❌ | No exact test for n≤10 |
| Average ranks for ties | ❌ | `metrics.ts:157-160`: consecutive ranks, not average |
| Tie variance correction | ❌ | Missing correction term |
| Continuity correction | ❌ | Not applied |

**Statistics Auditor finding (CRITICAL)**: The normal approximation at n=5 produces **systematically incorrect p-values**:

| Scenario | Reported p (approx) | Exact p | Error |
|----------|:-------------------:|:-------:|:-----:|
| SM-1, CS-4, BC-2 | 0.033 | 0.0625 | **48% understated** |
| CS-3, BC-1 | 0.052 | 0.0625* | ~17% understated |
| HL-1, HL-2 | 0.084 | 0.125* | ~33% understated |
| CI-2, HL-3 | 0.142 | 0.500* | ~72% understated |

*Exact values estimated from nearest quantile. Anti-conservative bias worsens as nr decreases.

**All reported p-values in the paper's tables are numerically incorrect.** While conclusions don't change (the paper correctly states nothing reaches Bonferroni significance), the incorrect values undermine credibility with statistically literate reviewers.

**Additional bugs in metrics.ts**:
- t-critical value 2.262 (df=9) used when n=5 requires 2.776 (df=4) — CIs 18% too narrow
- Tie handling assigns consecutive ranks instead of average ranks
- No variance correction for ties

**BLOCKING** — p-values in tables must be corrected before resubmission. Fix: implement exact permutation test for n≤10 (trivial: only 2^5=32 permutations to enumerate).

---

### MINOR Items (RC-13 through RC-18)

#### RC-13: Report Failure/Timeout Rates — **PARTIAL** ⚠️

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Exclusion policy mentioned | ✅ | `methodology.tex:88-90`: 120s timeout, failed cells excluded |
| Per-scenario table | ❌ | No failure rate table |
| MCAR discussion | ❌ | Not mentioned |
| All cells completed? | ⚠️ | All values are multiples of 20% (consistent with n=5, 0 exclusions) but not explicitly confirmed |

**Mitigating factor**: Data patterns (all percentages are multiples of 20%) strongly suggest zero exclusions. Adding one sentence — "All 220 cells completed within the timeout" — would fully address this.

**NON-BLOCKING.**

---

#### RC-14: Clarify Seeding vs. LLM Determinism — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Seed purpose clarified | ✅ | `methodology.tex:50-53`: "seeds control cell assignment metadata only" |
| LLM stochasticity noted | ✅ | "LLM outputs remain stochastic at T=0.7" |
| Variance handling | ✅ | "variance captured across the 5 repetitions" |

---

#### RC-15: Fix Perez & Ribeiro Attribution — **FAIL** ❌

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| "Formalized" attribution corrected | ❌ | `related-work.tex:20-21` still reads: "The foundational prompt injection threat was formalized by Perez and Ribeiro" |

Perez and Ribeiro's paper (HackAPrompt) is a competition paper, not a formalization. Should use "demonstrated" or "catalogued."

**NON-BLOCKING** — minor attribution error unlikely to cause rejection, but a knowledgeable reviewer would flag it.

---

#### RC-16: Remove Duplicate Bibliography Entries — **FAIL** ❌

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Duplicate removed | ❌ | `carroll2024ai` (line 433) and `park2024ai` (line 447) both still present with same DOI |
| Orphaned entries cleaned | ❌ | 15 uncited entries remain |

**NON-BLOCKING** — neither duplicate is cited; BibTeX warnings only.

---

#### RC-17: Vary Results Section Openings — **PASS** ✅

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| Varied openings | ✅ | Each section uses distinct verbs (target, bias, exploit, test) with descriptive qualifiers |

**Editorial Reviewer verdict**: Fully addressed.

---

#### RC-18: Use Defined Semantic Macros — **FAIL** ❌

| Criterion | Status | Evidence |
|-----------|:------:|---------|
| `\pval{}` used | ❌ | 0 matches |
| `\cohend{}` used | ❌ | 0 matches |
| `\ci{}{}` used | ❌ | 0 matches |
| `\meanstd{}{}` used | ❌ | 0 matches |
| `\sig` used | ❌ | 0 matches |

All five macros defined in `main.tex:54-58` but unused. Tables use raw LaTeX.

**NON-BLOCKING** — tables render correctly; this is a maintainability concern only.

---

## Aggregate Results

| Tier | Total Items | Pass | Partial | Fail |
|------|:-----------:|:----:|:-------:|:----:|
| Critical (RC-1–4) | 4 | 3 | 1 | 0 |
| Major (RC-5–12) | 8 | 5 | 1 | 2 |
| Minor (RC-13–18) | 6 | 2 | 1 | 3 |
| **Total** | **18** | **10** | **3** | **5** |

**Pass rate: 10/18 (55.6%) PASS, 3/18 (16.7%) PARTIAL, 5/18 (27.8%) FAIL**

Improvement from previous check: **0/18 → 10/18** (all 18 previously failed).

---

## Remaining Items — Prioritized

### BLOCKING (must fix before resubmission)

| Priority | RC | Issue | Effort | Fix |
|:--------:|:--:|-------|:------:|-----|
| **1** | RC-12 | **Wilcoxon p-values systematically incorrect** — normal approximation at n=5 understates all p-values by 17–72%. Three table values report 0.033 when exact is 0.0625. | 2–4 hours | Implement exact permutation test for n≤10 (32 permutations). Update all p-values in 7 tables. Fix tie handling to use average ranks. |
| **2** | RC-3 (partial) | **Appendix claims "full confidence intervals"** but data has none | 15 min | Fix `main.tex:167` to remove or qualify the CI claim. |

### NON-BLOCKING (should fix, improves quality)

| Priority | RC | Issue | Effort | Fix |
|:--------:|:--:|-------|:------:|-----|
| 3 | RC-10 | Missing 4 seminal references | 1 hour | Add Wallace 2019, Zeng 2024, Shen 2024, Shafahi 2018 to bibliography.bib; cite in related-work.tex §14 |
| 4 | RC-5 (partial) | Power limitation understates impossibility | 15 min | Add one sentence: "the minimum exact p-value at n=5 is 0.0625, exceeding the corrected threshold by 27×" |
| 5 | RC-15 | Perez & Ribeiro "formalized" attribution wrong | 5 min | Change "formalized" to "demonstrated" at related-work.tex:20 |
| 6 | RC-16 | Duplicate + orphaned bibliography entries | 30 min | Remove carroll2024ai duplicate; clean 15 orphaned entries |
| 7 | RC-13 (partial) | No explicit confirmation all cells completed | 5 min | Add: "All 220 cells completed within the timeout" |
| 8 | RC-18 | Semantic macros unused | 2–3 hours | Replace raw LaTeX in all tables with `\pval{}`, `\cohend{}`, etc. |

### NEW ISSUES (discovered during re-review)

| ID | Location | Severity | Description |
|:--:|----------|:--------:|-------------|
| N-1 | `discussion.tex:55-56` | Minor | Bold text says "12 show 0% baseline trap success" but 3 of those 12 are at 40%. Should say "12 show ≤40%" to match conclusion wording. BC-2 (0% baseline) omitted from explicit list. |
| N-2 | `main.tex:59` | Informational | `\placeholder{}` macro definition remains (dead code). Recommend removing. |
| N-3 | `metrics.ts:98` | Medium | t-critical value hardcoded as 2.262 (df=9) when n=5 requires 2.776 (df=4). CIs 18% too narrow. Coupled with RC-12 fix. |
| N-4 | `bibliography.bib` (end comment) | Informational | Comment says "53 entries total" but file has 65 entries. |

---

## Final Verdict: Paper Readiness for USENIX Security 2027

### Is the paper ready for resubmission? **Conditionally YES.**

**The paper has undergone a substantial and largely successful revision.** The gating blocker (RC-1: no data) is fully resolved. The paper now contains 220 real experiment data points, correctly scoped claims, an adequate statistical framework, and fits the page limit. The abstract, conclusion, and discussion accurately reflect the data. Ten of 18 required changes are fully addressed.

**One BLOCKING issue remains: RC-12 (incorrect p-values).** The Wilcoxon normal approximation at n=5 produces p-values that are systematically too small (0.033 reported vs. 0.0625 exact for the strongest results). While the paper's conclusions are unaffected (nothing claims significance), any reviewer who checks the statistics will flag this immediately. The fix is straightforward (exact permutation test, ~2–4 hours of implementation work + table updates).

**After fixing RC-12 and the RC-3 appendix claim**, the paper would be at acceptable quality for resubmission with the following caveats:

1. **The descoping (9,120→220) is a legitimate limitation** but is transparently handled. The paper does not overclaim.
2. **The n=5 sample size severely limits statistical power** but is honestly acknowledged, and the effect-size interpretation framework is appropriate.
3. **Missing references (RC-10) and attribution error (RC-15)** would be caught by domain-expert reviewers but are unlikely to cause rejection alone.
4. **The unused semantic macros (RC-18)** are a maintainability concern, not a quality issue.

### Estimated Time to Resubmission

| Action | Effort |
|--------|:------:|
| Fix RC-12 (exact Wilcoxon + update tables) | 2–4 hours |
| Fix RC-3 appendix claim | 15 minutes |
| Fix RC-10, RC-15, RC-16 (references) | 1.5 hours |
| Fix RC-5 power impossibility sentence | 15 minutes |
| Fix RC-13 completion confirmation | 5 minutes |
| Fix N-1 discussion wording | 10 minutes |
| Recompile and verify PDF | 30 minutes |
| **Total** | **~5–7 hours** |

### Recommendation

**Proceed with resubmission after a focused 1-day fix sprint** addressing the blocking items (RC-12, RC-3 appendix) and as many non-blocking items as time permits. The paper represents a genuine contribution — the first empirical operationalization of the DeepMind AI Agent Traps taxonomy with real experiment data — and the remaining issues are fixable without structural changes.

---

## Deliverable Metadata

**Task:** synthesize-revision-assessment
**Depends on:** validate-table-data ✅, verify-abstract-conclusion-accuracy ✅, audit-ci-columns ✅, audit-statistical-methodology ✅, audit-references-attribution ✅, audit-page-limit-and-structure ✅, audit-remaining-editorial ✅
**All dependencies satisfied.**
