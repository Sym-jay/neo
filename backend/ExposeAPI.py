import os
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
from LLMInference import LLMInference
from IngestAudio import AudioIngestor
from IngestDocs import DocumentIngestor
from VectorStore import VectorStore
import numpy as np
import ollama
import json
import os

import Database as db

app = FastAPI()

db.init_db()
audio_ingestor = AudioIngestor()

_vs_cache: dict = {}
_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_vector_store(session_id: Optional[int]) -> VectorStore:
    """Return (and cache) the VectorStore for *session_id*.

    Falls back to the legacy global store when session_id is None so that
    the legacy /api/audio/digest and /api/documents/ingest endpoints keep
    working unchanged.
    """
    key = session_id if session_id is not None else "global"
    if key not in _vs_cache:
        if session_id is None:
            idx  = os.path.join(_DATA_DIR, "faiss_index.bin")
            meta = os.path.join(_DATA_DIR, "metadata.json")
        else:
            idx  = os.path.join(_DATA_DIR, f"faiss_{session_id}.bin")
            meta = os.path.join(_DATA_DIR, f"faiss_{session_id}_meta.json")
        _vs_cache[key] = VectorStore(index_path=idx, metadata_path=meta)
    return _vs_cache[key]

def delete_vector_store(session_id: int) -> None:
    key = session_id
    _vs_cache.pop(key, None)
    for path in [
        os.path.join(_DATA_DIR, f"faiss_{session_id}.bin"),
        os.path.join(_DATA_DIR, f"faiss_{session_id}_meta.json"),
    ]:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inference = LLMInference()

SlotName = Literal["llm", "embed", "ocr", "asr"]

_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), ".registry.json")

class ModelRegistry:

    def __init__(self):
        # slot → model name (None = nothing loaded)
        self.slots: dict = {"llm": None, "embed": None, "ocr": None, "asr": None}
        self._restore()

    # ---- persistence -------------------------------------------------------

    def _save(self):
        try:
            with open(_REGISTRY_PATH, "w") as f:
                json.dump(self.slots, f)
        except Exception as e:
            print(f"[registry] could not save state: {e}")

    def _restore(self):
        """Re-read persisted slots and re-warm each model in Ollama."""
        if not os.path.exists(_REGISTRY_PATH):
            return
        try:
            with open(_REGISTRY_PATH) as f:
                saved = json.load(f)
        except Exception as e:
            print(f"[registry] could not load saved state: {e}")
            return

        for slot, model_name in saved.items():
            if not model_name:
                continue
            print(f"[registry] restoring {slot} → {model_name}")
            try:
                if slot == "asr":
                    self._mount_asr(model_name)
                else:
                    self._mount_ollama(slot, model_name)
                self.slots[slot] = model_name
            except Exception as e:
                print(f"[registry] restore {slot}/{model_name} failed: {e}")

    # ---- public API --------------------------------------------------------

    def status(self) -> dict:
        return {
            "llm":   self.slots["llm"],
            "embed": self.slots["embed"],
            "ocr":   self.slots["ocr"],
            "asr":   self.slots["asr"],
        }

    def mount(self, slot: str, model_name: str):
        """Load model_name into slot without touching other slots."""
        if slot == "asr":
            self._mount_asr(model_name)
        else:
            self._mount_ollama(slot, model_name)
        self.slots[slot] = model_name
        self._save()

    def unmount(self, slot: str):
        """Unload whatever is in slot."""
        model = self.slots.get(slot)
        if not model:
            return
        if slot == "asr":
            audio_ingestor.unload_model()
        else:
            try:
                if slot == "embed":
                    ollama.embeddings(model=model, prompt="", keep_alive=0)
                else:
                    ollama.generate(model=model, prompt="", keep_alive=0)
            except Exception as e:
                print(f"[registry] unmount {slot}/{model} error (non-fatal): {e}")
        self.slots[slot] = None
        self._save()

        if slot == "llm":
            inference.llm_name = None

    def _mount_ollama(self, slot: str, model_name: str):
        available = inference.get_available_models()
        if model_name not in available:
            print(f"[registry] pulling {model_name}…")
            ollama.pull(model_name)
        try:
            if slot == "embed":
                ollama.embeddings(model=model_name, prompt="warmup", keep_alive=-1)
            else:
                ollama.generate(model=model_name, prompt="", keep_alive=-1)
        except Exception as e:
            print(f"[registry] warm-up {slot}/{model_name} error (non-fatal): {e}")
        if slot == "llm":
            inference.llm_name = model_name

    def _mount_asr(self, model_name: str):
        audio_ingestor.load_model(model_name)


