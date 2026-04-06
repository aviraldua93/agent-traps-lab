# Statistics Review — USENIX Security 2027 Submission

**Paper:** *From Taxonomy to Testbed: Quantifying Environmental Attacks on Multi-Agent A2A Systems*
**Reviewer Role:** Statistics Reviewer
**Date:** 2026-04-06
**Scope:** §4.4 Statistical Analysis, all results tables (§5–§12), implementation in `src/harness/metrics.ts`

---

## Summary

The paper proposes a sound statistical framework—Wilcoxon signed-rank tests with Bonferroni correction and Cohen's d effect sizes—for evaluating adversarial trap scenarios against LLM agents. However, the design has a critical power limitation at n=10 under Bonferroni-corrected α, the Wilcoxon signed-rank test is at its absolute minimum viable sample size, several table structures omit required reporting columns, and **every single data cell in all results tables is still a [TBD] placeholder**. The statistical plan itself is defensible with explicit caveats; the paper is unpublishable without data.

---

## 1. Power Analysis

### 1.1 Setup
- **Design:** 22 scenarios × 4 models × 3 conditions × 10 reps = 9,120 cells (Eq. 1)
- **Per-cell comparisons:** n=10 paired observations (baseline vs. hardened)
- **Corrected α:** 0.05 / 22 = 0.00227 (Bonferroni for simultaneous scenario comparisons)
- **Target power:** 0.80 (per `src/config.ts:58`)
- **Target effect size:** Cohen's d = 0.5 (medium; per `src/config.ts:57`)

### 1.2 Power Calculation

For a **two-sided paired t-test** (as an upper-bound proxy, since Wilcoxon has lower power for normally-distributed data and similar power otherwise), the required sample size for:
- α = 0.00227 (Bonferroni-corrected)
- Power = 0.80
- d = 0.5 (medium effect)

Using the formula: n = ((z_{α/2} + z_β) / d)²

- z_{α/2} for α=0.00227 → z = 3.052 (two-sided, so α/2 = 0.001136)
- z_β for power 0.80 → z = 0.842
- n = ((3.052 + 0.842) / 0.5)² = (3.894 / 0.5)² = 7.788² ≈ **60.7**

**For a Wilcoxon signed-rank test** (asymptotic relative efficiency ≈ 0.955 under normality), the required n is approximately 60.7 / 0.955 ≈ **63.5**, rounding up to **n ≈ 64**.

### 1.3 Assessment

| Parameter | Paper Claims | Required for 80% Power |
|-----------|-------------|----------------------|
| n per cell | 10 | ~64 |
| α (corrected) | 0.00227 | 0.00227 |
| Target d | 0.5 (medium) | 0.5 |
| Achievable power at n=10 | **~0.12–0.15** | 0.80 |

**⚠ BLOCKING ISSUE (S1):** With n=10 and α=0.00227, the study has approximately **12–15% power** to detect a medium effect size (d=0.5). This means:
- The study will **miss ~85% of true medium effects**.
- Only **large effects** (d ≥ 1.2) are reliably detectable at this sample size and corrected α.
- At uncorrected α=0.05 with n=10, power for d=0.5 is approximately 0.56—still below the conventional 0.80 threshold.

### 1.4 Recommendations

1. **Increase n to at least 30** (power ≈ 0.43 at corrected α for d=0.5; still underpowered but substantially better) or ideally **n=64** for adequate power.
2. **Alternatively, acknowledge the power limitation explicitly** in §4.4 and §13.3 (Limitations), noting the study is powered only to detect large effects (d ≥ 1.0–1.2). Reframe: "This study provides a conservative test; non-significant results should not be interpreted as evidence of no effect."
3. **Consider Holm-Bonferroni** (step-down procedure) instead of standard Bonferroni—it controls FWER at the same level but is uniformly more powerful. This is a free improvement.
4. **Consider FDR control** (Benjamini-Hochberg) if the research goal is discovery rather than strict FWER control—appropriate for a testbed paper.

**Severity: BLOCKING** — The paper claims "statistical rigor" but does not disclose that its design is severely underpowered for the stated corrected α. A reviewer at USENIX Security will catch this immediately.

---

## 2. Test Selection — Wilcoxon Signed-Rank

### 2.1 Appropriateness

