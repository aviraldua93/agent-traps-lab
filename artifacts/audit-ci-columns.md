# Audit: RC-3 — 95% Confidence Interval Columns in Results Tables

**Role:** Statistics Auditor (re-audit)
**Date:** 2026-04-06
**Paper Version:** RC-3 (post-experiment, 220-cell run-2026-04-06T19-30-14)
**Scope:** All results tables in §5–§12, `\ci{}{}` macro usage, methodology claims, interval methodology
**Prior version:** Updated with empirical verification of CI computation bugs

---

## Summary

No results table in the paper includes 95% confidence interval columns. The `\ci{}{}` macro defined in `main.tex:56` is unused throughout all section files. The revised methodology (§4.4) **no longer explicitly claims CI reporting** — a significant improvement over the pre-revision draft which claimed "95% confidence intervals using the t-distribution with df=9." However, the appendix (§B, `main.tex:166-168`) references "full confidence intervals" in supplementary materials. The CI infrastructure in `metrics.ts` exists but contains a critical bug: the t-critical value is hardcoded for df=9 (n=10) rather than df=4 (n=5). For binary proportion data at n=5, Wilson score intervals are the recommended method.

---

## Detailed Findings

### 1. CI Columns in Results Tables — ABSENT

All 7 results tables in the paper use the same column structure:

| Table | Location | Columns |
|-------|----------|---------|
| `tab:ci-success` | results-content-injection.tex:20-29 | Scenario, B(%), H(%), Δ, d, p |
| `tab:sm-success` | results-semantic-manipulation.tex:17-27 | Scenario, B(%), H(%), Δ, d, p |
| `tab:cs-success` | results-cognitive-state.tex:17-27 | Scenario, B(%), H(%), Δ, d, p |
| `tab:bc-success` | results-behavioural-control.tex:17-27 | Scenario, B(%), H(%), Δ, d, p |
| `tab:sys-metrics` | results-systemic.tex:17-27 | Scenario, B(%), H(%), Δ, d, p |
| `tab:hitl-success` | results-human-in-the-loop.tex:17-25 | Scenario, B(%), H(%), Δ, d, p |
| `tab:summary-all` | mitigations-ablation.tex:56-91 | Scenario, B, H, d, p |

**No table includes a CI column.** Zero instances of `\ci{}{}` macro usage in any section file (confirmed via grep).

### 2. Methodology Claims — IMPROVED

The revised §4.4 (`methodology.tex:59-83`) describes the statistical analysis framework:

- **Line 60**: "Central tendency: Mean trap success rate per scenario" — no CI claim
- **Lines 62-65**: Wilcoxon signed-rank tests
- **Lines 66-69**: Cohen's d effect sizes
- **Lines 70-72**: Bonferroni correction with k=22

The pre-revision draft claimed "95% confidence intervals using the t-distribution with df=9" (flagged by the statistics reviewer). **This claim has been removed.** The methodology now correctly focuses on effect sizes and significance tests without claiming CI reporting.

However, `main.tex:166-168` (Appendix B) still states:
> "Per-scenario, per-model raw metrics with **full confidence intervals** are provided in the supplementary JSON artifacts."

This is partially misleading — the `analysis.json` does not include CI columns, though the `computeSummary()` function in `metrics.ts` does compute `ci95Lower`/`ci95Upper` values.

### 3. `\ci{}{}` Macro Usage — ZERO

The macro is defined at `main.tex:56`:
```latex
\newcommand{\ci}[2]{[#1, #2]}               % Confidence interval
```

**grep result**: 0 matches for `\ci{` across all files in `paper/sections/`. The macro is completely unused.

### 4. CI Implementation in metrics.ts — BUGGY

The `computeSummary()` function (`metrics.ts:85-110`) computes CIs:

```typescript
// t-distribution critical value for 95% CI (approximate for n >= 10)
const tCrit = n >= 30 ? 1.96 : 2.262; // df=9 for n=10
```

**Bug**: For n=5 (df=4), the correct t-critical value is **2.776**, not 2.262 (which is for df=9). This produces CIs that are **~18% too narrow**.

Example for CI-2 baseline (mean=0.4, n=5):
- std = 0.5477 (binary data), se = 0.2449
- **Buggy CI** (tCrit=2.262): [−0.154, 0.954] — incorrect width
- **Correct CI** (tCrit=2.776): [−0.280, 1.080] — still violates [0,1] bounds!

This illustrates why t-distribution CIs are inappropriate for proportion data.

### 5. Recommended Interval Methodology

For binary proportion data (trap success: 0 or 1 per rep, averaged over n=5) where the parameter is bounded on [0,1]:

