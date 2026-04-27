'use strict';

const YAML = require('yaml');

function parseWorkflow(source, filename) {
  const doc = YAML.parseDocument(source, { keepSourceTokens: true });
  const errors = doc.errors.map((e) => ({
    severity: 'error',
    ruleId: 'parse-error',
    message: e.message,
    line: e.linePos ? e.linePos[0].line : 1,
    column: e.linePos ? e.linePos[0].col : 1,
    filename,
  }));
  const data = doc.toJS({ maxAliasCount: -1 }) || {};
  return { doc, data, errors, filename };
}

function nodeAt(doc, pathParts) {
  let node = doc.contents;
  for (const part of pathParts) {
    if (!node) return null;
    if (typeof part === 'number' && node.items) {
      node = node.items[part];
    } else if (node.items) {
      const pair = node.items.find((p) => p.key && (p.key.value === part || p.key.source === part));
      node = pair ? pair.value : null;
    } else {
      return null;
    }
  }
  return node;
}

function lineOf(doc, pathParts) {
  const node = nodeAt(doc, pathParts);
  if (!node || !node.range) return { line: 1, column: 1 };
  const lc = doc.lineCounter ? doc.lineCounter.linePos(node.range[0]) : null;
  if (lc) return { line: lc.line, column: lc.col };
  const text = doc.toString().slice(0, node.range[0]);
  const line = text.split('\n').length;
  const lastNl = text.lastIndexOf('\n');
  const column = lastNl === -1 ? text.length + 1 : text.length - lastNl;
  return { line, column };
}

function parseWorkflowWithLines(source, filename) {
  const lineCounter = new YAML.LineCounter();
  const doc = YAML.parseDocument(source, { keepSourceTokens: true, lineCounter });
  doc.lineCounter = lineCounter;
  const errors = doc.errors.map((e) => ({
    severity: 'error',
    ruleId: 'parse-error',
    message: e.message,
    line: e.linePos ? e.linePos[0].line : 1,
    column: e.linePos ? e.linePos[0].col : 1,
    filename,
  }));
  const data = doc.toJS({ maxAliasCount: -1 }) || {};
  return { doc, data, errors, filename };
}

module.exports = { parseWorkflow: parseWorkflowWithLines, nodeAt, lineOf };
