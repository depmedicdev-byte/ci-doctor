'use strict';

const { makeFinding } = require('../util');

module.exports = {
  id: 'missing-permissions',
  severity: 'warn',
  description: 'Without a top-level permissions block the GITHUB_TOKEN gets the repository default which is usually too permissive.',
  category: 'security',
  check(parsed) {
    const data = parsed.data;
    if (!data) return [];
    if (data.permissions !== undefined) return [];
    const jobsObj = data.jobs || {};
    const everyJobHasPerms = Object.values(jobsObj).every((j) => j && j.permissions !== undefined);
    if (everyJobHasPerms && Object.keys(jobsObj).length > 0) return [];
    return [
      makeFinding(
        module.exports,
        parsed,
        'No top-level permissions block. GITHUB_TOKEN inherits the repo default, often write-all. Set least-privilege explicitly.',
        ['name'],
        {
          suggestion: 'permissions:\n  contents: read   # add other scopes only as jobs need them.',
        }
      ),
    ];
  },
};
