import ollama
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime
from concurrent.futures import Future, as_completed
import uuid

from shared_executor import executor


class EmbeddingPipeline:
    def __init__(self, embedding_model: str, chunk_size: int = 512, chunk_overlap: int = 50):
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str, doc_id: str, source: str, category: str = "document") -> List[Dict]:
        chunks = []
        start = 0
        chunk_num = 0

        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunk_text = text[start:end]

            if chunk_text.strip():
                chunks.append({
                    'text': chunk_text,
                    'chunk_id': f"{doc_id}_chunk_{chunk_num}",
                    'doc_id': doc_id,
                    'source': source,
                    'category': category,
                    'created_at': datetime.utcnow().isoformat()
                })
                chunk_num += 1

            start += self.chunk_size - self.chunk_overlap

        print(f"Created {len(chunks)} chunks from {source} (category={category})")
        return chunks

    def embed_async(self, text: str) -> Future:
        """
        Submit a single embedding call to the shared executor and return a
        Future.  Callers can submit many of these before calling .result(),
        allowing all chunks to embed concurrently alongside LLM / OCR calls.
        """
        model = self.embedding_model

        def _call():
            try:
                response = ollama.embeddings(model=model, prompt=text)
                return response.get("embedding") or [0.0] * 768
            except Exception as e:
                print(f"Error generating embedding: {e}")
                return [0.0] * 768

        return executor.submit(_call)

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Embed all chunks in parallel: submit every chunk at once to the
        shared executor, then collect results in order.
        """
        if not texts:
            return np.array([], dtype=np.float32)

        # Submit all futures first (non-blocking)
        futures = [self.embed_async(text) for text in texts]

        # Collect in original order
        embeddings = []
        for fut in futures:
            embeddings.append(fut.result())

        return np.array(embeddings, dtype=np.float32)

    def process_document_async(self, text: str, source: str, category: str = "document") -> Tuple[List[Dict], List[Future]]:
        """
        Chunk the text and immediately submit all embedding calls to the
        shared executor.  Returns (chunks, futures) so the caller can do
        other work (e.g. run the LLM) while embeddings are in-flight.

        Call collect_embeddings(futures) when you need the numpy array.
        """
        doc_id = str(uuid.uuid4())
        chunks = self.chunk_text(text, doc_id, source, category=category)

        if not chunks:
            return [], []

        futures = [self.embed_async(chunk['text']) for chunk in chunks]
        return chunks, futures

    @staticmethod
    def collect_embeddings(futures: List[Future]) -> np.ndarray:
        """Resolve a list of embed futures (in order) into a numpy array."""
        if not futures:
            return np.array([], dtype=np.float32)
        return np.array([f.result() for f in futures], dtype=np.float32)

    def process_document(self, text: str, source: str, category: str = "document") -> Tuple[List[Dict], np.ndarray]:
        """Blocking convenience wrapper — used by callers that don't need parallelism."""
        chunks, futures = self.process_document_async(text, source, category=category)
        embeddings = self.collect_embeddings(futures)
        return chunks, embeddings
