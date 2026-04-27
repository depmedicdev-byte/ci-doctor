# ci-doctor

Audit GitHub Actions workflows for waste, cost, and security gaps. CLI and a
GitHub Action. Posts a comment on every PR with a table of findings and
fix-it suggestions.

```text
$ npx ci-doctor examples/bad-workflow

Found 7 finding(s)  [error 1  warn 4  info 2]

.github/workflows/ci.yml
  ERROR  7:15  deprecated-action
         actions/checkout@v3 is on a deprecated major. Latest stable: v4.
         | actions/checkout@v4
  WARN   8:15  missing-cache
         actions/setup-node has no cache option. Add 'with: cache: <ecosystem>' to skip dep re-downloads. Saves 30-90 seconds per run.
         | with:
         |   cache: npm   # or pip, gradle, maven, go, etc.
  WARN   2:5   missing-concurrency
         No top-level concurrency block. New pushes will not cancel in-flight runs of stale commits, doubling spend on rapid-push branches.
         | concurrency:
         |   group: ${{ github.workflow }}-${{ github.ref }}
         |   cancel-in-progress: true
  WARN   5:5   missing-timeout
         Job 'build' has no timeout-minutes. Default is 360 (6h). A hung job can drain your CI budget.
         | timeout-minutes: 15   # tune to your job; cap below the default 360.
  WARN   1:7   missing-permissions
         No top-level permissions block. GITHUB_TOKEN inherits the repo default, often write-all. Set least-privilege explicitly.
         | permissions:
         |   contents: read   # add other scopes only as jobs need them.
  INFO   2:5   wide-trigger
         on: push fires on every branch. Restrict to main or release branches unless you need every-branch runs.
  INFO   14:15 artifact-no-retention
         upload-artifact has no retention-days. CI artifacts pile up at the repo default (usually 90d). Set 7-14d unless you need long-term retention.
```

Above is real output from `examples/bad-workflow/`. Try it: `git clone https://github.com/depmedicdev-byte/ci-doctor && cd ci-doctor && npx ci-doctor examples/bad-workflow`.

## Why

`act` runs your workflow locally. `actionlint` checks syntax. Neither tells
you the workflow is burning money. ci-doctor focuses on the cost and security
defaults you actually control.

## Install

### CLI

```bash
npm install -g ci-doctor
# or one-shot
npx ci-doctor
```

Node 18+.

### GitHub Action

```yaml
name: ci-doctor
on:
  pull_request:
permissions:
  contents: read
  pull-requests: write
jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: depmedicdev-byte/ci-doctor@v0.1.0
        with:
          fail-on: error
          comment: 'true'
```

It runs against every workflow under `.github/workflows/`, posts a single
sticky comment on the PR, and updates that comment on subsequent runs.

## Use

```bash
ci-doctor                          # scan .github/workflows in cwd
ci-doctor path/to/repo             # scan another repo
ci-doctor --file ci.yml            # one file
ci-doctor --json                   # machine output for CI
ci-doctor --markdown               # PR-comment table
ci-doctor --severity=warn          # only warn + error
ci-doctor --only=missing-cache     # one rule
ci-doctor --disable=fetch-depth-zero
ci-doctor --rules                  # list rules
```

Exit codes: `0` no error-level findings, `1` one or more errors, `2` internal
error.

## Rules in v0.1.0

| Rule | Severity | Category |
| - | - | - |
| `deprecated-action` | error | maintenance |
| `pinned-action-sha` | warn | security |
| `missing-cache` | warn | cost |
| `missing-concurrency` | warn | cost |
| `missing-timeout` | warn | cost |
| `expensive-runner` | warn | cost |
| `missing-permissions` | warn | security |
| `matrix-overcommit` | warn | cost |
| `wide-trigger` | info | cost |
| `artifact-no-retention` | info | cost |
| `fetch-depth-zero` | info | cost |

`ci-doctor --rules` prints them with descriptions.

## Action inputs

| Input | Default | What it does |
| - | - | - |
| `directory` | `.` | Repo root. Action looks for `.github/workflows` under it. |
| `fail-on` | `error` | Threshold to fail the job: `error`, `warn`, `info`, `never`. |
| `comment` | `true` | Post a single sticky PR comment with the findings. |
| `only` | (empty) | Comma-separated rule ids to run exclusively. |
| `disable` | (empty) | Comma-separated rule ids to skip. |
| `github-token` | `${{ github.token }}` | Token used to post the PR comment. |

## Pro

A paid Pro tier is in development:

- Org-wide policy file: enforce a baseline across every repo.
- Cost projection: estimate $ saved per finding using your runner mix.
- Audit history page on GitHub Pages.
- Private-repo support via license key.

License via Polar:
[$9/month](https://buy.polar.sh/polar_cl_SUzmX5RCQCV8MJV3dDEBFMu3MGWu2WQhzZ1s02ZhK09)
or [$39/year](https://buy.polar.sh/polar_cl_JVgKDJuOyHONZmW2GlP8oBoIIME2ZDCxlfP5c3ZA1ZN).
Free CLI and Action stay free, MIT.

## Companion

- [`depmedic`](https://github.com/depmedicdev-byte/depmedic) - surgical npm
  vulnerability triage from the same author.

## Honesty

Built with AI assistance. Every change reviewed. Open an issue if anything
breaks.

## License

MIT.
