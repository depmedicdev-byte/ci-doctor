'use strict';

const { jobs, makeFinding } = require('../util');

module.exports = {
  id: 'service-no-healthcheck',
  severity: 'warn',
  description: "Service containers (postgres, mysql, redis, mongo, kafka...) without an --health-cmd cause flaky 'connection refused' failures and burn re-run minutes.",
  category: 'cost',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      const services = job.services || {};
      for (const [svcName, svc] of Object.entries(services)) {
        if (!svc) continue;
        const opts = (typeof svc === 'object' && svc.options) ? String(svc.options) : '';
        if (opts.includes('--health-cmd') || opts.includes('--health-')) continue;
        const image = (typeof svc === 'object' ? svc.image : svc) || '';
        const base = String(image).split(':')[0].split('/').pop().toLowerCase();
        const KNOWN = ['postgres', 'mysql', 'mariadb', 'redis', 'mongo', 'mongodb', 'rabbitmq', 'kafka', 'elasticsearch', 'opensearch', 'minio', 'memcached'];
        if (!KNOWN.some((k) => base.startsWith(k))) continue;
        findings.push(
          makeFinding(
            module.exports,
            parsed,
            `Service '${svcName}' (${base}) in job '${jobId}' has no healthcheck. Test steps will start before the service is ready and fail intermittently, costing re-run minutes.`,
            ['jobs', jobId, 'services', svcName],
            {
              suggestion: `options: >-\n  --health-cmd "pg_isready -U postgres"\n  --health-interval 5s\n  --health-timeout 5s\n  --health-retries 5`,
              costImpact: 'medium',
            }
          )
        );
      }
    }
    return findings;
  },
};