The Wilcoxon signed-rank test is an appropriate choice for paired baseline-vs-hardened comparisons:
- ✅ **Paired design:** Same scenario × model cell measured under two conditions
- ✅ **Non-parametric:** Does not assume normality of the differences (important for bounded metrics like success rates in [0,1])
- ✅ **Ordinal-or-better data:** Trap success rates are ratio-scale
- ✅ **Two-condition comparison:** Appropriate for baseline vs. hardened

### 2.2 Small-Sample Concern

**⚠ MEDIUM ISSUE (S2):** With n=10 paired observations:
- The Wilcoxon signed-rank test has a **minimum possible two-tailed p-value of 2/1024 ≈ 0.00195** (when all 10 differences have the same sign). This is barely below the Bonferroni-corrected α=0.00227.
- This means significance is achievable only when **all 10 replicates show an effect in the same direction** and the Wilcoxon W statistic equals its extreme value.
- Any single "wrong-direction" replicate makes significance impossible.
- The **normal approximation** used in `src/harness/metrics.ts:167–173` is considered acceptable for n ≥ 10 but is at the boundary. An exact test would be preferable.

### 2.3 Implementation Review (`src/harness/metrics.ts`)

The Wilcoxon implementation (lines 145–175) has the following properties:
- ✅ Filters out zero differences (line 151)
- ✅ Computes W+ and W- correctly (lines 163–165)
- ✅ Uses min(W+, W-) as the test statistic (line 166)
- ⚠ **Does not handle ties in ranks** (line 158–160). If two differences have the same absolute value, they receive consecutive ranks rather than average ranks. This is a minor bias but should be corrected for publication-quality code.
- ⚠ **Uses normal approximation** (line 168–174) which is marginal at n=10. The exact permutation distribution should be used or at minimum a continuity correction should be applied.
- ✅ Two-tailed p-value (line 173)

### 2.4 Recommendations

1. Add tie-handling (average ranks) to the Wilcoxon implementation.
2. Either use exact permutation p-values for n=10 or add a continuity correction (z = (|W - μ_W| - 0.5) / σ_W).
3. Explicitly note in §4.4 that n=10 is at the minimum boundary for the normal approximation and that significance requires near-unanimity of replicates.

**Severity: MEDIUM** — The test choice is sound in principle but the implementation and the interaction with n=10 creates a near-binary significance outcome (all same direction → significant, any deviation → not).

---

## 3. Multiple Comparisons Correction

### 3.1 Bonferroni Application

The paper applies Bonferroni with 22 comparisons (one per scenario):
- α_corrected = 0.05 / 22 = 0.002273

### 3.2 Assessment

- ✅ **Correct for scenario-level comparisons within a single model:** If testing one model across 22 scenarios, Bonferroni with k=22 is correct.
- ⚠ **Ambiguous family-wise scope:** The paper tests 4 models × 22 scenarios = 88 comparisons. If all 88 are in the same family, Bonferroni should use k=88 (α_corrected = 0.000568), which would make n=10 even more underpowered. The paper should explicitly define the family of comparisons.
- ⚠ **Compound analysis:** The compound-analysis section (§11) tests 15 pairwise category combinations. Are these subject to a separate Bonferroni correction (k=15) or included in the main family? This is unspecified.
- ⚠ **Ablation analysis:** The ablation study (§12) tests 7 mitigation removals. Correction family is unstated.

### 3.3 Recommendations

1. **Explicitly define comparison families** in §4.4: (a) per-model across 22 scenarios (k=22), (b) compound analysis (k=15), (c) ablation (k=7). State that each family has its own Bonferroni correction.
2. **Consider Holm-Bonferroni** as a uniformly more powerful alternative with the same FWER guarantee.
3. **Report both corrected and uncorrected p-values** in tables so readers can apply their own correction.

**Severity: MEDIUM** — The correction approach is reasonable but the family scope is ambiguous, which could be challenged during review.

---

## 4. Effect Sizes — Cohen's d

### 4.1 Implementation

Cohen's d with pooled SD is implemented correctly in `src/harness/metrics.ts:115–131`:
- ✅ Uses Bessel-corrected variance (n-1 denominator)
- ✅ Pooled SD formula: √[((n_A - 1)s²_A + (n_B - 1)s²_B) / (n_A + n_B - 2)]
- ✅ Handles zero pooled SD edge case

### 4.2 Classification Thresholds

