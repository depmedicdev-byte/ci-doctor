'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyFixes } = require('../src/fix');
const { auditWorkflow } = require('../src/index');

function fix(yaml, opts) {
  return applyFixes(yaml, 'test.yml', opts);
}

test('adds top-level permissions block when missing', () => {
  const yaml = `on: pull_request
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  assert.match(r.content, /permissions:\s*\n\s+contents:\s*read/);
  assert.ok(r.applied.some((a) => a.ruleId === 'missing-permissions'));
});

test('adds concurrency block when missing', () => {
  const yaml = `on: pull_request
permissions:
  contents: read
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  assert.match(r.content, /concurrency:/);
  assert.match(r.content, /cancel-in-progress:\s*true/);
});

test('adds timeout-minutes per job, only where missing', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
  b:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  const timeouts = (r.content.match(/timeout-minutes:/g) || []).length;
  assert.equal(timeouts, 2, 'one existing + one added');
  const jobIds = r.applied.filter((a) => a.ruleId === 'missing-timeout').map((a) => a.jobId);
  assert.deepEqual(jobIds, ['a']);
});

test('adds retention-days to upload-artifact step without with', () => {
  const yaml = `on: push
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/upload-artifact@v4
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  assert.match(r.content, /retention-days:\s*7/);
});

test('adds retention-days to existing with block', () => {
  const yaml = `on: push
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  assert.match(r.content, /retention-days:\s*7/);
  assert.match(r.content, /name:\s*dist/);
});

test('clean workflow is unchanged', () => {
  const yaml = `name: clean
permissions:
  contents: read
on: pull_request
concurrency:
  group: x
  cancel-in-progress: true
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const r = fix(yaml);
  assert.equal(r.changed, false);
  assert.equal(r.applied.length, 0);
});

test('end-to-end: fix output passes the corresponding rules', () => {
  const yaml = `on: pull_request
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
      - uses: actions/upload-artifact@v4
`;
  const r = fix(yaml);
  assert.equal(r.changed, true);
  const findings = auditWorkflow(r.content, 'test.yml');
  const ids = new Set(findings.map((f) => f.ruleId));
  assert.ok(!ids.has('missing-permissions'), 'permissions should be fixed');
  assert.ok(!ids.has('missing-concurrency'), 'concurrency should be fixed');
  assert.ok(!ids.has('missing-timeout'), 'timeout should be fixed');
  assert.ok(!ids.has('artifact-no-retention'), 'retention should be fixed');
});

test('--only restricts which fixes are applied', () => {
  const yaml = `on: pull_request
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const r = fix(yaml, { enabled: ['missing-permissions'] });
  assert.equal(r.changed, true);
  assert.match(r.content, /permissions:/);
  assert.doesNotMatch(r.content, /concurrency:/);
  assert.doesNotMatch(r.content, /timeout-minutes:/);
});
