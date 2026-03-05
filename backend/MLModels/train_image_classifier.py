"""
BlueSky Image Classifier - CLIP-based Zero-Shot + Fine-tune
============================================================
Uses OpenAI CLIP model for image classification into our 12 categories.
Exports a lightweight ONNX wrapper for C# backend inference.

Strategy:
  - Use CLIP's zero-shot classification with category text descriptions
  - Export both image encoder and text embeddings to ONNX
  - At inference time, C# loads pre-computed text embeddings and compares
    with the image embedding via cosine similarity

Requirements:
    pip install torch transformers onnx onnxruntime Pillow

Usage:
    python train_image_classifier.py

Output:
    - image_classifier.onnx   (CLIP image encoder)
    - category_embeddings.bin  (pre-computed text embeddings for 12 categories)
    - image_label_map.json     (category mapping)
"""

import json
import os
import struct
import numpy as np
import torch
from transformers import CLIPModel, CLIPProcessor, CLIPTokenizer

# ─── Configuration ───────────────────────────────────────────────
MODEL_NAME = "openai/clip-vit-base-patch32"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_OUTPUT = os.path.join(SCRIPT_DIR, "image_classifier.onnx")
EMBEDDINGS_OUTPUT = os.path.join(SCRIPT_DIR, "category_embeddings.bin")
LABEL_MAP_OUTPUT = os.path.join(SCRIPT_DIR, "image_label_map.json")

# Rich category descriptions for zero-shot classification
# Multiple descriptions per category improve matching accuracy
CATEGORY_DESCRIPTIONS = {
    "Tech": [
        "a photo of technology, computers, programming, electronics",
        "a screenshot of code, software, or a computer screen",
        "technology devices: laptop, smartphone, server, circuit board",
        "artificial intelligence, robots, and digital innovation",
    ],
    "Art": [
        "a painting, drawing, sketch, or digital artwork",
        "an illustration, print, or artistic creation",
        "fine art: oil painting, watercolor, sculpture, or mixed media",
        "creative artwork with colors, brushstrokes, or artistic style",
    ],
    "Photography": [
        "a professional photograph with artistic composition",
        "portrait photography, studio photography, or creative photography",
        "black and white photography, long exposure, or HDR image",
        "a photograph taken with a professional camera with depth of field",
    ],
    "Gaming": [
        "a video game screenshot, game character, or gaming setup",
        "gaming console, controller, or esports competition",
        "pixel art game, RPG game scene, or FPS gameplay",
        "board game, card game, or tabletop gaming session",
    ],
    "Nature": [
        "a photo of nature: forest, mountain, ocean, or wildlife",
        "landscape scenery: sunset, waterfall, river, or valley",
        "animals in their natural habitat, birds, or marine life",
        "flowers, trees, gardens, and natural environments",
    ],
    "Music": [
        "a musical instrument: guitar, piano, drums, or violin",
        "a concert, live performance, or music festival stage",
        "a musician playing, singing, or recording in a studio",
        "album cover art, vinyl records, or music equipment",
    ],
    "News": [
        "a news broadcast, press conference, or journalism scene",
        "newspaper, headline, or breaking news coverage",
        "reporters, microphones, cameras at a news event",
        "protest, public gathering, or civic event coverage",
    ],
    "Politics": [
        "a political rally, speech, or government building",
        "politicians, parliament, congress, or election campaign",
        "voting ballot, debate stage, or political demonstration",
        "diplomatic meeting, summit, or international conference",
    ],
    "Movies": [
        "a movie scene, film still, or cinema theater",
        "movie poster, film set, or behind-the-scenes production",
        "actors performing, clapperboard, or film editing setup",
        "animated movie scene, CGI, or special effects",
    ],
    "Science": [
        "a science laboratory, microscope, or research equipment",
        "space, planets, galaxies, nebulae, or astronomy imagery",
        "chemical experiments, beakers, or scientific apparatus",
        "DNA helix, cells, atoms, or molecular structures",
    ],
    "Sports": [
        "a sports match: football, basketball, tennis, or soccer",
        "athletes competing, exercising, or training",
        "sports stadium, arena, or competition venue",
        "running, swimming, cycling, or gymnastics competition",
    ],
    "Food": [
        "a plate of food, a meal, or a delicious dish",
        "cooking, baking, or food preparation in a kitchen",
        "fruits, vegetables, ingredients, or grocery items",
        "restaurant dining, street food, or cafe beverages",
    ],
}

