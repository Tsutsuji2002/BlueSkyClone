"""
BlueSky ONNX Model Exporter
============================
This script automatically downloads a pre-trained MobileNetV2 model
and exports it to ONNX format for use in the BlueSky backend.

Requirements:
    pip install torch torchvision onnx

Usage:
    python export_model.py
    
The output file 'vision_model.onnx' will be placed in the same directory.
"""

import torch
import torchvision.models as models
import os

def export_mobilenet_v2():
    print("=" * 60)
    print("  BlueSky Vision Model Exporter")
    print("=" * 60)
    
    # 1. Load pre-trained MobileNetV2 (trained on ImageNet, 1000 classes)
    print("\n[1/3] Downloading MobileNetV2 (pre-trained on ImageNet)...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    model.eval()
    print("  ✓ Model loaded successfully!")
    
    # 2. Create a dummy input tensor (batch=1, channels=3, height=224, width=224)
    print("[2/3] Preparing export configuration...")
    dummy_input = torch.randn(1, 3, 224, 224)
    
    # 3. Export to ONNX
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vision_model.onnx")
    print(f"[3/3] Exporting to ONNX: {output_path}")
    
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=13,           # Compatible with ONNX Runtime
        do_constant_folding=True,   # Optimize constants
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"}
        }
    )
    
    # Verify
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\n{'=' * 60}")
    print(f"  ✓ Export complete!")
    print(f"  ✓ File: {output_path}")
    print(f"  ✓ Size: {file_size_mb:.1f} MB")
    print(f"  ✓ Model: MobileNetV2 (ImageNet, 1000 classes)")
    print(f"  ✓ Input: [1, 3, 224, 224] (RGB, normalized)")
    print(f"{'=' * 60}")
    print(f"\nThe BlueSky backend will automatically detect and use this model.")

if __name__ == "__main__":
    export_mobilenet_v2()
