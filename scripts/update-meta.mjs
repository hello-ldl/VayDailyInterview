#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const metaPath = path.resolve(process.cwd(), 'public/questions/meta.json');

async function loadMeta() {
  const raw = await fs.readFile(metaPath, 'utf8');
  return JSON.parse(raw);
}

function extractDateFromPath(p) {
  return path.basename(p, '.json');
}

async function main() {
  const meta = await loadMeta();
  if (!Array.isArray(meta.chunks)) {
    console.error('meta.json missing chunks array');
    process.exit(1);
  }

  // Sort chunks by date (YYYY-MM-DD) descending => latest first
  meta.chunks.sort((a, b) => {
    const da = extractDateFromPath(a.path);
    const db = extractDateFromPath(b.path);
    return db.localeCompare(da);
  });

  // Recompute cumulativeStart and totals
  let cumulative = 0;
  for (const c of meta.chunks) {
    c.cumulativeStart = cumulative;
    cumulative += Number(c.count || 0);
  }

  meta.latestDate = meta.chunks.length ? extractDateFromPath(meta.chunks[0].path) : meta.latestDate;
  meta.chunkCount = meta.chunks.length;
  meta.totalQuestions = cumulative;

  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  console.log('Updated', metaPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
