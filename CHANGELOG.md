# Changelog

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
