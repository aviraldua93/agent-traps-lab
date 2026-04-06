#!/usr/bin/env bun
/**
 * Generate paper-ready LaTeX tables and figures from experiment results.
 *
 * Usage:
 *   bun run scripts/generate-paper-assets.ts --dir results/run-xxx
 *   bun run scripts/generate-paper-assets.ts --dir results/run-xxx --output paper/
 */

import { parseArgs } from 'util';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import {
  generateTrapSuccessTable,
  generateVulnerabilityHeatmap,
  generateComparisonTable,
} from '../src/harness/reporter.js';
import {
  type AggregateMetrics,
  type StatisticalComparison,
  type ModelVulnerabilityProfile,
  computeSummary,
  cohensD,
  effectSizeLabel,
  wilcoxonSignedRank,
  bonferroniSignificant,
} from '../src/harness/metrics.js';
import { MODELS, EXPERIMENT_CONFIG } from '../src/config.js';

// ── CLI argument parsing ──────────────────────────────────────────────

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dir: { type: 'string' },
    output: { type: 'string', default: 'paper' },
  },
  strict: false,
});

if (!values.dir) {
  console.error('Usage: bun run scripts/generate-paper-assets.ts --dir results/run-xxx');
  console.error('');
  console.error('Options:');
  console.error('  --dir      Path to the results directory (required)');
  console.error('  --output   Path to the output directory (default: paper/)');
  process.exit(1);
}

const resultsDir = values.dir;
const outputDir = values.output ?? 'paper';

// ── Helpers ───────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

type TrapCategory =
  | 'content-injection'
  | 'semantic-manipulation'
  | 'cognitive-state'
  | 'behavioural-control'
  | 'systemic'
  | 'human-in-the-loop';

const ALL_CATEGORIES: TrapCategory[] = [
  'content-injection',
  'semantic-manipulation',
  'cognitive-state',
  'behavioural-control',
  'systemic',
  'human-in-the-loop',
];

// ── LaTeX generators for additional assets ────────────────────────────

function generateModelComparisonTable(profiles: ModelVulnerabilityProfile[]): string {
  const rows: string[] = [];

  rows.push(`\\begin{table}[htbp]`);
  rows.push(`\\centering`);
  rows.push(`\\caption{Model Vulnerability Profiles — Overall Trap Resistance}`);
  rows.push(`\\label{tab:model-comparison}`);
  rows.push(`\\small`);
  rows.push(`\\begin{tabular}{lccccc}`);
  rows.push(`\\toprule`);
  rows.push(`Model & Success Rate & Detection & Escape & Most Vulnerable & Mitigation $\\Delta$ \\\\`);
  rows.push(`\\midrule`);

  for (const p of profiles) {
    const modelName = MODELS[p.modelId]?.name ?? p.modelId;
    const vulnerable = p.mostVulnerableTo.split(':')[1] ?? p.mostVulnerableTo;
    rows.push([
      modelName,
      `${(p.overallTrapSuccessRate * 100).toFixed(1)}\\%`,
      `${(p.overallDetectionRate * 100).toFixed(1)}\\%`,
      `${(p.overallEscapeRate * 100).toFixed(1)}\\%`,
      vulnerable,
      `${(p.meanMitigationBenefit * 100).toFixed(1)}\\%`,
    ].join(' & ') + ' \\\\');
  }

  rows.push(`\\bottomrule`);
  rows.push(`\\end{tabular}`);
  rows.push(`\\end{table}`);

  return rows.join('\n');
}

function generateCategoryBreakdownTable(aggregates: AggregateMetrics[]): string {
  const rows: string[] = [];

  rows.push(`\\begin{table}[htbp]`);
  rows.push(`\\centering`);
  rows.push(`\\caption{Trap Success Rate by Category (Baseline Condition, mean $\\pm$ std)}`);
  rows.push(`\\label{tab:category-breakdown}`);
  rows.push(`\\small`);
  rows.push(`\\begin{tabular}{lcccc}`);
  rows.push(`\\toprule`);
  rows.push(`Category & GPT-4o & Claude Sonnet 4 & Gemini 2.5 Pro & GPT-4o-mini \\\\`);
  rows.push(`\\midrule`);

  for (const category of ALL_CATEGORIES) {
    const catAggs = aggregates.filter(
      a => a.scenarioId.startsWith(category) && a.condition === 'baseline',
    );

    const modelCells = (['gpt4o', 'claude-sonnet', 'gemini-pro', 'gpt4o-mini'] as const).map(modelId => {
      const modelAggs = catAggs.filter(a => a.modelId === modelId);
      if (modelAggs.length === 0) return '---';
      const rates = modelAggs.map(a => a.trapSuccessRate.mean);
      const catMean = rates.reduce((s, v) => s + v, 0) / rates.length;
      const catStd = rates.length > 1
        ? Math.sqrt(rates.reduce((s, v) => s + (v - catMean) ** 2, 0) / (rates.length - 1))
        : 0;
      return `${(catMean * 100).toFixed(1)}\\% \\textpm\\ ${(catStd * 100).toFixed(1)}`;
    });

    const label = category
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    rows.push(`${label} & ${modelCells.join(' & ')} \\\\`);
  }

  rows.push(`\\bottomrule`);
  rows.push(`\\end{tabular}`);
  rows.push(`\\end{table}`);

  return rows.join('\n');
}

