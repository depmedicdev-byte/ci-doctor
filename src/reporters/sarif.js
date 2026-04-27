'use strict';

// SARIF 2.1.0 reporter. Emits a single Run with the ci-doctor driver and
// every finding as a result. The output is consumable by GitHub's Code
// Scanning upload action, which renders findings as PR annotations and
// surfaces them in the repo's Security tab.
//
// spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html

const allRules = require('../rules');
const pkg = require('../../package.json');

function severityToLevel(sev) {
  if (sev === 'error') return 'error';
  if (sev === 'warn') return 'warning';
  return 'note';
}

function buildRules() {
  return allRules.map((r) => ({
    id: r.id,
    name: r.id,
    shortDescription: { text: r.description || r.id },
    fullDescription: { text: r.description || r.id },
    defaultConfiguration: { level: severityToLevel(r.severity) },
    properties: {
      category: r.category || 'general',
      tags: [r.category || 'general'],
    },
    helpUri: 'https://github.com/depmedicdev-byte/ci-doctor#rules',
  }));
}

function buildResult(f) {
  const region = {
    startLine: Math.max(1, Number(f.line) || 1),
    startColumn: Math.max(1, Number(f.column) || 1),
  };
  return {
    ruleId: f.ruleId,
    level: severityToLevel(f.severity),
    message: { text: f.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: (f.filename || 'workflow.yml').replace(/\\/g, '/') },
          region,
        },
      },
    ],
    properties: f.suggestion ? { suggestion: f.suggestion } : undefined,
  };
}

function renderSarif(findings) {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ci-doctor',
            version: pkg.version,
            informationUri: 'https://github.com/depmedicdev-byte/ci-doctor',
            rules: buildRules(),
          },
        },
        results: findings.filter((f) => f.ruleId !== 'parse-error').map(buildResult),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}

module.exports = { renderSarif };
