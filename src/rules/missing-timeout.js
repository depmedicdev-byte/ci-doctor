'use strict';

const { jobs, makeFinding } = require('../util');

module.exports = {
  id: 'missing-timeout',
  severity: 'warn',
  description: 'Jobs without timeout-minutes default to 360 (6 hours). A runaway job burns minutes you pay for.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id, job } of jobs(parsed)) {
      if (job['timeout-minutes'] !== undefined) continue;
      if (job.uses) continue;
      findings.push(
        makeFinding(
          module.exports,
          parsed,
          `Job '${id}' has no timeout-minutes. Default is 360 (6h). A hung job can drain your CI budget.`,
          ['jobs', id],
          {
            suggestion: 'timeout-minutes: 15   # tune to your job; cap below the default 360.',
            costImpact: 'high',
          }
        )
      );
    }
    return findings;
  },
};
