'use strict';

const YAML = require('yaml');
const { parseWorkflow } = require('./parse');

// What --fix can apply automatically. Each entry returns true if it
// changed the YAML doc. Order matters: top-level adds happen before
// per-job adds so the final shape is predictable.
//
// We deliberately do NOT auto-fix things where the safe default is
// arguable (cache ecosystem detection, action major-version bumps,
// SHA pinning - that lives in pin-actions). Those keep a "warn"
// finding so a human can review.

const FIX_IDS = ['missing-permissions', 'missing-concurrency', 'missing-timeout', 'artifact-no-retention'];

function buildPair(doc, key, value) {
  const v = doc.createNode(value);
  // Make Maps block-style so the rendered YAML matches surrounding code.
  if (v && v.items) v.flow = false;
  return doc.createPair(key, v);
}

function applyFixes(source, filename, options = {}) {
  const enabledSet = new Set(options.enabled || FIX_IDS);
  const parsed = parseWorkflow(source, filename);
  if (parsed.errors.length) return { changed: false, content: source, applied: [], errors: parsed.errors };

  const doc = parsed.doc;
  const data = parsed.data;
  const applied = [];

  // 1. missing-permissions: add `permissions: { contents: read }`.
  if (enabledSet.has('missing-permissions') && data.permissions === undefined) {
    doc.contents.add(buildPair(doc, 'permissions', { contents: 'read' }));
    applied.push({ ruleId: 'missing-permissions', filename });
  }

  // 2. missing-concurrency: add a standard cancel-in-progress block.
  if (enabledSet.has('missing-concurrency') && data.concurrency === undefined) {
    doc.contents.add(
      buildPair(doc, 'concurrency', {
        group: '${{ github.workflow }}-${{ github.ref }}',
        'cancel-in-progress': true,
      })
    );
    applied.push({ ruleId: 'missing-concurrency', filename });
  }

  // 3. missing-timeout: per job, add `timeout-minutes: 15` if absent.
  if (enabledSet.has('missing-timeout')) {
    const jobsNode = doc.get('jobs');
    if (jobsNode && jobsNode.items) {
      for (const pair of jobsNode.items) {
        if (!pair.value || !pair.value.items) continue;
        const jobId = pair.key && pair.key.value;
        const jobData = (data.jobs || {})[jobId];
        if (!jobData) continue;
        if (jobData.uses) continue; // reusable workflow job has its own timeout semantics
        if (jobData['timeout-minutes'] !== undefined) continue;
        pair.value.add(doc.createPair('timeout-minutes', 15));
        applied.push({ ruleId: 'missing-timeout', filename, jobId });
      }
    }
  }

  // 4. artifact-no-retention: add `retention-days: 7` to upload-artifact `with:`.
  if (enabledSet.has('artifact-no-retention')) {
    const jobsNode = doc.get('jobs');
    if (jobsNode && jobsNode.items) {
      for (const jobPair of jobsNode.items) {
        if (!jobPair.value || !jobPair.value.items) continue;
        const stepsPair = jobPair.value.items.find((p) => p.key && p.key.value === 'steps');
        if (!stepsPair || !stepsPair.value || !Array.isArray(stepsPair.value.items)) continue;
        for (const stepNode of stepsPair.value.items) {
          if (!stepNode || !stepNode.items) continue;
          const usesPair = stepNode.items.find((p) => p.key && p.key.value === 'uses');
          if (!usesPair || !usesPair.value) continue;
          const usesValue = String(usesPair.value.value || '');
          if (!/^actions\/upload-artifact@/.test(usesValue)) continue;
          let withPair = stepNode.items.find((p) => p.key && p.key.value === 'with');
          if (!withPair) {
            stepNode.add(buildPair(doc, 'with', { 'retention-days': 7 }));
            applied.push({ ruleId: 'artifact-no-retention', filename, action: usesValue });
            continue;
          }
          if (!withPair.value || !withPair.value.items) continue;
          const has = withPair.value.items.some((p) => p.key && p.key.value === 'retention-days');
          if (has) continue;
          withPair.value.add(doc.createPair('retention-days', 7));
          applied.push({ ruleId: 'artifact-no-retention', filename, action: usesValue });
        }
      }
    }
  }

  if (applied.length === 0) return { changed: false, content: source, applied: [], errors: [] };
  const out = doc.toString();
  return { changed: out !== source, content: out, applied, errors: [] };
}

module.exports = { applyFixes, FIX_IDS };
