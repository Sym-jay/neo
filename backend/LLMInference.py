import ollama

class LLMInference:
    def __init__(self, llm_name: str | None = None):
        self.llm_name = None
        if llm_name is not None:
            self.load_model(llm_name)

    def load_model(self, new_llm_name: str):
        if self.llm_name == new_llm_name:
            print(f"Model '{self.llm_name}' is already loaded.")
            return

        available_models = self.get_available_models()
        if new_llm_name not in available_models:
            print(f"Pulling model '{new_llm_name}' via Ollama...")
            ollama.pull(new_llm_name)
            
        self.llm_name = new_llm_name
        print(f"Model '{self.llm_name}' ready.")

    def categorize_model(self, model_info):
        """Helper to return the category of a model: 'LLM', 'Embedding model', 'OCR model', 'Audio', or 'Other'."""
        model_name = ""
        if isinstance(model_info, dict):
            model_name = model_info.get('model', model_info.get('name', ''))
        elif hasattr(model_info, 'model'):
            model_name = getattr(model_info, 'model', '')
            
        model_name_lower = model_name.lower()
        
        # Check explicit keywords in name
        if any(kw in model_name_lower for kw in ['embed', 'bge-m3']):
            return 'Embedding model'
        if any(kw in model_name_lower for kw in ['vision', 'llava', 'ocr', 'clip']):
            return 'OCR model'
        if any(kw in model_name_lower for kw in ['whisper', 'audio']):
            return 'Audio'
            
        details = None
        if isinstance(model_info, dict):
            details = model_info.get('details', {})
        elif hasattr(model_info, 'details'):
            details = getattr(model_info, 'details', None)
            
        if details:
            family = ""
            if isinstance(details, dict):
                family = details.get('family', '')
            elif hasattr(details, 'family'):
                family = getattr(details, 'family', '')
                
            if isinstance(family, str):
                family_lower = family.lower()
                if 'embed' in family_lower or family_lower in ['bert', 'nomic-bert']:
                    return 'Embedding model'
                if family_lower == 'clip':
                    return 'OCR model'
                if family_lower == 'whisper':
                    return 'Audio'
                    
        # By default, treat as LLM if it has common LLM keywords or no specific tag
        if any(kw in model_name_lower for kw in ['llama', 'mistral', 'gemma', 'phi', 'qwen', 'coder', 'deepseek']):
            return 'LLM'
            
        return 'Other'

    def get_available_models(self):
        try:
            response = ollama.list()
            models = []
            if hasattr(response, 'models'):
                models = response.models
            elif isinstance(response, dict) and 'models' in response:
                models = response['models']
            
            model_names = []
            for m in models:
                if isinstance(m, dict):
                    model_names.append(m.get('model', m.get('name', '')))
                elif hasattr(m, 'model'):
                    model_names.append(getattr(m, 'model', ''))
            return model_names
        except Exception as e:
            print(f"Error fetching models from Ollama: {e}")
            return []

    def get_categorized_models(self):
        try:
            response = ollama.list()
            models = []
            if hasattr(response, 'models'):
                models = response.models
            elif isinstance(response, dict) and 'models' in response:
                models = response['models']
            
            categorized = {
                "LLM": [],
                "Embedding model": [],
                "OCR model": [],
                "Audio": [],
                "Other": []
            }
            
            for m in models:
                category = self.categorize_model(m)
                name = ""
                if isinstance(m, dict):
                    name = m.get('model', m.get('name', ''))
                elif hasattr(m, 'model'):
                    name = getattr(m, 'model', '')
                    
                if name:
                    if category not in categorized:
                        categorized[category] = []
                    categorized[category].append(name)
            
            return categorized
        except Exception as e:
            print(f"Error fetching categorized models from Ollama: {e}")
            return {
                "LLM": [],
                "Embedding model": [],
                "OCR model": [],
                "Audio": [],
                "Other": []
            }

    def unload_model(self):
        if self.llm_name is not None:
            print(f"Unloading model '{self.llm_name}'...")
            try:
                # Unload model by generating with keep_alive=0
                ollama.generate(model=self.llm_name, prompt='', keep_alive=0)
            except Exception as e:
                print(f"Error unloading model: {e}")
            self.llm_name = None
            print("Model unloaded.")

    def delete_model(self, model_name: str):
        print(f"Deleting model '{model_name}'...")
        ollama.delete(model_name)
        if self.llm_name == model_name:
            self.llm_name = None
            print(f"Model '{model_name}' deleted, no active model loaded.")
        else:
            print(f"Model '{model_name}' deleted.")

    def generate(self, prompt: str, max_tokens: int = 256, temperature: float = 0.7):
        if self.llm_name is None:
            raise RuntimeError("No model is currently loaded.")

        response = ollama.generate(
            model=self.llm_name,
            prompt=prompt,
            options={
                "num_predict": max_tokens,
                "temperature": temperature,
            }
        )
        return response["response"]