#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { compare } from './similarity.js';

const __filename = fileURLToPath(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, threshold: 0.7 };
  for (const a of args) {
    if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--threshold=')) opts.threshold = Number(a.split('=')[1]) || opts.threshold;
    else if (a === '--help' || a === '-h') {
      console.log('用法: node scripts/dedupe-questions.mjs [--dry-run] [--threshold=0.7]');
      process.exit(0);
    }
  }
  return opts;
}

const CHUNKS_DIR = path.resolve(process.cwd(), 'public', 'questions', 'chunks');
const META_FILE = path.resolve(process.cwd(), 'public', 'questions', 'meta.json');

async function readChunks() {
  const files = await fs.readdir(CHUNKS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const chunks = [];
  for (const f of jsonFiles) {
    const full = path.join(CHUNKS_DIR, f);
    const txt = await fs.readFile(full, 'utf8');
    let obj;
    try {
      obj = JSON.parse(txt);
    } catch (e) {
      console.error('解析 JSON 失败:', full, e.message);
      throw e;
    }
    const date = path.basename(f, '.json');
    chunks.push({ path: f, fullPath: full, date, data: obj });
  }
  return chunks;
}

function flattenQuestions(chunks) {
  const flat = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const ch = chunks[ci];
    const qs = Array.isArray(ch.data.questions) ? ch.data.questions : [];
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi];
      flat.push({
        id: q.id,
        title: q.title || '',
        date: q.date || ch.date,
        chunkIndex: ci,
        questionIndex: qi,
      });
    }
  }
  return flat;
}

function isoDateLess(a, b) {
  return a < b;
}

async function updateMetaFromChunks(chunks) {
  // sort chunks by date desc (latest first)
  const sorted = [...chunks].sort((a, b) => (a.date < b.date ? 1 : -1));
  let cumulative = 0;
  const chunksMeta = [];
  for (const ch of sorted) {
    const count = Array.isArray(ch.data.questions) ? ch.data.questions.length : 0;
    chunksMeta.push({ path: `chunks/${ch.path}`, count, cumulativeStart: cumulative });
    cumulative += count;
  }
  const meta = {
    version: 1,
    chunkSize: sorted.length ? (sorted[0].data.questions ? sorted[0].data.questions.length : 0) : 5,
    totalQuestions: cumulative,
    chunkCount: chunksMeta.length,
    latestDate: sorted.length ? sorted[0].date : null,
    chunks: chunksMeta,
  };
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

async function run() {
  const opts = parseArgs();
  console.log('去重脚本开始', opts);
  const chunks = await readChunks();
  const flat = flattenQuestions(chunks);

  const toDelete = new Set(); // store flat indices

  // build index mapping from flat index to object
  // note: flat entries have stable order
  for (let i = 0; i < flat.length; i++) {
    if (toDelete.has(i)) continue;
    for (let j = i + 1; j < flat.length; j++) {
      if (toDelete.has(j)) continue;
      const qi = flat[i];
      const qj = flat[j];
      if (qi.date === qj.date) continue; // only compare across dates
      const sim = compare(qi.title || '', qj.title || '').cosine;
      if (sim >= opts.threshold) {
        // delete the one with smaller date
        if (isoDateLess(qi.date, qj.date)) {
          toDelete.add(i);
        } else if (isoDateLess(qj.date, qi.date)) {
          toDelete.add(j);
        }
      }
    }
  }

  // organize deletions per chunk
  const deletionsByChunk = new Map();
  for (const idx of toDelete) {
    const e = flat[idx];
    const arr = deletionsByChunk.get(e.chunkIndex) || [];
    arr.push(e.id);
    deletionsByChunk.set(e.chunkIndex, arr);
  }

  if (toDelete.size === 0) {
    console.log('未发现重复题目（按当前阈值）');
    return;
  }

  console.log(`发现 ${toDelete.size} 道重复题目，按 chunk 汇总：`);
  for (const [ci, ids] of deletionsByChunk.entries()) {
    console.log(`- ${chunks[ci].path}: 删除 ${ids.length} 道`);
  }

  if (opts.dryRun) {
    console.log('Dry-run 模式，未实际修改文件。');
    return;
  }

  // backup original files
  const backupDir = path.resolve(process.cwd(), 'public', 'questions', `chunks-backup-${Date.now()}`);
  await fs.mkdir(backupDir, { recursive: true });
  for (const ch of chunks) {
    await fs.copyFile(ch.fullPath, path.join(backupDir, ch.path));
  }
  console.log('已创建备份：', backupDir);

  // apply deletions
  for (const [ci, ids] of deletionsByChunk.entries()) {
    const ch = chunks[ci];
    ch.data.questions = (ch.data.questions || []).filter((q) => !ids.includes(q.id));
    await fs.writeFile(ch.fullPath, JSON.stringify(ch.data, null, 2), 'utf8');
    console.log(`已写回 ${ch.path}（删除 ${ids.length} 道）`);
  }

  // update meta
  await updateMetaFromChunks(chunks);
  console.log('已更新 meta.json');
  console.log('去重完成');
}

if (process.argv[1] === __filename) {
  run().catch((e) => {
    console.error('脚本出错:', e);
    process.exit(1);
  });
}

export { run };
