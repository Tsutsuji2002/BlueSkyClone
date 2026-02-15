"""
BlueSky Text Model Exporter (DistilBERT Multilingual)
=====================================================
This script downloads a pre-trained DistilBERT Multilingual model
and exports it + vocabulary for use in the BlueSky backend.

Requirements:
    pip install torch transformers onnx

Usage:
    python export_text_model.py
"""

import torch
from transformers import DistilBertForSequenceClassification, DistilBertTokenizer
import os

def export_bert_model():
    print("=" * 60)
    print("  BlueSky Text Model Exporter (DistilBERT)")
    print("=" * 60)
    
    model_name = "distilbert-base-multilingual-cased"
    output_dir = os.path.dirname(os.path.abspath(__file__))
    onnx_path = os.path.join(output_dir, "text_model.onnx")
    vocab_path = os.path.join(output_dir, "bert_vocab.txt")

    # 1. Load Pre-trained Model & Tokenizer
    print(f"\n[1/3] Downloading {model_name}...")
    tokenizer = DistilBertTokenizer.from_pretrained(model_name)
    
    # We fine-tune the classification head for our specific categories
    # ideally, but for zero-shot we might use NLI. 
    # HERE: We export the BASE model for feature extraction or a generic classifier.
    # To keep it simple for this demo, we export a model with a classification head 
    # initialized for our 7 categories + neutral = 8 classes.
    # Note: In a real scenario, you'd fine-tune this on a dataset first.
    # For now, we will use the base model to get embeddings or raw logits 
    # and map them effectively, OR we assume the user will fine-tune.
    
    # DECISION: Let's export a generic feature extractor (base model) 
    # and use a simple linear layer in C# OR just export a classifier with random weights 
    # that the user *should* train. 
    # BETTER OPTION FOR CONTEXT: We will export a model that is ready for inference 
    # but acknowledge it needs fine-tuning for high accuracy on *specific* labels.
    # However, since the user wants it to "just work" like vision, 
    # we might need a Zero-Shot classification approach (MNLI).
    # BUT that is heavy. 
    
    # Let's stick to the user's request: "Upgrade... to ONNX".
    # We will export the model architecture.
    num_labels = 8 # Tech, Art, Nature, Gaming, Music, Food, Movies, Unknown
    model = DistilBertForSequenceClassification.from_pretrained(model_name, num_labels=num_labels)
    model.eval()
    print("  ✓ Model loaded!")

    # 2. Save Vocabulary
    print(f"[2/3] Saving vocabulary to {vocab_path}...")
    tokenizer.save_vocabulary(output_dir)
    # Rename to bert_vocab.txt if needed, but save_vocabulary usually creates vocab.txt
    if os.path.exists(os.path.join(output_dir, "vocab.txt")):
        if os.path.exists(vocab_path): os.remove(vocab_path)
        os.rename(os.path.join(output_dir, "vocab.txt"), vocab_path)
    print("  ✓ Vocab saved!")

    # 3. Export to ONNX
    print(f"[3/3] Exporting to ONNX: {onnx_path}")
    dummy_input = tokenizer("This is a sample sentence to set dimensions", return_tensors="pt")
    
    torch.onnx.export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"]),
        onnx_path,
        export_params=True,
        opset_version=13,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "logits": {0: "batch_size"}
        }
    )
    
    print(f"\n{'=' * 60}")
    print(f"  ✓ Export complete!")
    print(f"  ✓ ONNX Model: {onnx_path}")
    print(f"  ✓ Vocabulary: {vocab_path}")
    print(f"{'=' * 60}")
    print(f"\nNOTE: This is an untrained classification head on top of BERT.")
    print(f"To get accurate predictions, you would typically fine-tune this model")
    print(f"on a labeled dataset (which we can do in Python easily).")
    print(f"For now, the C# backend will load this and run inference.")

if __name__ == "__main__":
    export_bert_model()
