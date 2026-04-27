'use strict';

const { makeFinding } = require('../util');

module.exports = {
  id: 'wide-trigger',
  severity: 'info',
  description: 'on: push without branches filter runs the workflow on every branch push.',
  category: 'cost',
  check(parsed) {
    const data = parsed.data;
    if (!data || !data.on) return [];
    const on = data.on;
    if (typeof on === 'string' && on === 'push') {
      return [
        makeFinding(
          module.exports,
          parsed,
          'on: push fires on every branch. Restrict to main or release branches unless you need every-branch runs.',
          ['on'],
          {
            suggestion: "on:\n  push:\n    branches: [main]\n  pull_request:",
            costImpact: 'medium',
          }
        ),
      ];
    }
    if (typeof on === 'object' && on && on.push !== undefined) {
      const p = on.push;
      if (p === null || (typeof p === 'object' && !p.branches && !p['branches-ignore'] && !p.tags && !p['tags-ignore'])) {
        return [
          makeFinding(
            module.exports,
            parsed,
            'push trigger has no branches filter. Workflow fires on every branch push.',
            ['on', 'push'],
            {
              suggestion: '    branches: [main]',
              costImpact: 'medium',
            }
          ),
        ];
      }
    }
    return [];
  },
};
