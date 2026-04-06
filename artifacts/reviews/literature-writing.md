# Literature & Writing Review — Agent Traps Lab Paper

**Reviewer Role:** Literature Writing Reviewer (combined related-work + writing quality)
**Paper:** "From Taxonomy to Testbed: Quantifying Environmental Attacks on Multi-Agent A2A Systems"
**Target Venue:** USENIX Security 2027
**Date:** 2026-04-06

---

## Summary

The paper presents agent-traps-lab, an open-source testbed operationalizing DeepMind's AI Agent Traps taxonomy into 22 adversarial scenarios evaluated across 4 LLMs over 9,120 experiments. The related work section is well-structured with five clearly delineated subsections and a positioning summary table covering the major research threads. Writing quality is generally strong with consistent macro usage and clear argumentation. However, the review identifies **3 numerical inconsistencies**, **5+ missing seminal references**, **76+ TBD placeholders** across results sections, and a potential **page limit risk**. The paper's current state is a well-scaffolded draft that requires data population and citation gap closure before submission.

---

## 1. Citation Completeness

### 1.1 Coverage of Required Research Threads

| Thread | Key Papers Required | Present in Bib? | Cited in Related Work? |
|--------|-------------------|-----------------|----------------------|
| **Prompt Injection** | Greshake et al. (2023) | ✅ `greshake2023indirect` | ✅ §14.1 |
| | Perez & Ribeiro (2022) | ✅ `perez2022prompt` | ✅ §14.1 |
| | Liu et al. (2024) | ✅ `liu2024formalizing` | ✅ §14.1 |
| | Yi et al. (2023) | ✅ `yi2023benchmarking` | ✅ §14.1 |
| | Zhan et al. (2024) | ✅ `zhan2024injecagent` | ✅ §14.1 |
| **Jailbreaking** | Wei et al. (2024) | ✅ `wei2024jailbroken` | ✅ §14.2 |
| | Zou et al. (2023) | ✅ `zou2023universal` | ✅ §14.2 |
| | Chao et al. (2023) | ✅ `chao2023jailbreaking` | ✅ §14.2 |
| | Liu et al. (AutoDAN, 2024) | ✅ `liu2024autodan` | ✅ §14.2 |
| **Adversarial ML** | Goodfellow et al. (2015) | ✅ `goodfellow2015adversarial` | ✅ §14.2 |
| | Carlini & Wagner (2017) | ✅ `carlini2017evaluating` | ✅ §14.2 |
| | Madry et al. (2018) | ✅ `madry2018towards` | ✅ §14.2 |
| | Biggio et al. (2013) | ✅ `biggio2013evasion` | ✅ §14.2 |
| **Multi-Agent** | Cohen et al. (2024) | ✅ `cohen2024unleashing` | ✅ §14.3 |
| | Gu et al. (2024) | ✅ `gu2024agent` | ✅ §14.3 |
| | Tian et al. (2024) | ✅ `tian2024evil` | ✅ §14.3 |
| **RAG Poisoning** | Zhong et al. (2023) | ✅ `zhong2023poisoning` | ✅ §14.4 |
| | Zou et al. (PoisonedRAG, 2024) | ✅ `zou2024poisonedrag` | ✅ §14.4 |
| | Xue et al. (BadRAG, 2024) | ✅ `xue2024badrag` | ✅ §14.4 |
| | Chaudhari et al. (Phantom, 2024) | ✅ `chaudhari2024phantom` | ✅ §14.4 |
| **Benchmarks** | HarmBench (Mazeika et al., 2024) | ✅ `mazeika2024harmbench` | ✅ §14.5 |
| | DecodingTrust (Wang et al., 2024) | ✅ `wang2024decodingtrust` | ✅ §14.5 |
| | AgentDojo (Debenedetti et al., 2024) | ✅ `debenedetti2024agentdojo` | ✅ §14.5 |
| | SafetyBench (Zhang et al., 2024) | ✅ `zhang2024safetybench` | ✅ §14.5 |
| | TrustLLM (Sun et al., 2024) | ✅ `sun2024trustllm` | ✅ §14.5 |

**Assessment:** All explicitly required citations from the review checklist are present. The bibliography contains 53 entries, and the related work section cites the key papers from each thread.

### 1.2 Missing Seminal References (MEDIUM severity)

Despite good coverage of required threads, the following seminal references are **absent** and should be added:

