'use strict';

const { lineOf } = require('./parse');

function jobs(parsed) {
  const j = parsed.data.jobs || {};
  return Object.entries(j).map(([id, job]) => ({ id, job }));
}

function stepsOf(job) {
  return Array.isArray(job.steps) ? job.steps : [];
}

function find(parsed, pathParts) {
  return lineOf(parsed.doc, pathParts);
}

function pos(parsed, pathParts, fallback) {
  const p = find(parsed, pathParts);
  if (p && p.line) return p;
  return fallback || { line: 1, column: 1 };
}

function makeFinding(rule, parsed, message, pathParts, extras = {}) {
  const p = pos(parsed, pathParts);
  return {
    ruleId: rule.id,
    severity: rule.severity,
    message,
    line: p.line,
    column: p.column,
    filename: parsed.filename,
    ...extras,
  };
}

module.exports = { jobs, stepsOf, makeFinding, find, pos };