function generateMitigationBarChart(comparisons: StatisticalComparison[]): string {
  // Group comparisons by scenario, compute average reduction per category
  const reductionByCategory = new Map<string, number[]>();

  for (const c of comparisons) {
    const category = c.scenarioId.split(':')[0];
    if (!reductionByCategory.has(category)) reductionByCategory.set(category, []);
    reductionByCategory.get(category)!.push(Math.max(0, c.difference));
  }

  const lines: string[] = [];
  lines.push(`\\begin{figure}[htbp]`);
  lines.push(`\\centering`);
  lines.push(`\\begin{tikzpicture}`);
  lines.push(`\\begin{axis}[`);
  lines.push(`  ybar,`);
  lines.push(`  bar width=12pt,`);
  lines.push(`  xlabel={Trap Category},`);
  lines.push(`  ylabel={Mean Reduction in Trap Success (\\%)},`);
  lines.push(`  ymin=0, ymax=100,`);
  lines.push(`  symbolic x coords={CI, SM, CS, BC, SY, HL},`);
  lines.push(`  xtick=data,`);
  lines.push(`  nodes near coords,`);
  lines.push(`  nodes near coords align={vertical},`);
  lines.push(`  every node near coord/.append style={font=\\footnotesize},`);
  lines.push(`]`);

  const coordPairs: string[] = [];
  const labels = ['CI', 'SM', 'CS', 'BC', 'SY', 'HL'];

  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const reductions = reductionByCategory.get(ALL_CATEGORIES[i]) ?? [0];
    const mean = (reductions.reduce((s, v) => s + v, 0) / reductions.length) * 100;
    coordPairs.push(`(${labels[i]}, ${mean.toFixed(1)})`);
  }

  lines.push(`\\addplot coordinates {${coordPairs.join(' ')}};`);
  lines.push(`\\end{axis}`);
  lines.push(`\\end{tikzpicture}`);
  lines.push(`\\caption{Mean reduction in trap success rate after applying mitigations, by category.}`);
  lines.push(`\\label{fig:mitigation-effectiveness}`);
  lines.push(`\\end{figure}`);

  return lines.join('\n');
}

function generateEffectSizeForestPlot(comparisons: StatisticalComparison[]): string {
  const lines: string[] = [];

  lines.push(`\\begin{figure}[htbp]`);
  lines.push(`\\centering`);
  lines.push(`\\begin{tikzpicture}`);
  lines.push(`\\begin{axis}[`);
  lines.push(`  xbar,`);
  lines.push(`  bar width=6pt,`);
  lines.push(`  xlabel={Cohen's $d$ (Effect Size)},`);
  lines.push(`  ylabel={},`);
  lines.push(`  xmin=-0.5, xmax=3,`);
  lines.push(`  ytick={${comparisons.map((_, i) => i).join(',')}},`);
  lines.push(`  yticklabels={${comparisons.map(c => {
    const short = c.scenarioId.split(':')[1] ?? c.scenarioId;
    return `${short}/${c.modelId}`;
  }).join(',')}},`);
  lines.push(`  y dir=reverse,`);
  lines.push(`  extra x ticks={0.2, 0.5, 0.8},`);
  lines.push(`  extra x tick labels={small, medium, large},`);
  lines.push(`  extra x tick style={grid=major, grid style={dashed, gray}},`);
  lines.push(`  height=${Math.max(6, comparisons.length * 0.4)}cm,`);
  lines.push(`  width=12cm,`);
  lines.push(`]`);

  const coords = comparisons.map((c, i) => `(${Math.abs(c.cohensD).toFixed(3)}, ${i})`);
  lines.push(`\\addplot+[`);
  lines.push(`  mark=*,`);
  lines.push(`  error bars/.cd, x dir=both, x explicit,`);
  lines.push(`] coordinates {${coords.join(' ')}};`);

  lines.push(`\\end{axis}`);
  lines.push(`\\end{tikzpicture}`);
  lines.push(`\\caption{Forest plot of effect sizes (Cohen's $d$) for mitigation effectiveness per scenario--model pair. Dashed lines show conventional thresholds.}`);
  lines.push(`\\label{fig:effect-size-forest}`);
  lines.push(`\\end{figure}`);

  return lines.join('\n');
}

