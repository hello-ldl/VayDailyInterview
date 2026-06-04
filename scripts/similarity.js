#!/usr/bin/env node
// 比较两个字符串相似度的小脚本
// 支持：Levenshtein 相似度、Jaccard（基于词集）和 Cosine（基于词频）

import { fileURLToPath } from 'url';

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\p{P}$+<=>^`|~]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(s) {
  return normalize(s).split(' ').filter(Boolean);
}

// Levenshtein distance
function levenshtein(a, b) {
  a = a || '';
  b = b || '';
  const la = a.length,
    lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[la][lb];
}

function levenshteinSimilarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// Jaccard on word sets
function jaccardSimilarity(a, b) {
  const sa = new Set(words(a));
  const sb = new Set(words(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 1 : inter / union;
}

// Cosine similarity on word frequency vectors
function cosineSimilarity(a, b) {
  const wa = words(a);
  const wb = words(b);
  const freqA = {};
  const freqB = {};
  wa.forEach((w) => (freqA[w] = (freqA[w] || 0) + 1));
  wb.forEach((w) => (freqB[w] = (freqB[w] || 0) + 1));
  const allKeys = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0,
    na = 0,
    nb = 0;
  for (const k of allKeys) {
    const va = freqA[k] || 0;
    const vb = freqB[k] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function compare(a, b) {
  return {
    levenshtein: Number(levenshteinSimilarity(a, b).toFixed(4)),
    jaccard: Number(jaccardSimilarity(a, b).toFixed(4)),
    cosine: Number(cosineSimilarity(a, b).toFixed(4)),
  };
}

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const [, , a, b] = process.argv;
  if (!a || !b) {
    console.log('用法: node scripts/similarity.js "字符串A" "字符串B"');
    console.log('示例: node scripts/similarity.js "你好，世界" "你好 世界！"');
    process.exit(1);
  }
  const res = compare(a, b);
  console.log('比较结果：');
  console.log(JSON.stringify(res, null, 2));
}

export { compare, levenshtein, levenshteinSimilarity, jaccardSimilarity, cosineSimilarity };