registry = ModelRegistry()

doc_ingestor = DocumentIngestor()

class LoadModelRequest(BaseModel):
    model_name: str

class QueryRequest(BaseModel):
    query: str
    max_tokens: int = 256
    temperature: float = 0.7

class QueryResponse(BaseModel):
    response: str

@app.get("/")
async def root():
    return {"message": "LLM Inference API is running"}


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"

class UpdateSessionRequest(BaseModel):
    title: str

@app.post("/api/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new chat session and return it."""
    try:
        session = db.create_session(title=request.title or "New Chat")
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions")
async def list_sessions():
    """Return all sessions ordered by most-recently-updated first."""
    try:
        sessions = db.list_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: int):
    """Return a single session by id."""
    try:
        session = db.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/sessions/{session_id}")
async def update_session(session_id: int, request: UpdateSessionRequest):
    """Rename a session."""
    try:
        ok = db.update_session_title(session_id, request.title)
        if not ok:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: int):
    """Delete a session and all its messages / uploaded files."""
    try:
        ok = db.delete_session(session_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Session not found")
        # Clean up the per-session FAISS index files and evict from cache
        delete_vector_store(session_id)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: int):
    """Return all messages for a session in chronological order."""
    try:
        messages = db.get_messages(session_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/files")
async def get_session_files(session_id: int):
    """Return all uploaded file records for a session."""
    try:
        files = db.get_uploaded_files(session_id)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def get_models():
    models = inference.get_available_models()
    categorized = inference.get_categorized_models()
    return {"models": models, "categorized_models": categorized, "current_model": inference.llm_name}

@app.get("/api/trending-models")
async def get_popular_models():
    import requests
    import re

    models = {
        "popular": []
    }

    try:
        response_popular = requests.get("https://ollama.com/library?sort=popular", timeout=5)
        matches_popular = re.findall(r'href="/library/([^/"]+)"', response_popular.text)
        seen_popular = set()
        for match in matches_popular:
            if match not in seen_popular and match != "library":
                seen_popular.add(match)
                models["popular"].append(match)
                if len(models["popular"]) >= 8:
                    break

        if len(models["popular"]) > 0:
            return models

    except Exception as e:
        print(f"Failed to fetch models from ollama.com: {e}")
        pass

    fallback = [
        "llama3.2", "mistral", "qwen2.5:0.5b", "gemma2", "phi3", "deepseek-coder-v2"
    ]
    return {"popular": fallback}

class DeleteModelRequest(BaseModel):
    model_name: str

@app.post("/api/models/delete")
async def delete_model(request: DeleteModelRequest):
    try:
        inference.delete_model(request.model_name)
        return {"status": "success", "message": f"Model {request.model_name} deleted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/models/load")
async def load_model(request: LoadModelRequest):
    from fastapi.responses import StreamingResponse
    import json
    import ollama

    available_models = inference.get_available_models()
    if request.model_name not in available_models:
        def pull_stream():
            try:
                for progress in ollama.pull(request.model_name, stream=True):
                    progress_dict = vars(progress) if hasattr(progress, '__dict__') else progress if isinstance(progress, dict) else dict(progress)
                    yield json.dumps(progress_dict) + "\n"

                inference.llm_name = request.model_name
                print(f"Model '{request.model_name}' ready.")
                yield json.dumps({"status": "success", "message": f"Model {request.model_name} loaded and ready."}) + "\n"
            except Exception as e:
                yield json.dumps({"status": "error", "message": str(e)}) + "\n"

        return StreamingResponse(pull_stream(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})
    else:
        try:
            inference.load_model(request.model_name)
            return {"status": "success", "message": f"Model {request.model_name} loaded and ready."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

@app.post("/api/models/unload")
async def unload_model():
    try:
        inference.unload_model()
        return {"status": "success", "message": "Model unloaded successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# Multi-model registry endpoints
# ---------------------------------------------------------------------------

@app.get("/api/models/status")
async def models_status():
    """Return the active model name for each of the 4 slots (None if empty)."""
    return registry.status()


class MountRequest(BaseModel):
    slot: str          # "llm" | "embed" | "ocr" | "asr"
    model_name: str


@app.post("/api/models/mount")
async def mount_model(request: MountRequest):
    """
    Load model_name into the named slot WITHOUT unloading any other slot.
    For Ollama slots (llm/embed/ocr) uses keep_alive=-1 so the model stays
    in memory indefinitely.  For the asr slot loads the Whisper model.

    Pulling a new Ollama model can take a long time so this endpoint streams
    NDJSON progress lines: {"status": "...", "completed": N, "total": N}
    finished by {"status": "success", "slot": "...", "model": "..."}.
    """
    from fastapi.responses import StreamingResponse
    import json

    slot = request.slot
    model_name = request.model_name

    if slot not in ("llm", "embed", "ocr", "asr"):
        return {"status": "error", "message": f"Unknown slot '{slot}'. Use llm, embed, ocr, or asr."}

    if slot == "asr":
        # Whisper: non-streaming, just load and respond
        try:
            registry.mount("asr", model_name)
            return {"status": "success", "slot": "asr", "model": model_name}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # Ollama slot — may need to pull first; stream progress
    def mount_stream():
        available = inference.get_available_models()
        if model_name not in available:
            try:
                for progress in ollama.pull(model_name, stream=True):
                    d = vars(progress) if hasattr(progress, '__dict__') else (
                        progress if isinstance(progress, dict) else dict(progress)
                    )
                    yield json.dumps(d) + "\n"
            except Exception as e:
                yield json.dumps({"status": "error", "message": str(e)}) + "\n"
                return

        # Warm into memory with keep_alive=-1
        # Embedding models only support ollama.embeddings(), not ollama.generate().
        try:
            if slot == "embed":
                ollama.embeddings(model=model_name, prompt="warmup", keep_alive=-1)
            else:
                ollama.generate(model=model_name, prompt="", keep_alive=-1)
        except Exception as e:
            yield json.dumps({"status": "error", "message": f"Warm-up failed: {e}"}) + "\n"
            return

        registry.slots[slot] = model_name
        if slot == "llm":
            inference.llm_name = model_name
        registry._save()  # persist so this survives a backend restart

        yield json.dumps({"status": "success", "slot": slot, "model": model_name}) + "\n"

    return StreamingResponse(mount_stream(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})


class UnmountRequest(BaseModel):
    slot: str   # "llm" | "embed" | "ocr" | "asr"


@app.post("/api/models/unmount")
async def unmount_model(request: UnmountRequest):
    """Unload the model in the named slot without affecting other slots."""
    if request.slot not in ("llm", "embed", "ocr", "asr"):
        return {"status": "error", "message": f"Unknown slot '{request.slot}'."}
    try:
        registry.unmount(request.slot)
        return {"status": "success", "slot": request.slot}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/generate", response_model=QueryResponse)
async def generate_response(request: QueryRequest):
    response_text = inference.generate(
        prompt=request.query,
        max_tokens=request.max_tokens,
        temperature=request.temperature
    )
    return {"response": response_text}


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[int] = None
    embedding_model: Optional[str] = None
    max_tokens: int = 1024
    temperature: float = 0.7

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Streaming chat endpoint.

    Flow:
      1. Take the last user message.
      2. If an embedding model is configured and the vector store has data,
         embed the query and prepend retrieved context to the system prompt.
      3. Stream the LLM response token-by-token as NDJSON lines:
           {"token": "..."} during generation
           {"done": true}   when finished
      4. Persist user message + full assistant response to Postgres (if session_id provided).
    """
    from fastapi.responses import StreamingResponse
    import json

    if inference.llm_name is None:
        return {"status": "error", "message": "No LLM model loaded. Please load a model first."}

    embedding_model = request.embedding_model or registry.slots.get("embed") or None

    history_lines = []
    user_query = ""

    for msg in request.messages:
        if msg.role == "user":
            if msg.content.startswith("[File:"):
                # File context — strip the [File: name] header line so the LLM
                # only sees the actual text content (the header triggers "I can't
                # access files" refusals in small models even with a system prompt).
                lines = msg.content.split("\n", 1)
                header = lines[0]   # e.g. "[File: audio.mp3]"
                body   = lines[1].strip() if len(lines) > 1 else ""
                # Extract the filename for labelling
                fname = header[len("[File: "):-1] if header.startswith("[File: ") and header.endswith("]") else header
                label = f"Contents of {fname}"
                history_lines.append(f"Document context ({label}):\n{body}" if body else f"Document context ({label}): (empty)")
            else:
                # Real user turn — previous ones go to history, last one is the query
                if user_query:
                    # push the previous real user turn into history
                    history_lines.append(f"User: {user_query}")
                user_query = msg.content
        elif msg.role == "assistant":
            history_lines.append(f"Assistant: {msg.content}")
        # system / context / other roles are skipped

    system_instruction = (
        "You are a helpful assistant. "
        "When the conversation contains 'Document context:' blocks, use that "
        "information to answer the user's question. "
        "Do not say you cannot access files — the file contents are already "
        "provided as text in the conversation.\n\n"
    )

    has_inline_file_context = any(
        msg.role == "user" and msg.content.startswith("[File:")
        for msg in request.messages
    )

    context_block = ""
    vs = get_vector_store(request.session_id)
    if embedding_model and vs.index.ntotal > 0 and not has_inline_file_context:
        try:
            from EmbedData import EmbeddingPipeline
            pipeline = EmbeddingPipeline(embedding_model=embedding_model)
            q_emb = pipeline.embed_async(user_query).result()
            import numpy as np
            hits = vs.search(np.array(q_emb, dtype=np.float32), k=5)
            hits = [h for h in hits if h.get("score", 0) >= 0.3]

            if hits:
                # Separate audio hits from other document hits
                audio_hits = [h for h in hits if h.get("category") == "audio"]
                other_hits = [h for h in hits if h.get("category") != "audio"]

                context_parts = []

                # For audio chunks: ask the LLM to summarise the retrieved
                # transcript excerpts in relation to the user's query.
                if audio_hits:
                    audio_sources = list(dict.fromkeys(h["source"] for h in audio_hits))
                    combined_transcript = "\n\n".join(h["text"] for h in audio_hits)
                    summary_prompt = (
                        f"The following are excerpts from the transcript of "
                        f"{', '.join(audio_sources)}.\n\n"
                        f"{combined_transcript}\n\n"
                        f"Based only on the above transcript excerpts, answer or summarise "
                        f"the following query in a clear, concise way:\n{user_query}"
                    )
                    audio_summary = inference.generate_async(prompt=summary_prompt).result()
                    context_parts.append(
                        f"Summary from audio transcript ({', '.join(audio_sources)}):\n{audio_summary}"
                    )

                # For non-audio chunks: inject the raw text as before
                if other_hits:
                    snippets = "\n\n".join(h["text"] for h in other_hits)
                    context_parts.append(f"Relevant context from your documents:\n{snippets}")

                context_block = "\n\n".join(context_parts) + "\n\n"

        except Exception as e:
            print(f"RAG retrieval failed (non-fatal): {e}")

    history_block = "\n".join(history_lines)
    if history_block:
        history_block = f"Conversation so far:\n{history_block}\n\n"

    full_prompt = (
        f"{system_instruction}"
        f"{context_block}"
        f"{history_block}"
        f"User: {user_query}\n"
        f"Assistant:"
    )

    model = inference.llm_name
    options = {"num_predict": request.max_tokens, "temperature": request.temperature}
    print(f"[chat] prompt ({len(full_prompt)} chars):\n{full_prompt[:500]}\n---")

    # Persist the user message before streaming
    session_id = request.session_id
    if session_id:
        try:
            db.add_message(session_id, "user", user_query)
        except Exception as e:
            print(f"[db] failed to persist user message: {e}")

    def stream_tokens():
        accumulated = ""
        try:
            for chunk in ollama.generate(model=model, prompt=full_prompt, options=options, stream=True):
                token = chunk.get("response", "") if isinstance(chunk, dict) else getattr(chunk, "response", "")
                if token:
                    accumulated += token
                    yield json.dumps({"token": token}) + "\n"
            yield json.dumps({"done": True}) + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"
        finally:
            # Persist the completed assistant reply
            if session_id and accumulated:
                try:
                    db.add_message(session_id, "assistant", accumulated)
                    # Auto-title the session from the first user message if it still has the default title
                    sess = db.get_session(session_id)
                    if sess and sess["title"] == "New Chat":
                        short_title = user_query[:60].strip()
                        if short_title:
                            db.update_session_title(session_id, short_title)
                except Exception as e:
                    print(f"[db] failed to persist assistant message: {e}")

    return StreamingResponse(stream_tokens(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff"}
TEXT_EXTENSIONS  = {".txt", ".md"}
PDF_EXTENSIONS   = {".pdf"}

@app.post("/api/files/ingest")
async def ingest_files(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = None,
    embedding_model: Optional[str] = None,
    asr_model: Optional[str] = None,
):
    """
    Unified file ingest endpoint. Accepts one or more files, detects type by
    extension, routes each to the correct pipeline, embeds into the vector
    store, and returns a result object per file.

    Response shape:
      { "results": [ { "filename", "category", "status", "detail", "chunks" }, ... ] }
    """
    import os, tempfile
    from EmbedData import EmbeddingPipeline

    # Fall back to whatever is mounted in the registry if client didn't send it.
    embedding_model = embedding_model or registry.slots.get("embed") or None
    asr_model       = asr_model       or registry.slots.get("asr")   or None
    print(f"[ingest] embedding_model={embedding_model} asr_model={asr_model}")

    # Parse session_id from form field (comes as string from FormData)
    sid: Optional[int] = None
    if session_id:
        try:
            sid = int(session_id)
        except (ValueError, TypeError):
            pass

    vs = get_vector_store(sid)
    vs._load()

    results = []

    for upload in files:
        filename = upload.filename or "unknown"
        ext = os.path.splitext(filename)[1].lower()
        file_bytes = await upload.read()
        file_size = len(file_bytes)

        # Persist to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            if ext in AUDIO_EXTENSIONS:
                if audio_ingestor.model is None:
                    # Try to load whatever model is available
                    available = audio_ingestor.get_downloaded_models()
                    if available:
                        audio_ingestor.load_model(available[0])
                    else:
                        result = {
                            "filename": filename,
                            "category": "audio",
                            "status": "error",
                            "detail": "No Whisper model loaded. Load one first.",
                            "chunks": 0,
                            "text": "",
                        }
                        results.append(result)
                        if sid:
                            try:
                                db.add_uploaded_file(sid, filename, "audio", "error", 0, result["detail"], file_size)
                            except Exception as dbe:
                                print(f"[db] file persist error: {dbe}")
                        continue

                transcribe_result = audio_ingestor.transcribe(tmp_path)
                text = str(transcribe_result.get("text", ""))

                chunks_created = 0
                summary = ""

                if text.strip() and embedding_model:
                    if vs.has_source(filename):
                        # File already embedded — skip re-ingestion
                        existing = sum(1 for m in vs.metadata if m.get("source") == filename)
                        result = {
                            "filename": filename,
                            "category": "audio",
                            "status": "duplicate",
                            "detail": f"Already ingested ({existing} chunk(s) in vector store). Delete and re-upload to replace.",
                            "chunks": existing,
                            "text": text[:8000],
                        }
                        results.append(result)
                        if sid:
                            try:
                                db.add_uploaded_file(sid, filename, "audio", "duplicate", existing, result["detail"][:500], file_size)
                            except Exception as dbe:
                                print(f"[db] file persist error: {dbe}")
                        continue

                    summary_prompt = f"Summarize this audio transcript in bullet points:\n{text}"
                    llm_future = inference.generate_async(prompt=summary_prompt)

                    pipeline = EmbeddingPipeline(embedding_model=embedding_model)
                    chunks, embed_futures = pipeline.process_document_async(text, filename, category="audio")

                    summary = llm_future.result()
                    if chunks:
                        embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)
                        vs.add_embeddings(embeddings, chunks)
                        chunks_created = len(chunks)

                result = {
                    "filename": filename,
                    "category": "audio",
                    "status": "success",
                    "detail": summary or text[:200],
                    "chunks": chunks_created,
                    "text": text[:8000],
                }
                results.append(result)
                if sid:
                    try:
                        db.add_uploaded_file(sid, filename, "audio", "success", chunks_created, result["detail"][:500], file_size)
                        # Persist the inline file-context message so it is restored on session reload
                        db.add_message(sid, "context", f"[File: {filename}]\n{text[:8000]}")
                    except Exception as dbe:
                        print(f"[db] file persist error: {dbe}")

            elif ext in IMAGE_EXTENSIONS:
                # ---- Image / OCR pipeline ----------------------------------
                active_ocr_model = registry.slots.get("ocr") or ""
                print(f"[ingest] OCR slot='{active_ocr_model}' for {filename}")
                ocr_future = doc_ingestor.ocr_async(tmp_path, ocr_model=active_ocr_model)
                text = ocr_future.result()
                print(f"[ingest] OCR result length={len(text)} for {filename}")

                chunks_created = 0

                if text.strip() and embedding_model:
                    if vs.has_source(filename):
                        existing = sum(1 for m in vs.metadata if m.get("source") == filename)
                        result = {
                            "filename": filename,
                            "category": "image",
                            "status": "duplicate",
                            "detail": f"Already ingested ({existing} chunk(s) in vector store). Delete and re-upload to replace.",
                            "chunks": existing,
                            "text": text[:8000],
                        }
                        results.append(result)
                        if sid:
                            try:
                                db.add_uploaded_file(sid, filename, "image", "duplicate", existing, result["detail"][:500], file_size)
                            except Exception as dbe:
                                print(f"[db] file persist error: {dbe}")
                        continue

                    pipeline = EmbeddingPipeline(embedding_model=embedding_model)
                    chunks, embed_futures = pipeline.process_document_async(text, filename)
                    if chunks:
                        embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)
                        vs.add_embeddings(embeddings, chunks)
                        chunks_created = len(chunks)

                ocr_status = "success" if text.strip() else "error"
                ocr_detail = (
                    text[:200] if text.strip()
                    else ("No OCR model mounted — mount a vision model in the OCR slot first"
                          if not active_ocr_model
                          else "OCR model returned no text")
                )
                result = {
                    "filename": filename,
                    "category": "image",
                    "status": ocr_status,
                    "detail": ocr_detail,
                    "chunks": chunks_created,
                    "text": text[:8000] if text.strip() else "",
                }
                results.append(result)
                if sid:
                    try:
                        db.add_uploaded_file(sid, filename, "image", ocr_status, chunks_created, ocr_detail[:500], file_size)
                        if ocr_status == "success" and text.strip():
                            db.add_message(sid, "context", f"[File: {filename}]\n{text[:8000]}")
                    except Exception as dbe:
                        print(f"[db] file persist error: {dbe}")

            elif ext in TEXT_EXTENSIONS:
                # ---- Text / Markdown pipeline ------------------------------
                with open(tmp_path, "r", errors="replace") as f:
                    text = f.read()

                chunks_created = 0

                if text.strip() and embedding_model:
                    if vs.has_source(filename):
                        existing = sum(1 for m in vs.metadata if m.get("source") == filename)
                        result = {
                            "filename": filename,
                            "category": "text",
                            "status": "duplicate",
                            "detail": f"Already ingested ({existing} chunk(s) in vector store). Delete and re-upload to replace.",
                            "chunks": existing,
                            "text": text[:8000],
                        }
                        results.append(result)
                        if sid:
                            try:
                                db.add_uploaded_file(sid, filename, "text", "duplicate", existing, result["detail"][:500], file_size)
                            except Exception as dbe:
                                print(f"[db] file persist error: {dbe}")
                        continue

                    pipeline = EmbeddingPipeline(embedding_model=embedding_model)
                    chunks, embed_futures = pipeline.process_document_async(text, filename)
                    if chunks:
                        embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)
                        vs.add_embeddings(embeddings, chunks)
                        chunks_created = len(chunks)

                txt_status = "success" if text.strip() else "error"
                txt_detail = text[:200] if text.strip() else "File is empty"
                result = {
                    "filename": filename,
                    "category": "text",
                    "status": txt_status,
                    "detail": txt_detail,
                    "chunks": chunks_created,
                    "text": text[:8000] if text.strip() else "",
                }
                results.append(result)
                if sid:
                    try:
                        db.add_uploaded_file(sid, filename, "text", txt_status, chunks_created, txt_detail[:500], file_size)
                        if txt_status == "success":
                            db.add_message(sid, "context", f"[File: {filename}]\n{text[:8000]}")
                    except Exception as dbe:
                        print(f"[db] file persist error: {dbe}")

            elif ext in PDF_EXTENSIONS:
                # ---- PDF pipeline ------------------------------------------
                import pdfplumber, tempfile
                from PIL import Image as PILImage

                pdf_texts = []
                active_ocr_model = registry.slots.get("ocr") or ""

                try:
                    with pdfplumber.open(tmp_path) as pdf:
                        for page in pdf.pages:
                            page_text = page.extract_text() or ""
                            if page_text.strip():
                                pdf_texts.append(page_text)
                            elif active_ocr_model:
                                try:
                                    pil_img = page.to_image(resolution=150).original
                                    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as ptmp:
                                        pil_img.save(ptmp.name, format="PNG")
                                        page_ocr = doc_ingestor.ocr_async(ptmp.name, ocr_model=active_ocr_model).result()
                                    os.unlink(ptmp.name)
                                    if page_ocr.strip():
                                        pdf_texts.append(page_ocr)
                                except Exception as pe:
                                    print(f"[PDF] page OCR failed: {pe}")
                except Exception as e:
                    result = {
                        "filename": filename,
                        "category": "pdf",
                        "status": "error",
                        "detail": f"Could not read PDF: {e}",
                        "chunks": 0,
                        "text": "",
                    }
                    results.append(result)
                    if sid:
                        try:
                            db.add_uploaded_file(sid, filename, "pdf", "error", 0, result["detail"][:500], file_size)
                        except Exception as dbe:
                            print(f"[db] file persist error: {dbe}")
                    continue

                text = "\n\n".join(pdf_texts)
                chunks_created = 0

                if text.strip() and embedding_model:
                    if vs.has_source(filename):
                        existing = sum(1 for m in vs.metadata if m.get("source") == filename)
                        result = {
                            "filename": filename,
                            "category": "pdf",
                            "status": "duplicate",
                            "detail": f"Already ingested ({existing} chunk(s) in vector store). Delete and re-upload to replace.",
                            "chunks": existing,
                            "text": text[:8000],
                        }
                        results.append(result)
                        if sid:
                            try:
                                db.add_uploaded_file(sid, filename, "pdf", "duplicate", existing, result["detail"][:500], file_size)
                            except Exception as dbe:
                                print(f"[db] file persist error: {dbe}")
                        continue

                    pipeline = EmbeddingPipeline(embedding_model=embedding_model)
                    chunks, embed_futures = pipeline.process_document_async(text, filename)
                    if chunks:
                        embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)
                        vs.add_embeddings(embeddings, chunks)
                        chunks_created = len(chunks)

                pdf_status = "success" if text.strip() else "error"
                pdf_detail = text[:200] if text.strip() else "No text extracted from PDF"
                result = {
                    "filename": filename,
                    "category": "pdf",
                    "status": pdf_status,
                    "detail": pdf_detail,
                    "chunks": chunks_created,
                    "text": text[:8000] if text.strip() else "",
                }
                results.append(result)
                if sid:
                    try:
                        db.add_uploaded_file(sid, filename, "pdf", pdf_status, chunks_created, pdf_detail[:500], file_size)
                        if pdf_status == "success":
                            db.add_message(sid, "context", f"[File: {filename}]\n{text[:8000]}")
                    except Exception as dbe:
                        print(f"[db] file persist error: {dbe}")

            else:
                result = {
                    "filename": filename,
                    "category": "unknown",
                    "status": "error",
                    "detail": f"Unsupported file type: {ext}",
                    "chunks": 0,
                    "text": "",
                }
                results.append(result)
                if sid:
                    try:
                        db.add_uploaded_file(sid, filename, "unknown", "error", 0, result["detail"][:500], file_size)
                    except Exception as dbe:
                        print(f"[db] file persist error: {dbe}")

        except Exception as e:
            result = {
                "filename": filename,
                "category": "unknown",
                "status": "error",
                "detail": str(e),
                "chunks": 0,
                "text": "",
            }
            results.append(result)
            if sid:
                try:
                    db.add_uploaded_file(sid, filename, "unknown", "error", 0, str(e)[:500], file_size)
                except Exception as dbe:
                    print(f"[db] file persist error: {dbe}")
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return {"results": results}


@app.post("/api/audio/digest")
async def audio_digest(file: UploadFile = File(...), embedding_model: str = ...):
    """
    Pipeline:
      1. Transcribe audio (CPU/GPU — Whisper, not Ollama, so runs independently)
      2. In parallel via the shared executor:
           a. LLM summarises the transcript
           b. EmbeddingPipeline chunks + embeds the transcript
      3. Store embeddings, return transcript + summary.
    """
    import os
    from EmbedData import EmbeddingPipeline

    if not file.filename:
        return {"status": "error", "message": "No filename provided"}

    filename = file.filename
    file_location = f"temp_{filename}"

    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        # Step 1 — transcription (blocking; Whisper runs on its own compute)
        transcribe_result = audio_ingestor.transcribe(file_location)
        text = str(transcribe_result["text"])

        # Step 2 — fire LLM summary and all chunk embeddings concurrently
        summary_prompt = f"Summarize this file in bullet points\n{text}"
        llm_future = inference.generate_async(prompt=summary_prompt)

        embedding_pipeline = EmbeddingPipeline(embedding_model=embedding_model)
        chunks, embed_futures = embedding_pipeline.process_document_async(text, filename)

        # Step 3 — collect (both ran in parallel while we awaited)
        summary = llm_future.result()
        embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)

        if len(chunks) > 0:
            get_vector_store(None).add_embeddings(embeddings, chunks)

        return {"transcribe": text, "summary": summary}
    finally:
        os.remove(file_location)


@app.get("/api/whisper/models")
async def get_whisper_models():
    available = audio_ingestor.get_available_models()
    downloaded = audio_ingestor.get_downloaded_models()
    return {"models": downloaded, "all_models": available, "current_model": audio_ingestor.model_name}


class WhisperModelRequest(BaseModel):
    model_name: str


@app.post("/api/whisper/models/load")
async def load_whisper_model(request: WhisperModelRequest):
    from fastapi.responses import StreamingResponse
    import json
    import asyncio
    import threading

    if request.model_name not in audio_ingestor.get_available_models():
        return {"status": "error", "message": f"Model {request.model_name} not available."}

    if audio_ingestor.model_name == request.model_name and audio_ingestor.model is not None:
        return {"status": "success", "message": f"Whisper model {request.model_name} already loaded."}

    model_sizes = {
        "tiny": 75, "base": 75, "small": 150, "medium": 300, "large": 400, "large-v2": 400, "large-v3": 400
    }
    total_steps = model_sizes.get(request.model_name, 200)

    def generate_progress():
        try:
            for step in range(1, total_steps + 1):
                progress = int((step / total_steps) * 100)
                yield json.dumps({"status": "downloading", "completed": progress, "total": 100, "message": f"Downloading Whisper model {request.model_name}..."}) + "\n"
                if step % 20 == 0:
                    import time
                    time.sleep(0.1)

            audio_ingestor.load_model(request.model_name)
            yield json.dumps({"status": "success", "completed": 100, "total": 100, "message": f"Whisper model {request.model_name} loaded successfully."}) + "\n"
        except Exception as e:
            import time
            time.sleep(0.1)
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

    return StreamingResponse(generate_progress(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})


@app.post("/api/whisper/models/unload")
async def unload_whisper_model():
    try:
        audio_ingestor.unload_model()
        return {"status": "success", "message": "Whisper model unloaded successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


class WhisperDeleteRequest(BaseModel):
    model_name: str


@app.post("/api/whisper/models/delete")
async def delete_whisper_model(request: WhisperDeleteRequest):
    try:
        import os
        import shutil

        if audio_ingestor.model_name == request.model_name:
            audio_ingestor.unload_model()

        cache_dir = os.path.expanduser("~/.cache/whisper")
        model_path = os.path.join(cache_dir, f"{request.model_name}.pt")

        if os.path.exists(model_path):
            os.remove(model_path)
            return {"status": "success", "message": f"Whisper model {request.model_name} deleted from cache."}
        else:
            return {"status": "success", "message": f"Whisper model {request.model_name} not found in cache (may already be deleted)."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/documents/ingest")
async def ingest_document(file: UploadFile = File(...), embedding_model: str = ...):
    try:
        from EmbedData import EmbeddingPipeline
        import tempfile
        import os

        if not file.filename:
            return {"status": "error", "message": "No filename provided"}

        filename = file.filename
        embedding_pipeline = EmbeddingPipeline(embedding_model=embedding_model)

        with tempfile.NamedTemporaryFile(delete=False, suffix=filename) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                # Fire OCR immediately (non-blocking), using the mounted OCR model.
                active_ocr_model = registry.slots.get("ocr") or ""
                ocr_future = doc_ingestor.ocr_async(tmp_path, ocr_model=active_ocr_model)

                # Wait for OCR text, then fan out all embed calls at once
                text = ocr_future.result()
                if not text.strip():
                    return {"status": "error", "message": "No text extracted from document"}

                chunks, embed_futures = embedding_pipeline.process_document_async(text, filename)
                if not chunks:
                    return {"status": "error", "message": "No chunks created from document"}

                embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)

            elif filename.lower().endswith(('.txt', '.md')):
                with open(tmp_path, 'r') as f:
                    text = f.read()

                if not text.strip():
                    return {"status": "error", "message": "No text extracted from document"}

                # All chunk embeds run in parallel on the shared executor
                chunks, embed_futures = embedding_pipeline.process_document_async(text, filename)
                if not chunks:
                    return {"status": "error", "message": "No chunks created from document"}

                embeddings = EmbeddingPipeline.collect_embeddings(embed_futures)

            else:
                return {"status": "error", "message": f"Unsupported file type: {filename}"}

            get_vector_store(None).add_embeddings(embeddings, chunks)

            return {
                "status": "success",
                "message": f"Document '{filename}' ingested successfully",
                "chunks_created": len(chunks),
                "doc_id": chunks[0]['doc_id'] if chunks else None
            }
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        return {"status": "error", "message": str(e)}
