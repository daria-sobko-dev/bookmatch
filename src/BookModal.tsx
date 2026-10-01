import { useEffect, useState } from 'react';
import { coverLarge, fetchDescription, type Book } from './openLibrary';

interface Props { book: Book; saved: boolean; onToggle: () => void; onClose: () => void }

export function BookModal({ book, saved, onToggle, onClose }: Props) {
  const [description, setDescription] = useState<string | null | undefined>(undefined);
  const cover = coverLarge(book.coverId);

  useEffect(() => {
    let alive = true;
    fetchDescription(book.key).then((d) => alive && setDescription(d));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { alive = false; window.removeEventListener('keydown', onKey); };
  }, [book.key, onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={book.title}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-cover">{cover ? <img src={cover} alt={book.title} /> : <span>📖</span>}</div>
        <div className="modal-body">
          <h2>{book.title}</h2>
          <p className="muted">{book.authors.slice(0, 3).join(', ') || 'Unknown author'}{book.year ? ` · first published ${book.year}` : ''}</p>
          {description === undefined ? <div className="line-skeleton" /> : <p className="description">{description ?? book.firstSentence ?? 'No description yet.'}</p>}
          {book.subjects.length > 0 && <div className="tags">{book.subjects.slice(0, 10).map((s) => <span key={s}>{s}</span>)}</div>}
          <div className="actions">
            <button className={saved ? 'btn secondary' : 'btn primary'} onClick={onToggle}>{saved ? '✓ In your reading list' : '+ Add to reading list'}</button>
            <a className="btn ghost" href={`https://openlibrary.org${book.key}`} target="_blank" rel="noreferrer">Open on Open Library ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
