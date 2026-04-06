import type { TrapMetrics, ScenarioId } from '../traps/types.js';
import type { ModelId, Condition } from '../config.js';

/**
 * Aggregate metrics across multiple experiment repetitions.
 */
export interface AggregateMetrics {
  scenarioId: ScenarioId;
  modelId: ModelId;
  condition: Condition;
  n: number;

  // Mean ± std
  trapSuccessRate: MetricSummary;
  detectionRate: MetricSummary;
  escapeRate: MetricSummary;
  decisionDrift: MetricSummary;
  timeToCompromiseMs: MetricSummary;
  tokenWaste: MetricSummary;

  // Multi-agent (Trap 5)
  cascadeDepth?: MetricSummary;
  blastRadius?: MetricSummary;

  // Mitigation
  recoverySuccess?: MetricSummary;
  mitigationOverheadMs?: MetricSummary;
}

export interface MetricSummary {
  mean: number;
  std: number;
  median: number;
  min: number;
  max: number;
  ci95Lower: number;
  ci95Upper: number;
  values: number[];
}

/**
 * Statistical comparison between two conditions.
 */
export interface StatisticalComparison {
  scenarioId: ScenarioId;
  modelId: ModelId;
  conditionA: Condition;
  conditionB: Condition;
  metric: string;

  meanA: number;
  meanB: number;
  difference: number;

  // Effect size
  cohensD: number;
  effectSizeLabel: 'negligible' | 'small' | 'medium' | 'large';

  // Significance
  pValue: number;
  significant: boolean; // After Bonferroni correction
  bonferroniAlpha: number;

  // Confidence interval of the difference
  diffCi95Lower: number;
  diffCi95Upper: number;
}

/**
 * Model vulnerability profile — how each model performs across all traps.
 */
export interface ModelVulnerabilityProfile {
  modelId: ModelId;
  overallTrapSuccessRate: number;
  overallDetectionRate: number;
  overallEscapeRate: number;
  byCategorySuccessRate: Record<string, number>;
  mostVulnerableTo: ScenarioId;
  mostResistantTo: ScenarioId;
  meanMitigationBenefit: number; // Reduction in trap success rate with mitigations
}

// ── Statistical computation functions ──────────────────────────────────

