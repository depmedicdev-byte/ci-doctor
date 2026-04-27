'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

const PLATFORM_HINTS = [
  /\bbrew\b/, /\bcodesign\b/, /\bxcodebuild\b/, /\bxcrun\b/, /\bnotarytool\b/, /\bsecurity\s+create-keychain\b/,
  /\bchocolatey\b/, /\bchoco\s+install\b/, /\bSet-ExecutionPolicy\b/i, /Get-WmiObject/i, /\bpowershell\s+-/i,
  /\bnuget\b/i, /\bmsbuild\b/i,
];

module.exports = {
  id: 'expensive-runner',
  severity: 'warn',
  description: 'macos-* runners cost 10x and windows-* costs 2x ubuntu. Use them only when platform-specific commands are present.',
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id, job } of jobs(parsed)) {
      const ro = job['runs-on'];
      if (!ro) continue;
      const runners = Array.isArray(ro) ? ro : [ro];
      const isExpensive = runners.some((r) => typeof r === 'string' && (r.startsWith('macos-') || r.startsWith('windows-')));
      if (!isExpensive) continue;
      const allRun = stepsOf(job)
        .map((s) => (s && typeof s.run === 'string' ? s.run : ''))
        .join('\n');
      const allUses = stepsOf(job)
        .map((s) => (s && typeof s.uses === 'string' ? s.uses : ''))
        .join('\n');
      const hasHint = PLATFORM_HINTS.some((re) => re.test(allRun) || re.test(allUses));
      if (hasHint) continue;
      const ratio = runners.some((r) => typeof r === 'string' && r.startsWith('macos-')) ? '10x' : '2x';
      findings.push(
        makeFinding(
          module.exports,
          parsed,
          `Job '${id}' runs on ${runners.join(', ')} but has no platform-specific commands detected. ubuntu-latest costs ${ratio} less.`,
          ['jobs', id, 'runs-on'],
          { suggestion: 'runs-on: ubuntu-latest', costImpact: 'high' }
        )
      );
    }
    return findings;
  },
};
