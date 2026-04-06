# Audit: References & Attribution (RC-10, RC-15, RC-16)

**Task:** audit-references-attribution
**Role:** Editorial Reviewer
**Date:** 2026-04-06

## Summary

RC-10, RC-15, and RC-16 remain **fully unaddressed**. Four seminal references are still missing from `bibliography.bib`, the Perez & Ribeiro attribution error persists at `related-work.tex:20`, and the duplicate `carroll2024ai`/`park2024ai` entries remain at lines 433 and 447. Additionally, 15 bibliography entries are orphaned (never cited).

## Details

### RC-10: Missing Seminal References — NOT ADDRESSED

The following four references, explicitly flagged in the meta-review, are **absent from both `bibliography.bib` and all `.tex` section files**:

| Reference | Relevance | Status |
|-----------|-----------|--------|
| Wallace et al. 2019 — "Universal Adversarial Triggers" (EMNLP) | Precursor to Zou et al. universal suffixes; belongs in §14.2 (Adversarial ML Foundations) | **MISSING** |
| Zeng et al. 2024 — Persuasion-based jailbreaking | Directly relevant to SM category; belongs in §14.1 or §14.2 | **MISSING** |
| Shen et al. 2024 — In-the-wild jailbreak characterization (IEEE S&P) | Empirical jailbreak study; belongs in §14.2 | **MISSING** |
| Shafahi et al. 2018 — "Poison Frogs" (NeurIPS) | Foundational for RAG poisoning lineage; belongs in §14.4 (RAG & Knowledge Poisoning) | **MISSING** |

**Additionally**, `deng2024masterkey` exists in `bibliography.bib:342-353` but is **never cited** anywhere in the paper. The meta-review specifically noted it should be cited in §14.2.

**Severity: MEDIUM** — These are standard seminal references that reviewers will expect. Their absence weakens the related work section.

### RC-15: Perez & Ribeiro Attribution — NOT ADDRESSED

**Exact problematic text** at `related-work.tex:20-21`:
```latex
The foundational prompt injection threat was formalized by
Perez and Ribeiro~\cite{perez2022prompt}, who demonstrated that
adversarial prompts can override system-level instructions.
```

**Problem**: Perez and Ribeiro's paper (`perez2022prompt` = "Ignore This Title and HackAPrompt") is a **competition paper** describing a prompt hacking competition, not a formalization of prompt injection. The word "formalized" is incorrect attribution.

**Note**: `liu2024formalizing` ("Prompt Injection Attack against LLM-Integrated Applications") IS cited at line 30 and actually uses "formalized" in its own context. The Perez and Ribeiro citation should be recharacterized (e.g., "demonstrated" or "catalogued" rather than "formalized").

**Severity: LOW** — Minor attribution error, but a knowledgeable reviewer would flag it.

### RC-16: Duplicate Bibliography Entries — NOT ADDRESSED

**`carroll2024ai`** (lines 433-445) and **`park2024ai`** (lines 447-459) share:
- Same title: "AI Deception: A Survey of Examples, Risks, and Potential Solutions"
- Same journal: Patterns, vol. 5, no. 1, 2024
- Same DOI: `10.1016/j.patter.2023.100900`
- **Different author lists**: Carroll, Chan, Ashton, Krueger vs. Park, Goldstein, O'Gara, Chen, Hendrycks

The correct authors are Park et al. (the DOI resolves to Park et al.). **Neither entry is cited** in the paper — they are both orphaned AND duplicate.

**Severity: LOW** — Causes BibTeX warnings but does not affect the paper content since neither is cited.

### Additional Finding: 15 Orphaned Bibliography Entries

The following entries exist in `bibliography.bib` but are **never cited** in any `.tex` file (verified against compiled `main.bbl` which contains 50 resolved entries vs. 65 total bib entries):

1. `chase2022langchain` — LangChain framework
2. `yuan2024gpt4` — GPT-4 cipher attacks
3. `deng2024masterkey` — MasterKey jailbreaking (NDSS)
4. `jones2024capabilitieslarge` — Auditing LLMs via discrete optimization
5. `carroll2024ai` — AI Deception survey (duplicate)
6. `park2024ai` — AI Deception survey (duplicate)
7. `schick2023toolformer` — Toolformer
8. `xi2023rise` — Rise of LLM-based agents survey
9. `wang2024survey` — LLM autonomous agents survey
10. `jain2023baseline` — Baseline defenses for adversarial attacks
11. `alon2023detecting` — Detecting attacks with perplexity
12. `robey2023smoothllm` — SmoothLLM defense
13. `halfond2006classification` — SQL injection classification
14. `shayegani2023survey` — LLM vulnerability survey
15. `mo2024trembling` — Fragility of LLM guardrails

**Severity: LOW** — These cause BibTeX warnings and bloat the bib file but do not appear in the compiled PDF. Several (deng2024masterkey, jain2023baseline, alon2023detecting, robey2023smoothllm) would strengthen the paper if actually cited in relevant sections.

## Acceptance Criteria Status

- ☐ **RC-10**: Wallace 2019, Zeng 2024, Shen 2024, Shafahi 2018 NOT added to bibliography.bib and NOT cited in related-work.tex
- ☐ **RC-15**: related-work.tex:20 STILL attributes "formalized" to Perez and Ribeiro (exact text: "The foundational prompt injection threat was formalized by Perez and Ribeiro")
- ☐ **RC-16**: carroll2024ai (line 433) and park2024ai (line 447) duplicate entries STILL present in bibliography.bib
- ☑ **Additional**: 15 orphaned/uncited bibliography entries documented
