import { useCallback, useEffect, useRef, useState } from 'react';
import { embed } from './embedder';
import { coverUrl, type Book } from './openLibrary';
import { matchLabel, type Ranked } from './rank';
import { findBooks } from './search';
import { useReadingList } from './useReadingList';
import { BookModal } from './BookModal';

const PROMPTS = [
  { emoji: '🍵', text: 'a cozy mystery set in Japan' },
  { emoji: '🚀', text: 'space adventure with funny robots' },
  { emoji: '🐉', text: 'magic school with dragons' },
  { emoji: '💔', text: 'a sad story about friendship and growing up' },
  { emoji: '🏛️', text: 'history of the Roman Empire for beginners' },
  { emoji: '🌊', text: 'survival at sea, based on a true story' },
];

type Phase = 'idle' | 'searching' | 'reading' | 'done' | 'empty' | 'error';

export default function App() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Ranked[]>([]);
  const [visible, setVisible] = useState(12);
  const [selected, setSelected] = useState<Book | null>(null);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState('');
  const reading = useReadingList();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Warm up the model in the background so the first search is faster.
  useEffect(() => { embed(['warm up']).catch(() => {}); }, []);

  async function run(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setPhase('searching');
    setResults([]);
    setVisible(12);
    setShowList(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    try {
      const ranked = await findBooks(q, (done, total) => { setPhase('reading'); setProgress({ done, total }); });
      setResults(ranked);
      setPhase(ranked.length ? 'done' : 'empty');
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }

  const close = useCallback(() => setSelected(null), []);
  const busy = phase === 'searching' || phase === 'reading';
  const list = showList ? reading.list.map((book) => ({ book, score: -1 })) : results.slice(0, visible);

  return (
    <>
      <nav className="nav">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); setPhase('idle'); setShowList(false); setQuery(''); }}>📚 BookMatch</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <button className="pill" onClick={() => setShowList((s) => !s)}>♥ Reading list{reading.list.length ? ` · ${reading.list.length}` : ''}</button>
        </div>
      </nav>

      <header className="hero">
        <h1>Find your next book<br /><em>by vibe</em>, not by keywords.</h1>
        <p>Describe the story you're in the mood for. We'll search millions of real books and bring you the ones that fit.</p>
        <form className="search" onSubmit={(e) => { e.preventDefault(); run(query); }}>
          <span className="search-icon">✦</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="a slow, cozy fantasy about a tea shop…" aria-label="Describe a book" />
          <button className="btn primary" disabled={busy || !query.trim()}>{busy ? 'Searching…' : 'Find books'}</button>
        </form>
        <div className="prompts">
          {PROMPTS.map((p) => (
            <button key={p.text} onClick={() => run(p.text)} disabled={busy}><span>{p.emoji}</span>{p.text}</button>
          ))}
        </div>
      </header>

      <main ref={resultsRef} className="results">
        {showList && (
          <div className="results-head">
            <h2>Your reading list</h2>
            {reading.list.length === 0 && <p className="muted">Nothing saved yet. Tap the heart on any book to keep it here.</p>}
          </div>
        )}

        {!showList && busy && (
          <>
            <div className="results-head">
              <h2>{phase === 'searching' ? 'Looking through the library…' : `Reading ${progress.total} books to find your match…`}</h2>
              <div className="progress"><span style={{ width: phase === 'searching' ? '15%' : `${15 + (progress.done / Math.max(progress.total, 1)) * 85}%` }} /></div>
            </div>
            <div className="grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card skeleton"><div className="cover" /><div className="line" /><div className="line short" /></div>)}</div>
          </>
        )}

        {!showList && phase === 'done' && (
          <div className="results-head">
            <h2>Books for “{query}”</h2>
            <p className="muted">Picked from {results.length} real books, sorted by how well they match.</p>
          </div>
        )}
        {!showList && phase === 'empty' && <div className="results-head"><h2>No books found</h2><p className="muted">Try describing it differently, in English, with a genre or a setting.</p></div>}
        {!showList && phase === 'error' && <div className="results-head"><h2>Something went wrong</h2><p className="muted">{error} Please try again.</p></div>}

        {(showList || phase === 'done') && (
          <div className="grid">
            {list.map((r) => (
              <BookCard key={r.book.key} r={r} saved={reading.has(r.book)} onSave={() => reading.toggle(r.book)} onOpen={() => setSelected(r.book)} />
            ))}
          </div>
        )}
        {!showList && phase === 'done' && visible < results.length && (
          <div className="more"><button className="btn ghost" onClick={() => setVisible((v) => v + 12)}>Show more books</button></div>
        )}
      </main>

      <section id="how" className="how">
        <h2>How it works</h2>
        <div className="steps">
          <div><b>1. Search</b><p>Your description is turned into keywords and several searches run across the Open Library catalog to collect around a hundred candidates.</p></div>
          <div><b>2. Understand</b><p>A compact AI language model reads every candidate's title, subjects and first lines and converts them into meaning vectors.</p></div>
          <div><b>3. Match</b><p>Books are ranked by how close their meaning is to your request, so mood and setting count, not just shared words.</p></div>
        </div>
        <p className="muted small">The AI runs privately on your device: your searches are not sent to any AI service.</p>
      </section>

      <footer className="footer">
        <span>Book data and covers from <a href="https://openlibrary.org" target="_blank" rel="noreferrer">Open Library</a>, a project of the Internet Archive.</span>
        <span>Made by <a href="https://dariadev.cv.ua" target="_blank" rel="noreferrer">Daria Sobko</a> · <a href="https://github.com/daria-sobko-dev/bookmatch" target="_blank" rel="noreferrer">GitHub</a></span>
      </footer>

      {selected && <BookModal book={selected} saved={reading.has(selected)} onToggle={() => reading.toggle(selected)} onClose={close} />}
    </>
  );
}

function BookCard({ r, saved, onSave, onOpen }: { r: Ranked; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const b = r.book;
  const cover = coverUrl(b.coverId);
  const label = r.score >= 0 ? matchLabel(r.score) : null;
  return (
    <article className="card" onClick={onOpen}>
      <div className="cover">
        {cover ? <img src={cover} alt={b.title} loading="lazy" /> : <div className="placeholder"><span>{b.title}</span></div>}
        <button className={`heart ${saved ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onSave(); }} aria-label={saved ? 'Remove from reading list' : 'Save to reading list'}>{saved ? '♥' : '♡'}</button>
        {label && <span className={`badge ${label.level}`}>{label.text}</span>}
      </div>
      <h3>{b.title}</h3>
      <p className="muted">{b.authors[0] ?? 'Unknown author'}{b.year ? ` · ${b.year}` : ''}</p>
    </article>
  );
}
