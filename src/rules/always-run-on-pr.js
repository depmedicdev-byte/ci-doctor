'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

// Heavy steps that should usually be gated on a path filter or a label,
// not run unconditionally on every PR.
const HEAVY_PATTERNS = [
  { rx: /^docker\/build-push-action/, label: 'docker build+push' },
  { rx: /^docker\/build-action/, label: 'docker build' },
  { rx: /^cypress-io\/github-action/, label: 'cypress e2e' },
  { rx: /^playwright/i, label: 'playwright e2e' },
  { rx: /^microsoft\/playwright/i, label: 'playwright e2e' },
  { rx: /^github\/codeql-action/, label: 'codeql analysis' },
];

function triggers(parsed) {
  const on = parsed.data.on;
  if (!on) return new Set();
  if (typeof on === 'string') return new Set([on]);
  if (Array.isArray(on)) return new Set(on);
  return new Set(Object.keys(on));
}

function hasPathFilter(parsed) {
  const on = parsed.data.on;
  if (!on || typeof on !== 'object' || Array.isArray(on)) return false;
  for (const trig of ['pull_request', 'pull_request_target', 'push']) {
    const cfg = on[trig];
    if (cfg && typeof cfg === 'object' && (cfg.paths || cfg['paths-ignore'])) {
      return true;
    }
  }
  return false;
}

function gatedByCondition(job, step) {
  const ifs = [job && job.if, step && step.if].filter(Boolean).join(' ');
  if (!ifs) return false;
  // any reasonable condition counts as "the author thought about gating"
  return /github\.event|labels|contains|paths|files_changed/i.test(ifs);
}

module.exports = {
  id: 'always-run-on-pr',
  severity: 'info',
  description: 'a heavy step (docker build, e2e, codeql) runs on every PR with no paths filter, no label gate, and no condition. It runs whether or not the PR touched anything that matters to it.',
  category: 'cost',
  check(parsed) {
    const trig = triggers(parsed);
    const isPrTriggered = trig.has('pull_request') || trig.has('pull_request_target');
    if (!isPrTriggered) return [];
    if (hasPathFilter(parsed)) return [];

    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        const base = step.uses.split('@')[0];
        const match = HEAVY_PATTERNS.find((h) => h.rx.test(base));
        if (!match) return;
        if (gatedByCondition(job, step)) return;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `${match.label} step in job '${jobId}' runs on every PR with no paths filter or condition. Consider gating it on changed files or a label.`,
            ['jobs', jobId, 'steps', i, 'uses'],
            {
              suggestion:
                "on:\n  pull_request:\n    paths:\n      - 'src/**'   # or a label gate via if: contains(github.event.pull_request.labels.*.name, 'run-e2e')",
              costImpact: 'high',
            }
          )
        );
      });
    }
    return findings;
  },
};
