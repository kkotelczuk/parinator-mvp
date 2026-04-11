#!/usr/bin/env node
/**
 * Parses `.ai/prd.md` user stories (### US-xxx blocks) and syncs them to GitHub Issues
 * via `gh`, optionally attaching each issue to a GitHub Project v2.
 *
 * Prerequisites: `gh auth login` with `repo` and (for projects) `project` scope.
 *
 * Usage:
 *   node .github/scripts/sync-user-stories.mjs --dry-run
 *   node .github/scripts/sync-user-stories.mjs
 *   GITHUB_PROJECT_NUMBER=3 node .github/scripts/sync-user-stories.mjs
 *
 * Env:
 *   GITHUB_REPOSITORY   owner/name (default: from `gh repo view` or git remote)
 *   GITHUB_PROJECT_NUMBER  optional; if set, runs `gh project item-add` for each issue URL
 *   PROJECT_OWNER       optional; default: repo owner (for `gh project item-add`)
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PRD_PATH = join(ROOT, '.ai', 'prd.md');

function parsePrd(md) {
  // Match only `### US-nnn` headings (not `### 1.1` or `### 7.3`).
  // Note: JavaScript has no `\Z` end-anchor; `\Z` would match a literal "Z" and break titles like "Zarządzanie…".
  const headerRe = /^### (US-\d+)\s*$/gm;
  const matches = [...md.matchAll(headerRe)];
  const stories = [];
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i][1];
    const bodyStart = matches[i].index + matches[i][0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const block = md.slice(bodyStart, bodyEnd);
    const titleM = block.match(/^[\s\r\n]*- Tytuł: (.+)$/m);
    const descM = block.match(/^[\s\r\n]*- Opis: (.+)$/m);
    const parts = block.split(/(?:^|\n)- Kryteria akceptacji:\s*\r?\n/);
    const critRaw = parts[1];
    if (!critRaw || !titleM || !descM) continue;
    const criteria = critRaw
      .split('\n')
      .filter((line) => line.startsWith('  - '))
      .map((line) => line.replace(/^  - /, ''));
    if (criteria.length === 0) continue;
    stories.push({
      id,
      title: titleM[1].trim(),
      description: descM[1].trim(),
      criteria,
    });
  }
  return stories;
}

function gh(args, { quiet = false } = {}) {
  try {
    const out = execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: quiet ? 'pipe' : ['inherit', 'pipe', 'pipe'],
    });
    return (out || '').trim();
  } catch (e) {
    e.stderr?.toString && process.stderr.write(e.stderr.toString());
    throw e;
  }
}

function detectRepo() {
  const env = process.env.GITHUB_REPOSITORY;
  if (env && /^\S+\/\S+$/.test(env)) return env;
  try {
    return gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
      quiet: true,
    });
  } catch {
    /* fall through */
  }
  try {
    const url = execFileSync('git', ['-C', ROOT, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim();
    const ssh = url.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (ssh) return `${ssh[1]}/${ssh[2]}`;
  } catch {
    /* ignore */
  }
  throw new Error(
    'Set GITHUB_REPOSITORY=owner/name or run inside a repo with `gh repo view` working.',
  );
}

function ensureLabel(repo, name, color, description) {
  try {
    gh(['label', 'create', name, '--repo', repo, '--color', color, '--description', description], {
      quiet: true,
    });
  } catch {
    /* exists */
  }
}

function issueTitle(story) {
  return `[${story.id}] ${story.title}`;
}

function issueBody(story, repo) {
  const prdUrl = `https://github.com/${repo}/blob/HEAD/.ai/prd.md`;
  const crit = story.criteria.map((c) => `- ${c}`).join('\n');
  return [
    `**${story.id}** — Źródło PRD: [\`.ai/prd.md\`](${prdUrl})`,
    '',
    '## Opis',
    '',
    story.description,
    '',
    '## Kryteria akceptacji',
    '',
    crit,
    '',
  ].join('\n');
}

function findIssueNumber(repo, storyId) {
  const q = `repo:${repo} is:issue in:title "[${storyId}]"`;
  const json = gh(['issue', 'list', '--repo', repo, '--search', q, '--json', 'number,title', '--limit', '30'], {
    quiet: true,
  });
  const rows = JSON.parse(json || '[]');
  const prefix = `[${storyId}]`;
  const hit = rows.find((r) => String(r.title).startsWith(prefix));
  return hit?.number ?? null;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const md = readFileSync(PRD_PATH, 'utf8');
  const stories = parsePrd(md);
  if (stories.length === 0) {
    console.error('No user stories parsed from', PRD_PATH);
    process.exit(1);
  }
  console.error(`Parsed ${stories.length} user stories from PRD.`);

  if (dryRun) {
    for (const s of stories) {
      console.log(issueTitle(s));
    }
    process.exit(0);
  }

  let repo;
  try {
    repo = detectRepo();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  ensureLabel(repo, 'user-story', '5319E7', 'PRD user story');
  ensureLabel(repo, 'mvp', '0E8A16', 'MVP scope (US-001–US-032)');
  ensureLabel(repo, 'post-mvp', 'B60205', 'Extended scope / §7 stories (US-033+)');

  const projectNo = process.env.GITHUB_PROJECT_NUMBER;
  const projectOwner = process.env.PROJECT_OWNER || repo.split('/')[0];

  const tmp = mkdtempSync(join(tmpdir(), 'gh-issue-'));
  try {
    for (const story of stories) {
      const bodyPath = join(tmp, `${story.id}.md`);
      writeFileSync(bodyPath, issueBody(story, repo), 'utf8');
      const title = issueTitle(story);
      const tierLabel = parseInt(story.id.replace('US-', ''), 10) >= 33 ? 'post-mvp' : 'mvp';
      const labelArgs = ['--add-label', 'user-story', '--add-label', tierLabel];

      const existing = findIssueNumber(repo, story.id);
      let url;
      if (existing != null) {
        gh([
          'issue',
          'edit',
          String(existing),
          '--repo',
          repo,
          '--title',
          title,
          '--body-file',
          bodyPath,
          ...labelArgs,
        ]);
        url = gh(['issue', 'view', String(existing), '--repo', repo, '--json', 'url', '-q', '.url'], {
          quiet: true,
        });
        console.error(`Updated ${story.id} -> #${existing}`);
      } else {
        url = gh([
          'issue',
          'create',
          '--repo',
          repo,
          '--title',
          title,
          '--body-file',
          bodyPath,
          '--label',
          `user-story,${tierLabel}`,
        ]);
        console.error(`Created ${story.id} -> ${url.trim()}`);
      }

      if (projectNo && url) {
        try {
          gh(['project', 'item-add', projectNo, '--owner', projectOwner, '--url', url.trim()]);
          console.error(`  Added to project ${projectOwner}#${projectNo}`);
        } catch (e) {
          console.error(`  (project add failed; check PROJECT_OWNER and project scope)`);
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();
