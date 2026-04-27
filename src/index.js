'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseWorkflow } = require('./parse');
const allRules = require('./rules');

function auditWorkflow(source, filename = 'workflow.yml', options = {}) {
  const parsed = parseWorkflow(source, filename);
  if (parsed.errors.length) return parsed.errors;
  const enabled = filterRules(allRules, options);
  const findings = [];
  for (const rule of enabled) {
    try {
      const out = rule.check(parsed) || [];
      findings.push(...out);
    } catch (err) {
      findings.push({
        ruleId: rule.id,
        severity: 'error',
        message: `rule crashed: ${err && err.message}`,
        line: 1,
        column: 1,
        filename,
      });
    }
  }
  return findings;
}

function auditDirectory(dir, options = {}) {
  const root = path.resolve(dir);
  const wfDir = fs.existsSync(path.join(root, '.github', 'workflows'))
    ? path.join(root, '.github', 'workflows')
    : root;
  if (!fs.existsSync(wfDir)) return [];
  const files = fs
    .readdirSync(wfDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(wfDir, f));
  const all = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file).replace(/\\/g, '/');
    all.push(...auditWorkflow(source, rel, options));
  }
  return all;
}

function filterRules(rules, options) {
  let out = rules;
  if (options.only && options.only.length) {
    const set = new Set(options.only);
    out = out.filter((r) => set.has(r.id));
  }
  if (options.disable && options.disable.length) {
    const set = new Set(options.disable);
    out = out.filter((r) => !set.has(r.id));
  }
  return out;
}

function summarize(findings) {
  const sev = { error: 0, warn: 0, info: 0 };
  for (const f of findings) sev[f.severity] = (sev[f.severity] || 0) + 1;
  return { total: findings.length, ...sev };
}

module.exports = { auditWorkflow, auditDirectory, summarize, rules: allRules };
