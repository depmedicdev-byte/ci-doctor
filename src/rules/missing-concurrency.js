'use strict';

const { makeFinding } = require('../util');

module.exports = {
  id: 'missing-concurrency',
  severity: 'warn',
  description: 'Workflows triggered on push or pull_request should declare a concurrency group to cancel superseded runs.',
  category: 'cost',
  check(parsed) {
    const data = parsed.data;
    if (!data) return [];
    const on = data.on || data.true;
    if (!on) return [];
    const triggers = typeof on === 'string' ? [on] : Array.isArray(on) ? on : Object.keys(on);
    const cancellable = triggers.some((t) => t === 'push' || t === 'pull_request' || t === 'pull_request_target');
    if (!cancellable) return [];
    if (data.concurrency) return [];
    return [
      makeFinding(
        module.exports,
        parsed,
        'No top-level concurrency block. New pushes will not cancel in-flight runs of stale commits, doubling spend on rapid-push branches.',
        ['on'],
        {
          suggestion:
            "concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true",
          costImpact: 'high',
        }
      ),
    ];
  },
};
