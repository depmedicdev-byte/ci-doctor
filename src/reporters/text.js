'use strict';

const { summarize } = require('../index');

const SEV_LABEL = { error: 'ERROR', warn: 'WARN ', info: 'INFO ' };

const COST_RULES = new Set([
  'missing-concurrency',
  'missing-timeout',
  'missing-cache',
  'expensive-runner',
  'matrix-overcommit',
  'artifact-no-retention',
  'fetch-depth-zero',
  'wide-trigger',
]);

function renderFooter(findings) {
  const costCount = findings.filter((f) => COST_RULES.has(f.ruleId)).length;
  const lines = [];
  lines.push('');
  lines.push('-'.repeat(60));
  if (costCount > 0) {
    lines.push(`${costCount} of these are cost issues. Run \`npx ci-doctor --fix\` to`);
    lines.push('apply the safe ones, then `npx gha-budget` to price what is left.');
  } else {
    lines.push('Run `npx ci-doctor --fix` to auto-apply the safe fixes.');
  }
  lines.push('');
  lines.push('Want the full pattern set (30 patterns + 5 paste-ready workflows)?');
  lines.push('Cut Your CI Bill cookbook, $19 one-time:');
  lines.push('https://buy.polar.sh/polar_cl_E2HGFeAVxJ64gU0Tv0qGwAueuxvhuq6A0pjhE4BWTyD');
  const hasExpensive = findings.some((f) => f.ruleId === 'expensive-runner');
  if (hasExpensive) {
    lines.push('');
    lines.push('Cheaper third-party runners compared (BuildJet, Namespace,');
    lines.push('Ubicloud, RunsOn, WarpBuild, Blacksmith): https://depmedicdev-byte.github.io/runners.html');
  }
  return lines.join('\n');
}

function renderText(findings, options = {}) {
  const lines = [];
  const s = summarize(findings);
  const ts = new Date().toISOString();
  lines.push(`ci-doctor  ${ts}`);
  lines.push('');
  if (findings.length === 0) {
    lines.push('No findings. Workflows look clean.');
    return lines.join('\n');
  }
  lines.push(`Found ${s.total} finding(s)  [error ${s.error}  warn ${s.warn}  info ${s.info}]`);
  lines.push('');
  const byFile = new Map();
  for (const f of findings) {
    const list = byFile.get(f.filename) || [];
    list.push(f);
    byFile.set(f.filename, list);
  }
  for (const [filename, list] of byFile) {
    lines.push(filename);
    for (const f of list) {
      lines.push(`  ${SEV_LABEL[f.severity] || f.severity}  ${f.line}:${f.column}  ${f.ruleId}`);
      lines.push(`         ${f.message}`);
      if (f.suggestion && options.verbose !== false) {
        const sug = String(f.suggestion).split('\n').map((l) => '         | ' + l).join('\n');
        lines.push(sug);
      }
      if (f.tip && options.verbose !== false) {
        lines.push(`         tip: ${f.tip}`);
      }
    }
    lines.push('');
  }
  if (options.footer !== false) lines.push(renderFooter(findings));
  return lines.join('\n').trimEnd();
}

module.exports = { renderText };
