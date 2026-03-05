"""
BlueSky Text Classifier - Fine-tune DistilBERT Multilingual
============================================================
Fine-tunes distilbert-base-multilingual-cased on curated bilingual
training data (English + Vietnamese) for 12-category post classification.

Requirements:
    pip install torch transformers datasets onnx onnxruntime scikit-learn

Usage:
    python train_text_classifier.py
    
Output:
    - text_classifier.onnx  (ONNX model for C# backend)
    - label_map.json        (category index mapping)
    - bert_vocab.txt        (tokenizer vocabulary)
"""

import json
import os
import sys
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizer,
    get_linear_schedule_with_warmup,
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ─── Configuration ───────────────────────────────────────────────
MODEL_NAME = "distilbert-base-multilingual-cased"
MAX_LENGTH = 128
BATCH_SIZE = 16
EPOCHS = 6
LEARNING_RATE = 2e-5
WEIGHT_DECAY = 0.01
WARMUP_RATIO = 0.1
SEED = 42

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "training_data.json")
ONNX_OUTPUT = os.path.join(SCRIPT_DIR, "text_classifier.onnx")
LABEL_MAP_OUTPUT = os.path.join(SCRIPT_DIR, "label_map.json")
VOCAB_OUTPUT = os.path.join(SCRIPT_DIR, "bert_vocab.txt")

CATEGORIES = [
    "Tech", "Art", "Photography", "Gaming", "Nature",
    "Music", "News", "Politics", "Movies", "Science",
    "Sports", "Food"
]


# ─── Dataset ─────────────────────────────────────────────────────
class TextDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length):
        self.encodings = tokenizer(
            texts, truncation=True, padding="max_length",
            max_length=max_length, return_tensors="pt"
        )
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            "input_ids": self.encodings["input_ids"][idx],
            "attention_mask": self.encodings["attention_mask"][idx],
            "labels": self.labels[idx],
        }