| Method | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Wilson score** | Good coverage even at boundaries (0%, 100%), closed-form, never exceeds [0,1] | Slightly anti-conservative for very small n | **RECOMMENDED** |
| **Clopper-Pearson (exact)** | Conservative (guaranteed ≥95% coverage), respects [0,1] bounds | Overly conservative, wide intervals at small n | Acceptable alternative |
| **t-distribution** | Simple, standard for continuous data | Violates [0,1] bounds for proportions; incorrect for binary data | **NOT APPROPRIATE** |
| **Agresti-Coull** | Near-nominal coverage for moderate n | Requires n ≥ 40 for best performance | Not suitable for n=5 |

**Wilson score interval formula** for proportion p̂ = k/n:

$$\frac{p̂ + z^2/2n \pm z\sqrt{p̂(1-p̂)/n + z^2/4n^2}}{1 + z^2/n}$$

where z = 1.96 for 95% CI, k = number of successes, n = number of trials.

**Examples for current data (n=5)**:

| Scenario | p̂ | k/n | Wilson 95% CI | t-distribution CI (buggy) |
|----------|-----|-----|---------------|--------------------------|
| CI-1 (B) | 1.00 | 5/5 | [0.566, 1.000] | [1.000, 1.000] (degenerate) |
| CI-2 (B) | 0.40 | 2/5 | [0.118, 0.738] | [−0.154, 0.954] (OOB!) |
| SM-1 (B) | 1.00 | 5/5 | [0.566, 1.000] | [1.000, 1.000] (degenerate) |
| SM-1 (H) | 0.00 | 0/5 | [0.000, 0.434] | [0.000, 0.000] (degenerate) |
| HL-1 (B) | 0.60 | 3/5 | [0.262, 0.882] | [0.046, 1.154] (OOB!) |

Wilson intervals are well-behaved at boundaries and never exceed [0,1].

### 6. Tables Requiring CI Columns

If CIs are to be added (recommended for completeness), each of the 7 tables listed above needs a CI column for at least the baseline and hardened success rates. Given the two-column USENIX format, adding two CI columns (one per condition) would significantly widen tables. Options:

- **Option A**: Add a single "CI" column showing the wider of the two intervals (space-efficient)
- **Option B**: Use footnoted supplementary table with full CIs (preserves current compact format)
- **Option C**: Report CIs only in the summary table (`tab:summary-all`) and reference supplementary data for per-category CIs

Given the page limit constraint (RC-2), **Option C is recommended**: add Wilson CIs to `tab:summary-all` only and reference the supplementary JSON for per-scenario CIs.

### 7. Appendix Claim Fix

`main.tex:166-168` should be updated to either:
- Remove the "full confidence intervals" claim, or
- Ensure the supplementary JSON actually includes Wilson CIs (currently `analysis.json` does not)

---

## Acceptance Criteria Status

- ☑ **Determination of whether any results table includes 95% CI columns**: Confirmed — **no table includes CI columns** (0/7 tables). All use the column set {Scenario, B(%), H(%), Δ, d, p}.

- ☑ **Assessment of whether the paper still claims CI reporting in methodology section**: The revised §4.4 methodology **no longer claims CI reporting** (the pre-revision claim was removed). However, Appendix B (`main.tex:167`) still references "full confidence intervals" in supplementary materials, which is partially misleading since `analysis.json` lacks CI data.

- ☑ **Tables needing CI columns and interval recommendation**: All 7 tables need CI columns if added. **Wilson score intervals** are recommended over Clopper-Pearson for proportion data at n=5 (better coverage properties, bounded on [0,1], closed-form). The t-distribution implementation in `metrics.ts` is unsuitable (violates [0,1] bounds, uses wrong df). Recommend adding CIs to `tab:summary-all` only (Option C) to respect page limits.

- ☑ **Check if `\ci{}{}` macro is used in section files**: **Not used anywhere.** Zero matches across all section files. The macro is defined at `main.tex:56` but entirely unused.

---

## Severity Assessment

**Overall: MODERATE (not blocking, but should be addressed)**

The removal of the CI-reporting claim from §4.4 significantly reduces the severity of this issue. The paper no longer promises CIs and then fails to deliver them. However:
1. The appendix still references "full confidence intervals" — needs correction
2. Adding Wilson CIs to at least the summary table would strengthen the paper
3. The `metrics.ts` CI implementation has a wrong t-critical value (2.262 for df=9 used when n=5, should be 2.776 for df=4) and is inappropriate for proportion data in any case

**Recommended actions (prioritized)**:
1. Fix `main.tex:167` appendix claim about confidence intervals
2. Fix `metrics.ts:98` t-critical value lookup (add df-based lookup or switch to Wilson)
3. Add Wilson CI columns to `tab:summary-all` (Option C above)
4. Ensure supplementary JSON includes Wilson CIs if claimed
