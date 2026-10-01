import { useEffect, useState } from 'react';
import type { Book } from './openLibrary';

const KEY = 'bookmatch-reading-list';

function load(): Book[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function useReadingList() {
  const [list, setList] = useState<Book[]>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } }, [list]);
  const has = (b: Book) => list.some((x) => x.key === b.key);
  const toggle = (b: Book) => setList((l) => (l.some((x) => x.key === b.key) ? l.filter((x) => x.key !== b.key) : [b, ...l]));
  return { list, has, toggle };
}
