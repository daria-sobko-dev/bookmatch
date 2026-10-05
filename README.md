# 📚 BookMatch — find real books by meaning

Describe the book you want in your own words, like *"a cozy mystery set in Japan"* or *"a sad story about friendship and growing up"*. BookMatch pulls **real books from the Open Library API** and re-ranks them with an **AI embedding model that runs in your browser**. No API key, no server costs, no rate-limited LLM.

**Live demo:** https://bookmatch-tau.vercel.app/

## How it works: retrieve, then re-rank

This is the same two-stage pattern used in production search and RAG systems.

1. **Retrieve (Open Library API)** — the request is turned into keywords, and several searches run in parallel: all keywords together plus a `subject:` search for each keyword. This gives a wide pool of ~50–130 real candidate books with titles, authors, subjects and first sentences.
2. **Embed (in the browser)** — `all-MiniLM-L6-v2` (quantized, ~23 MB) runs with [Transformers.js](https://huggingface.co/docs/transformers.js) inside a **Web Worker**. It turns the request and every candidate book into a 384-dimensional vector.
3. **Re-rank** — books are sorted by **cosine similarity** to the request, so results match the *meaning* (mood, setting, audience), not just shared words.
4. **Product details** — results are de-duplicated by title, labelled *Great / Good match*, open a detail view with the full description (Open Library Works API), and can be saved to a reading list (localStorage). Book vectors are cached by key and embedded in batches with a progress bar.

Reliability: Open Library requests go through a same-origin proxy (`/ol`, Vite proxy locally, Vercel rewrite in production), failed sub-searches are skipped, and if the model can't load the app still shows Open Library results.

```
src/openLibrary.ts  candidate retrieval from the Open Library Search API
src/worker.ts       embedding model in a Web Worker (Transformers.js)
src/embedder.ts     promise-based wrapper around the worker
src/rank.ts         cosine similarity re-ranking
src/search.ts       pipeline: retrieve, embed in batches with cache, re-rank
src/BookModal.tsx   detail view with description
src/App.tsx         UI: hero search, results grid, reading list
vercel.json         rewrite /ol/* → openlibrary.org
```

## Run locally

```bash
npm install
npm run dev     # http://localhost:5173
```

Deploy: import the repo in Vercel. No environment variables needed.

## Next steps

- Fetch work descriptions for the top 20 results to re-rank on richer text
- Multilingual model so you can search in Ukrainian or Spanish
- Small labelled test set to measure ranking quality (Hit@k, MRR) against Open Library's order

Data from [Open Library](https://openlibrary.org), an Internet Archive project.
