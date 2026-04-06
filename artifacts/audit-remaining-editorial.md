# Audit: Remaining Editorial Items (RC-7, RC-9, RC-11, RC-13, RC-14)

**Reviewer:** Editorial Reviewer (Re-review)
**Date:** 2026-04-06
**Scope:** Confound acknowledgment, numerical consistency, tool-use scoping, failure rates, seeding

---

## Summary

Of five items audited: three fully addressed (RC-9 numerical consistency, RC-11 tool-use scoping, RC-14 seeding clarification), one adequately addressed (RC-7 confound acknowledgment), one partially addressed (RC-13 failure/timeout rates — mentioned but no per-scenario table).

---

## RC-7: Confound Acknowledgment — ADEQUATELY ADDRESSED

**Acknowledged in both methodology and discussion.**

**methodology.tex:34-37:**
> Confound note. The hardened condition simultaneously changes two variables: mitigation modules and system prompt. We cannot attribute observed improvements to either factor alone. A factorial decomposition (prompt-only, modules-only) is planned for future work.

**discussion.tex:76-78 (Sec 13.4, bullet 2):**
> The hardened condition confounds mitigation modules with the security-hardened prompt. A 2x2 factorial (modules +/- prompt +/-) would disambiguate these effects.

Assessment: Explicitly names both confounded variables, states attribution limitation, proposes fix as future work. Satisfies the meta-review's "minimum fix" requirement.

---

## RC-9: Numerical Consistency — FULLY ADDRESSED

**Numbers now correctly reflect the 220-cell experiment.**

The meta-review flagged "2,640 main runs" and "600 compound" as errors.

**Current text (related-work.tex:181-182):**
> 22 scenarios x 2 conditions x 5 reps = 220 main runs

**Cross-consistency check:**

| Location | Stated count | Correct? |
|----------|:------------|:--------:|
| abstract.tex:13 | 220 runs | YES |
| introduction.tex:55 | 220 experiment cells | YES |
| methodology.tex:45-48 | 22 x 2 x 5 = 220 | YES |
| related-work.tex:182 | 220 main runs | YES |
| conclusion.tex:11 | 220 controlled experiments | YES |
| testbed-design.tex:165 | 220 experiment cells | YES |

All six mentions are consistent. The erroneous 2,640 and 600 figures have been corrected.

---

## RC-11: Tool-Use Attack Scoping — ADEQUATELY ADDRESSED

**Explicitly scoped out in Discussion limitations.**

**discussion.tex:120-123 (Sec 13.7, item 6):**
> Tool-use attacks not covered. Following the DeepMind taxonomy scope, we evaluate environmental/contextual attacks and do not cover tool-use/function-calling attack surfaces (cf. AgentDojo).

Assessment:
1. Names the gap explicitly
2. Justifies the scoping decision
3. Distinguishes the paper's focus
4. References the relevant benchmark (AgentDojo)

---

## RC-13: Failure/Timeout Rates — PARTIALLY ADDRESSED

**Mentioned in methodology but no per-scenario table.**

**methodology.tex:88-90:**
> Each cell has a 120-second timeout. Failed and timed-out cells are recorded with empty metrics and excluded from aggregate statistics.

**Missing:**
- No table of failure/timeout rates per scenario
- No MCAR vs. systematic missingness discussion
- No sensitivity analysis

**Mitigating factor:** All 22 scenarios report clean percentage values that are multiples of 20% (consistent with n=5 with all reps completing), suggesting zero or near-zero exclusions. A one-line statement ("All 220 cells completed successfully") would satisfy this requirement without a table.

**Severity: LOW** — Data appears complete but explicit confirmation is missing.

---

## RC-14: Seeding Clarification — FULLY ADDRESSED

**methodology.tex:50-53:**
> Each cell is assigned a deterministic seed (cellIndex x 1337 + rep) for reproducible experiment assignment. Note that seeds control cell assignment metadata only; LLM outputs remain stochastic at T=0.7, with variance captured across the 5 repetitions.

This directly addresses the concern by:
1. Explaining what seeds control ("cell assignment metadata only")
2. Clarifying LLM stochasticity ("remain stochastic at T=0.7")
3. Explaining variance handling ("captured across the 5 repetitions")

---

## Acceptance Criteria Status

- [x] **RC-7**: Confound acknowledged in methodology.tex (Sec 4.2) and discussion.tex (Sec 13.4)
- [x] **RC-9**: All six mentions of experiment count are consistent at 220
- [x] **RC-11**: Tool-use attacks explicitly scoped out with justification and reference
- [ ] **RC-13**: Failure rates mentioned but no per-scenario table provided
- [x] **RC-14**: Seeding clarification distinguishes seed determinism from LLM stochasticity
