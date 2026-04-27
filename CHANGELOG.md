# Changelog

## 0.4.1 - 2026-04-27

- Fix: `ci-doctor path/to/single.yml` now audits the single file instead
  of crashing with `ENOTDIR`. Found while dogfooding 0.4.0 against my
  own repos. Directory invocation behavior is unchanged.

## 0.4.0 - 2026-04-27

- New rule: `stale-cache-key` (warn). Flags `actions/cache` steps whose
  `key` doesn't include `hashFiles()` over a lockfile (or `github.sha` /
  `github.run_id`). A static cache key never invalidates - it either
  serves stale deps or grows unbounded.
- New rule: `fail-fast-true` (info). Flags matrix jobs that don't
  explicitly set `strategy.fail-fast: false`. Default `fail-fast: true`
  cancels every sibling cell on the first failure - you still pay for
  the cancelled minutes and only see one failure per run.
- New rule: `always-run-on-pr` (info). Flags heavy steps (docker build
  +push, cypress, playwright, codeql) that run on every PR with no
  paths filter, no `if:` condition, and no label gate. They run whether
  or not the PR touched anything that matters to them.
- Total rule count: 14 (was 11). Same fast scan, three more cost smells.

## 0.3.3 - 2026-04-27

- README cross-links to the in-browser budget tool at
  https://depmedicdev-byte.github.io/budget.html for users who want a
  dollar number alongside the audit findings.

## 0.3.2 - 2026-04-27

- Companion in-browser audit page at
  https://depmedicdev-byte.github.io/audit.html. Same rule engine bundled
  for the browser. Useful for sharing a finding without telling someone
  to `npx`. README updated to point at it.

## 0.3.1 - 2026-04-27

- Text reporter ends with a contextual next-step block: counts cost-class
  findings, points to `--fix` and `gha-budget`, and surfaces the cookbook
  link. Most users see the text reporter; previously it had no
  actionable footer.

## 0.3.0 - 2026-04-27

- New: `--sarif` output. Emits SARIF 2.1.0, ready for upload to GitHub
  Code Scanning via `github/codeql-action/upload-sarif@v3`. Findings
  show up as PR annotations and in the repo Security tab.
  - Severity mapping: `error` -> `error`, `warn` -> `warning`,
    `info` -> `note` (the three levels GitHub renders).
  - Driver advertises every rule with descriptions and default level so
    Code Scanning can show rule names in the UI.
  - File paths are normalised to forward slashes for cross-platform
    consumers.

## 0.2.0 - 2026-04-27

- New: `--fix` mode. ci-doctor stops being read-only.
  - Auto-applies safe, deterministic fixes to your workflows in place.
  - Currently fixes: `missing-permissions`, `missing-concurrency`,
    `missing-timeout`, `artifact-no-retention`.
  - Preserves comments and surrounding formatting (uses
    `yaml.parseDocument`).
  - `--fix --dry-run` prints the patched workflow to stdout instead of
    writing.
  - `--only=rule-id` restricts which fixes run, same as the audit flag.
  - Findings ci-doctor cannot safely auto-fix (cache ecosystem,
    deprecated action major bumps, SHA pinning, cost decisions) keep
    their warning so a human can decide. SHA pinning is delegated to
    [`pin-actions`](https://www.npmjs.com/package/pin-actions).

## 0.1.4 - 2026-04-27

- `pinned-action-sha` rule now points to the new
  [`pin-actions`](https://www.npmjs.com/package/pin-actions) free CLI in
  the suggestion. ci-doctor flags the issue; pin-actions does the
  pinning. Both MIT, both run in <2 sec.

## 0.1.3 - 2026-04-27

- README ships an animated terminal demo (svg) so the GitHub page shows
  the tool running live, not a static code block.
- Markdown reporter footer now also points to the new
  [`gha-budget`](https://www.npmjs.com/package/gha-budget) free CLI for
  putting a dollar figure on each job. ci-doctor finds the issues,
  gha-budget tells you what each one costs.

## 0.1.2 - 2026-04-27

- Add `--demo` flag. Runs ci-doctor against the bundled
  `examples/bad-workflow/` so users can see the tool work in 5 seconds
  without writing a workflow first.
- `examples/` now ships in the npm tarball so `--demo` works after
  `npm install -g ci-doctor`.
- Markdown reporter footer mentions the optional [GHA cost
  cookbook](https://buy.polar.sh/polar_cl_E2HGFeAVxJ64gU0Tv0qGwAueuxvhuq6A0pjhE4BWTyD)
  for the deeper pattern set. The free CLI continues to ship every rule
  and stays MIT.

## 0.1.1 - 2026-04-27

- Add `examples/bad-workflow/` so the README demo is runnable from a clone.
- README demo block now shows real ci-doctor output (7 findings) from
  `examples/bad-workflow/`, instead of an abridged 4-finding sample.
- No engine or rule changes. Pure docs and example.

## 0.1.0 - 2026-04-27

Initial release.

- 11 rules covering cost, security, and maintenance defaults.
- CLI with `--json`, `--markdown`, `--severity`, `--only`, `--disable`,
  `--rules`.
- GitHub Action with sticky PR comment and configurable `fail-on`.
- MIT licensed.