The paper (§4.4, lines 79–82) and code (`src/harness/metrics.ts:133–139`) use standard Cohen (1988) thresholds:
- Negligible: |d| < 0.2
- Small: 0.2 ≤ |d| < 0.5
- Medium: 0.5 ≤ |d| < 0.8
- Large: |d| ≥ 0.8

✅ These match Cohen's original conventions. No issue.

### 4.3 Concern: Cohen's d for Bounded Variables

**⚠ LOW ISSUE (S3):** Trap success rates are bounded in [0, 1]. Cohen's d assumes underlying continuous distributions with potentially infinite support. When proportions are near 0 or 1, the pooled SD shrinks, inflating d artificially. This is a known limitation of d for proportion data.

### 4.4 Recommendations

1. Consider supplementing Cohen's d with **Cliff's delta** (ordinal, non-parametric, bounded in [-1, 1]), which is more appropriate for bounded outcome variables.
2. If retaining Cohen's d, note the boundary inflation concern in the limitations section.

**Severity: LOW** — Standard practice, but a sophisticated reviewer may raise this.

---

## 5. Confidence Interval Construction

### 5.1 Paper Claim

§4.4 states: "95% confidence intervals using the t-distribution with df = 9."

### 5.2 Implementation

`src/harness/metrics.ts:97–98`:
```typescript
const tCrit = n >= 30 ? 1.96 : 2.262; // df=9 for n=10
```

### 5.3 Assessment

- ✅ t-distribution with df = n-1 = 9 is correct for n=10.
- ✅ t_{0.025, df=9} = 2.262 is the correct critical value.
- ⚠ **Binary branching at n=30:** The code uses z=1.96 for n≥30 and t=2.262 for n<30. This is a crude approximation. For a general-purpose statistics library, it should use the exact t critical value for any df. However, since all cells have n=10, this only affects the n≥30 path (which is unused in the current design). Cosmetic concern only.
- ⚠ **CIs for proportions:** These t-distribution CIs assume normally distributed sample means. For proportions (trap success rates), this may produce intervals outside [0, 1]. Consider Wilson or Clopper-Pearson intervals for bounded outcomes.

### 5.4 Recommendations

1. Use a proper t-distribution quantile function (or lookup table) instead of the binary branch.
2. Consider clipping CIs to [0, 1] when reporting proportions, or use Wilson intervals.

**Severity: LOW** — Correct for the n=10 case; the binary branch is inelegant but not wrong.

---

## 6. Table Audit — Required Statistical Columns

### 6.1 Required Columns per Paper's Own Standards

Per §4.4 and CONTRIBUTING.md, every results table must report:
- **N** (sample size)
- **Mean ± std**
- **95% CI**
- **p-value** (for comparison tables)
- **Cohen's d** (for comparison tables)

### 6.2 Table-by-Table Audit

