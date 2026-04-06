#!/usr/bin/env bun
/**
 * Run the full experiment matrix — all 3,480+ experiments.
 *
 * Usage:
 *   bun run scripts/run-full-matrix.ts
 *   bun run scripts/run-full-matrix.ts --dry-run
 *   bun run scripts/run-full-matrix.ts --model gpt4o --condition baseline
 */

import { generateMatrix, filterMatrix, printMatrixSummary } from '../src/harness/matrix.js';
import { executeMatrix, saveResults } from '../src/harness/runner.js';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'dry-run': { type: 'boolean', default: false },
    model: { type: 'string' },
    condition: { type: 'string' },
    scenario: { type: 'string' },
    category: { type: 'string' },
  },
  strict: false,
});

async function main() {
  console.log('\n🪤 agent-traps-lab — Full Experiment Matrix\n');

  let matrix = generateMatrix();

  // Apply filters
  if (values.model || values.condition || values.scenario || values.category) {
    matrix = filterMatrix(matrix, {
      model: values.model as any,
      condition: values.condition as any,
      scenario: values.scenario as any,
      category: values.category,
    });
  }

  console.log(printMatrixSummary(matrix));

  if (values['dry-run']) {
    console.log('\n  [DRY RUN] — no experiments executed.\n');
    return;
  }

  console.log('\n  Starting experiments...\n');

  const result = await executeMatrix(matrix, (progress) => {
    const pct = ((progress.completed / progress.total) * 100).toFixed(1);
    const icon = progress.status === 'running' ? '⏳'
      : progress.status === 'success' ? '✅'
      : progress.status === 'timeout' ? '⏰'
      : '❌';
    process.stdout.write(`\r  ${icon} ${pct}% (${progress.completed}/${progress.total}) — ${progress.current.id}`);
  });

  console.log('\n');
  console.log(`  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  RESULTS                                     ║`);
  console.log(`  ╚══════════════════════════════════════════════╝`);
  console.log(`  Run ID:    ${result.runId}`);
  console.log(`  Duration:  ${(result.summary.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Succeeded: ${result.summary.succeeded}`);
  console.log(`  Failed:    ${result.summary.failed}`);
  console.log(`  Timed out: ${result.summary.timedOut}`);

  const dir = await saveResults(result);
  console.log(`  Saved to:  ${dir}`);
  console.log('');
}

main().catch(console.error);