export function computeSummary(values: number[]): MetricSummary {
  const n = values.length;
  if (n === 0) {
    return { mean: 0, std: 0, median: 0, min: 0, max: 0, ci95Lower: 0, ci95Upper: 0, values: [] };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const se = std / Math.sqrt(n);

  // t-distribution critical value for 95% CI (approximate for n >= 10)
  const tCrit = n >= 30 ? 1.96 : 2.262; // df=9 for n=10

  return {
    mean,
    std,
    median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
    min: sorted[0],
    max: sorted[n - 1],
    ci95Lower: mean - tCrit * se,
    ci95Upper: mean + tCrit * se,
    values,
  };
}

/**
 * Cohen's d effect size between two groups.
 */
export function cohensD(groupA: number[], groupB: number[]): number {
  const nA = groupA.length;
  const nB = groupB.length;
  if (nA < 2 || nB < 2) return 0;

  const meanA = groupA.reduce((s, v) => s + v, 0) / nA;
  const meanB = groupB.reduce((s, v) => s + v, 0) / nB;
  const varA = groupA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (nA - 1);
  const varB = groupB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (nB - 1);

  // Pooled standard deviation
  const pooledVar = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
  const pooledStd = Math.sqrt(pooledVar);

  if (pooledStd === 0) return meanA === meanB ? 0 : Infinity * Math.sign(meanA - meanB);
  return (meanA - meanB) / pooledStd;
}

export function effectSizeLabel(d: number): 'negligible' | 'small' | 'medium' | 'large' {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  return 'large';
}

/**
 * Wilcoxon signed-rank test (approximate z-test for n >= 10).
 * Returns p-value for the null hypothesis that there's no difference.
 */
export function wilcoxonSignedRank(groupA: number[], groupB: number[]): number {
  if (groupA.length !== groupB.length) {
    throw new Error('Groups must have equal length for paired test');
  }

  const n = groupA.length;
  const differences = groupA.map((a, i) => a - groupB[i]).filter(d => d !== 0);
  const nr = differences.length;

  if (nr === 0) return 1.0; // No differences

  // Rank by absolute value
  const ranked = differences
    .map((d, i) => ({ diff: d, abs: Math.abs(d), index: i }))
    .sort((a, b) => a.abs - b.abs)
    .map((item, rank) => ({ ...item, rank: rank + 1 }));

  // Sum of positive ranks
  const wPlus = ranked.filter(r => r.diff > 0).reduce((sum, r) => sum + r.rank, 0);
  const wMinus = ranked.filter(r => r.diff < 0).reduce((sum, r) => sum + r.rank, 0);
  const w = Math.min(wPlus, wMinus);

  // Normal approximation for n >= 10
  const meanW = (nr * (nr + 1)) / 4;
  const stdW = Math.sqrt((nr * (nr + 1) * (2 * nr + 1)) / 24);
  const z = (w - meanW) / stdW;

  // Two-tailed p-value (standard normal approximation)
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return p;
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun).
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Bonferroni-corrected significance test.
 */
export function bonferroniSignificant(pValue: number, alpha: number, numComparisons: number): boolean {
  return pValue < alpha / numComparisons;
}

/**
 * Aggregate raw TrapMetrics from multiple repetitions.
 */
export function aggregateMetrics(metrics: TrapMetrics[]): AggregateMetrics {
  if (metrics.length === 0) throw new Error('No metrics to aggregate');

  const first = metrics[0];
  return {
    scenarioId: first.scenarioId,
    modelId: first.modelId,
    condition: first.condition,
    n: metrics.length,
    trapSuccessRate: computeSummary(metrics.map(m => m.trapSuccessRate)),
    detectionRate: computeSummary(metrics.map(m => m.detectionRate)),
    escapeRate: computeSummary(metrics.map(m => m.escapeRate)),
    decisionDrift: computeSummary(metrics.map(m => m.decisionDrift)),
    timeToCompromiseMs: computeSummary(metrics.map(m => m.timeToCompromiseMs)),
    tokenWaste: computeSummary(metrics.map(m => m.tokenWaste)),
    cascadeDepth: metrics[0].cascadeDepth != null
      ? computeSummary(metrics.map(m => m.cascadeDepth!))
      : undefined,
    blastRadius: metrics[0].blastRadius != null
      ? computeSummary(metrics.map(m => m.blastRadius!))
      : undefined,
    recoverySuccess: metrics[0].recoverySuccess != null
      ? computeSummary(metrics.map(m => m.recoverySuccess!))
      : undefined,
    mitigationOverheadMs: metrics[0].mitigationOverheadMs != null
      ? computeSummary(metrics.map(m => m.mitigationOverheadMs!))
      : undefined,
  };
}

/**
 * Compare two conditions statistically.
 */
export function compareConditions(
  metricsA: TrapMetrics[],
  metricsB: TrapMetrics[],
  metricName: string,
  alpha: number,
  numComparisons: number,
): StatisticalComparison {
  const extract = (m: TrapMetrics) => (m as Record<string, unknown>)[metricName] as number;
  const valuesA = metricsA.map(extract);
  const valuesB = metricsB.map(extract);

  const meanA = valuesA.reduce((s, v) => s + v, 0) / valuesA.length;
  const meanB = valuesB.reduce((s, v) => s + v, 0) / valuesB.length;
  const d = cohensD(valuesA, valuesB);
  const p = wilcoxonSignedRank(valuesA, valuesB);
  const correctedAlpha = alpha / numComparisons;

  const diffs = valuesA.map((a, i) => a - valuesB[i]);
  const diffSummary = computeSummary(diffs);

  return {
    scenarioId: metricsA[0].scenarioId,
    modelId: metricsA[0].modelId,
    conditionA: metricsA[0].condition,
    conditionB: metricsB[0].condition,
    metric: metricName,
    meanA,
    meanB,
    difference: meanA - meanB,
    cohensD: d,
    effectSizeLabel: effectSizeLabel(d),
    pValue: p,
    significant: p < correctedAlpha,
    bonferroniAlpha: correctedAlpha,
    diffCi95Lower: diffSummary.ci95Lower,
    diffCi95Upper: diffSummary.ci95Upper,
  };
}