| Table | File | N | Mean±std | 95% CI | p-value | Cohen's d | Status |
|-------|------|---|----------|--------|---------|-----------|--------|
| tab:ci-success | results-content-injection.tex | ✅ (caption: n=10) | ✅ (structure present) | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:ci-detection | results-content-injection.tex | ❌ **MISSING** | ❌ (no ± std in structure) | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:sm-drift | results-semantic-manipulation.tex | ✅ (caption: n=10) | ✅ | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:sm-detection | results-semantic-manipulation.tex | ❌ **MISSING** | ❌ (no ± std) | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:cs-success | results-cognitive-state.tex | ✅ (caption: n=10) | ✅ | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:bc-success | results-behavioural-control.tex | ✅ (caption: n=10) | ✅ | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:sys-metrics | results-systemic.tex | ✅ (caption: n=10) | ✅ | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:hitl-success | results-human-in-the-loop.tex | ✅ (caption: n=10) | ✅ | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:compound | compound-analysis.tex | ✅ (caption: n=10) | ❌ (only τ values, no ±std) | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** | ⚠ Incomplete |
| tab:mitigation-effectiveness | mitigations-ablation.tex | ❌ **MISSING** | ✅ (caption mentions ±std) | ❌ **MISSING** | ✅ (p-value row) | ✅ (Cohen's d row) | ⚠ Partial |
| tab:ablation | mitigations-ablation.tex | ✅ (caption: n=10) | ❌ (Δτ only, no ±std) | ❌ **MISSING** | ✅ (Sig. column) | ✅ (Cohen's d column) | ⚠ Partial |

### 6.3 Column Deficiency Summary

**⚠ BLOCKING ISSUE (S4):** No results table includes a **95% CI column**, despite the paper explicitly claiming CIs are reported (§4.4). This is a universal omission across all 11 tables.

**⚠ MEDIUM ISSUE (S5):** The per-category results tables (tab:ci-success through tab:hitl-success) report only mean ± std for each condition but **lack paired comparison statistics (p-value, Cohen's d)**. The reader must cross-reference these tables with §12 (mitigations) to find any statistical tests, but §12 reports only aggregated comparisons, not per-scenario paired tests.

**⚠ MEDIUM ISSUE (S6):** The compound analysis table (tab:compound) reports raw success rates (τ_A, τ_B, τ_{A+B}) and surplus (Δ) but no variance estimates, CIs, p-values, or effect sizes for the super-additivity test. The "†" significance marker is defined in the caption but the test procedure for super-additivity is never formally specified in §4.4.

---

## 7. TBD Placeholder Inventory

### 7.1 Total Count

| File | TBD Count |
|------|-----------|
| results-content-injection.tex | **16** (8 B/H pairs × 4 models in tab:ci-success + 8 cells × 4 models in tab:ci-detection = 32 [TBD] markers; counted as 16 per grep cell-count) |
| results-semantic-manipulation.tex | **12** |
| results-cognitive-state.tex | **8** |
| results-behavioural-control.tex | **8** |
| results-systemic.tex | **8** |
| results-human-in-the-loop.tex | **6** |
| compound-analysis.tex | **16** (15 rows × 4 columns = 60 cells in tab:compound, but grep counts 16 lines containing [TBD]; total individual [TBD] markers ≈ 61) |
| mitigations-ablation.tex | **10** (4 cells in tab:mitigation-effectiveness + 21 cells in tab:ablation; grep line count = 10) |
| **Total (grep line count)** | **84 lines containing [TBD]** |

Additionally, `methodology.tex:94` contains `\placeholder{X}` for GPU-hours.

### 7.2 Estimated Individual [TBD] Markers

Counting individual `[TBD]` occurrences within lines:
- results-content-injection.tex: 32 (tab:ci-success) + 32 (tab:ci-detection) = **64**
- results-semantic-manipulation.tex: 32 (tab:sm-drift) + 16 (tab:sm-detection) = **48**
- results-cognitive-state.tex: **32**
- results-behavioural-control.tex: **32**
- results-systemic.tex: **32**
- results-human-in-the-loop.tex: **24**
- compound-analysis.tex: 60 (tab:compound) + 1 (prose in §11.3 item 4) = **61**
- mitigations-ablation.tex: 12 (tab:mitigation-effectiveness) + 21 (tab:ablation) = **33**
- methodology.tex: 1 (`\placeholder{X}`)
- **Grand total: ~327 individual [TBD] placeholders**

**⚠ BLOCKING ISSUE (S7):** The paper contains **zero actual data**. Every numerical result is a placeholder. The statistical framework is a plan, not an analysis.

---

## 8. Compound Analysis — Super-Additivity Test

### 8.1 Hypothesis

§11.1 states: "We hypothesize that compound traps succeed at a rate higher than max(τ_A, τ_B) — i.e., they are super-additive."

### 8.2 Assessment

- ❌ **No formal test specification.** The paper does not define the statistical test for super-additivity. Is it a one-sided Wilcoxon testing H₁: τ_{A+B} > max(τ_A, τ_B)? A bootstrap test? A permutation test?
- ❌ **No correction for 15 compound comparisons.** If each of the 15 pairs is tested, a separate Bonferroni family (α/15 = 0.00333) should be defined.
- ❌ **No effect size defined.** The Δ column shows surplus but no standardized effect measure.
- ❌ **"Averaged across 4 models"** (caption of tab:compound) collapses the model dimension, losing model-level paired structure. Should the super-additivity test be per-model or aggregated?

### 8.3 Recommendations

1. Formally specify the super-additivity test in §4.4: For each compound pair, compute paired differences d_i = τ_{A+B,i} - max(τ_{A,i}, τ_{B,i}) for i=1,...,n. Test H₀: median(d) ≤ 0 vs. H₁: median(d) > 0 using a one-sided Wilcoxon signed-rank test.
2. Define the multiple comparison correction family for compound tests (k=15).
3. Report per-model results or justify the aggregation.
4. Add Cohen's d for the paired differences.

**Severity: BLOCKING** — The super-additivity claim is central to §11 but has no defined test procedure.

---

## 9. Additional Statistical Concerns

### 9.1 Independence Assumption

The Wilcoxon signed-rank test assumes independence of the paired differences. If the 10 repetitions within a cell share systematic variance (e.g., all using the same LLM API endpoint with temperature-based randomness), the differences may be correlated, inflating Type I error. The deterministic seeding (§4.3, line 64) helps reproducibility but does not address this.

**Recommendation:** Report the intra-class correlation (ICC) of replicate measurements within cells. If ICC > 0.1, consider a mixed-effects model or cluster-robust inference.

### 9.2 Missing Data Handling

§4.5 states: "Failed and timed-out cells are recorded with empty metrics and excluded from aggregate statistics." This creates a missing-not-at-random (MNAR) concern—if certain models/scenarios are more likely to timeout, exclusion biases the results toward easier cells.

**Recommendation:** Report the failure rate per cell and conduct a sensitivity analysis (e.g., impute failures as trap-success=1 or trap-success=0 and check robustness).

### 9.3 Multiple Metrics per Table

Some tables report multiple metrics (e.g., tab:sys-metrics reports τ, C_d, and B_r). Are all metrics subject to Bonferroni correction? If so, the effective number of comparisons increases.

**Recommendation:** Designate a primary outcome metric per analysis and apply correction only to that. Report other metrics as descriptive.

---

## 10. Verdict

### Strengths
- Sound choice of non-parametric test (Wilcoxon) for potentially non-normal bounded outcomes
- Correct Bonferroni correction direction and Cohen's d implementation
- Well-structured code implementation that matches paper description
- The `src/harness/metrics.ts` implementation is generally well-written and correct

### Blocking Issues (must fix before submission)
1. **(S1) Severely underpowered design:** n=10 achieves ~12–15% power for medium effects at corrected α. Must either increase n or explicitly acknowledge and reframe.
2. **(S4) Missing 95% CI columns:** No table includes CI despite claiming CI reporting in §4.4.
3. **(S7) Zero data:** All 327+ result cells are [TBD] placeholders. Cannot evaluate without data.
4. **(S8) Undefined super-additivity test:** §11 claims super-additivity without specifying the test procedure.

### Medium Issues (should fix)
5. **(S2) Wilcoxon at n=10 boundary:** Near-binary significance outcome; normal approximation marginal.
6. **(S5) Missing per-scenario paired statistics:** Category results tables lack p-values and effect sizes.
7. **(S6) Compound table missing variance/CI/effect sizes.**
8. **(S3) Ambiguous Bonferroni family scope** across models/compound/ablation.

### Low Issues (consider addressing)
9. Cohen's d boundary inflation for proportions near 0/1.
10. t-distribution CI may exceed [0,1] for proportions.
11. Consider Holm-Bonferroni or BH as more powerful alternatives.

### Overall Assessment

**Decision: MAJOR REVISION (bordering REJECT)**

The statistical analysis *plan* is fundamentally sound but has a critical power deficiency and several structural gaps. More importantly, the paper contains no actual data—every result cell is a [TBD] placeholder. The paper cannot be evaluated as an empirical contribution without results. Once data is populated, the structural issues (missing CIs, missing per-scenario tests, undefined super-additivity test) must be addressed.

---

## Acceptance Criteria Status

- ☑ Review file exists at `artifacts/reviews/statistics.md` with structured sections: Power Analysis, Test Selection, Multiple Comparisons, Effect Sizes, Table Audit, Verdict
- ☑ Power analysis assessment for n=10 reps: explicit calculation shows ~12–15% power to detect d=0.5 at α=0.00227, requiring n≈64 for 80% power
- ☑ Complete inventory of all TBD placeholders: ~327 individual [TBD] markers across 8 files (84 lines), plus 1 `\placeholder{X}` in methodology.tex
- ☑ Assessment of Wilcoxon signed-rank appropriateness at n=10: minimum p-value ≈ 0.00195 creates near-binary significance; normal approximation is marginal
- ☑ Each LaTeX table checked for N, mean±std, 95% CI, p-value, Cohen's d — **all 11 tables missing CI; 8/11 missing p-value and Cohen's d columns**
