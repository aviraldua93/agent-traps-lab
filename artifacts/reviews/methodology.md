# Methodology Review: "From Taxonomy to Testbed"

**Reviewer:** Methodology Reviewer (automated, A2A-coordinated)
**Paper:** "From Taxonomy to Testbed: Quantifying Environmental Attacks on Multi-Agent A2A Systems"
**Target Venue:** USENIX Security 2027
**Date:** 2026-04-06

---

## Summary

The paper presents an ambitious experimental framework with a well-structured 9,120-cell experiment matrix, principled statistical methodology (Wilcoxon, Cohen's d, Bonferroni), and a clean factorial design. However, **all results tables contain only placeholder [TBD] values**—no experiments have been run. The paper makes five strong empirical claims in the abstract and six in the conclusion with zero supporting data. Additionally, the hardened condition confounds mitigation modules with a system prompt change, no power analysis justifies the n=10 design, and the Wilcoxon normal approximation is unreliable at n=10. The experimental infrastructure is impressively thorough, but the paper cannot be evaluated as an empirical contribution until data is collected.

---

## 1. Design Assessment

### 1.1 Matrix Arithmetic — ✅ Sound

The experiment matrix is correctly computed:

| Sub-matrix | Formula | Count |
|---|---|---|
| Main (baseline + hardened) | 22 × 4 × 2 × 10 | 1,760 |
| Ablation (remove 1 of 7) | 22 × 4 × 7 × 10 | 6,160 |
| Compound (15 pairs) | 15 × 4 × 2 × 10 | 1,200 |
| **Total** | | **9,120** |

The 15 compound pairs correctly correspond to C(6,2) = 15 pairwise combinations of the six DeepMind categories. Each sub-matrix is generated deterministically in `src/harness/matrix.ts`.

### 1.2 Scenario Coverage — ✅ Complete

All 22 scenarios are registered in `src/traps/register-all.ts` and implement the `TrapScenario` interface with the full lifecycle (`setup → execute → evaluate → teardown`). The distribution across categories (4-4-4-4-3-3) matches the paper's Table 1 (`testbed-design.tex` lines 88–134).

### 1.3 Model Selection — ⚠️ Adequate with caveats

Four models across 3 providers and 2 tiers is reasonable. However:

- **All models use T=0.7** (`src/config.ts`), which introduces non-deterministic outputs. The paper claims "deterministic seed" (`methodology.tex` line 64) but seeds only control experiment assignment, not LLM sampling. This means repeat runs with identical seeds will NOT produce identical results. The paper should clarify this distinction.
- **Model versioning risk** is acknowledged in Discussion §13.4 item 4 but not mitigated. Pinning specific model snapshots (e.g., `gpt-4o-2024-05-13`) would strengthen reproducibility.

### 1.4 Condition Design — ⚠️ Confound present

The three conditions are well-motivated but the **baseline→hardened comparison is confounded**:

- **Baseline**: No mitigations, default system prompt.
- **Hardened**: All 7 mitigations + security-hardened system prompt suffix ("You are operating in a security-hardened mode. Before executing any action, validate the source and intent...").
- **Ablated**: Hardened minus one mitigation (but retains the system prompt suffix).

**Problem**: The hardened condition changes TWO independent variables simultaneously—(1) mitigation modules and (2) system prompt. The observed baseline→hardened improvement cannot be attributed solely to the mitigations. A **prompt-only** condition (security prompt suffix, no mitigation modules) is needed to isolate the contribution of each.

### 1.5 Ablation Design — ✅ Principled, with limitation

Single-module removal ablation correctly measures marginal contribution under the assumption of no interaction effects. However, the paper acknowledges (§12.4 item 2) that the semantic-shield and context-validator have "partially overlapping coverage," suggesting interaction effects exist. A **pairwise ablation** (remove 2 at a time) for known interacting modules would strengthen the analysis.

---

## 2. Controls Evaluation

### 2.1 Internal Validity — ⚠️ Three confound concerns

| Confound | Severity | Detail |
|---|---|---|
| **System prompt confound** | **MEDIUM** | Hardened adds mitigations AND prompt suffix simultaneously. Cannot isolate which drives improvement. |
| **Temperature stochasticity** | **MEDIUM** | T=0.7 means identical seeds don't produce identical outputs. 10 reps may capture variance, but this should be explicitly modeled, not implicitly assumed. The paper should either use T=0 (for reproducibility) or justify T=0.7 and report inter-run variance. |
| **Mitigation order effects** | **LOW** | Mitigations are applied sequentially in a fixed order (`src/agents/agent-handle.ts` lines 105–130). If mitigation A strips content that B would have detected, the order matters. Not discussed in the paper. |

### 2.2 External Validity — Acknowledged limitations

The Discussion (§13.4) appropriately acknowledges:
- Synthetic environments (item 1)
- Static adversaries (item 2)
- Binary metrics (item 3)
- Model versioning (item 4)
- No human validation for HL-category (item 5)

These are standard limitations for this type of work and are handled transparently.

### 2.3 Construct Validity — ⚠️ Binary metric resolution

With binary metrics (trap success = 0 or 1) and n=10 repetitions, each cell can only produce 11 possible success rates (0%, 10%, 20%, ..., 100%). This severely limits the statistical resolution:

- A 10% difference (e.g., 70% vs 80%) corresponds to a single additional success in 10 trials
- Confidence intervals on proportions at n=10 are inherently wide
- The Wilcoxon signed-rank test has very low power at n=10 for binary outcomes

The paper should report exact binomial CIs for binary metrics alongside the t-distribution CIs currently used.

---

## 3. Reproducibility

### 3.1 Deterministic Seeding — ⚠️ Partially achieved

**Formula**: `seed = cellIndex × 1337 + rep` (`src/harness/matrix.ts`)

- ✅ The formula uniquely identifies each cell-rep combination
- ✅ Seeds are deterministic given the same matrix configuration
- ⚠️ However, these seeds are NOT passed to the LLM API as `seed` parameters (the OpenAI API supports a `seed` parameter; Anthropic and Google do not). With T=0.7, the seed only controls experiment metadata, not LLM output.
- ⚠️ Consecutive reps within the same cell get consecutive seeds (offset by 1), which is fine for experiment identification but should be documented as not providing randomization of experimental conditions.

### 3.2 Open-Source Artifacts — ⚠️ Incomplete

| Artifact | Status |
|---|---|
| Source code | ✅ Available at GitHub URL |
| 22 trap scenarios | ✅ All implemented and registered |
| 7 mitigation modules | ✅ All implemented |
| Experiment harness | ✅ Matrix generator + runner complete |
| Statistical analysis | ✅ Metrics, comparisons, Wilcoxon, Cohen's d |
| Raw experiment data | ❌ `results/` directory is empty |
| Zenodo DOI | ❌ Placeholder: `XX.XXXX/zenodo.XXXXXXX` (`main.tex` line 175) |
| GPU-hours estimate | ❌ Placeholder: `\placeholder{X}` (`methodology.tex` line 94) |

### 3.3 Timeout and Failure Exclusion — ⚠️ Described but not analyzed

- **Timeout**: 120 seconds per cell (`src/harness/runner.ts` lines 81–84)
- **Failure handling**: Timeout and error cells get empty metrics, status recorded
- **Exclusion**: Failed/timed-out cells are excluded from aggregate statistics (`results.filter(r => r.status === 'success')`)

**Concern**: The paper does not describe reporting the failure/timeout rate. If many cells time out (e.g., BC-4 infinite loops might systematically timeout), the exclusion could introduce survivorship bias. The paper should:
1. Report failure/timeout rates per scenario
2. Analyze whether failures are random or systematic
3. Consider intent-to-treat analysis (counting failures as trap successes for certain scenarios)

### 3.4 Missing Reproduction Details

1. **No requirements.txt / package.json lockfile discussion**: While `bun.lock` exists, the paper doesn't mention dependency pinning.
2. **No hardware specification**: Beyond "8 parallel workers," no CPU/memory/network latency details.
3. **No API rate-limiting strategy**: With 9,120 calls across 3 providers, rate limits could affect timing metrics. Not discussed.

---

## 4. Claim-Evidence Mapping

### 4.1 Abstract Claims

| # | Claim (abstract.tex) | Evidence Section | Data Status | Assessment |
|---|---|---|---|---|
| A1 | "content injection traps via hidden CSS and HTML comments achieve the highest baseline success rates" | §5 (`results-ci`), Table 2 (`tab:ci-success`) | **ALL [TBD]** | ❌ No supporting data |
| A2 | "semantic manipulation through authority framing is the most difficult trap category for agents to detect" | §6 (`results-sm`), Table 4 (`tab:sm-detection`) | **ALL [TBD]** | ❌ No supporting data |
| A3 | "systemic multi-agent cascades produce super-additive failure modes" | §9 (`results-sys`), Table 7 (`tab:sys-metrics`) | **ALL [TBD]** | ❌ No supporting data. Also, "super-additive" is a compound-trap claim (§11), not a systemic-category claim. The wording conflates cascade depth with cross-category super-additivity. |
| A4 | "the hardened mitigation suite reduces overall trap success by a statistically significant margin with large effect sizes" | §12 (`mitigations-ablation`), Table 11 (`tab:mitigation-effectiveness`) | **ALL [TBD]** | ❌ No supporting data |
| A5 | "ablation analysis reveals that input sanitization and cascade breaking contribute the greatest marginal defense value" | §12.3 (`mit-ablation`), Table 12 (`tab:ablation`) | **ALL [TBD]** | ❌ No supporting data |

### 4.2 Conclusion Claims

| # | Claim (conclusion.tex) | Evidence Section | Data Status | Assessment |
|---|---|---|---|---|
| C1 | "All six trap categories are empirically effective against undefended agents" | §5–§10 (all results sections) | **ALL [TBD]** | ❌ No data to support "empirically effective" |
| C2 | "efficient models (GPT-4o-mini) are consistently more vulnerable than frontier models" | §5–§10, §13.2 | **ALL [TBD]** | ❌ No data. Cross-model comparison requires completed tables. |
| C3 | "the seven-module mitigation suite reduces overall trap success by a statistically significant margin with large effect sizes across all models and categories" | §12, Table 11 | **ALL [TBD]** | ❌ No data. "Across all models and categories" is a strong universal claim. |
| C4 | "combining two trap categories produces success rates higher than either individual category" (super-additive) | §11 (`compound`), Table 13 (`tab:compound`) | **ALL [TBD]** | ❌ No data. Also note `compound-analysis.tex` line 79 has inline [TBD]: "Overall, [TBD] of the 15 compound pairs show statistically significant super-additivity." |
| C5 | "input sanitization and cascade breaking provide the greatest marginal defense value, while RAG integrity is a single point of failure for cognitive state attacks" | §12.3, Table 12 | **ALL [TBD]** | ❌ No data |
| C6 | "our systemic attack results motivate mandatory message authentication, content integrity verification, and trust scoring in future protocol versions" | §9, §13.1 | **ALL [TBD]** for data; §13.1 provides qualitative argument | ⚠️ Qualitative analysis present but quantitative support missing |

### 4.3 Cross-Section Inconsistency

**Related-work.tex line 182** states: "22 scenarios × 4 models × 3 conditions × 10 reps = 2,640 main runs"

This conflicts with **methodology.tex lines 57–62** which correctly computes: 22 × 4 × 2 × 10 = 1,760 main cells (the "3 conditions" include ablation which is counted separately as 6,160).

The related-work section appears to use "3 conditions" = {baseline, hardened, ablated} and compute 22 × 4 × 3 × 10 = 2,640, but this double-counts: ablation is 7 sub-conditions (one per removed mitigation), not 1.

---

## 5. Statistical Methodology Assessment

### 5.1 Wilcoxon Signed-Rank at n=10 — ⚠️ Approximation concern

The implementation (`src/harness/metrics.ts` lines 145–175) uses the **normal approximation** for the Wilcoxon test statistic:

```
z = (w - meanW) / stdW
```

This approximation is generally recommended for n ≥ 20–25. At n=10, exact critical values from Wilcoxon tables should be used. The normal approximation can produce inaccurate p-values at small sample sizes, potentially leading to false positives or false negatives.

**Recommendation**: Use exact Wilcoxon tables for n=10 or switch to a permutation test.

### 5.2 Bonferroni Correction — ✅ Conservative

α = 0.05 / 22 = 0.00227. This is correctly implemented in `src/harness/metrics.ts` lines 199–201. Bonferroni is conservative (reduces Type I error at the cost of power), which is appropriate for a testbed paper making many simultaneous comparisons.

### 5.3 Cohen's d — ✅ Correct implementation

Pooled standard deviation approach with standard classification thresholds (negligible < 0.2 < small < 0.5 < medium < 0.8 ≤ large). Implementation in `src/harness/metrics.ts` lines 115–131 matches the paper's description.

### 5.4 Missing: Power Analysis

The paper asserts n=10 repetitions "for statistical power" (abstract, line 18) but provides **no a priori power analysis**. For binary outcomes at n=10:

- To detect a 30% absolute difference (e.g., 80% → 50%) with α=0.00227 (Bonferroni-corrected) and 80% power, n ≈ 30–40 per group is needed (exact McNemar's test).
- n=10 provides adequate power only for very large effects (d > 1.2) at the corrected α level.

The paper should either:
1. Present a post-hoc power analysis showing what effect sizes are detectable at n=10
2. Increase n to 30+ for adequate power
3. Reduce the number of comparisons to allow a less aggressive Bonferroni correction

### 5.5 Missing: Multiple Testing Strategy

The paper applies Bonferroni correction for 22 scenario comparisons. However, the actual number of comparisons is much larger:

- 22 scenarios × 4 models × 6 metrics = 528 statistical tests (baseline vs hardened)
- Plus 22 × 4 × 7 = 616 ablation comparisons
- Plus 15 compound comparisons

The Bonferroni denominator should reflect the total number of tests performed, not just the 22 scenarios. Alternatively, the paper should clarify that correction is applied per-model and describe the family-wise error rate precisely.

---

## 6. Variable Operationalization

### 6.1 TrapScenario Lifecycle — ✅ Well-defined

The `TrapScenario` interface (`src/traps/types.ts` lines 22–57) provides a clean four-phase lifecycle:

1. **`setup(config)`** → `TrapEnvironment`: Provisions adversarial resources with ground truth
2. **`execute(env, agent)`** → `TrapObservation`: Deploys agent, records behavior
3. **`evaluate(observation)`** → `TrapMetrics`: Computes 6 core metrics + optional cascade metrics
4. **`teardown(env)`** → Cleanup

This design cleanly separates environment provisioning from agent execution from metric computation, enabling independent validation of each phase.

### 6.2 Mitigation Interface — ✅ Clean pre/post hooks

The `Mitigation` interface (`src/mitigations/types.ts` lines 5–29) with `preProcess()` / `postProcess()` hooks provides a clear insertion point. The `estimateOverhead()` method enables cost analysis.

### 6.3 Metrics — ⚠️ Mixed operationalization

| Metric | Type | Resolution at n=10 | Concern |
|---|---|---|---|
| Trap Success Rate (τ) | Binary | 11 values (0–100% by 10%) | Low resolution |
| Detection Rate (δ) | Binary | 11 values | Low resolution |
| Escape Rate (ε) | Binary | 11 values | Low resolution |
| Decision Drift (Δ) | Continuous (cosine distance) | Good | ✅ Well-operationalized |
| Time to Compromise (t_c) | Continuous (ms) | Good | ✅ Well-operationalized |
| Token Waste (w) | Continuous (count) | Good | ✅ Well-operationalized |

The three binary metrics at n=10 have very low resolution. The three continuous metrics are fine.

---

## 7. Specific Actionable Recommendations

### Recommendation 1: Add a prompt-only control condition
**Section**: `methodology.tex` lines 36–50 (§4.2 Experimental Conditions)
**Issue**: The hardened condition confounds mitigation modules with a security system prompt suffix. The baseline→hardened comparison cannot isolate which factor drives improvement.
**Fix**: Add a fourth condition: "prompt-only" — no mitigation modules active, but with the security system prompt suffix from the hardened config. This enables a 2×2 factorial decomposition: {prompt, no-prompt} × {mitigations, no-mitigations}.
**Severity**: MEDIUM — affects all baseline vs. hardened claims (A4, C3).

### Recommendation 2: Add power analysis subsection
**Section**: `methodology.tex` after line 86 (after §4.4 Statistical Analysis)
**Issue**: No justification for n=10 repetitions. With binary outcomes and Bonferroni correction (α=0.00227), n=10 may be severely underpowered.
**Fix**: Add a §4.5 "Sample Size Justification" subsection with: (a) target minimum detectable effect size (e.g., 30% absolute difference); (b) power calculation for Wilcoxon test at n=10 with corrected α; (c) if underpowered, either increase n or use a less conservative correction (e.g., Benjamini-Hochberg FDR).
**Severity**: MEDIUM — affects credibility of all significance claims.

### Recommendation 3: Use exact Wilcoxon tables for n=10
**Section**: `methodology.tex` line 78 (§4.4 Statistical Analysis, Wilcoxon description)
**Implementation**: `src/harness/metrics.ts` lines 145–175
**Issue**: The normal approximation for the Wilcoxon test is unreliable at n=10. Critical values from exact tables differ meaningfully from the normal approximation at small sample sizes.
**Fix**: Replace the normal approximation with exact Wilcoxon critical values (lookup table for n=10) or use a permutation test. Document the choice in the paper.
**Severity**: MEDIUM — could produce incorrect p-values.

### Recommendation 4: Fix matrix count inconsistency in related-work.tex
**Section**: `related-work.tex` line 182
**Issue**: States "2,640 main runs" but methodology.tex correctly computes 1,760 main cells. The "3 conditions" claim conflates the 2 main conditions with 7 ablation sub-conditions.
**Fix**: Change to "1,760 main runs, plus 600 compound and 6,160 ablation runs" or simply "9,120 total experiment cells."
**Severity**: LOW — factual error in positioning text.

### Recommendation 5: Report failure/timeout rates per scenario
**Section**: `methodology.tex` lines 90–95 (§4.5 Execution Infrastructure)
**Issue**: Timed-out and errored cells are excluded from aggregate statistics. No reporting of exclusion rates. This could introduce survivorship bias, especially for BC-4 (infinite loops) which may systematically timeout.
**Fix**: Add a table reporting failure/timeout rates per scenario. Discuss whether exclusions are MCAR (missing completely at random) or systematic. Consider sensitivity analysis including failures.
**Severity**: MEDIUM — affects reliability of aggregate metrics.

### Recommendation 6: Fill all placeholder values before submission
**Section**: All results sections (§5–§12), `methodology.tex` line 94, `main.tex` line 175
**Issue**: Every data table contains `\textcolor{red}{[TBD]}` placeholders. The GPU-hours estimate and Zenodo DOI are also missing.
**Fix**: Run the experiment matrix and populate all tables. This is a blocking prerequisite for any empirical claims.
**Severity**: **BLOCKING** — paper cannot be reviewed as empirical work without data.

### Recommendation 7: Clarify seeding vs. LLM determinism
**Section**: `methodology.tex` lines 64–65 (§4.3 Experiment Matrix)
**Issue**: "Each cell is assigned a deterministic seed" implies reproducible results, but T=0.7 makes LLM outputs non-deterministic. Seeds control cell assignment only.
**Fix**: Clarify: "Seeds ensure reproducible experiment assignment; LLM outputs are stochastic at T=0.7, with variance captured across 10 repetitions." Consider using T=0 for a subset of experiments as a reproducibility validation.
**Severity**: LOW — misleading wording, not a design flaw.

---

## 8. Verdict

### Overall Assessment: **Major Revision Required**

**Strengths:**
- Impressive experimental infrastructure: 22 scenarios, 7 mitigations, full matrix generator, statistical analysis pipeline
- Sound factorial design with 9,120 cells covering main, ablation, and compound sub-matrices
- Appropriate non-parametric statistics (Wilcoxon) and effect sizes (Cohen's d) with multiple comparison correction
- Clean interface design (TrapScenario, Mitigation) enabling modular extension
- Comprehensive limitation discussion (§13.4)
- Strong contribution to reproducible adversarial evaluation

**Weaknesses:**
- **BLOCKING: No experimental data exists.** All results tables are [TBD]. The paper makes 11 specific empirical claims with zero supporting evidence.
- **Confounded hardened condition**: System prompt + mitigations changed simultaneously
- **No power analysis**: n=10 may be underpowered for binary outcomes at Bonferroni-corrected α
- **Wilcoxon approximation unreliable at n=10**: Should use exact tables
- **Matrix count inconsistency** between methodology and related-work sections

**Required Changes (before resubmission):**
1. ☐ Run experiments and populate all [TBD] tables
2. ☐ Add prompt-only control condition or acknowledge confound
3. ☐ Add power analysis subsection
4. ☐ Switch to exact Wilcoxon test (or permutation test)
5. ☐ Fix related-work matrix count inconsistency
6. ☐ Report failure/timeout exclusion rates
7. ☐ Fill GPU-hours estimate and Zenodo DOI

---

## Acceptance Criteria Status

- ☑ Review file exists at `artifacts/reviews/methodology.md` with structured sections: Design Assessment, Controls Evaluation, Reproducibility, Claim-Evidence Mapping, Verdict
- ☑ Every claim in `abstract.tex` and `conclusion.tex` is mapped to a specific results section with assessment of whether supporting evidence exists or is TBD (see §4)
- ☑ The 3-condition experimental design (baseline/hardened/ablated) is evaluated for internal validity with specific confound concerns listed (see §2.1)
- ☑ Reproducibility assessment covers: deterministic seeding formula, open-source artifacts, timeout/failure exclusion policy, and identifies missing reproduction details (see §3)
- ☑ At least 3 specific actionable recommendations provided, each referencing a specific section and line of the paper (see §7, 7 recommendations total)