CATEGORIES = list(CATEGORY_DESCRIPTIONS.keys())


def compute_text_embeddings(model, tokenizer, device):
    """Compute averaged text embeddings for each category."""
    print("  Computing text embeddings for categories...")
    category_embeddings = {}

    with torch.no_grad():
        for cat, descriptions in CATEGORY_DESCRIPTIONS.items():
            # Tokenize all descriptions for this category
            inputs = tokenizer(
                descriptions, padding=True, truncation=True,
                max_length=77, return_tensors="pt"
            ).to(device)

            # Get text features
            text_features = model.get_text_features(**inputs)
            # Normalize
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            # Average across all descriptions
            avg_embedding = text_features.mean(dim=0)
            avg_embedding = avg_embedding / avg_embedding.norm()

            category_embeddings[cat] = avg_embedding.cpu().numpy()
            print(f"    ✓ {cat}: {len(descriptions)} descriptions → embedding dim={avg_embedding.shape[0]}")

    return category_embeddings


def save_embeddings_binary(embeddings, output_path):
    """Save embeddings in a simple binary format readable by C#.
    
    Format:
      - 4 bytes: int32 num_categories
      - For each category:
        - 4 bytes: int32 name_length
        - N bytes: UTF-8 category name
        - 4 bytes: int32 embedding_dim
        - D*4 bytes: float32 embedding values
    """
    with open(output_path, "wb") as f:
        f.write(struct.pack("<i", len(embeddings)))
        for name, emb in embeddings.items():
            name_bytes = name.encode("utf-8")
            f.write(struct.pack("<i", len(name_bytes)))
            f.write(name_bytes)
            f.write(struct.pack("<i", len(emb)))
            for val in emb:
                f.write(struct.pack("<f", float(val)))

    print(f"  ✓ Embeddings saved: {output_path}")
    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"  ✓ Size: {file_size_kb:.1f} KB")


def export_image_encoder_onnx(model, processor, device):
    """Export CLIP image encoder to ONNX."""
    model.eval()

    # Create a dummy image tensor (3x224x224)
    dummy_pixel_values = torch.randn(1, 3, 224, 224).to(device)

    # We need a wrapper that only runs the vision portion
    class CLIPImageEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.vision_model = clip_model.vision_model
            self.visual_projection = clip_model.visual_projection

        def forward(self, pixel_values):
            vision_outputs = self.vision_model(pixel_values=pixel_values)
            image_embeds = vision_outputs.pooler_output
            image_embeds = self.visual_projection(image_embeds)
            # Normalize
            image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
            return image_embeds

    encoder = CLIPImageEncoder(model).cpu()
    dummy_cpu = dummy_pixel_values.cpu()

    torch.onnx.export(
        encoder,
        dummy_cpu,
        ONNX_OUTPUT,
        export_params=True,
        opset_version=14,
        input_names=["pixel_values"],
        output_names=["image_embedding"],
        dynamic_axes={
            "pixel_values": {0: "batch_size"},
            "image_embedding": {0: "batch_size"},
        },
    )

    model.to(device)
    print(f"  ✓ Image encoder ONNX exported: {ONNX_OUTPUT}")
    file_size_mb = os.path.getsize(ONNX_OUTPUT) / (1024 * 1024)
    print(f"  ✓ Model size: {file_size_mb:.1f} MB")


