'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

const DEPRECATED = {
  'actions/checkout': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
  'actions/setup-node': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
  'actions/setup-python': { bad: ['v1', 'v2', 'v3', 'v4'], current: 'v5' },
  'actions/upload-artifact': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
  'actions/download-artifact': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
  'actions/cache': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
  'actions/setup-go': { bad: ['v1', 'v2', 'v3', 'v4'], current: 'v5' },
  'actions/setup-java': { bad: ['v1', 'v2', 'v3'], current: 'v4' },
};

module.exports = {
  id: 'deprecated-action',
  severity: 'error',
  description: 'Pinned to a deprecated major version. GitHub will start failing these.',
  category: 'maintenance',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        const at = step.uses.lastIndexOf('@');
        if (at === -1) return;
        const base = step.uses.slice(0, at);
        const ref = step.uses.slice(at + 1);
        const rule = DEPRECATED[base];
        if (!rule) return;
        const major = ref.match(/^v?(\d+)/);
        if (!major) return;
        const want = `v${major[1]}`;
        if (rule.bad.includes(want)) {
          findings.push(
            makeFinding(
              module.exports,
              parsed,
              `${step.uses} is on a deprecated major. Latest stable: ${rule.current}.`,
              ['jobs', jobId, 'steps', i, 'uses'],
              { suggestion: `${base}@${rule.current}` }
            )
          );
        }
      });
    }
    return findings;
  },
};
