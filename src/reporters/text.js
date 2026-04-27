'use strict';

const { summarize } = require('../index');

const SEV_LABEL = { error: 'ERROR', warn: 'WARN ', info: 'INFO ' };

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
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

module.exports = { renderText };
