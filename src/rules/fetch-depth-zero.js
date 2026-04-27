'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

module.exports = {
  id: 'fetch-depth-zero',
  severity: 'info',
  description: "actions/checkout with fetch-depth: 0 pulls full history. Slow and rarely needed.",
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        if (!step.uses.startsWith('actions/checkout@')) return;
        const w = step.with || {};
        const fd = w['fetch-depth'];
        if (fd === 0 || fd === '0') {
          findings.push(
            makeFinding(
              module.exports,
              parsed,
              "fetch-depth: 0 pulls full git history. Slow on large repos. Most jobs only need the last commit. Required only for tools like commitlint, semantic-release, lerna, or git log analysis.",
              ['jobs', jobId, 'steps', i, 'uses'],
              { suggestion: 'remove fetch-depth or set fetch-depth: 1', costImpact: 'medium' }
            )
          );
        }
      });
    }
    return findings;
  },
};
