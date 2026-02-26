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

    def get_available_models(self):
        try:
            response = ollama.list()
            if hasattr(response, 'models'):
                return [m.model for m in response.models]
            elif isinstance(response, dict) and 'models' in response:
                return [m.get('model', m.get('name', '')) for m in response['models']]
            return []
        except Exception as e:
            print(f"Error fetching models from Ollama: {e}")
            return []

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