import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('docs/story-evidence.json', 'utf8'));
const storiesDocument = readFileSync('docs/USER_STORIES.md', 'utf8');
const manual = readFileSync('docs/USER_MANUAL.md', 'utf8');
const errors = [];
const seenStories = new Set();
const seenCriteria = new Set();
const seenScreenshots = new Set();
const allowedStatuses = new Set(['planned', 'partial', 'verified', 'waived']);
const allowedLayers = new Set(['unit', 'component', 'api', 'e2e']);

if (manifest.version !== 2) errors.push(`unsupported manifest version: ${manifest.version}`);

const documentedCriteria = new Set(
  [...storiesDocument.matchAll(/^#### (US-\d{2}-AC-\d{2})\b/gm)].map((match) => match[1]),
);
const slugifyHeading = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s/g, '-');
const manualAnchors = new Set(
  [...manual.matchAll(/^#{2,6}\s+(.+)$/gm)].map((match) => slugifyHeading(match[1])),
);
const validatePath = (id, path, label) => {
  if (!existsSync(path)) errors.push(`${id}: ${label} does not exist: ${path}`);
};

for (const story of manifest.stories) {
  if (!/^US-\d{2}$/.test(story.id)) errors.push(`${story.id}: invalid story ID`);
  if (seenStories.has(story.id)) errors.push(`${story.id}: duplicate story ID`);
  seenStories.add(story.id);
  if (!allowedStatuses.has(story.status))
    errors.push(`${story.id}: invalid status: ${story.status}`);

  if (!storiesDocument.includes(`| ${story.id} |`)) {
    errors.push(`${story.id}: missing from docs/USER_STORIES.md`);
  }
  if (!manualAnchors.has(story.manualAnchor)) {
    errors.push(`${story.id}: manual anchor does not exist: ${story.manualAnchor}`);
  }
  for (const path of story.implementation) validatePath(story.id, path, 'implementation reference');
  for (const path of story.tests) validatePath(story.id, path, 'test reference');

  if (!Array.isArray(story.criteria) || story.criteria.length === 0) {
    errors.push(`${story.id}: no acceptance criteria in evidence manifest`);
    continue;
  }

  for (const criterion of story.criteria) {
    if (!criterion.id.startsWith(`${story.id}-AC-`)) {
      errors.push(`${criterion.id}: criterion does not belong to ${story.id}`);
    }
    if (seenCriteria.has(criterion.id)) errors.push(`${criterion.id}: duplicate criterion ID`);
    seenCriteria.add(criterion.id);
    if (!documentedCriteria.has(criterion.id)) {
      errors.push(`${criterion.id}: missing from docs/USER_STORIES.md`);
    }
    if (!manualAnchors.has(criterion.manualAnchor)) {
      errors.push(`${criterion.id}: manual anchor does not exist: ${criterion.manualAnchor}`);
    }

    if (!Array.isArray(criterion.testLayers) || criterion.testLayers.length === 0) {
      errors.push(`${criterion.id}: no test layers declared`);
    }
    const layers = new Set(criterion.testLayers);
    for (const layer of layers) {
      if (!allowedLayers.has(layer)) errors.push(`${criterion.id}: invalid test layer: ${layer}`);
    }
    if (!layers.has('e2e')) errors.push(`${criterion.id}: Android E2E is not declared`);
    if (layers.size !== criterion.testLayers.length)
      errors.push(`${criterion.id}: duplicate test layer`);

    if (!Array.isArray(criterion.implementationRefs) || criterion.implementationRefs.length === 0) {
      errors.push(`${criterion.id}: no implementation references`);
    }
    for (const path of criterion.implementationRefs) {
      validatePath(criterion.id, path, 'implementation reference');
    }
    for (const path of criterion.testRefs) validatePath(criterion.id, path, 'test reference');

    if (!Array.isArray(criterion.screenshots) || criterion.screenshots.length === 0) {
      errors.push(`${criterion.id}: no screenshot checkpoints`);
    }
    for (const screenshot of criterion.screenshots) {
      if (!screenshot.startsWith(`${story.evidence}/`) || !screenshot.endsWith('.png')) {
        errors.push(`${criterion.id}: invalid screenshot path: ${screenshot}`);
      }
      if (seenScreenshots.has(screenshot))
        errors.push(`${criterion.id}: duplicate screenshot path`);
      seenScreenshots.add(screenshot);
    }
    if (criterion.e2eFlow) validatePath(criterion.id, criterion.e2eFlow, 'E2E flow');

    if (story.status === 'verified') {
      if (criterion.testRefs.length === 0) {
        errors.push(`${criterion.id}: verified criterion has no automated test reference`);
      }
      if (!criterion.e2eFlow) errors.push(`${criterion.id}: verified criterion has no E2E flow`);
      for (const screenshot of criterion.screenshots) {
        validatePath(criterion.id, screenshot, 'required screenshot');
      }
    }
  }

  if (story.status === 'verified') {
    if (story.tests.length === 0) errors.push(`${story.id}: verified story has no automated tests`);
    if (!story.e2e || !existsSync(story.e2e)) {
      errors.push(`${story.id}: verified story has no story-level E2E flow`);
    }
    if (!existsSync(story.evidence))
      errors.push(`${story.id}: verified story has no evidence directory`);
    const manualHeading = [...manual.matchAll(/^###\s+(.+)$/gm)].find((match) =>
      slugifyHeading(match[1]).startsWith(story.manualAnchor),
    );
    if (manualHeading) {
      const sectionStart = manualHeading.index;
      const sectionEnd = manual.indexOf('\n### ', sectionStart + 1);
      const section = manual.slice(sectionStart, sectionEnd < 0 ? undefined : sectionEnd);
      if (/\*\*Status:\*\* Evidence pending\./.test(section)) {
        errors.push(`${story.id}: verified story manual still says evidence pending`);
      }
    }
  }
}

const expectedStories = Array.from(
  { length: 13 },
  (_, index) => `US-${String(index + 1).padStart(2, '0')}`,
);
for (const id of expectedStories) {
  if (!seenStories.has(id)) errors.push(`${id}: missing from evidence manifest`);
}
for (const id of documentedCriteria) {
  if (!seenCriteria.has(id)) errors.push(`${id}: documented criterion is missing from manifest`);
}

const statusCounts = manifest.stories.reduce((result, story) => {
  result[story.status] = (result[story.status] ?? 0) + 1;
  return result;
}, {});
const criteria = manifest.stories.flatMap((story) => story.criteria);
const criteriaWithTests = criteria.filter((criterion) => criterion.testRefs.length > 0).length;
const criteriaWithE2E = criteria.filter((criterion) => criterion.e2eFlow).length;
const screenshotCount = criteria.reduce(
  (count, criterion) => count + criterion.screenshots.length,
  0,
);
const report = [
  '# MVP traceability report',
  '',
  `- Stories: ${manifest.stories.length}`,
  `- Acceptance criteria: ${criteria.length}`,
  `- Criteria with current automated-test references: ${criteriaWithTests}/${criteria.length}`,
  `- Criteria with current Android E2E flows: ${criteriaWithE2E}/${criteria.length}`,
  `- Required screenshot checkpoints: ${screenshotCount}`,
  `- Story status: ${Object.entries(statusCounts)
    .map(([status, count]) => `${status}=${count}`)
    .join(', ')}`,
  '',
  '| Story | Status | Criteria | Test refs | E2E flows | Screenshots |',
  '| --- | --- | ---: | ---: | ---: | ---: |',
  ...manifest.stories.map((story) => {
    const tests = story.criteria.filter((criterion) => criterion.testRefs.length > 0).length;
    const e2e = story.criteria.filter((criterion) => criterion.e2eFlow).length;
    const images = story.criteria.reduce(
      (count, criterion) => count + criterion.screenshots.length,
      0,
    );
    return `| ${story.id} | ${story.status} | ${story.criteria.length} | ${tests} | ${e2e} | ${images} |`;
  }),
  '',
].join('\n');

const reportIndex = process.argv.indexOf('--report');
if (reportIndex >= 0) {
  const reportPath = process.argv[reportIndex + 1];
  if (!reportPath) errors.push('--report requires a file path');
  else writeFileSync(reportPath, report);
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);

if (errors.length > 0) {
  console.error('MVP evidence validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${manifest.stories.length} stories, ${criteria.length} criteria, and ${screenshotCount} screenshot checkpoints.`,
);
console.log(`Story status: ${JSON.stringify(statusCounts)}`);
