'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

module.exports = {
  id: 'stale-cache-key',
  severity: 'warn',
  description: 'actions/cache step has a key that does not include a lockfile hash, so the cache never invalidates when deps change.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        if (!step.uses.startsWith('actions/cache@')) return;
        const w = step.with || {};
        const key = typeof w.key === 'string' ? w.key : '';
        if (!key) return;
        const hashesLockfile = /hashFiles\s*\(/.test(key);
        const hashesCommitSha = /\$\{\{\s*github\.sha\s*\}\}/.test(key);
        const hashesRunId = /\$\{\{\s*github\.run_id\s*\}\}/.test(key);
        if (hashesLockfile || hashesCommitSha || hashesRunId) return;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `cache key '${key}' has no hashFiles() over a lockfile. Cache will never refresh when dependencies change, leading to stale builds or unbounded cache growth.`,
            ['jobs', jobId, 'steps', i, 'with', 'key'],
            {
              suggestion: "key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}",
              costImpact: 'medium',
            }
          )
        );
      });
    }
    return findings;
  },
};
