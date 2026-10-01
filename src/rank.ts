import type { Book } from './openLibrary';

export interface Ranked { book: Book; score: number }

// Vectors are L2-normalized by the model, so the dot product is cosine similarity.
export const cosine = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

export function rerank(books: Book[], queryVec: number[], bookVecs: number[][]): Ranked[] {
  const seenTitles = new Set<string>();
  return books
    // Small bonus for books with a cover: same relevance, nicer result.
    .map((book, i) => ({ book, score: cosine(queryVec, bookVecs[i]) + (book.coverId ? 0.02 : 0) }))
    .sort((a, b) => b.score - a.score)
    // Hide duplicate editions with the same title.
    .filter((r) => { const k = norm(r.book.title); if (seenTitles.has(k)) return false; seenTitles.add(k); return true; });
}

export function matchLabel(score: number): { text: string; level: 'great' | 'good' | 'fair' } {
  if (score >= 0.5) return { text: 'Great match', level: 'great' };
  if (score >= 0.38) return { text: 'Good match', level: 'good' };
  return { text: 'Worth a look', level: 'fair' };
}
