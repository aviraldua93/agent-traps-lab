#!/usr/bin/env bun
/**
 * Run a single trap category.
 *
 * Usage:
 *   bun run scripts/run-single-trap.ts --trap content-injection
 *   bun run scripts/run-single-trap.ts --trap content-injection --model gpt4o --reps 5
 */

import { registerAllScenarios } from '../src/traps/register-all.js';
import { generateMatrix, filterMatrix, printMatrixSummary } from '../src/harness/matrix.js';
import { executeMatrix, saveResults } from '../src/harness/runner.js';
import { parseArgs } from 'util';

registerAllScenarios();

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    trap: { type: 'string' },
    model: { type: 'string' },
    reps: { type: 'string', default: '10' },
    condition: { type: 'string' },
  },
  strict: false,
});

async function main() {
  if (!values.trap) {
    console.error('Usage: bun run scripts/run-single-trap.ts --trap <category>');
    console.error('Categories: content-injection, semantic-manipulation, cognitive-state, behavioural-control, systemic, human-in-the-loop');
    process.exit(1);
  }

  console.log(`\n🪤 Running trap: ${values.trap}\n`);

  let matrix = generateMatrix();
  matrix = filterMatrix(matrix, {
    category: values.trap,
    model: values.model as any,
    condition: values.condition as any,
  });

  console.log(printMatrixSummary(matrix));
  console.log('\n  Starting experiments...\n');

  const result = await executeMatrix(matrix, (progress) => {
    const pct = ((progress.completed / progress.total) * 100).toFixed(1);
    const icon = progress.status === 'success' ? '✅' : progress.status === 'timeout' ? '⏰' : '❌';
    if (progress.status !== 'running') {
      console.log(`  ${icon} ${progress.current.id}`);
    }
  });

  console.log(`\n  Done: ${result.summary.succeeded} passed, ${result.summary.failed} failed, ${result.summary.timedOut} timed out`);

  const dir = await saveResults(result);
  console.log(`  Results: ${dir}\n`);
}

main().catch(console.error);
