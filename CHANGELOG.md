# Changelog

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
