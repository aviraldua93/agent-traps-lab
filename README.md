# 🪤 agent-traps-lab

> **Empirical testbed for DeepMind's ["AI Agent Traps"](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6372438) paper — 22 adversarial scenarios, 4 models, 3,480 experiments, statistical rigor.**

![Tests](https://img.shields.io/badge/tests-pending-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue)
![A2A](https://img.shields.io/badge/protocol-A2A-blueviolet)

---

## The Tetralogy

| # | Project | Protocol | What It Proves |
|---|---------|----------|----------------|
| 1 | [**a2a-crews**](https://github.com/aviraldua93/a2a-crews) | A2A | Agents that coordinate |
| 2 | [**ag-ui-crews**](https://github.com/aviraldua93/ag-ui-crews) | AG-UI | Agents you can observe |
| 3 | [**rag-a2a**](https://github.com/aviraldua93/rag-a2a) | A2A | Agents that know things |
| 4 | **agent-traps-lab** ← you are here | A2A | **Agents you can attack (and defend)** |

---

## Why This Exists

Google DeepMind's paper ["AI Agent Traps"](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6372438) proposes a taxonomy of 6 environmental attack categories against AI agents. It's a landmark contribution — but it's **theoretical**. No open testbed exists to empirically validate these traps against real multi-agent systems.

**agent-traps-lab** changes that. It implements all 6 trap categories as reproducible scenarios, runs them against real agents using the A2A protocol, and produces paper-ready statistical results.

What makes this unique:
- **Real multi-agent cascades** — uses [a2a-crews](https://github.com/aviraldua93/a2a-crews) for genuine A2A protocol agent orchestration
- **Real RAG poisoning** — attacks a live [rag-a2a](https://github.com/aviraldua93/rag-a2a) pipeline, not a toy example
- **Real-time observability** — watch agents fall into traps via [ag-ui-crews](https://github.com/aviraldua93/ag-ui-crews)
- **Statistical rigor** — 10 repetitions, Bonferroni correction, Cohen's d effect sizes, Wilcoxon signed-rank tests

---

## The 6 Trap Categories (22 Scenarios)

| # | Category | Sub-Scenarios | Key Metric |
|---|----------|:---:|-----------|
| 1 | **Content Injection** | 4 | Execution rate of hidden instructions |
| 2 | **Semantic Manipulation** | 4 | Decision drift from baseline |
| 3 | **Cognitive State** | 4 | Factual accuracy degradation |
| 4 | **Behavioural Control** | 4 | Wrong-action rate |
| 5 | **Systemic (Multi-Agent)** | 3 | Cascade depth & blast radius |
| 6 | **Human-in-the-Loop** | 3 | Manipulation success rate |

Each scenario runs against **4 models** (GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro, GPT-4o-mini) under **3 conditions** (baseline, hardened, ablated) with **10 repetitions** = **3,480 experiment runs**.

Plus 600 compound trap experiments and 240 ablation studies.

---

## Quick Start

```bash
git clone https://github.com/aviraldua93/agent-traps-lab.git
cd agent-traps-lab
bun install
```

### Run a Single Trap

```bash
bun run run:trap -- --trap content-injection --model gpt4o --reps 10
```

### Run the Full Matrix

```bash
# Set API keys
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AI...

# All 3,480 experiments
bun run run:matrix
```

### Generate Paper Assets

```bash
bun run report -- --dir results/run-xxx
```

### Review the Paper

```bash
# Launches 7-agent review crew via a2a-crews
bun run review
```

---

## Experiment Matrix

```
22 scenarios × 4 models × 3 conditions × 10 reps  = 2,640 main runs
15 compound pairs × 4 models × 10 reps             =   600 compound runs
7 mitigations × 22 scenarios × 4 models × 10 reps  = 6,160 ablation runs
                                                    ─────────────────────
                                              Total = 9,400 experiment runs
```

---

## 7 Mitigations

| Defense | Targets | Approach |
|---------|---------|----------|
| **Input Sanitizer** | Content Injection | Strip hidden CSS/HTML/comments, detect instruction patterns |
| **Semantic Shield** | Semantic Manipulation | Detect authority framing, urgency, social proof, identity manipulation |
| **Context Validator** | Semantic Manipulation | Detect context flooding, saturation, low diversity |
| **RAG Integrity** | Cognitive State | Cross-reference validation, contradiction detection, provenance checks |
| **Behavioral Guard** | Behavioural Control | Deceptive dialog detection, loop prevention, form validation |
| **Cascade Breaker** | Systemic | A2A message validation, trust scoring, anomaly detection, circuit breaker |
| **Report Auditor** | Human-in-the-Loop | Cherry-pick detection, anchoring analysis, decision fatigue monitoring |

---

## Research Paper Review Crew

After drafting the paper, we launch a **7-agent review crew** via a2a-crews:

| Wave | Agent | Focus |
|------|-------|-------|
| 1 (parallel) | Methodology Reviewer | Experimental design, controls, confounds, reproducibility |
| 1 (parallel) | Statistics Reviewer | Sample sizes, significance tests, effect sizes, multiple comparisons |
| 1 (parallel) | Security Reviewer | Threat model realism, attack completeness, defense soundness |
| 1 (parallel) | Related Work Reviewer | Citation completeness, positioning, missed references |
| 1 (parallel) | Writing Reviewer | Clarity, structure, figures, formatting |
| 2 | Meta-Reviewer | Synthesize reviews → accept/revise/reject decision |
| 3 | Revision Checker | Verify all required changes addressed |

---

## Statistical Framework

Every experiment produces:
- **Mean ± std** across 10 repetitions
- **95% confidence intervals** (t-distribution)
- **Wilcoxon signed-rank test** p-values (non-parametric)
- **Cohen's d** effect sizes (negligible/small/medium/large)
- **Bonferroni correction** for 22 simultaneous comparisons

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh/) |
| Language | TypeScript 5.x |
| Protocol | [A2A](https://google.github.io/A2A/) |
| LLM Clients | OpenAI, Anthropic, Google AI SDKs |
| HTML Parsing | Cheerio + Puppeteer |
| Image Metadata | exifr |
| Statistics | Custom TypeScript implementation |
| Paper Assets | LaTeX (booktabs, pgfplots) |
| Testing | Bun Test + Playwright |
| Orchestration | [a2a-crews](https://github.com/aviraldua93/a2a-crews) |

---

## Dogfooding

This project was built using [a2a-crews](https://github.com/aviraldua93/a2a-crews):

```bash
crews plan "Build adversarial testing framework for the 6 AI Agent Trap categories"
crews apply
crews launch
```

The paper review crew is also managed via a2a-crews. Dogfooding all the way down.

---

## License

[MIT](LICENSE) © Aviral Dua

## Citation

If you use agent-traps-lab in your research, please cite:

```bibtex
@misc{dua2026agenttrapslab,
  author = {Dua, Aviral},
  title = {agent-traps-lab: Empirical Testbed for AI Agent Trap Validation},
  year = {2026},
  url = {https://github.com/aviraldua93/agent-traps-lab}
}
```