def test_classification(model, processor, tokenizer, device):
    """Quick test with synthetic descriptions to verify the pipeline."""
    print("\n  Testing zero-shot classification with text inputs...")

    test_descriptions = [
        ("I love coding in Python and building web apps", "Tech"),
        ("Beautiful sunset over the mountain lake", "Nature"),
        ("New album from Taylor Swift just released", "Music"),
        ("Delicious homemade pasta carbonara recipe", "Food"),
        ("Premier League match highlights from today", "Sports"),
        ("Marvel movie trailer breaks viewing records", "Movies"),
        ("CRISPR gene editing breakthrough announced", "Science"),
        ("Presidential election campaign rally downtown", "Politics"),
        ("Oil painting of a peaceful countryside scene", "Art"),
        ("Nấu phở bò chuẩn vị Hà Nội thơm ngon", "Food"),
        ("Trận bóng đá V-League kết quả hôm nay", "Sports"),
        ("Công nghệ AI đang phát triển nhanh chóng", "Tech"),
    ]

    # Pre-compute category text embeddings
    category_texts = []
    category_names = []
    for cat, descs in CATEGORY_DESCRIPTIONS.items():
        category_texts.extend(descs)
        category_names.extend([cat] * len(descs))

    correct = 0
    for text, expected in test_descriptions:
        # Use CLIP's text-to-text similarity as a proxy test
        inputs = tokenizer([text] + [d for descs in CATEGORY_DESCRIPTIONS.values() for d in descs],
                          padding=True, truncation=True, max_length=77, return_tensors="pt").to(device)

        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            query = text_features[0:1]
            candidates = text_features[1:]

            # Group by category (4 descriptions each)
            scores = {}
            idx = 0
            for cat in CATEGORIES:
                n_descs = len(CATEGORY_DESCRIPTIONS[cat])
                cat_sims = torch.matmul(query, candidates[idx:idx + n_descs].T).squeeze()
                scores[cat] = cat_sims.mean().item()
                idx += n_descs

            predicted = max(scores, key=scores.get)
            is_correct = predicted == expected
            if is_correct:
                correct += 1

            status = "✓" if is_correct else "✗"
            print(f"    {status} \"{text[:50]}...\" → {predicted} (expected: {expected})")

    print(f"\n  Test accuracy: {correct}/{len(test_descriptions)} ({100*correct/len(test_descriptions):.0f}%)")


def main():
    print("=" * 60)
    print("  BlueSky Image Classifier (CLIP Zero-Shot)")
    print("  Model: openai/clip-vit-base-patch32")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device: {device}")

    # ── 1. Load Model ──
    print(f"\n[1/5] Loading CLIP model: {MODEL_NAME}...")
    model = CLIPModel.from_pretrained(MODEL_NAME).to(device)
    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    tokenizer = CLIPTokenizer.from_pretrained(MODEL_NAME)
    print(f"  ✓ Model loaded ({sum(p.numel() for p in model.parameters()):,} parameters)")

    # ── 2. Compute Category Embeddings ──
    print(f"\n[2/5] Computing category text embeddings...")
    category_embeddings = compute_text_embeddings(model, tokenizer, device)

    # ── 3. Test ──
    print(f"\n[3/5] Running quick classification test...")
    test_classification(model, processor, tokenizer, device)

    # ── 4. Export Image Encoder ──
    print(f"\n[4/5] Exporting CLIP image encoder to ONNX...")
    export_image_encoder_onnx(model, processor, device)

    # ── 5. Save Artifacts ──
    print(f"\n[5/5] Saving artifacts...")

    # Save pre-computed embeddings
    save_embeddings_binary(category_embeddings, EMBEDDINGS_OUTPUT)

    # Save label map
    label_map = {
        "categories": CATEGORIES,
        "label2id": {cat: i for i, cat in enumerate(CATEGORIES)},
        "id2label": {str(i): cat for i, cat in enumerate(CATEGORIES)},
        "descriptions": CATEGORY_DESCRIPTIONS,
    }
    with open(LABEL_MAP_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(label_map, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Label map saved: {LABEL_MAP_OUTPUT}")

    print(f"\n{'=' * 60}")
    print(f"  ✓ Export Complete!")
    print(f"  ✓ Files:")
    print(f"    - {ONNX_OUTPUT}")
    print(f"    - {EMBEDDINGS_OUTPUT}")
    print(f"    - {LABEL_MAP_OUTPUT}")
    print(f"{'=' * 60}")
    print(f"\nThe C# backend will use image_classifier.onnx + category_embeddings.bin")
    print(f"to classify images via cosine similarity with category embeddings.")


if __name__ == "__main__":
    main()
