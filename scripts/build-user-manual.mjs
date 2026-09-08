import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const outputDirectory = resolve(args.get('--output') ?? 'dist/user-manual');
const commit = args.get('--commit') ?? process.env.GITHUB_SHA ?? 'local-development';
const run = args.get('--run') ?? process.env.GITHUB_RUN_ID ?? 'local-development';
const release = process.argv.includes('--release');
const htmlOnly = process.argv.includes('--html-only');
const manifest = JSON.parse(readFileSync('docs/story-evidence.json', 'utf8'));
const source = readFileSync('docs/USER_MANUAL.md', 'utf8');

if (release) {
  const incomplete = manifest.stories.filter((story) => story.status !== 'verified');
  if (incomplete.length > 0) {
    throw new Error(
      `Release manual blocked: unverified stories: ${incomplete.map((story) => story.id).join(', ')}`,
    );
  }
}

const missingScreenshots = manifest.stories
  .filter((story) => story.status === 'verified')
  .flatMap((story) => story.criteria)
  .flatMap((criterion) => criterion.screenshots)
  .filter((screenshot) => !existsSync(screenshot));
if (missingScreenshots.length > 0) {
  throw new Error(
    `Manual references missing verified screenshots: ${missingScreenshots.join(', ')}`,
  );
}

const version = release ? `MVP ${commit.slice(0, 7)}` : 'Development preview';
const renderedSource = source
  .replace('| Version             | Development', `| Version             | ${version}`)
  .replace(
    '| Git commit          | Populated by the release evidence workflow',
    `| Git commit          | \`${commit}\``,
  )
  .replace(
    '| GitHub Actions run  | Populated by the release evidence workflow',
    `| GitHub Actions run  | \`${run}\``,
  );

mkdirSync(outputDirectory, { recursive: true });
const temporarySource = resolve(outputDirectory, '.USER_MANUAL.rendered.md');
const htmlOutput = resolve(outputDirectory, 'invite-mvp-user-manual.html');
const pdfOutput = resolve(outputDirectory, 'invite-mvp-user-manual.pdf');
writeFileSync(temporarySource, renderedSource);

try {
  execFileSync('pandoc', [
    temporarySource,
    '--standalone',
    '--embed-resources',
    '--toc',
    '--metadata',
    'title=Invite MVP user manual',
    '--css',
    resolve('docs/user-manual.css'),
    '--output',
    htmlOutput,
  ]);
  if (!htmlOnly) {
    execFileSync(
      'wkhtmltopdf',
      ['--enable-local-file-access', '--outline', htmlOutput, pdfOutput],
      {
        stdio: 'inherit',
      },
    );
  }
} finally {
  rmSync(temporarySource, { force: true });
}

console.log(`Generated ${htmlOutput}`);
if (!htmlOnly) console.log(`Generated ${pdfOutput}`);