# ─── Training Loop ───────────────────────────────────────────────
def train_epoch(model, dataloader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["labels"].to(device)

        optimizer.zero_grad()
        outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
        loss = outputs.loss
        logits = outputs.logits

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item()
        preds = torch.argmax(logits, dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / len(dataloader), correct / total


def evaluate(model, dataloader, device):
    model.eval()
    all_preds = []
    all_labels = []
    total_loss = 0

    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            total_loss += outputs.loss.item()
            preds = torch.argmax(outputs.logits, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    accuracy = accuracy_score(all_labels, all_preds)
    return total_loss / len(dataloader), accuracy, all_labels, all_preds


# ─── ONNX Export ─────────────────────────────────────────────────
def export_to_onnx(model, tokenizer, device):
    model.eval()
    dummy_text = "This is a sample sentence for ONNX export"
    dummy = tokenizer(dummy_text, return_tensors="pt", padding="max_length",
                      truncation=True, max_length=MAX_LENGTH)

    dummy_input_ids = dummy["input_ids"].to(device)
    dummy_attention_mask = dummy["attention_mask"].to(device)

    # Move model to CPU for ONNX export
    model_cpu = model.cpu()
    dummy_input_ids = dummy_input_ids.cpu()
    dummy_attention_mask = dummy_attention_mask.cpu()

    torch.onnx.export(
        model_cpu,
        (dummy_input_ids, dummy_attention_mask),
        ONNX_OUTPUT,
        export_params=True,
        opset_version=14,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "logits": {0: "batch_size"},
        },
    )

    # Move model back to device
    model.to(device)
    print(f"  ✓ ONNX model exported: {ONNX_OUTPUT}")
    file_size_mb = os.path.getsize(ONNX_OUTPUT) / (1024 * 1024)
    print(f"  ✓ Model size: {file_size_mb:.1f} MB")


# ─── Main ────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  BlueSky Text Classifier Training")
    print("  Model: DistilBERT Multilingual (Fine-tuned)")
    print("=" * 60)

    # Set seed for reproducibility
    torch.manual_seed(SEED)
    np.random.seed(SEED)

    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device: {device}")
    if device.type == "cuda":
        print(f"  GPU: {torch.cuda.get_device_name(0)}")

    # ── 1. Load Data ──
    print(f"\n[1/6] Loading training data from {DATA_PATH}...")
    if not os.path.exists(DATA_PATH):
        print(f"  ✗ Error: {DATA_PATH} not found!")
        sys.exit(1)

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    label2id = {cat: i for i, cat in enumerate(CATEGORIES)}
    id2label = {i: cat for i, cat in enumerate(CATEGORIES)}

    texts = [item["text"] for item in raw_data]
    labels = [label2id[item["label"]] for item in raw_data]

    print(f"  ✓ Loaded {len(texts)} samples across {len(CATEGORIES)} categories")
    for cat in CATEGORIES:
        count = sum(1 for item in raw_data if item["label"] == cat)
        print(f"    - {cat}: {count} samples")

    # ── 2. Split Data ──
    print(f"\n[2/6] Splitting into train/eval sets (80/20)...")
    train_texts, eval_texts, train_labels, eval_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=SEED, stratify=labels
    )
    print(f"  ✓ Train: {len(train_texts)} | Eval: {len(eval_texts)}")

    # ── 3. Load Tokenizer & Model ──
    print(f"\n[3/6] Loading {MODEL_NAME}...")
    tokenizer = DistilBertTokenizer.from_pretrained(MODEL_NAME)
    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(CATEGORIES),
        id2label=id2label,
        label2id=label2id,
    )
    model.to(device)
    print(f"  ✓ Model loaded ({sum(p.numel() for p in model.parameters()):,} parameters)")

    # ── 4. Create DataLoaders ──
    print(f"\n[4/6] Tokenizing and preparing dataloaders...")
    train_dataset = TextDataset(train_texts, train_labels, tokenizer, MAX_LENGTH)
    eval_dataset = TextDataset(eval_texts, eval_labels, tokenizer, MAX_LENGTH)
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    eval_loader = DataLoader(eval_dataset, batch_size=BATCH_SIZE)
    print(f"  ✓ Train batches: {len(train_loader)} | Eval batches: {len(eval_loader)}")

    # ── 5. Train ──
    print(f"\n[5/6] Fine-tuning for {EPOCHS} epochs (lr={LEARNING_RATE})...")
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY
    )
    total_steps = len(train_loader) * EPOCHS
    warmup_steps = int(total_steps * WARMUP_RATIO)
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps
    )

    best_accuracy = 0.0
    for epoch in range(EPOCHS):
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, device)
        eval_loss, eval_acc, all_labels, all_preds = evaluate(model, eval_loader, device)

        marker = ""
        if eval_acc > best_accuracy:
            best_accuracy = eval_acc
            # Save best model state
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            marker = " ★ best"

        print(
            f"  Epoch {epoch + 1}/{EPOCHS}: "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.3f} | "
            f"eval_loss={eval_loss:.4f} eval_acc={eval_acc:.3f}{marker}"
        )

    # Load best model state
    if best_accuracy > 0:
        model.load_state_dict(best_state)
        print(f"\n  ✓ Restored best model (eval_acc={best_accuracy:.3f})")

    # Final evaluation report
    _, _, final_labels, final_preds = evaluate(model, eval_loader, device)
    print(f"\n  Classification Report:")
    print(classification_report(
        final_labels, final_preds,
        target_names=CATEGORIES,
        digits=3,
        zero_division=0,
    ))

    # ── 6. Export ──
    print(f"[6/6] Exporting to ONNX and saving artifacts...")

    # Export ONNX
    export_to_onnx(model, tokenizer, device)

    # Save label map
    with open(LABEL_MAP_OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"label2id": label2id, "id2label": id2label}, f, indent=2)
    print(f"  ✓ Label map saved: {LABEL_MAP_OUTPUT}")

    # Save vocabulary
    tokenizer.save_vocabulary(SCRIPT_DIR)
    vocab_src = os.path.join(SCRIPT_DIR, "vocab.txt")
    if os.path.exists(vocab_src):
        if os.path.exists(VOCAB_OUTPUT):
            os.remove(VOCAB_OUTPUT)
        os.rename(vocab_src, VOCAB_OUTPUT)
    print(f"  ✓ Vocabulary saved: {VOCAB_OUTPUT}")

    print(f"\n{'=' * 60}")
    print(f"  ✓ Training Complete!")
    print(f"  ✓ Best eval accuracy: {best_accuracy:.3f}")
    print(f"  ✓ Files:")
    print(f"    - {ONNX_OUTPUT}")
    print(f"    - {LABEL_MAP_OUTPUT}")
    print(f"    - {VOCAB_OUTPUT}")
    print(f"{'=' * 60}")
    print(f"\nThe C# backend will auto-detect text_classifier.onnx on startup.")


if __name__ == "__main__":
    main()
