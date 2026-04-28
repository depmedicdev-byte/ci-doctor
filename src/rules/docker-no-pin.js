'use strict';

const { jobs, stepsOf, makeFinding } = require('../util');

const BAD_TAGS = /:(latest|main|master|edge|stable|nightly|alpine|ubuntu|debian|node|python|jdk\d*|jre\d*|\d+\.\d+|\d+|\d{1,2})$/i;

function isUnpinnedImageRef(ref) {
  if (typeof ref !== 'string') return false;
  if (ref.includes('@sha256:')) return false;
  if (!ref.includes(':')) return true;
  return BAD_TAGS.test(ref);
}

module.exports = {
  id: 'docker-no-pin',
  severity: 'warn',
  description: 'container/image and services use floating Docker tags (e.g. :latest, :node, :22). Pin to a digest (image@sha256:...) for reproducible builds.',
  category: 'security',
  check(parsed) {
    const findings = [];
    for (const { id: jobId, job } of jobs(parsed)) {
      const container = job.container;
      if (container) {
        const ref = typeof container === 'string' ? container : container.image;
        if (isUnpinnedImageRef(ref)) {
          findings.push(
            makeFinding(
              module.exports,
              parsed,
              `Job '${jobId}' container '${ref}' is not pinned to a digest. A silent registry update can change the build reproducibly.`,
              ['jobs', jobId, 'container'],
              { suggestion: `image: ${(ref || '').split(':')[0]}@sha256:<digest>`, costImpact: 'low' }
            )
          );
        }
      }
      const services = job.services || {};
      for (const [svcName, svc] of Object.entries(services)) {
        if (!svc) continue;
        const ref = typeof svc === 'string' ? svc : svc.image;
        if (isUnpinnedImageRef(ref)) {
          findings.push(
            makeFinding(
              module.exports,
              parsed,
              `Service '${svcName}' image '${ref}' in job '${jobId}' is not pinned to a digest.`,
              ['jobs', jobId, 'services', svcName],
              { suggestion: `image: ${(ref || '').split(':')[0]}@sha256:<digest>`, costImpact: 'low' }
            )
          );
        }
      }
      stepsOf(job).forEach((step, i) => {
        if (!step || typeof step.uses !== 'string') return;
        if (!step.uses.startsWith('docker://')) return;
        const ref = step.uses.replace(/^docker:\/\//, '');
        if (isUnpinnedImageRef(ref)) {
          findings.push(
            makeFinding(
              module.exports,
              parsed,
              `Step uses unpinned Docker image '${ref}'. Container actions should pin to a digest.`,
              ['jobs', jobId, 'steps', i, 'uses'],
              { suggestion: `uses: docker://${(ref || '').split(':')[0]}@sha256:<digest>`, costImpact: 'low' }
            )
          );
        }
      });
    }
    return findings;
  },
};
