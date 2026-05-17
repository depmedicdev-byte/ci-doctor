# Rules reference

This page expands the short README rule table with the rationale, a minimal bad/good workflow example, the suggested fix, and the source file for each rule.

| Rule | Severity | Category | Source |
| - | - | - | - |
| `pinned-action-sha` | warn | security | [pinned-action-sha.js](../src/rules/pinned-action-sha.js) |
| `missing-cache` | warn | cost | [missing-cache.js](../src/rules/missing-cache.js) |
| `missing-concurrency` | warn | cost | [missing-concurrency.js](../src/rules/missing-concurrency.js) |
| `wide-trigger` | info | cost | [wide-trigger.js](../src/rules/wide-trigger.js) |
| `missing-timeout` | warn | cost | [missing-timeout.js](../src/rules/missing-timeout.js) |
| `deprecated-action` | error | maintenance | [deprecated-action.js](../src/rules/deprecated-action.js) |
| `expensive-runner` | warn | cost | [expensive-runner.js](../src/rules/expensive-runner.js) |
| `missing-permissions` | warn | security | [missing-permissions.js](../src/rules/missing-permissions.js) |
| `artifact-no-retention` | info | cost | [artifact-no-retention.js](../src/rules/artifact-no-retention.js) |
| `fetch-depth-zero` | info | cost | [fetch-depth-zero.js](../src/rules/fetch-depth-zero.js) |
| `matrix-overcommit` | warn | cost | [matrix-overcommit.js](../src/rules/matrix-overcommit.js) |
| `stale-cache-key` | warn | cost | [stale-cache-key.js](../src/rules/stale-cache-key.js) |
| `fail-fast-true` | info | cost | [fail-fast-true.js](../src/rules/fail-fast-true.js) |
| `always-run-on-pr` | info | cost | [always-run-on-pr.js](../src/rules/always-run-on-pr.js) |
| `docker-no-pin` | warn | security | [docker-no-pin.js](../src/rules/docker-no-pin.js) |
| `service-no-healthcheck` | warn | cost | [service-no-healthcheck.js](../src/rules/service-no-healthcheck.js) |

## `pinned-action-sha`

- Severity: `warn`
- Category: `security`
- Source: [pinned-action-sha.js](../src/rules/pinned-action-sha.js)
- Rationale: Third-party actions pinned to tags or branches can change without review. Pinning to a full commit SHA makes the workflow reproducible and reduces supply-chain risk.
- Suggested fix: Replace mutable third-party action refs with full 40-character commit SHAs and keep a comment with the human-readable version.

Bad example:

```yaml
steps:
  - uses: some/action@v1
  - uses: docker/login-action@v3
  - run: npm test
```

Good example:

```yaml
steps:
  - uses: some/action@0123456789abcdef0123456789abcdef01234567 # v1
  - uses: docker/login-action@89abcdef0123456789abcdef0123456789abcdef # v3
  - run: npm test
```

## `missing-cache`

- Severity: `warn`
- Category: `cost`
- Source: [missing-cache.js](../src/rules/missing-cache.js)
- Rationale: setup-* actions without cache options re-download dependencies on every run, wasting time and hosted-runner minutes.
- Suggested fix: Add the appropriate setup action cache option, such as `with: cache: npm`, `pip`, `gradle`, `maven`, or `go`.

Bad example:

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 20
  - run: npm ci
```

Good example:

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
  - run: npm ci
```

## `missing-concurrency`

- Severity: `warn`
- Category: `cost`
- Source: [missing-concurrency.js](../src/rules/missing-concurrency.js)
- Rationale: Push and pull-request workflows without concurrency keep stale runs alive after new commits arrive, doubling spend during rapid iteration.
- Suggested fix: Add a top-level `concurrency` group keyed by workflow and ref with `cancel-in-progress: true`.

Bad example:

```yaml
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps: []
```

Good example:

```yaml
on: pull_request
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs: {}
```

## `wide-trigger`

- Severity: `info`
- Category: `cost`
- Source: [wide-trigger.js](../src/rules/wide-trigger.js)
- Rationale: `on: push` without branch filters runs on every branch, including temporary or experimental branches that do not need the full workflow.
- Suggested fix: Restrict push triggers to main/release branches and keep PR coverage where needed.

Bad example:

```yaml
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps: []
```

Good example:

```yaml
on:
  push:
    branches: [main]
  pull_request:
jobs: {}
```

## `missing-timeout`

- Severity: `warn`
- Category: `cost`
- Source: [missing-timeout.js](../src/rules/missing-timeout.js)
- Rationale: Jobs without `timeout-minutes` can run for the GitHub default of 360 minutes if a command hangs, draining CI budget.
- Suggested fix: Set `timeout-minutes` on each normal job, tuned below the six-hour default.

Bad example:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

Good example:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - run: npm test
```

## `deprecated-action`

- Severity: `error`
- Category: `maintenance`
- Source: [deprecated-action.js](../src/rules/deprecated-action.js)
- Rationale: Deprecated major versions of official actions eventually stop receiving updates or can fail when GitHub retires old runtimes.
- Suggested fix: Upgrade official actions to the current stable major shown in the finding.

Bad example:

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-node@v3
  - run: npm ci
```

