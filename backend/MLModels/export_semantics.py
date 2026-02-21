"""
Export Multilingual Semantic Embedding Model to ONNX
====================================================
Exports a high-quality multilingual model (paraphrase-multilingual-MiniLM-L12-v2) 
to ONNX for semantic similarity search in the C# backend.

This enables zero-shot classification: comparing post embeddings with 
interest embeddings via cosine similarity.

Requirements:
    pip install torch transformers onnx onnxruntime
"""

import os
import torch
from transformers import AutoTokenizer, AutoModel

# Configuration
MODEL_NAME = "distilbert-base-multilingual-cased"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_OUTPUT = os.path.join(SCRIPT_DIR, "text_semantics.onnx")
VOCAB_OUTPUT = os.path.join(SCRIPT_DIR, "semantic_vocab.txt")

def export_to_onnx():
    print(f"Loading model: {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=False)
    model = AutoModel.from_pretrained(MODEL_NAME)
    model.eval()

    # Create dummy input
    text = "Hello, world! Xin chào thế giới!"
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
    
    input_ids = inputs["input_ids"]
    attention_mask = inputs["attention_mask"]

    print("Exporting to ONNX...")
    # Wrap model to perform mean pooling (Sentence-Transformer style)
    class SemanticModelWrapper(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        def forward(self, input_ids, attention_mask):
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            # Mean Pooling - Take attention mask into account for correct averaging
            token_embeddings = outputs.last_hidden_state
            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
            sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
            sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
            embeddings = sum_embeddings / sum_mask
            # Normalize for cosine similarity
            return torch.nn.functional.normalize(embeddings, p=2, dim=1)

    wrapper = SemanticModelWrapper(model)
    
    torch.onnx.export(
        wrapper,
        (input_ids, attention_mask),
        ONNX_OUTPUT,
        export_params=True,
        opset_version=14,
        input_names=["input_ids", "attention_mask"],
        output_names=["embeddings"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "embeddings": {0: "batch_size"},
        },
    )

    print(f"✓ ONNX model saved to: {ONNX_OUTPUT}")
    
    # Manually save vocabulary for C# compatibility
    print("Saving vocabulary...")
    vocab = tokenizer.get_vocab()
    # Sort by ID to ensure correct order
    sorted_vocab = sorted(vocab.items(), key=lambda x: x[1])
    with open(VOCAB_OUTPUT, "w", encoding="utf-8") as f:
        for token, token_id in sorted_vocab:
            f.write(token + "\n")
    print(f"✓ Vocabulary saved to: {VOCAB_OUTPUT}")

if __name__ == "__main__":
    export_to_onnx()
