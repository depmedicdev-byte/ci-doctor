'use strict';

const path = require('node:path');
const core = require('@actions/core');
const github = require('@actions/github');
const { auditDirectory, summarize } = require('../src/index');
const { renderMarkdown } = require('../src/reporters/markdown');
const { renderJson } = require('../src/reporters/json');

async function run() {
  try {
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const inputDir = core.getInput('directory') || workspace;
    const failOn = (core.getInput('fail-on') || 'error').toLowerCase();
    const commentOnPR = (core.getInput('comment') || 'true').toLowerCase() !== 'false';
    const only = (core.getInput('only') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const disable = (core.getInput('disable') || '').split(',').map((s) => s.trim()).filter(Boolean);

    const findings = auditDirectory(path.resolve(inputDir), { only, disable });
    const s = summarize(findings);

    core.setOutput('error-count', String(s.error));
    core.setOutput('warn-count', String(s.warn));
    core.setOutput('info-count', String(s.info));
    core.setOutput('total', String(s.total));
    core.setOutput('findings-json', renderJson(findings));

    const md = renderMarkdown(findings);
    await core.summary.addRaw(md).write();

    const ctx = github.context;
    if (commentOnPR && ctx.payload && ctx.payload.pull_request) {
      const token = process.env.GITHUB_TOKEN || core.getInput('github-token');
      if (token) {
        const oct = github.getOctokit(token);
        const marker = '<!-- ci-doctor:pr-report -->';
        const body = `${marker}\n${md}`;
        const { owner, repo } = ctx.repo;
        const pr = ctx.payload.pull_request.number;
        const existing = await oct.rest.issues.listComments({ owner, repo, issue_number: pr, per_page: 100 });
        const prior = existing.data.find((c) => c.body && c.body.includes(marker));
        if (prior) {
          await oct.rest.issues.updateComment({ owner, repo, comment_id: prior.id, body });
        } else {
          await oct.rest.issues.createComment({ owner, repo, issue_number: pr, body });
        }
      }
    }

    if (failOn === 'error' && s.error > 0) core.setFailed(`${s.error} error finding(s)`);
    else if (failOn === 'warn' && (s.error + s.warn) > 0) core.setFailed(`${s.error + s.warn} error/warn finding(s)`);
    else if (failOn === 'info' && s.total > 0) core.setFailed(`${s.total} finding(s)`);
  } catch (err) {
    core.setFailed(err && err.stack ? err.stack : String(err));
  }
}

run();