Good example:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  - run: npm ci
```

## `expensive-runner`

- Severity: `warn`
- Category: `cost`
- Source: [expensive-runner.js](../src/rules/expensive-runner.js)
- Rationale: macOS and Windows hosted runners cost more than Ubuntu. If a job has no platform-specific commands, Linux usually gives the same signal for less money.
- Suggested fix: Use `ubuntu-latest` unless the job genuinely needs macOS or Windows tools.

Bad example:

```yaml
jobs:
  test:
    runs-on: macos-latest
    steps:
      - run: npm test
```

Good example:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

## `missing-permissions`

- Severity: `warn`
- Category: `security`
- Source: [missing-permissions.js](../src/rules/missing-permissions.js)
- Rationale: Without explicit permissions, `GITHUB_TOKEN` inherits the repository default, which is often broader than the workflow needs.
- Suggested fix: Add least-privilege top-level or per-job `permissions`, starting with `contents: read` and adding scopes only when needed.

Bad example:

```yaml
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps: []
```

Good example:

```yaml
on: pull_request
permissions:
  contents: read
jobs:
  test: {}
```

## `artifact-no-retention`

- Severity: `info`
- Category: `cost`
- Source: [artifact-no-retention.js](../src/rules/artifact-no-retention.js)
- Rationale: Artifacts without `retention-days` stay for the repository default, often 90 days, increasing storage cost.
- Suggested fix: Set `retention-days` to a short window such as 7 to 14 days unless long-term retention is required.

Bad example:

```yaml
steps:
  - uses: actions/upload-artifact@v4
    with:
      name: reports
      path: reports/
```

Good example:

```yaml
steps:
  - uses: actions/upload-artifact@v4
    with:
      name: reports
      path: reports/
      retention-days: 7
```

## `fetch-depth-zero`

- Severity: `info`
- Category: `cost`
- Source: [fetch-depth-zero.js](../src/rules/fetch-depth-zero.js)
- Rationale: `fetch-depth: 0` downloads full history. Most CI jobs only need the current checkout and run faster with the default shallow fetch.
- Suggested fix: Remove `fetch-depth: 0` or set `fetch-depth: 1` unless a history-aware tool requires full history.

Bad example:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - run: npm test
```

Good example:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 1
  - run: npm test
```

## `matrix-overcommit`

- Severity: `warn`
- Category: `cost`
- Source: [matrix-overcommit.js](../src/rules/matrix-overcommit.js)
- Rationale: Large matrix cross-products multiply CI minutes quickly, especially when they include macOS or Windows axes.
- Suggested fix: Trim PR matrices, split expensive axes into nightly jobs, or use `include` to test only representative combinations.

Bad example:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [18, 20, 22]
```

Good example:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
    node: [20, 22]
# move full matrix to nightly
```

## `stale-cache-key`

- Severity: `warn`
- Category: `cost`
- Source: [stale-cache-key.js](../src/rules/stale-cache-key.js)
- Rationale: Cache keys without a lockfile hash never refresh when dependencies change, causing stale builds and unbounded cache churn.
- Suggested fix: Include `hashFiles()` over the relevant lockfile in the cache key.

Bad example:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-cache
    restore-keys: npm-
```

Good example:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-
```

## `fail-fast-true`

- Severity: `info`
- Category: `cost`
- Source: [fail-fast-true.js](../src/rules/fail-fast-true.js)
- Rationale: The default matrix `fail-fast: true` cancels sibling jobs after the first failure, hiding parallel failures while still billing already-started minutes.
- Suggested fix: Set `strategy.fail-fast: false` for matrices where seeing all failing combinations is worth the extra signal.

Bad example:

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
steps:
  - run: npm test
```

Good example:

```yaml
strategy:
  fail-fast: false
  matrix:
    node: [18, 20, 22]
steps: []
```

## `always-run-on-pr`

- Severity: `info`
- Category: `cost`
- Source: [always-run-on-pr.js](../src/rules/always-run-on-pr.js)
- Rationale: Heavy jobs such as Docker builds, E2E suites, Playwright, Cypress, or CodeQL should usually be gated when a PR does not touch relevant paths.
- Suggested fix: Gate heavy PR jobs with `paths`, `paths-ignore`, a label, or an `if:` condition tied to changed files.

Bad example:

```yaml
on: pull_request
jobs:
  e2e:
    steps:
      - uses: cypress-io/github-action@v6
```

Good example:

```yaml
on:
  pull_request:
    paths: ['web/**']
jobs:
  e2e: {}
```

## `docker-no-pin`

- Severity: `warn`
- Category: `security`
- Source: [docker-no-pin.js](../src/rules/docker-no-pin.js)
- Rationale: Floating Docker tags such as `latest`, `node`, or version-only tags can point to different images over time, breaking reproducibility.
- Suggested fix: Pin container, service, and `docker://` image references to immutable `@sha256:` digests.

Bad example:

```yaml
jobs:
  test:
    container: node:22
    services:
      db: postgres:latest
```

Good example:

```yaml
jobs:
  test:
    container: node@sha256:<digest>
    services:
      db:
        image: postgres@sha256:<digest>
```

## `service-no-healthcheck`

- Severity: `warn`
- Category: `cost`
- Source: [service-no-healthcheck.js](../src/rules/service-no-healthcheck.js)
- Rationale: Database and queue service containers can accept connections after the job starts. Missing health checks cause flaky connection-refused failures and reruns.
- Suggested fix: Add service `options` with a suitable `--health-cmd`, interval, timeout, and retry count.

Bad example:

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - 5432:5432
```

Good example:

```yaml
services:
  postgres:
    image: postgres@sha256:<digest>
    options: >-
      --health-cmd pg_isready --health-retries 5
```