function generateSummaryStatsTex(
  aggregates: AggregateMetrics[],
  comparisons: StatisticalComparison[],
  profiles: ModelVulnerabilityProfile[],
): string {
  const baselineAggs = aggregates.filter(a => a.condition === 'baseline');
  const hardenedAggs = aggregates.filter(a => a.condition === 'hardened');

  const baselineRates = baselineAggs.map(a => a.trapSuccessRate.mean);
  const hardenedRates = hardenedAggs.map(a => a.trapSuccessRate.mean);

  const overallBaseline = baselineRates.length > 0
    ? baselineRates.reduce((s, v) => s + v, 0) / baselineRates.length
    : 0;
  const overallHardened = hardenedRates.length > 0
    ? hardenedRates.reduce((s, v) => s + v, 0) / hardenedRates.length
    : 0;

  const sigCount = comparisons.filter(c => c.significant).length;
  const largeEffects = comparisons.filter(c => c.effectSizeLabel === 'large').length;

  const mostVulnerable = profiles.reduce((a, b) =>
    a.overallTrapSuccessRate > b.overallTrapSuccessRate ? a : b,
    profiles[0],
  );
  const mostResistant = profiles.reduce((a, b) =>
    a.overallTrapSuccessRate < b.overallTrapSuccessRate ? a : b,
    profiles[0],
  );

  const lines: string[] = [];
  lines.push(`% Auto-generated summary statistics — do not edit manually`);
  lines.push(`% Generated by: bun run scripts/generate-paper-assets.ts`);
  lines.push(``);
  lines.push(`\\newcommand{\\totalScenarios}{${new Set(aggregates.map(a => a.scenarioId)).size}}`);
  lines.push(`\\newcommand{\\totalModels}{${new Set(aggregates.map(a => a.modelId)).size}}`);
  lines.push(`\\newcommand{\\totalCells}{${aggregates.reduce((s, a) => s + a.n, 0)}}`);
  lines.push(`\\newcommand{\\repsPerCell}{${EXPERIMENT_CONFIG.repetitions}}`);
  lines.push(``);
  lines.push(`\\newcommand{\\overallBaselineRate}{${(overallBaseline * 100).toFixed(1)}\\%}`);
  lines.push(`\\newcommand{\\overallHardenedRate}{${(overallHardened * 100).toFixed(1)}\\%}`);
  lines.push(`\\newcommand{\\overallReduction}{${((overallBaseline - overallHardened) * 100).toFixed(1)}\\%}`);
  lines.push(``);
  lines.push(`\\newcommand{\\sigComparisons}{${sigCount}}`);
  lines.push(`\\newcommand{\\totalComparisons}{${comparisons.length}}`);
  lines.push(`\\newcommand{\\largeEffects}{${largeEffects}}`);
  lines.push(`\\newcommand{\\bonferroniAlpha}{${(EXPERIMENT_CONFIG.statisticalAlpha / EXPERIMENT_CONFIG.bonferroniScenarios).toFixed(4)}}`);
  lines.push(``);
  lines.push(`\\newcommand{\\mostVulnerableModel}{${MODELS[mostVulnerable?.modelId]?.name ?? 'N/A'}}`);
  lines.push(`\\newcommand{\\mostResistantModel}{${MODELS[mostResistant?.modelId]?.name ?? 'N/A'}}`);

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n📄 Generating paper assets from: ${resultsDir}\n`);

  // Validate results directory
  const aggregatesPath = `${resultsDir}/aggregate/aggregates.json`;
  const resultsPath = `${resultsDir}/results.json`;

  if (!existsSync(aggregatesPath)) {
    console.error(`❌ Aggregates file not found: ${aggregatesPath}`);
    console.error(`   Run experiments first: bun run run:matrix`);
    process.exit(1);
  }

  // Read aggregate data
  const rawAggregates = JSON.parse(await Bun.file(aggregatesPath).text()) as Array<{
    key: string;
    aggregate: AggregateMetrics;
  }>;
  const aggregates = rawAggregates.map(a => a.aggregate);
  console.log(`  📊 Loaded ${aggregates.length} aggregate entries`);

  // Read raw results for statistical comparisons
  let rawResults: Array<{ cell: { scenarioId: string; modelId: string; condition: string }; metrics: any }> = [];
  if (existsSync(resultsPath)) {
    rawResults = JSON.parse(await Bun.file(resultsPath).text());
    console.log(`  📊 Loaded ${rawResults.length} individual results`);
  }

  // ── Build statistical comparisons (baseline vs hardened) ──────────
  const comparisons: StatisticalComparison[] = [];

  // Group raw results by scenario + model
  const grouped = new Map<string, Map<string, number[]>>();
  for (const r of rawResults) {
    const key = `${r.cell.scenarioId}__${r.cell.modelId}`;
    if (!grouped.has(key)) grouped.set(key, new Map());
    const condMap = grouped.get(key)!;
    const cond = r.cell.condition;
    if (!condMap.has(cond)) condMap.set(cond, []);
    condMap.get(cond)!.push(r.metrics.trapSuccessRate);
  }

  for (const [key, condMap] of grouped) {
    const baseline = condMap.get('baseline');
    const hardened = condMap.get('hardened');
    if (!baseline || !hardened || baseline.length < 2 || hardened.length < 2) continue;

    const [scenarioId, modelId] = key.split('__');
    const meanA = baseline.reduce((s, v) => s + v, 0) / baseline.length;
    const meanB = hardened.reduce((s, v) => s + v, 0) / hardened.length;

    // Pad arrays to equal length for paired test
    const len = Math.min(baseline.length, hardened.length);
    const bTrimmed = baseline.slice(0, len);
    const hTrimmed = hardened.slice(0, len);

    const d = cohensD(bTrimmed, hTrimmed);
    const p = wilcoxonSignedRank(bTrimmed, hTrimmed);
    const diffs = bTrimmed.map((a, i) => a - hTrimmed[i]);
    const diffSummary = computeSummary(diffs);

    comparisons.push({
      scenarioId: scenarioId as any,
      modelId: modelId as any,
      conditionA: 'baseline',
      conditionB: 'hardened',
      metric: 'trapSuccessRate',
      meanA,
      meanB,
      difference: meanA - meanB,
      cohensD: d,
      effectSizeLabel: effectSizeLabel(d),
      pValue: p,
      significant: bonferroniSignificant(
        p,
        EXPERIMENT_CONFIG.statisticalAlpha,
        EXPERIMENT_CONFIG.bonferroniScenarios,
      ),
      bonferroniAlpha: EXPERIMENT_CONFIG.statisticalAlpha / EXPERIMENT_CONFIG.bonferroniScenarios,
      diffCi95Lower: diffSummary.ci95Lower,
      diffCi95Upper: diffSummary.ci95Upper,
    });
  }

  console.log(`  📊 Computed ${comparisons.length} statistical comparisons`);

  // ── Build model vulnerability profiles ────────────────────────────
  const modelIds = [...new Set(aggregates.map(a => a.modelId))];
  const profiles: ModelVulnerabilityProfile[] = modelIds.map(modelId => {
    const modelAggs = aggregates.filter(a => a.modelId === modelId && a.condition === 'baseline');
    const allRates = modelAggs.map(a => a.trapSuccessRate.mean);
    const allDetection = modelAggs.map(a => a.detectionRate.mean);
    const allEscape = modelAggs.map(a => a.escapeRate.mean);

    const overallRate = allRates.length > 0
      ? allRates.reduce((s, v) => s + v, 0) / allRates.length
      : 0;
    const overallDetection = allDetection.length > 0
      ? allDetection.reduce((s, v) => s + v, 0) / allDetection.length
      : 0;
    const overallEscape = allEscape.length > 0
      ? allEscape.reduce((s, v) => s + v, 0) / allEscape.length
      : 0;

    // By category
    const byCat: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      const catAggs = modelAggs.filter(a => a.scenarioId.startsWith(cat));
      if (catAggs.length > 0) {
        byCat[cat] = catAggs.reduce((s, a) => s + a.trapSuccessRate.mean, 0) / catAggs.length;
      } else {
        byCat[cat] = 0;
      }
    }

    // Most/least vulnerable
    const sorted = [...modelAggs].sort((a, b) => b.trapSuccessRate.mean - a.trapSuccessRate.mean);
    const mostVuln = sorted[0]?.scenarioId ?? ('unknown:unknown' as any);
    const mostResist = sorted[sorted.length - 1]?.scenarioId ?? ('unknown:unknown' as any);

    // Mitigation benefit: compare baseline to hardened
    const hardenedAggs = aggregates.filter(a => a.modelId === modelId && a.condition === 'hardened');
    let mitBenefit = 0;
    if (hardenedAggs.length > 0 && modelAggs.length > 0) {
      const hardenedRate = hardenedAggs.reduce((s, a) => s + a.trapSuccessRate.mean, 0) / hardenedAggs.length;
      mitBenefit = overallRate - hardenedRate;
    }

    return {
      modelId,
      overallTrapSuccessRate: overallRate,
      overallDetectionRate: overallDetection,
      overallEscapeRate: overallEscape,
      byCategorySuccessRate: byCat,
      mostVulnerableTo: mostVuln,
      mostResistantTo: mostResist,
      meanMitigationBenefit: mitBenefit,
    };
  });

  console.log(`  📊 Built ${profiles.length} model vulnerability profiles`);

  // ── Write LaTeX assets ────────────────────────────────────────────
  const tablesDir = `${outputDir}/tables`;
  const figuresDir = `${outputDir}/figures`;
  ensureDir(tablesDir);
  ensureDir(figuresDir);

  const written: { tables: string[]; figures: string[] } = { tables: [], figures: [] };

  // Table 1: Trap success rates (from reporter.ts)
  const trapSuccessTeX = generateTrapSuccessTable(aggregates);
  await Bun.write(`${tablesDir}/trap-success.tex`, trapSuccessTeX);
  written.tables.push('trap-success.tex');

  // Table 2: Statistical comparisons (from reporter.ts)
  if (comparisons.length > 0) {
    const comparisonTeX = generateComparisonTable(comparisons);
    await Bun.write(`${tablesDir}/mitigation-effectiveness.tex`, comparisonTeX);
    written.tables.push('mitigation-effectiveness.tex');
  }

  // Table 3: Model comparison
  if (profiles.length > 0) {
    const modelCompTeX = generateModelComparisonTable(profiles);
    await Bun.write(`${tablesDir}/model-comparison.tex`, modelCompTeX);
    written.tables.push('model-comparison.tex');
  }

  // Table 4: Category breakdown
  const catBreakdownTeX = generateCategoryBreakdownTable(aggregates);
  await Bun.write(`${tablesDir}/category-breakdown.tex`, catBreakdownTeX);
  written.tables.push('category-breakdown.tex');

  // Figure 1: Vulnerability heatmap (from reporter.ts)
  if (profiles.length > 0) {
    const heatmapTeX = generateVulnerabilityHeatmap(profiles);
    await Bun.write(`${figuresDir}/vulnerability-heatmap.tex`, heatmapTeX);
    written.figures.push('vulnerability-heatmap.tex');
  }

  // Figure 2: Mitigation effectiveness bar chart
  if (comparisons.length > 0) {
    const barChartTeX = generateMitigationBarChart(comparisons);
    await Bun.write(`${figuresDir}/mitigation-bar-chart.tex`, barChartTeX);
    written.figures.push('mitigation-bar-chart.tex');
  }

  // Figure 3: Effect size forest plot
  if (comparisons.length > 0) {
    const forestTeX = generateEffectSizeForestPlot(comparisons);
    await Bun.write(`${figuresDir}/effect-size-forest.tex`, forestTeX);
    written.figures.push('effect-size-forest.tex');
  }

  // Summary stats .tex (LaTeX macros for inline use)
  const statsTeX = generateSummaryStatsTex(aggregates, comparisons, profiles);
  await Bun.write(`${tablesDir}/summary-stats.tex`, statsTeX);
  written.tables.push('summary-stats.tex');

  // ── Report ────────────────────────────────────────────────────────
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  PAPER ASSETS GENERATED                      ║`);
  console.log(`  ╚══════════════════════════════════════════════╝`);
  console.log(`  Source:  ${resultsDir}`);
  console.log(`  Output:  ${outputDir}/`);
  console.log(``);
  console.log(`  Tables (${written.tables.length}):`);
  for (const t of written.tables) {
    console.log(`    📄 ${tablesDir}/${t}`);
  }
  console.log(``);
  console.log(`  Figures (${written.figures.length}):`);
  for (const f of written.figures) {
    console.log(`    📈 ${figuresDir}/${f}`);
  }
  console.log(``);
  console.log(`  Use in LaTeX:`);
  console.log(`    \\input{tables/summary-stats}   % loads \\overallBaselineRate etc.`);
  console.log(`    \\input{tables/trap-success}     % Table 1`);
  console.log(`    \\input{figures/vulnerability-heatmap}  % Figure 1`);
  console.log(``);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
