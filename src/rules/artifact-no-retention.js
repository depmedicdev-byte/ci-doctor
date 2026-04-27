'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

module.exports = {
  id: 'artifact-no-retention',
  severity: 'info',
  description: 'upload-artifact without retention-days uses the repo default (often 90 days) and bills storage for the full window.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        const base = step.uses.split('@')[0];
        if (base !== 'actions/upload-artifact') return;
        const w = step.with || {};
        if (w['retention-days']) return;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            'upload-artifact has no retention-days. CI artifacts pile up at the repo default (usually 90d). Set 7-14d unless you need long-term retention.',
            ['jobs', jobId, 'steps', i, 'uses'],
            { suggestion: 'with:\n  retention-days: 7', costImpact: 'low' }
          )
        );
      });
    }
    return findings;
  },
};
