import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'docs/story-evidence.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const storiesDocument = readFileSync('docs/USER_STORIES.md', 'utf8');
const manual = readFileSync('docs/USER_MANUAL.md', 'utf8');
const errors = [];
const seen = new Set();

for (const story of manifest.stories) {
  if (!/^US-\d{2}$/.test(story.id)) errors.push(`${story.id}: invalid story ID`);
  if (seen.has(story.id)) errors.push(`${story.id}: duplicate story ID`);
  seen.add(story.id);

  if (!storiesDocument.includes(`| ${story.id} |`)) {
    errors.push(`${story.id}: missing from docs/USER_STORIES.md`);
  }
  if (!manual.toLowerCase().includes(story.id.toLowerCase())) {
    errors.push(`${story.id}: missing from docs/USER_MANUAL.md`);
  }

  for (const path of [...story.implementation, ...story.tests]) {
    if (!existsSync(path)) errors.push(`${story.id}: referenced file does not exist: ${path}`);
  }

  if (story.status === 'verified') {
    if (story.tests.length === 0) errors.push(`${story.id}: verified story has no automated tests`);
    if (!story.e2e || !existsSync(story.e2e))
      errors.push(`${story.id}: verified story has no E2E flow`);
    if (!existsSync(story.evidence))
      errors.push(`${story.id}: verified story has no evidence directory`);
  }
}

const expected = Array.from(
  { length: 13 },
  (_, index) => `US-${String(index + 1).padStart(2, '0')}`,
);
for (const id of expected) {
  if (!seen.has(id)) errors.push(`${id}: missing from evidence manifest`);
}

if (errors.length > 0) {
  console.error('MVP evidence validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const counts = manifest.stories.reduce((result, story) => {
  result[story.status] = (result[story.status] ?? 0) + 1;
  return result;
}, {});

console.log(`Validated ${manifest.stories.length} user stories: ${JSON.stringify(counts)}`);
