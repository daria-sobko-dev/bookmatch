// Runs the embedding model in a Web Worker so the UI stays responsive.
// The model (~23 MB) is downloaded once from Hugging Face and cached by the browser.
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const MODEL = 'Xenova/all-MiniLM-L6-v2';
// Typed loosely on purpose: the library's pipeline() union type is too complex for TypeScript.
let extractor: Promise<any> | null = null;

function getExtractor() {
  extractor ??= (pipeline as any)('feature-extraction', MODEL, {
    dtype: 'q8',
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.total) self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total, file: p.file });
    },
  });
  return extractor;
}

self.onmessage = async (e: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = e.data;
  try {
    const model = await getExtractor();
    const output = await model(texts, { pooling: 'mean', normalize: true });
    self.postMessage({ type: 'result', id, vectors: output.tolist() as number[][] });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: (err as Error).message });
  }
};
