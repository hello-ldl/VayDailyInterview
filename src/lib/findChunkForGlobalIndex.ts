import type { ChunkDescriptor } from '../types/question'

export function findChunkIndexForGlobalIndex(
  chunks: readonly ChunkDescriptor[],
  globalIndex: number,
): number {
  let lo = 0
  let hi = chunks.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const c = chunks[mid]
    const start = c.cumulativeStart
    const end = start + c.count - 1
    if (globalIndex < start) hi = mid - 1
    else if (globalIndex > end) lo = mid + 1
    else return mid
  }
  return -1
}