1. **Wallace et al. (2019) — "Universal Adversarial Triggers for Attacking and Analyzing NLP" (EMNLP)**
   - *Why critical:* This is the foundational work on adversarial triggers in NLP, directly preceding Zou et al. (2023)'s universal adversarial suffixes. The paper cites Zou et al. but omits this key precursor. Reviewers familiar with the adversarial NLP lineage will note this gap.
   - *Placement:* §14.2 (Adversarial ML Foundations), between Biggio et al. and Zou et al.

2. **Zeng et al. (2024) — "How Johnny Can Persuade LLMs to Jailbreak Them: Rethinking Persuasion to Challenge AI Safety by Humanizing LLMs"**
   - *Why critical:* Directly relevant to the Semantic Manipulation trap category (SM-1 through SM-4), which tests authority framing, emotional urgency, and identity manipulation. This paper systematically studies persuasion-based attacks on LLMs — the exact mechanism the SM traps operationalize. Its omission leaves a gap in justifying the SM category's attack design.
   - *Placement:* §14.2 (Adversarial ML) or in §14.1 alongside the semantic manipulation discussion.

3. **Shen et al. (2024) — "Do Anything Now: Characterizing and Evaluating In-The-Wild Jailbreak Prompts on Large Language Models" (IEEE S&P)**
   - *Why critical:* Largest empirical study of real-world jailbreak prompts, directly relevant for grounding the paper's jailbreaking-related scenarios in observed attack patterns. Establishes the practical prevalence of the attack types this paper operationalizes.
   - *Placement:* §14.2 (Adversarial ML Foundations), with jailbreaking discussion.

4. **Shafahi et al. (2018) — "Poison Frogs! Targeted Clean-Label Poisoning Attacks on Neural Networks" (NeurIPS)**
   - *Why critical:* Seminal data poisoning paper. The RAG poisoning thread (§14.4) discusses corpus poisoning extensively but lacks foundational data poisoning references from the classical ML literature. Including this strengthens the intellectual lineage from traditional ML poisoning → RAG poisoning.
   - *Placement:* §14.4 (RAG & Knowledge Poisoning), as historical context.

5. **Deng et al. (2024) — "MasterKey: Automated Jailbreaking of Large Language Model Chatbots" (NDSS)**
   - *Note:* This paper IS in the bibliography (`deng2024masterkey`) but is **never cited in the related work text**. This is either an orphaned entry or an accidental omission. It should be cited in §14.2 alongside AutoDAN as another automated jailbreak generation approach.

### 1.3 Minor Citation Concerns

- **Perez & Ribeiro attribution:** The text says "The foundational prompt injection threat was formalized by Perez and Ribeiro" (related-work.tex:20-21), but the cited paper (`perez2022prompt`) is "Ignore This Title and HackAPrompt" — a prompt hacking *competition* paper, not a formalization work. The foundational formalization of prompt injection is typically attributed to Greshake et al. (2023) for indirect injection and earlier blog-post-level work. Consider revising the attribution or citing the actual formalization paper by the correct authors.
- **Orphaned bibliography entries:** `deng2024masterkey`, `yuan2024gpt4`, `jones2024capabilitieslarge`, `carroll2024ai`, `park2024ai`, `shayegani2023survey`, `mo2024trembling`, `schick2023toolformer`, `xi2023rise`, `wang2024survey`, `jain2023baseline`, `alon2023detecting`, `robey2023smoothllm`, `halfond2006classification`, `chase2022langchain` — these entries exist in the bibliography but may not be cited in the paper body. Orphaned entries will generate BibTeX warnings. Some (like `jain2023baseline`, `robey2023smoothllm`, `alon2023detecting`) are defense mechanism papers that *should* be cited in the mitigations section.

---

## 2. Positioning Analysis — Table 2 Validation

Table 2 (`tab:related-positioning`) compares 7 prior works + "this work" across 5 dimensions. Below is a per-claim accuracy assessment:

### 2.1 Per-Row Validation

