import type { AggregateMetrics, StatisticalComparison, ModelVulnerabilityProfile } from './metrics.js';
import type { ExperimentRunResult, CellResult } from './runner.js';
import type { TrapCategory } from '../traps/types.js';

/**
 * Reporter — transforms experiment results into paper-ready LaTeX assets.
 */

/**
 * Generate a full LaTeX table for trap success rates across models and conditions.
 */
export function generateTrapSuccessTable(aggregates: AggregateMetrics[]): string {
  const rows: string[] = [];

  // Group by scenario
  const byScenario = new Map<string, AggregateMetrics[]>();
  for (const a of aggregates) {
    const key = a.scenarioId;
    if (!byScenario.has(key)) byScenario.set(key, []);
    byScenario.get(key)!.push(a);
  }

  rows.push(`\\begin{table}[htbp]`);
  rows.push(`\\centering`);
  rows.push(`\\caption{Trap Success Rate by Scenario, Model, and Condition (mean \\textpm\\ std, $n=10$)}`);
  rows.push(`\\label{tab:trap-success}`);
  rows.push(`\\small`);
  rows.push(`\\begin{tabular}{llcccc}`);
  rows.push(`\\toprule`);
  rows.push(`Scenario & Condition & GPT-4o & Claude Sonnet 4 & Gemini 2.5 Pro & GPT-4o-mini \\\\`);
  rows.push(`\\midrule`);

  for (const [scenarioId, metrics] of byScenario) {
    const shortId = scenarioId.split(':')[1] ?? scenarioId;
    const byCondition = new Map<string, AggregateMetrics[]>();
    for (const m of metrics) {
      const key = m.condition;
      if (!byCondition.has(key)) byCondition.set(key, []);
      byCondition.get(key)!.push(m);
    }

    let first = true;
    for (const [condition, condMetrics] of byCondition) {
      const label = first ? `\\textbf{${shortId}}` : '';
      const cells = ['gpt4o', 'claude-sonnet', 'gemini-pro', 'gpt4o-mini'].map(modelId => {
        const m = condMetrics.find(cm => cm.modelId === modelId);
        if (!m) return '---';
        const { mean, std } = m.trapSuccessRate;
        return `${(mean * 100).toFixed(1)}\\% \\textpm\\ ${(std * 100).toFixed(1)}`;
      });
      rows.push(`${label} & ${condition} & ${cells.join(' & ')} \\\\`);
      first = false;
    }
    rows.push(`\\midrule`);
  }

  rows.push(`\\bottomrule`);
  rows.push(`\\end{tabular}`);
  rows.push(`\\end{table}`);

  return rows.join('\n');
}

/**
 * Generate a LaTeX pgfplots figure for model vulnerability heatmap.
 */
export function generateVulnerabilityHeatmap(profiles: ModelVulnerabilityProfile[]): string {
  const categories: TrapCategory[] = [
    'content-injection',
    'semantic-manipulation',
    'cognitive-state',
    'behavioural-control',
    'systemic',
    'human-in-the-loop',
  ];

  const lines: string[] = [];
  lines.push(`\\begin{figure}[htbp]`);
  lines.push(`\\centering`);
  lines.push(`\\begin{tikzpicture}`);
  lines.push(`\\begin{axis}[`);
  lines.push(`  colormap/hot2,`);
  lines.push(`  colorbar,`);
  lines.push(`  colorbar style={ylabel={Trap Success Rate}},`);
  lines.push(`  xlabel={Trap Category},`);
  lines.push(`  ylabel={Model},`);
  lines.push(`  xtick data,`);
  lines.push(`  ytick data,`);
  lines.push(`  xticklabels={CI, SM, CS, BC, SY, HL},`);
  lines.push(`  yticklabels={${profiles.map(p => p.modelId).join(', ')}},`);
  lines.push(`  point meta min=0,`);
  lines.push(`  point meta max=1,`);
  lines.push(`]`);
  lines.push(`\\addplot[matrix plot*, mesh/cols=${categories.length}, mesh/rows=${profiles.length}] table {`);
  lines.push(`x y c`);

  for (let y = 0; y < profiles.length; y++) {
    for (let x = 0; x < categories.length; x++) {
      const rate = profiles[y].byCategorySuccessRate[categories[x]] ?? 0;
      lines.push(`${x} ${y} ${rate.toFixed(4)}`);
    }
  }

  lines.push(`};`);
  lines.push(`\\end{axis}`);
  lines.push(`\\end{tikzpicture}`);
  lines.push(`\\caption{Model vulnerability heatmap across trap categories. Darker = more vulnerable.}`);
  lines.push(`\\label{fig:vulnerability-heatmap}`);
  lines.push(`\\end{figure}`);

  return lines.join('\n');
}

/**
 * Generate LaTeX table for statistical comparisons (baseline vs hardened).
 */
export function generateComparisonTable(comparisons: StatisticalComparison[]): string {
  const rows: string[] = [];

  rows.push(`\\begin{table}[htbp]`);
  rows.push(`\\centering`);
  rows.push(`\\caption{Mitigation Effectiveness: Baseline vs Hardened (Wilcoxon signed-rank test, Bonferroni-corrected)}`);
  rows.push(`\\label{tab:mitigation-effectiveness}`);
  rows.push(`\\small`);
  rows.push(`\\begin{tabular}{llccccc}`);
  rows.push(`\\toprule`);
  rows.push(`Scenario & Model & $\\Delta$ & Cohen's $d$ & Effect & $p$ & Sig. \\\\`);
  rows.push(`\\midrule`);

  for (const c of comparisons) {
    const shortId = c.scenarioId.split(':')[1] ?? c.scenarioId;
    const sig = c.significant ? `\\textbf{*}` : '';
    rows.push([
      shortId,
      c.modelId,
      `${(c.difference * 100).toFixed(1)}\\%`,
      c.cohensD.toFixed(2),
      c.effectSizeLabel,
      c.pValue < 0.001 ? '$<$0.001' : c.pValue.toFixed(3),
      sig,
    ].join(' & ') + ' \\\\');
  }

  rows.push(`\\bottomrule`);
  rows.push(`\\end{tabular}`);
  rows.push(`\\vspace{2mm}`);
  rows.push(`\\raggedright\\footnotesize * Significant after Bonferroni correction ($\\alpha/22 = ${(0.05 / 22).toFixed(4)}$)`);
  rows.push(`\\end{table}`);

  return rows.join('\n');
}

/**
 * Generate full paper assets from experiment results.
 */
export async function generatePaperAssets(
  resultDir: string,
  outputDir: string,
): Promise<{ tables: string[]; figures: string[] }> {
  const tables: string[] = [];
  const figures: string[] = [];

  // Read results
  const resultsJson = await Bun.file(`${resultDir}/aggregate/aggregates.json`).text();
  const aggregates: Array<{ key: string; aggregate: AggregateMetrics }> = JSON.parse(resultsJson);
  const allAggregates = aggregates.map(a => a.aggregate);

  // Table 1: Trap success rates
  const successTable = generateTrapSuccessTable(allAggregates);
  await Bun.write(`${outputDir}/tables/trap-success.tex`, successTable);
  tables.push('trap-success.tex');

  // More tables and figures would follow...

  return { tables, figures };
}
