'use strict';

const { jobs, makeFinding } = require('../util');

module.exports = {
  id: 'fail-fast-true',
  severity: 'info',
  description: 'matrix job uses default fail-fast: true, which kills sibling jobs on first failure - wasting their already-billed minutes and hiding parallel failures.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      const strategy = job && job.strategy;
      if (!strategy || typeof strategy !== 'object') continue;
      const matrix = strategy.matrix;
      if (!matrix || typeof matrix !== 'object') continue;
      // explicit fail-fast: false is fine; missing or true is the smell
      if (strategy['fail-fast'] === false) continue;
      findings.push(
        makeFinding(
          module.exports,
          parsed,
          `matrix job '${jobId}' has the default fail-fast: true. The first cell that fails cancels every sibling - you still pay for the cancelled minutes, and you only see one failure per run instead of all of them.`,
          ['jobs', jobId, 'strategy'],
          {
            suggestion: 'strategy:\n  fail-fast: false\n  matrix:\n    ...',
            costImpact: 'low',
          }
        )
      );
    }
    return findings;
  },
};
