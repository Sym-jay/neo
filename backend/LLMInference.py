import ollama

class LLMInference:
    def __init__(self, llm_name: str):
        self.llm_name = None
        self.load_model(llm_name)

    def load_model(self, new_llm_name: str):
        if self.llm_name == new_llm_name:
            print(f"Model '{self.llm_name}' is already loaded.")
            return

        print(f"Pulling model '{new_llm_name}' via Ollama...")
        ollama.pull(new_llm_name)
        self.llm_name = new_llm_name
        print(f"Model '{self.llm_name}' ready.")

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

if __name__ == "__main__":
    inference = LLMInference(llm_name="qwen2.5:0.5b")
    inference.load_model("qwen2.5:0.5b")
    query = input("enter query")
    print(inference.generate(query))