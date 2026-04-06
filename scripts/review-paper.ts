#!/usr/bin/env bun
/**
 * Launch the paper review crew via a2a-crews.
 *
 * This reads the review-crew.json config and uses `crews apply` + `crews launch`
 * to deploy 7 reviewer agents (5 parallel + meta-reviewer + revision checker).
 *
 * Usage:
 *   bun run scripts/review-paper.ts
 *   bun run scripts/review-paper.ts --paper-dir paper/
 */

import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'paper-dir': { type: 'string', default: 'paper/' },
  },
  strict: false,
});

async function main() {
  console.log('\n📝 Launching Paper Review Crew\n');
  console.log(`  Paper directory: ${values['paper-dir']}`);
  console.log('');

  const reviewCrew = await Bun.file('src/review/review-crew.json').json();

  console.log(`  Crew: ${reviewCrew.name}`);
  console.log(`  Roles: ${reviewCrew.roles.length}`);
  console.log(`  Tasks: ${reviewCrew.tasks.length}`);
  console.log('');

  // Wave 1: Parallel reviews
  const wave1 = reviewCrew.tasks.filter((t: any) => t.depends_on.length === 0);
  console.log(`  Wave 1 (parallel): ${wave1.map((t: any) => t.assigned_to).join(', ')}`);

  // Wave 2: Meta-review
  const wave2 = reviewCrew.tasks.filter((t: any) => t.id === 'meta-review');
  console.log(`  Wave 2: ${wave2.map((t: any) => t.assigned_to).join(', ')}`);

  // Wave 3: Revision check
  const wave3 = reviewCrew.tasks.filter((t: any) => t.id === 'check-revisions');
  console.log(`  Wave 3: ${wave3.map((t: any) => t.assigned_to).join(', ')}`);

  console.log('');
  console.log('  To launch with a2a-crews:');
  console.log('    crews apply --config src/review/review-crew.json');
  console.log('    crews launch');
  console.log('');
  console.log('  Reviews will be written to artifacts/reviews/');
  console.log('');
}

main().catch(console.error);
