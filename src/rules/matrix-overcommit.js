'use strict';

const { jobs, makeFinding } = require('../util');

module.exports = {
  id: 'matrix-overcommit',
  severity: 'warn',
  description: 'A matrix that crosses many OS or version axes can multiply CI minutes silently.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id, job } of jobs(parsed)) {
      const m = job.strategy && job.strategy.matrix;
      if (!m || typeof m !== 'object') continue;
      let total = 1;
      for (const [k, v] of Object.entries(m)) {
        if (k === 'include' || k === 'exclude') continue;
        if (Array.isArray(v)) total *= v.length;
      }
      if (Array.isArray(m.include)) total += m.include.length;
      const expensiveOs = Array.isArray(m.os) && m.os.some((o) => typeof o === 'string' && (o.startsWith('macos-') || o.startsWith('windows-')));
      if (total >= 6 || (expensiveOs && total >= 3)) {
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `Job '${id}' matrix produces ${total} combinations${expensiveOs ? ', including macos/windows runners' : ''}. Reduce the cross-product or move expensive runners behind a 'workflow_dispatch' or scheduled run.`,
            ['jobs', id, 'strategy', 'matrix'],
            { suggestion: 'Trim versions or split into a fast PR matrix and a nightly full matrix.', costImpact: 'high' }
          )
        );
      }
    }
    return findings;
  },
};
