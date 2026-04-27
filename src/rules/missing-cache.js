'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

const CACHE_AWARE = [
  'actions/setup-node',
  'actions/setup-python',
  'actions/setup-java',
  'actions/setup-go',
  'actions/setup-dotnet',
  'ruby/setup-ruby',
];

module.exports = {
  id: 'missing-cache',
  severity: 'warn',
  description: 'setup-* actions without a cache option re-download dependencies on every run.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        const base = step.uses.split('@')[0];
        if (!CACHE_AWARE.includes(base)) return;
        const w = step.with || {};
        if (w.cache || w['cache-dependency-path']) return;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `${base} has no cache option. Add 'with: cache: <ecosystem>' to skip dep re-downloads. Saves 30-90 seconds per run.`,
            ['jobs', jobId, 'steps', i, 'uses'],
            { suggestion: 'with:\n  cache: npm   # or pip, gradle, maven, go, etc.', costImpact: 'high' }
          )
        );
      });
    }
    return findings;
  },
};
