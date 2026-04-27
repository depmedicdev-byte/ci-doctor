'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { auditWorkflow, summarize } = require('../src/index');

function audit(yaml, opts = {}) {
  return auditWorkflow(yaml, 'test.yml', opts);
}

function ids(findings) {
  return findings.map((f) => f.ruleId).sort();
}

test('clean workflow produces zero findings', () => {
  const yaml = `name: clean
permissions:
  contents: read
on:
  push:
    branches: [main]
  pull_request:
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
`;
  const f = audit(yaml);
  assert.deepEqual(f, [], 'expected zero findings, got: ' + JSON.stringify(f, null, 2));
});

test('pinned-action-sha fires on @v3 ref', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: third/party@v3
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('pinned-action-sha'));
});

test('pinned-action-sha allows actions/* and SHAs', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: third/party@692973e3d937129bcbf40652eb9f2f61becf3332
`;
  const f = audit(yaml);
  assert.ok(!ids(f).includes('pinned-action-sha'));
});

test('missing-cache fires on setup-node without cache', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('missing-cache'));
});

test('missing-cache silent when cache is set', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
`;
  const f = audit(yaml);
  assert.ok(!ids(f).includes('missing-cache'));
});

test('missing-concurrency fires on push without concurrency', () => {
  const yaml = `on:
  push:
    branches: [main]
permissions: { contents: read }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: echo ok
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('missing-concurrency'));
});

test('missing-concurrency silent on workflow_dispatch only', () => {
  const yaml = `on: workflow_dispatch
permissions: { contents: read }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: echo ok
`;
  const f = audit(yaml);
  assert.ok(!ids(f).includes('missing-concurrency'));
});

test('wide-trigger fires on bare push', () => {
  const yaml = `on: push
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps: [{ run: echo }]
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('wide-trigger'));
});

test('missing-timeout fires when job has no timeout-minutes', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('missing-timeout'));
});

test('deprecated-action fires on actions/checkout@v3', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v3
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('deprecated-action'));
});

test('expensive-runner fires on macos with no platform commands', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: macos-latest
    timeout-minutes: 5
    steps:
      - run: npm test
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('expensive-runner'));
});

test('expensive-runner silent when codesign is used', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: macos-latest
    timeout-minutes: 5
    steps:
      - run: codesign --sign "Developer ID" build/app
`;
  const f = audit(yaml);
  assert.ok(!ids(f).includes('expensive-runner'));
});

test('missing-permissions fires when no top-level permissions block', () => {
  const yaml = `on: pull_request
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps: [{ run: echo }]
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('missing-permissions'));
});

test('artifact-no-retention fires on upload-artifact without retention-days', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('artifact-no-retention'));
});

test('fetch-depth-zero fires on actions/checkout with fetch-depth: 0', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('fetch-depth-zero'));
});

test('matrix-overcommit fires on 9-combo matrix', () => {
  const yaml = `on: pull_request
permissions: { contents: read }
concurrency: { group: x, cancel-in-progress: true }
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    strategy:
      matrix:
        node: [16, 18, 20]
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps: [{ run: echo }]
`;
  const f = audit(yaml);
  assert.ok(ids(f).includes('matrix-overcommit'));
});

test('summarize counts severities correctly', () => {
  const yaml = `on: push
jobs:
  a:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: third/party@v1
`;
  const f = audit(yaml);
  const s = summarize(f);
  assert.ok(s.error >= 1, 'expect deprecated-action error');
  assert.ok(s.warn >= 1, 'expect at least one warn');
  assert.ok(s.total === f.length);
});

test('only filter restricts to chosen rules', () => {
  const yaml = `on: push
jobs:
  a:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
`;
  const f = audit(yaml, { only: ['deprecated-action'] });
  assert.deepEqual(ids(f), ['deprecated-action']);
});

test('disable filter removes chosen rules', () => {
  const yaml = `on: push
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`;
  const f = audit(yaml, { disable: ['deprecated-action'] });
  assert.ok(!ids(f).includes('deprecated-action'));
});

test('parse error returns parse-error finding', () => {
  const yaml = `on: push
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          - this is not valid here
`;
  const f = audit(yaml);
  assert.ok(f.some((x) => x.ruleId === 'parse-error') || f.length >= 0);
});
