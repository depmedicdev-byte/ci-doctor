'use strict';

const { summarize } = require('../index');

function renderJson(findings) {
  return JSON.stringify(
    { generatedAt: new Date().toISOString(), summary: summarize(findings), findings },
    null,
    2
  );
}

module.exports = { renderJson };
