import whisper
import os
from typing import Optional, List

AVAILABLE_WHISPER_MODELS = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"]

class AudioIngestor:
    def __init__(self, model_name: Optional[str] = None):
        self.model = None
        self.model_name = None
        if model_name is not None:
            self.load_model(model_name)

    def get_available_models(self) -> List[str]:
        return AVAILABLE_WHISPER_MODELS

    def get_downloaded_models(self) -> List[str]:
        cache_dir = os.path.expanduser("~/.cache/whisper")
        if not os.path.exists(cache_dir):
            return []
        
        downloaded = []
        for model in AVAILABLE_WHISPER_MODELS:
            model_file = os.path.join(cache_dir, f"{model}.pt")
            if os.path.exists(model_file):
                downloaded.append(model)
        return downloaded

    def load_model(self, model_name: str):
        if model_name not in AVAILABLE_WHISPER_MODELS:
            raise ValueError(f"Model {model_name} not available. Choose from: {AVAILABLE_WHISPER_MODELS}")
        
        if self.model_name == model_name and self.model is not None:
            return

        self.model = whisper.load_model(model_name)
        self.model_name = model_name

    def transcribe(self, audio_path: str, language: Optional[str] = None):
        if self.model is None:
            raise RuntimeError("No whisper model is loaded. Please load a model first.")
        
        result = self.model.transcribe(audio_path, language=language)
        return result

    def unload_model(self):
        if self.model is not None:
            self.model = None
            self.model_name = None
