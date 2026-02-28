import torch
import pytesseract
from PIL import Image
import ollama

class DocumentIngestor:
    def __init__(self, ocr_model: str = "glm-ocr"):
        self.ocr_model = ocr_model

    def perform_ocr(self, image_path: str) -> str:
        # Check if running on GPU (CUDA or Apple Silicon MPS)
        if torch.cuda.is_available():
            try:
                response = ollama.generate(
                    model=self.ocr_model,
                    prompt="Extract all text from this image exactly as it appears. Do not add any additional comments or formatting.",
                    images=[image_path]
                )
                return response.get("response", "")
            except Exception as e:
                print(f"Ollama OCR failed: {e}. Falling back to pytesseract.")
                return self._pytesseract_ocr(image_path)
        else:
            return self._pytesseract_ocr(image_path)
            
    def _pytesseract_ocr(self, image_path: str) -> str:
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            print(f"PyTesseract OCR failed: {e}")
            return ""