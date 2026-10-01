// Promise-based wrapper around the embedding Web Worker.
type Listener = (loaded: number, total: number) => void;

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();
let nextId = 0;
let onProgress: Listener | null = null;

worker.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'progress') return onProgress?.(msg.loaded, msg.total);
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  msg.type === 'result' ? p.resolve(msg.vectors) : p.reject(new Error(msg.message));
};

export function setProgressListener(fn: Listener) { onProgress = fn; }

export function embed(texts: string[]): Promise<number[][]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, texts });
  });
}
