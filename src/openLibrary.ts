// Candidate retrieval from the Open Library Search API (free, no key, CORS enabled).
// Docs: https://openlibrary.org/dev/docs/api/search

export interface Book {
  key: string;            // e.g. "/works/OL45804W"
  title: string;
  authors: string[];
  year?: number;
  subjects: string[];
  firstSentence?: string;
  coverId?: number;
  olRank: number;         // position in Open Library's own results
}

const FIELDS = 'key,title,author_name,first_publish_year,subject,first_sentence,cover_i';
const STOP = new Set(('a an the and or of to for in on at is are i my me we you your with be by it this that from as do not can but ' +
  'want need looking book books novel novels read something like about some any story stories set where who which').split(' '));

export function keywords(query: string): string[] {
  return (query.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));
}

async function search(q: string, limit: number): Promise<any[]> {
  // Requests go through /ol, proxied to openlibrary.org by Vite (dev) and Vercel rewrites (prod), so there are no CORS issues.
  const url = `/ol/search.json?q=${encodeURIComponent(q)}&fields=${FIELDS}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library error ${res.status}`);
  const data = await res.json();
  return data.docs ?? [];
}

// Several broad searches (all keywords + subject searches per keyword) give a wide candidate pool.
// Semantic re-ranking then picks what actually matches the request.
export async function fetchCandidates(query: string): Promise<{ books: Book[]; searches: string[] }> {
  const kw = keywords(query);
  const searches = [kw.join(' '), ...kw.slice(0, 3).map((k) => `subject:${k}`)].filter(Boolean);
  const results = await Promise.allSettled(searches.map((q, i) => search(q, i === 0 ? 30 : 20)));
  const seen = new Map<string, Book>();
  let rank = 0;
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const d of r.value) {
      rank++;
      if (!d.key || !d.title || seen.has(d.key)) continue;
      seen.set(d.key, {
        key: d.key,
        title: d.title,
        authors: d.author_name ?? [],
        year: d.first_publish_year,
        subjects: (d.subject ?? []).slice(0, 25),
        firstSentence: Array.isArray(d.first_sentence) ? d.first_sentence[0] : d.first_sentence,
        coverId: d.cover_i,
        olRank: rank,
      });
    }
  }
  if (results.every((r) => r.status === 'rejected')) throw new Error('Could not reach Open Library. Check your connection.');
  return { books: [...seen.values()], searches };
}

export const bookText = (b: Book) =>
  `${b.title}${b.authors.length ? ` by ${b.authors.slice(0, 2).join(', ')}` : ''}. Subjects: ${b.subjects.slice(0, 15).join(', ')}.${b.firstSentence ? ` ${b.firstSentence}` : ''}`;

export const coverUrl = (id?: number) => (id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null);

// Loads the full description of one work for the detail view.
export async function fetchDescription(key: string): Promise<string | null> {
  try {
    const res = await fetch(`/ol${key}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.description;
    const text = typeof d === 'string' ? d : d?.value;
    return text ? text.split(/\n-{3,}|\(\[source\]/)[0].trim() : null;
  } catch {
    return null;
  }
}

export const coverLarge = (id?: number) => (id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null);
