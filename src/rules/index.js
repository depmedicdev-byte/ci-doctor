'use strict';

module.exports = [
  require('./pinned-action-sha'),
  require('./missing-cache'),
  require('./missing-concurrency'),
  require('./wide-trigger'),
  require('./missing-timeout'),
  require('./deprecated-action'),
  require('./expensive-runner'),
  require('./missing-permissions'),
  require('./artifact-no-retention'),
  require('./fetch-depth-zero'),
  require('./matrix-overcommit'),
  require('./stale-cache-key'),
  require('./fail-fast-true'),
  require('./always-run-on-pr'),
  require('./docker-no-pin'),
  require('./service-no-healthcheck'),
];
