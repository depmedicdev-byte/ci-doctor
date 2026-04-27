'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

const SHA_RE = /^[0-9a-f]{40}$/i;

module.exports = {
  id: 'pinned-action-sha',
  severity: 'warn',
  description: 'Third-party actions should be pinned to a full commit SHA, not a tag or branch.',
  category: 'security',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      const steps = stepsOf(job);
      steps.forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        if (step.uses.startsWith('./') || step.uses.startsWith('docker://')) return;
        const at = step.uses.lastIndexOf('@');
        if (at === -1) return;
        const owner = step.uses.slice(0, at).split('/')[0];
        const ref = step.uses.slice(at + 1);
        if (SHA_RE.test(ref)) return;
        if (owner === 'actions' || owner === 'github') return;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `${step.uses} is not SHA-pinned. Mutable refs let upstream replace the action under you. Pin to a 40-char commit SHA and add a comment with the version.`,
            ['jobs', jobId, 'steps', i, 'uses'],
            { suggestion: `uses: ${step.uses.slice(0, at)}@<sha>  # ${ref}` }
          )
        );
      });
    }
    return findings;
  },
};
