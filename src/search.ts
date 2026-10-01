import { embed } from './embedder';
import { fetchCandidates, bookText, type Book } from './openLibrary';
import { rerank, type Ranked } from './rank';

// Book vectors are cached by Open Library key, so repeated books are never embedded twice.
const vectorCache = new Map<string, number[]>();
const BATCH = 16;

export async function findBooks(query: string, onProgress: (done: number, total: number) => void): Promise<Ranked[]> {
  const { books } = await fetchCandidates(query);
  if (!books.length) return [];

  let queryVec: number[];
  try {
    [queryVec] = await embed([query]);
  } catch {
    // AI model unavailable: still show real books in the library's own order.
    return books.sort((a, b) => a.olRank - b.olRank).map((book) => ({ book, score: -1 }));
  }
  const todo: Book[] = books.filter((b) => !vectorCache.has(b.key));
  onProgress(books.length - todo.length, books.length);
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const vecs = await embed(batch.map(bookText));
    batch.forEach((b, j) => vectorCache.set(b.key, vecs[j]));
    onProgress(books.length - todo.length + i + batch.length, books.length);
  }
  return rerank(books, queryVec, books.map((b) => vectorCache.get(b.key)!));
}
