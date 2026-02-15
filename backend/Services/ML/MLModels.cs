using System;
using Microsoft.ML.Data;

namespace BSkyClone.Services.ML;

public class TextData
{
    [LoadColumn(0)]
    public string Content { get; set; } = string.Empty;

    [LoadColumn(1)]
    public string Category { get; set; } = string.Empty;
}

public class TextPrediction
{
    [ColumnName("PredictedLabel")]
    public string Category { get; set; } = string.Empty;

    public float[]? Score { get; set; }
}

public class ImageData
{
    [LoadColumn(0)]
    public byte[] Image { get; set; } = Array.Empty<byte>();

    [LoadColumn(1)]
    public string Label { get; set; } = string.Empty;
}

public class ImagePrediction
{
    [ColumnName("PredictedLabel")]
    public string Label { get; set; } = string.Empty;

    public float[]? Score { get; set; }
}
