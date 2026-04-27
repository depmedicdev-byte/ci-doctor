'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderSarif } = require('../src/reporters/sarif');
const { auditWorkflow } = require('../src/index');

const BAD = `name: ci
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
`;

function findings() {
  return auditWorkflow(BAD, '.github/workflows/ci.yml');
}

test('renders valid SARIF 2.1.0 envelope', () => {
  const out = renderSarif(findings());
  const sarif = JSON.parse(out);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(typeof sarif.$schema, 'string');
  assert.ok(Array.isArray(sarif.runs));
  assert.equal(sarif.runs.length, 1);
});

test('driver advertises ci-doctor and lists every rule', () => {
  const sarif = JSON.parse(renderSarif(findings()));
  const drv = sarif.runs[0].tool.driver;
  assert.equal(drv.name, 'ci-doctor');
  assert.match(drv.version, /^\d+\.\d+\.\d+/);
  assert.ok(Array.isArray(drv.rules));
  const ids = drv.rules.map((r) => r.id);
  assert.ok(ids.includes('missing-timeout'));
  assert.ok(ids.includes('missing-permissions'));
  assert.ok(ids.includes('pinned-action-sha'));
});

test('every result has required SARIF fields', () => {
  const sarif = JSON.parse(renderSarif(findings()));
  const results = sarif.runs[0].results;
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.equal(typeof r.ruleId, 'string');
    assert.ok(['error', 'warning', 'note'].includes(r.level), 'level is GitHub-supported');
    assert.equal(typeof r.message.text, 'string');
    const loc = r.locations[0].physicalLocation;
    assert.equal(loc.artifactLocation.uri, '.github/workflows/ci.yml');
    assert.ok(loc.region.startLine >= 1);
    assert.ok(loc.region.startColumn >= 1);
  }
});

test('severity mapping: warn -> warning, info -> note, error -> error', () => {
  const sarif = JSON.parse(renderSarif(findings()));
  const results = sarif.runs[0].results;
  const dep = results.find((r) => r.ruleId === 'deprecated-action');
  assert.equal(dep.level, 'error');
  const tmo = results.find((r) => r.ruleId === 'missing-timeout');
  assert.equal(tmo.level, 'warning');
  const wide = results.find((r) => r.ruleId === 'wide-trigger');
  assert.equal(wide.level, 'note');
});

test('parse-error findings are excluded from results', () => {
  const f = auditWorkflow(': : : not yaml', 'broken.yml');
  const sarif = JSON.parse(renderSarif(f));
  assert.equal(sarif.runs[0].results.length, 0);
});

test('artifactLocation.uri uses forward slashes on all platforms', () => {
  const fakeFinding = [{
    ruleId: 'missing-timeout',
    severity: 'warn',
    message: 'x',
    line: 5,
    column: 5,
    filename: '.github\\workflows\\ci.yml',
  }];
  const sarif = JSON.parse(renderSarif(fakeFinding));
  assert.equal(
    sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri,
    '.github/workflows/ci.yml'
  );
});