| Work | Env. | Multi-Ag. | A2A | Full Tax. | Stat. Rigor | Assessment |
|------|------|-----------|-----|-----------|-------------|------------|
| Greshake et al. | ○ | ✗ | ✗ | ✗ | ✗ | **Accurate.** Their indirect prompt injection through web content IS partially environmental. ○ is fair. ✗ for Stat Rigor is slightly harsh (they report quantitative results) but defensible. |
| Perez & Ribeiro | ✗ | ✗ | ✗ | ✗ | ✗ | **Accurate.** HackAPrompt is a competition-based study, not environmental, multi-agent, or statistically rigorous in the formal sense. |
| Zou et al. | ✗ | ✗ | ✗ | ✗ | ○ | **Accurate.** Universal adversarial suffixes are model-level (not environmental). ○ for statistical rigor is fair — they report transfer rates across models but don't use formal hypothesis testing. |
| Cohen et al. | ○ | ✓ | ✗ | ✗ | ✗ | **Mostly accurate.** ○ for Environmental is reasonable — their worm propagates through environments but the focus is on the propagation mechanism. ✓ for Multi-Agent is correct. ✗ for Stat Rigor is slightly harsh — they demonstrate empirical attacks but without formal statistical analysis, so defensible. |
| Mazeika et al. (HarmBench) | ✗ | ✗ | ✗ | ✗ | ✓ | **Accurate.** HarmBench is a single-model benchmark with robust evaluation methodology. |
| Debenedetti et al. (AgentDojo) | ○ | ✗ | ✗ | ✗ | ○ | **Mostly accurate.** AgentDojo tests adversarial robustness of LLM agents in tool-use scenarios, which has environmental aspects (hence ○). ○ for Stat Rigor is fair. However, **Multi-Agent = ✗ is debatable** — AgentDojo does involve agent interactions with tools and potentially other agents. This could arguably be ○. |
| Yuntao et al. (DeepMind) | ✓ | ○ | ✗ | ✓ | ✗ | **Accurate.** The taxonomy IS the environmental attack foundation. ○ for Multi-Agent is fair (they discuss it but don't evaluate). ✗ for Stat Rigor is correct (purely theoretical). |
| **This work** | ✓ | ✓ | ✓ | ✓ | ✓ | **Claims are aspirationally correct** but contingent on the TBD data being populated. Currently, all results tables contain [TBD] placeholders, so the ✓ for Stat Rigor cannot be verified. |

### 2.2 Overall Table Assessment

**Verdict: Largely accurate with minor quibbles.** The positioning is fair and not over-claiming. Two minor concerns:
1. AgentDojo's Multi-Agent column (✗) could arguably be ○ given its agent-tool interaction scope.
2. The "This work" row claims ✓ for Statistical Rigor, but this cannot be verified until the 76+ TBD placeholders in results tables are filled with actual data.

---

## 3. Writing Quality

### 3.1 Abstract Assessment

**Strengths:**
- Self-contained: mentions the problem (theoretical gap), solution (testbed), scale (9,120 runs, 22 scenarios, 4 models), methodology (statistical tests), and 5 key findings
- Quantitative: specific numbers for experiment matrix and statistical methods
- Lists five concrete findings, each actionable and distinct

**Weaknesses:**
- At ~250 words, slightly long for USENIX (typical: 150-200 words). Consider trimming.
- Finding (5) about ablation analysis could be merged with finding (4) about mitigations to save space.
- The abstract would be stronger with 1-2 concrete numerical results (e.g., "content injection achieves X% baseline success" or "mitigations reduce success by Y%"), but this depends on TBD data.

**Rating: Strong (8/10)** — well-structured and informative, needs minor tightening.

### 3.2 Introduction Narrative Arc

**Strengths:**
- Classic three-paragraph structure: context → gap → contribution
- The "The gap" paragraph effectively frames the research questions
- Six enumerated contributions are specific, each with section cross-references
- Roadmap paragraph at the end provides clear navigation

**Weaknesses:**
- The opening sentence could be more compelling — consider leading with a concrete attack scenario or statistic to hook the reader immediately
- The transition from theoretical taxonomy to empirical testbed could be sharpened with a motivating example (e.g., "Consider an A2A agent that encounters CSS-hidden instructions while processing a web page...")

**Rating: Strong (8/10)**

### 3.3 Section Transitions

| Transition | Quality | Notes |
|-----------|---------|-------|
| Abstract → Introduction | Good | Natural flow from overview to detailed motivation |
| Introduction → Background | Good | Roadmap paragraph bridges |
| Background → Testbed Design | Good | Background establishes context, testbed follows logically |
| Testbed Design → Methodology | Good | Design describes *what*, methodology describes *how* |
| Methodology → Results (§5-10) | Adequate | Could use a brief transitional sentence summarizing what the reader should expect |
| Results §5 → §6 → ... → §10 | **Repetitive** | Each section opens with "This section reports results for the N [category] scenarios: ..." — functionally correct but monotonous across 6 sections. Consider varying the opening structure. |
| Results §10 → Compound (§11) | Good | Logical progression from individual to combined attacks |
| Compound → Mitigations (§12) | Good | Natural flow from attack analysis to defense analysis |
| Mitigations → Discussion (§13) | Good | Findings lead to implications |
| Discussion → Related Work (§14) | **Unusual placement** | Related work is placed AFTER discussion (§14), which is atypical for security venues. USENIX Security papers typically place related work in §2 or §3. However, this is a stylistic choice and not a violation — some USENIX papers do place it late. |
| Related Work → Conclusion (§15) | Good | Standard placement |

### 3.4 Notation Consistency

| Macro | Definition | Usage Count (sections) | Consistent? |
|-------|-----------|----------------------|-------------|
| `\trap{Name}` | `\textsc{Name}` — trap scenario names | ~14 uses across results sections | ✅ Generally consistent |
| `\model{Name}` | `\textsf{Name}` — model identifiers | ~19 uses across methodology + results | ✅ Consistent |
| `\metric{Name}` | `\textit{Name}` — metric names | ~11 uses, mostly in testbed-design | ✅ Consistent |
| `\mitigation{name}` | `\texttt{name}` — mitigation module names | ~22 uses in mitigations + results | ✅ Consistent |
| `\category{Name}` | `\textbf{Name}` — category names | ~6 uses in background + introduction | ✅ Consistent |
| `\pval{val}` | `$p = val$` — p-value formatting | Defined but **not used in body** | ⚠️ Unused — TBD data dependency |
| `\cohend{val}` | `$d = val$` — Cohen's d formatting | Defined but **not used in body** | ⚠️ Unused — TBD data dependency |
| `\ci{a}{b}` | `[a, b]` — confidence interval | Defined but **not used in body** | ⚠️ Unused — TBD data dependency |
| `\meanstd{m}{s}` | `$m \pm s$` — mean ± std | Defined but **not used in body** | ⚠️ Unused — TBD data dependency |
| `\sig` | `$^{*}$` — significance marker | Referenced in captions but no data | ⚠️ Unused — TBD data dependency |
| `\placeholder{text}` | Red bold text for TBD | 1 use in methodology | ✅ Used as intended |

**Key observation:** Five custom macros (`\pval`, `\cohend`, `\ci`, `\meanstd`, `\sig`) are defined but never used in the body text. They appear designed for the results tables but all cells currently contain `\textcolor{red}{[TBD]}` rather than using these macros. When data is populated, authors should use these macros for consistency.

**Notation inconsistency found:** In the "Key Findings" subsections of results, mitigation modules are sometimes referenced with the `\mitigation{}` macro (e.g., `\mitigation{input-sanitizer}`) and sometimes in bold prose (e.g., "**Input sanitization**" in mitigations-ablation.tex:98). This is defensible when the bold text refers to the concept rather than the module name, but should be reviewed for consistency.

### 3.5 Figure/Table Self-Explanatory Quality

| Element | Self-Explanatory? | Notes |
|---------|-------------------|-------|
| Figure 1 (Architecture) | ✅ Good | Clear TikZ diagram with labeled components and data flow |
| Figure 2 (Matrix Flow) | ✅ Good | Visual representation of experimental design |
| Table 1 (Scenarios) | ✅ Good | Well-organized by category with clear columns |
| Table 2 (Models) | ✅ Good | Concise model summary |
| Tables 3-10 (Results) | ⚠️ **All TBD** | Cannot assess — all 76+ cells contain [TBD] placeholders |
| Table 11 (Mitigations) | ✅ Good | Clear mapping of modules to categories and strategies |
| Table 12 (Positioning) | ✅ Good | Clear comparison with check/cross/circle symbols. Caption includes legend. |

### 3.6 Conclusion Strength

**Strengths:**
- Mirrors abstract structure — reinforces key messages
- Six numbered findings are specific and actionable
- The A2A protocol security extension finding is a strong practical contribution
- "Future work" paragraph identifies concrete next steps

**Weaknesses:**
- Could be more impactful with 1-2 memorable quantitative takeaways (dependent on TBD data)
- The conclusion reads as a summary rather than a call-to-action. Consider ending with a stronger statement about the implications for the multi-agent ecosystem.

**Rating: Adequate (7/10)** — solid but would benefit from data-driven punch.

---

## 4. Formatting Compliance — USENIX Security 2027

### 4.1 Page Count Estimate

| Component | Estimated Pages |
|-----------|----------------|
| Abstract + Introduction | ~1.5 |
| Background | ~1.5 |
| Testbed Design | ~2.0 (includes 2 figures, 1 large table) |
| Methodology | ~1.5 |
| Results (6 sections × ~1 page) | ~6.0 |
| Compound Analysis | ~1.0 |
| Mitigations & Ablation | ~1.5 |
| Discussion | ~1.0 |
| Related Work | ~1.5 |
| Conclusion | ~0.5 |
| **Total (excl. references & appendices)** | **~18.0** |

**⚠️ BLOCKING: The paper is estimated at ~18 pages of body content, significantly exceeding the 13-page USENIX limit.** Even with generous TBD compression, the structural layout (15 sections, 12+ tables, 2 figures) is far too expansive. Major restructuring is needed:
- **Option A:** Merge results sections (§5-10) into a single "Results" section with subsections, using summary tables instead of per-category tables
- **Option B:** Move detailed per-scenario results to an appendix (which doesn't count against the limit), keeping only aggregate results in the body
- **Option C:** Eliminate some redundant tables (e.g., combine detection/escape rate tables with success rate tables)

### 4.2 Document Class & Style

| Check | Status | Details |
|-------|--------|---------|
| Document class | ✅ | `\documentclass[letterpaper,twocolumn,10pt]{article}` |
| Style file | ✅ | `\usepackage{usenix-2020-09}` loaded |
| Two-column layout | ✅ | Via `twocolumn` option |
| Paper size | ✅ | `letterpaper` |
| Font size | ✅ | `10pt` |
| Bibliography style | ✅ | `\bibliographystyle{plain}` — standard for USENIX |
| Appendix placement | ✅ | After `\bibliography{}`, with `\newpage\appendix` |
| Author block | ✅ | Single author with affiliation and email |
| Acknowledgments | ✅ | Present as `\section*{Acknowledgments}` |
| `\balance` package | ✅ | Loaded for last-page column balancing |

### 4.3 Style Violations

| Issue | Severity | Location | Details |
|-------|----------|----------|---------|
| **Placeholder DOI** | LOW | main.tex:174 | `\url{https://doi.org/XX.XXXX/zenodo.XXXXXXX}` — needs real DOI before submission |
| **GPU-hours placeholder** | LOW | methodology.tex:94 | `\placeholder{X} GPU-hours` — must be filled |
| **76+ TBD cells** | BLOCKING | All results sections | Every data table contains `\textcolor{red}{[TBD]}` — paper cannot be submitted |
| **Compound findings TBD** | LOW | compound-analysis.tex:78 | `\textcolor{red}{[TBD]} of the 15 compound pairs` — inline TBD in prose |
| **Email placeholder** | LOW | main.tex:92 | `aviral@example.com` — needs real contact |

---

## 5. Numerical Inconsistencies Found

### 5.1 Main Run Count Discrepancy (MEDIUM)

**Location:** `related-work.tex:180-183` vs `methodology.tex:57-61`

- **Related work** states: "22~scenarios × 4~models × 3~conditions × 10~reps = 2,640 main runs, plus 600 compound and 6,160 ablation runs"
- **Methodology** states: Main cells = 22 × 4 × **2** × 10 = **1,760** (baseline + hardened only)

The related work section uses 3 conditions for main runs, but the methodology correctly treats ablation as a separate sub-matrix. **2,640 should be 1,760.**

### 5.2 Compound Run Count Discrepancy (MEDIUM)

**Location:** `related-work.tex:182` vs `methodology.tex:60`

- **Related work** states: "600 compound" runs
- **Methodology** states: Compound cells = 15 × 4 × 2 × 10 = **1,200**

**600 should be 1,200.**

### 5.3 Cross-check

With methodology's numbers: 1,760 + 6,160 + 1,200 = 9,120 ✅
With related-work's numbers: 2,640 + 600 + 6,160 = 9,400 ❌ (doesn't equal the stated 9,120 total)

This confirms the related-work numbers are erroneous.

---

## 6. Additional Writing Observations

### 6.1 Strengths
- **Professional LaTeX craft:** Custom semantic macros, `booktabs` tables, `pgfplots`, `cleveref` cross-references, TikZ architecture diagrams — publication-quality typesetting infrastructure
- **Modular section structure:** Each section file is self-contained and well-organized
- **Consistent voice:** Academic tone is maintained throughout
- **Ethical considerations:** Section 4.6 addresses dual-use concerns and responsible disclosure
- **Reproducibility:** Artifact availability appendix with GitHub URL and Zenodo DOI placeholder

### 6.2 Weaknesses
- **Repetitive results structure:** Sections 5-10 follow an identical template (intro → table → key findings). While consistent, it reads mechanically. Varying the analysis depth or structure per category would improve readability.
- **No per-model discussion in results:** Each results section discusses findings at the category level but rarely compares models within findings. The model comparison is deferred entirely to Discussion §13.2.
- **Limited qualitative analysis:** Results sections present quantitative tables and enumerated findings but lack qualitative examples (e.g., "Here is an example of a CSS-invisible instruction that GPT-4o followed:"). A concrete adversarial example per category would significantly strengthen the paper.
- **Duplicate bibliography entries:** `carroll2024ai` and `park2024ai` appear to reference the same paper ("AI Deception: A Survey of Examples, Risks, and Potential Solutions" in Patterns, 2024) with different author lists. One should be removed.

---

## 7. Verdict

### Overall Assessment: **Major Revision Required**

### Required Changes (prioritized)

1. **[BLOCKING] Populate all TBD data cells** — 76+ cells across 8 result tables + inline placeholders. The paper cannot be evaluated for statistical rigor or claim validity without data.
2. **[BLOCKING] Address page limit** — estimated ~18 pages vs 13-page limit. Requires significant restructuring (merge results sections, move per-scenario details to appendix).
3. **[MEDIUM] Fix numerical inconsistencies** in related-work.tex:180-183 — change "2,640 main runs" to "1,760" and "600 compound" to "1,200".
4. **[MEDIUM] Add 3+ missing seminal references** — Wallace et al. (2019), Zeng et al. (2024), Shen et al. (2024), Shafahi et al. (2018) as detailed in §1.2.
5. **[MEDIUM] Cite orphaned bib entry** — `deng2024masterkey` is in bibliography but uncited in text.
6. **[MEDIUM] Fix Perez & Ribeiro attribution** — HackAPrompt is a competition, not the formalization of prompt injection.
7. **[LOW] Remove duplicate bib entries** — `carroll2024ai` and `park2024ai` duplicate.
8. **[LOW] Fill placeholder values** — GPU-hours (methodology.tex:94), Zenodo DOI (main.tex:174), email (main.tex:92).
9. **[LOW] Use defined macros in data tables** — When populating data, use `\pval{}`, `\cohend{}`, `\ci{}{}`, `\meanstd{}{}`, `\sig` for consistency.
10. **[LOW] Vary results section openings** — Reduce repetitive "This section reports results for..." pattern.

### Strengths Worth Preserving
- Comprehensive five-thread related work structure
- Well-validated Table 2 positioning claims
- Professional LaTeX infrastructure with semantic macros
- Strong abstract and introduction narrative
- Thorough ethical considerations section

---

## Acceptance Criteria Status

- ☑ Review file exists at `artifacts/reviews/literature-writing.md` with structured sections: Citation Completeness, Positioning Analysis, Writing Quality, Formatting Compliance, Verdict
- ☑ Table 2 (related-work positioning) is validated: each checkmark/cross/partial claim is assessed for accuracy against the cited paper's actual contributions (see §2)
- ☑ At least 3 missing references identified from prompt injection, adversarial ML, multi-agent security, or LLM safety benchmark literature published through 2025 (see §1.2: Wallace 2019, Zeng 2024, Shen 2024, Shafahi 2018, plus orphaned Deng 2024)
- ☑ Writing assessment covers: abstract (§3.1), introduction narrative arc (§3.2), section transitions (§3.3), notation consistency across all 16 section files (§3.4), and conclusion strength (§3.6)
- ☑ USENIX Security formatting compliance check: page count estimate (§4.1), two-column layout (§4.2), bibliography style (§4.2), appendix placement (§4.2), style violations flagged (§4.3)
