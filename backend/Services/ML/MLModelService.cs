using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.ML;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using BSkyClone.Constants;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Repositories;
using BSkyClone.UnitOfWork;

namespace BSkyClone.Services.ML;

public interface IMLModelService : IDisposable
{
    Task<string> PredictTextCategoryAsync(string content);
    Task<(string Label, float Probability)> PredictTextCategoryWithScoreAsync(string content);
    Task<Dictionary<string, float>> PredictTextMultiLabelAsync(string content);
    Task<string> PredictImageLabelAsync(string imageUrl);
    Task<Dictionary<string, float>> PredictImageMultiLabelAsync(string imageUrl);
    Task<bool> IsNsfwImageAsync(string imageUrl);
    Task<float[]> GenerateEmbeddingAsync(string text);
    void TrainModels();
}

public class MLModelService : IMLModelService, IDisposable
{
    private readonly MLContext _mlContext;
    private readonly HttpClient _httpClient;
    private ITransformer? _textModel;
    private PredictionEngine<TextData, TextPrediction>? _textPredictionEngine;
    private readonly string _modelPath = Path.Combine(AppContext.BaseDirectory, "MLModels");

    // ONNX Sessions (Singleton instances)
    private InferenceSession? _textClassifierSession;
    private InferenceSession? _textSemanticsSession;
    private InferenceSession? _imageClassifierSession;
    private InferenceSession? _visionModelSession;

    // Tokenizers
    private SimpleBertTokenizer? _bertTokenizer;
    private SimpleBertTokenizer? _semanticTokenizer;

    // Python-trained model artifacts
    private Dictionary<string, int>? _textLabelMap;
    private Dictionary<int, string>? _textIdToLabel;
    private float[][]? _categoryEmbeddings;
    private string[]? _categoryNames;

    // Semantic Similarity
    private readonly IServiceScopeFactory _scopeFactory;
    private Dictionary<string, float[]>? _interestEmbeddings;
    private DateTime _lastInterestsUpdate = DateTime.MinValue;

    public MLModelService(HttpClient httpClient, IServiceScopeFactory scopeFactory)
    {
        _mlContext = new MLContext(seed: 1);
        _httpClient = httpClient;
        _scopeFactory = scopeFactory;
        if (!Directory.Exists(_modelPath))
        {
            Directory.CreateDirectory(_modelPath);
        }
        LoadLabelMaps();
        LoadCategoryEmbeddings();
        InitializeSessions();
    }

    private void InitializeSessions()
    {
        try
        {
            // 1. Text Classifier (Fine-tuned DistilBERT)
            var textOnnxPath = Path.Combine(_modelPath, "text_classifier.onnx");
            var vocabPath = Path.Combine(_modelPath, "bert_vocab.txt");
            if (File.Exists(textOnnxPath) && File.Exists(vocabPath))
            {
                _textClassifierSession = new InferenceSession(textOnnxPath);
                using var vocabStream = File.OpenRead(vocabPath);
                _bertTokenizer = new SimpleBertTokenizer(vocabStream);
                Console.WriteLine("[ML] Initialized Text Classifier Session.");
            }

            // 2. Semantic Similarity
            var semanticOnnxPath = Path.Combine(_modelPath, "text_semantics.onnx");
            var semanticVocabPath = Path.Combine(_modelPath, "semantic_vocab.txt");
            if (File.Exists(semanticOnnxPath) && File.Exists(semanticVocabPath))
            {
                _textSemanticsSession = new InferenceSession(semanticOnnxPath);
                using var vocabStream = File.OpenRead(semanticVocabPath);
                _semanticTokenizer = new SimpleBertTokenizer(vocabStream);
                Console.WriteLine("[ML] Initialized Semantic Similarity Session.");
            }

            // 3. Image Classifier (CLIP)
            var clipOnnxPath = Path.Combine(_modelPath, "image_classifier.onnx");
            if (File.Exists(clipOnnxPath))
            {
                _imageClassifierSession = new InferenceSession(clipOnnxPath);
                Console.WriteLine("[ML] Initialized CLIP Image Classifier Session.");
            }

            // 4. Vision Model (MobileNet/ResNet)
            var visionOnnxPath = Path.Combine(_modelPath, "vision_model.onnx");
            if (File.Exists(visionOnnxPath))
            {
                _visionModelSession = new InferenceSession(visionOnnxPath);
                Console.WriteLine("[ML] Initialized Vision Model Session.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ML] Error initializing sessions: {ex.Message}");
        }
    }

    public void TrainModels()
    {
        TrainTextModel();
    }

    // ═══════════════════════════════════════════════════════════════
    //  TEXT CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════

    public async Task<string> PredictTextCategoryAsync(string content)
    {
        var (label, _) = await PredictTextCategoryWithScoreAsync(content);
        return label;
    }

    public async Task<(string Label, float Probability)> PredictTextCategoryWithScoreAsync(string content)
    {
        // 1. Try Python-trained ONNX (fine-tuned DistilBERT) first
        try 
        {
            if (_textClassifierSession != null && _textIdToLabel != null)
            {
                return await PredictTextWithPythonOnnxAsync(content);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Python ONNX text model error: {ex.Message}");
        }

        // 2. Try legacy ONNX (old export_text_model.py)
        try 
        {
            // Note: Reuse the same classifier session if compatible, or add a specific legacy field if needed.
            // For now, we assume the main one is the one we want.
            if (_textClassifierSession != null)
            {
                return await PredictTextWithOnnxAsync(content);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Legacy ONNX text model error: {ex.Message}");
        }

        // 3. Fallback to ML.NET
        EnsureTextPredictorInitialized();
        if (_textPredictionEngine == null) return ("unknown", 0f);

        var prediction = _textPredictionEngine.Predict(new TextData { Content = content });
        var normalizedLabel = PostCategoryConstants.Normalize(prediction.Category);
        
        float maxScore = 0;
        if (prediction.Score != null && prediction.Score.Length > 0)
        {
            maxScore = prediction.Score.Max();
        }

        return (normalizedLabel, maxScore);
    }

    /// <summary>
    /// Returns top categories with confidence scores for multi-label classification.
    /// Used by the Discover feed scoring algorithm.
    /// </summary>
    public async Task<Dictionary<string, float>> PredictTextMultiLabelAsync(string content)
    {
        var results = new Dictionary<string, float>();
        if (string.IsNullOrWhiteSpace(content)) return results;

        try
        {
            // 1. Try Semantic Similarity (Dynamic interests) - NEW & BEST
            if (_textSemanticsSession != null)
            {
                var textEmbedding = await GenerateEmbeddingAsync(content);
                if (textEmbedding != null && textEmbedding.Length > 0)
                {
                    await RefreshInterestEmbeddingsAsync();
                    if (_interestEmbeddings != null && _interestEmbeddings.Any())
                    {
                        foreach (var pair in _interestEmbeddings)
                        {
                            var similarity = CosineSimilarity(textEmbedding, pair.Value);
                            // Rescale from [-1, 1] to [0, 1]
                            var score = (similarity + 1.0f) / 2.0f;
                            
                            // Boost score if it's high enough
                            if (score > 0.45f) // Threshold for semantic relevance
                            {
                                results[pair.Key] = score;
                            }
                        }
                        
                        if (results.Any()) return results;
                    }
                }
            }

            // 2. Fallback to fine-tuned classification
            if (_textClassifierSession != null && _textIdToLabel != null)
            {
                return await PredictTextMultiLabelWithOnnxAsync(content);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Multi-label text prediction error: {ex.Message}");
        }

        // 3. Fallback: single-label (fine-tuned or ML.NET)
        var (label, prob) = await PredictTextCategoryWithScoreAsync(content);
        if (label != "unknown" && prob > 0.1f)
        {
            results[label] = prob;
        }
        return results;
    }

    private async Task<(string Label, float Probability)> PredictTextWithPythonOnnxAsync(string text)
    {
        if (_textClassifierSession == null || _bertTokenizer == null) return ("unknown", 0f);

        var maxLen = 128;
        var encoded = _bertTokenizer.Encode(text).Take(maxLen).ToList();
        while (encoded.Count < maxLen) encoded.Add(0);
        
        var inputIds = new DenseTensor<long>(new[] { 1, maxLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, maxLen });

        for (int i = 0; i < maxLen; i++)
        {
            inputIds[0, i] = encoded[i];
            attentionMask[0, i] = encoded[i] > 0 ? 1 : 0;
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask)
        };

        using var results = _textClassifierSession.Run(inputs);
        var logits = results.First().AsEnumerable<float>().ToArray();
        
        // Softmax
        var maxVal = logits.Max();
        var exp = logits.Select(x => Math.Exp(x - maxVal)).ToArray();
        var sum = exp.Sum();
        var probs = exp.Select(x => (float)(x / sum)).ToArray();

        var topIdx = probs.Select((p, i) => new { p, i })
                         .OrderByDescending(x => x.p)
                         .First();

        if (_textIdToLabel != null && _textIdToLabel.TryGetValue(topIdx.i, out var category))
        {
            return (category, topIdx.p);
        }
        
        return ("unknown", 0f);
    }

    private async Task<Dictionary<string, float>> PredictTextMultiLabelWithOnnxAsync(string text)
    {
        var results = new Dictionary<string, float>();
        if (_textClassifierSession == null || _bertTokenizer == null) return results;
        
        var maxLen = 128;
        var encoded = _bertTokenizer.Encode(text).Take(maxLen).ToList();
        while (encoded.Count < maxLen) encoded.Add(0);
        
        var inputIds = new DenseTensor<long>(new[] { 1, maxLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, maxLen });

        for (int i = 0; i < maxLen; i++)
        {
            inputIds[0, i] = encoded[i];
            attentionMask[0, i] = encoded[i] > 0 ? 1 : 0;
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask)
        };

        using var onnxResults = _textClassifierSession.Run(inputs);
        var logits = onnxResults.First().AsEnumerable<float>().ToArray();
        
        // Softmax
        var maxVal = logits.Max();
        var exp = logits.Select(x => Math.Exp(x - maxVal)).ToArray();
        var sum = exp.Sum();
        var probs = exp.Select(x => (float)(x / sum)).ToArray();

        // Return all categories with probability > 0.05 (5% threshold)
        if (_textIdToLabel != null)
        {
            for (int i = 0; i < probs.Length && i < _textIdToLabel.Count; i++)
            {
                if (probs[i] > 0.05f && _textIdToLabel.TryGetValue(i, out var category))
                {
                    results[category] = probs[i];
                }
            }
        }

        return results;
    }

    private async Task<(string Label, float Probability)> PredictTextWithOnnxAsync(string text)
    {
        if (_textClassifierSession == null || _bertTokenizer == null) return ("unknown", 0f);
        
        var maxLen = 128;
        var encoded = _bertTokenizer.Encode(text).Take(maxLen).ToList();
        while (encoded.Count < maxLen) encoded.Add(0);
        
        var inputIds = new DenseTensor<long>(new[] { 1, maxLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, maxLen });

        for (int i = 0; i < maxLen; i++)
        {
            inputIds[0, i] = encoded[i];
            attentionMask[0, i] = encoded[i] > 0 ? 1 : 0;
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask)
        };

        using var results = _textClassifierSession.Run(inputs);
        var logits = results.First().AsEnumerable<float>().ToArray();
        
        var (category, confidence) = MapBertLogitsToCategory(logits);
        return (category, confidence);
    }

    private SimpleBertTokenizer? _tokenizer;
    private Task<SimpleBertTokenizer> GetTokenizerAsync(string vocabPath)
    {
        if (_tokenizer != null) return Task.FromResult(_tokenizer);
        
        using var vocabStream = File.OpenRead(vocabPath);
        _tokenizer = new SimpleBertTokenizer(vocabStream);
        return Task.FromResult(_tokenizer);
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text)
    {
        try
        {
            if (_textSemanticsSession == null || _semanticTokenizer == null) return Array.Empty<float>();

            var maxLen = 128;
            var encoded = _semanticTokenizer.Encode(text).Take(maxLen).ToList();
            while (encoded.Count < maxLen) encoded.Add(0);

            var inputIds = new DenseTensor<long>(new[] { 1, maxLen });
            var attentionMask = new DenseTensor<long>(new[] { 1, maxLen });

            for (int i = 0; i < maxLen; i++)
            {
                inputIds[0, i] = encoded[i];
                attentionMask[0, i] = encoded[i] > 0 ? 1 : 0;
            }

            var inputs = new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
                NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask)
            };

            using var results = _textSemanticsSession.Run(inputs);
            return results.First().AsEnumerable<float>().ToArray();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Embedding generation error: {ex.Message}");
            return Array.Empty<float>();
        }
    }

    private async Task RefreshInterestEmbeddingsAsync()
    {
        if (DateTime.UtcNow - _lastInterestsUpdate < TimeSpan.FromMinutes(30) && _interestEmbeddings != null)
            return;

        try
        {
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<BSkyClone.Models.BSkyDbContext>();
                var interests = await context.Interests
                    .Where(i => i.IsDeleted != true)
                    .ToListAsync();
                
                var newEmbeddings = new Dictionary<string, float[]>();
                foreach (var interest in interests)
                {
                    var emb = await GenerateEmbeddingAsync(interest.Name);
                    if (emb != null)
                    {
                        newEmbeddings[interest.Name] = emb;
                    }
                }
                
                _interestEmbeddings = newEmbeddings;
                _lastInterestsUpdate = DateTime.UtcNow;
                Console.WriteLine($"[ML] Refreshed semantic embeddings for {newEmbeddings.Count} database interests.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to refresh interest embeddings: {ex.Message}");
        }
    }

    private (string, float) MapBertLogitsToCategory(float[] logits)
    {
        var maxVal = logits.Max();
        var exp = logits.Select(x => Math.Exp(x - maxVal)).ToArray();
        var sum = exp.Sum();
        var probs = exp.Select(x => (float)(x / sum)).ToArray();
        
        var top = probs.Select((p, i) => new { p, i })
                       .OrderByDescending(x => x.p)
                       .First();
                       
        // Legacy 8-category mapping for old text_model.onnx
        string[] categories = { 
            PostCategoryConstants.Tech, 
            PostCategoryConstants.Art, 
            PostCategoryConstants.Nature, 
            PostCategoryConstants.Gaming, 
            PostCategoryConstants.Music, 
            PostCategoryConstants.Food, 
            PostCategoryConstants.Movies,
            "unknown" 
        };
        
        if (top.i < categories.Length)
            return (categories[top.i], top.p);
            
        return ("unknown", 0f);
    }

    // ═══════════════════════════════════════════════════════════════
    //  IMAGE CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════

    public async Task<string> PredictImageLabelAsync(string imageUrl)
    {
        try
        {
            // 1. Try Python-trained CLIP model first
            if (_imageClassifierSession != null && _categoryEmbeddings != null)
            {
                var imageBytes = await DownloadImageAsync(imageUrl);
                if (imageBytes.Length > 0)
                {
                    return await PredictWithClipAsync(imageBytes);
                }
            }

            // 2. Fallback to MobileNet/ResNet ONNX
            if (_visionModelSession != null)
            {
                var imageBytes = await DownloadImageAsync(imageUrl);
                if (imageBytes.Length > 0)
                {
                    return await PredictWithMobileNetAsync(imageBytes);
                }
            }

            // 3. Fallback: URL analysis
            var lowerUrl = imageUrl.ToLower();
            if (lowerUrl.Contains("photo") || lowerUrl.Contains("camera") || lowerUrl.Contains("shot")) return PostCategoryConstants.Photography;
            if (lowerUrl.Contains("art") || lowerUrl.Contains("draw") || lowerUrl.Contains("paint") || lowerUrl.Contains("illustration")) return PostCategoryConstants.Art;
            if (lowerUrl.Contains("game") || lowerUrl.Contains("xbox") || lowerUrl.Contains("playstation")) return PostCategoryConstants.Gaming;
            if (lowerUrl.Contains("nature") || lowerUrl.Contains("mountain") || lowerUrl.Contains("forest") || lowerUrl.Contains("beach")) return PostCategoryConstants.Nature;

            return "neutral";
        }
        catch (Exception)
        {
            return "unknown";
        }
    }

    /// <summary>
    /// Returns all categories with confidence scores from image analysis.
    /// Used by the Discover feed scoring algorithm.
    /// </summary>
    public async Task<Dictionary<string, float>> PredictImageMultiLabelAsync(string imageUrl)
    {
        var results = new Dictionary<string, float>();
        try
        {
            if (_imageClassifierSession != null && _categoryEmbeddings != null)
            {
                var imageBytes = await DownloadImageAsync(imageUrl);
                if (imageBytes.Length > 0)
                {
                    return await PredictImageMultiLabelWithClipAsync(imageBytes);
                }
            }

            // Fallback to single label
            var label = await PredictImageLabelAsync(imageUrl);
            if (label != "neutral" && label != "unknown")
            {
                results[label] = 0.5f;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Image multi-label error: {ex.Message}");
        }
        return results;
    }

    private async Task<string> PredictWithClipAsync(byte[] imageBytes)
    {
        var scores = await PredictImageMultiLabelWithClipAsync(imageBytes);
        if (scores.Count == 0) return "neutral";
        var top = scores.OrderByDescending(x => x.Value).First();
        return top.Value > 0.15f ? top.Key : "neutral";
    }

    private Task<Dictionary<string, float>> PredictImageMultiLabelWithClipAsync(byte[] imageBytes)
    {
        var results = new Dictionary<string, float>();
        if (_imageClassifierSession == null || _categoryEmbeddings == null || _categoryNames == null) return Task.FromResult(results);
        
        try
        {
            // Preprocess image for CLIP (224x224, normalize with CLIP stats)
            using var image = Image.Load<Rgb24>(imageBytes);
            image.Mutate(x => x.Resize(new ResizeOptions {
                Size = new Size(224, 224),
                Mode = ResizeMode.Crop
            }));

            var inputTensor = new DenseTensor<float>(new[] { 1, 3, 224, 224 });
            // CLIP normalization: mean=[0.48145466, 0.4578275, 0.40821073], std=[0.26862954, 0.26130258, 0.27577711]
            for (int y = 0; y < 224; y++)
            {
                for (int x = 0; x < 224; x++)
                {
                    var pixel = image[x, y];
                    inputTensor[0, 0, y, x] = (pixel.R / 255f - 0.48145466f) / 0.26862954f;
                    inputTensor[0, 1, y, x] = (pixel.G / 255f - 0.4578275f) / 0.26130258f;
                    inputTensor[0, 2, y, x] = (pixel.B / 255f - 0.40821073f) / 0.27577711f;
                }
            }

            var inputName = _imageClassifierSession.InputMetadata.Keys.First();
            var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor(inputName, inputTensor) };
            
            using var onnxResults = _imageClassifierSession.Run(inputs);
            var imageEmbedding = onnxResults.First().AsEnumerable<float>().ToArray();

            // Cosine similarity with pre-computed category embeddings
            for (int i = 0; i < _categoryNames.Length && i < _categoryEmbeddings.Length; i++)
            {
                var similarity = CosineSimilarity(imageEmbedding, _categoryEmbeddings[i]);
                // Scale from [-1,1] to [0,1] range
                var score = (similarity + 1f) / 2f;
                if (score > 0.1f) // 10% threshold
                {
                    results[_categoryNames[i]] = score;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"CLIP inference error: {ex.Message}");
        }

        return Task.FromResult(results);
    }

    private float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0f;
        float dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        var denom = Math.Sqrt(normA) * Math.Sqrt(normB);
        return denom > 0 ? (float)(dot / denom) : 0f;
    }

    private Task<string> PredictWithMobileNetAsync(byte[] imageBytes)
    {
        if (_visionModelSession == null) return Task.FromResult("neutral");
        try 
        {
            using var image = Image.Load<Rgb24>(imageBytes);
            image.Mutate(x => x.Resize(new ResizeOptions {
                Size = new Size(224, 224),
                Mode = ResizeMode.Crop
            }));

            var inputTensor = new DenseTensor<float>(new[] { 1, 3, 224, 224 });
            for (int y = 0; y < 224; y++)
            {
                for (int x = 0; x < 224; x++)
                {
                    var pixel = image[x, y];
                    inputTensor[0, 0, y, x] = (pixel.R / 255f - 0.485f) / 0.229f;
                    inputTensor[0, 1, y, x] = (pixel.G / 255f - 0.456f) / 0.224f;
                    inputTensor[0, 2, y, x] = (pixel.B / 255f - 0.406f) / 0.225f;
                }
            }

            var inputName = _visionModelSession.InputMetadata.Keys.First();
            var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor(inputName, inputTensor) };
            
            using var results = _visionModelSession.Run(inputs);
            var output = results.First().AsEnumerable<float>().ToArray();
            
            var (category, confidence) = ImageNetCategoryMapper.MapWithConfidence(output);
            return Task.FromResult(confidence > 0.1f ? category : "neutral");
        }
        catch 
        {
            return Task.FromResult("neutral");
        }
    }

    private async Task<byte[]> DownloadImageAsync(string url)
    {
        try
        {
            return await _httpClient.GetByteArrayAsync(url);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public Task<bool> IsNsfwImageAsync(string imageUrl)
    {
        var lowerUrl = imageUrl.ToLower();
        return Task.FromResult(lowerUrl.Contains("nsfw") || lowerUrl.Contains("adult") || lowerUrl.Contains("sensitive"));
    }

    // ═══════════════════════════════════════════════════════════════
    //  LABEL MAP & EMBEDDINGS LOADING
    // ═══════════════════════════════════════════════════════════════

    private void LoadLabelMaps()
    {
        try
        {
            var labelMapPath = Path.Combine(_modelPath, "label_map.json");
            if (File.Exists(labelMapPath))
            {
                var json = File.ReadAllText(labelMapPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                
                _textLabelMap = new Dictionary<string, int>();
                _textIdToLabel = new Dictionary<int, string>();
                
                if (doc.RootElement.TryGetProperty("label2id", out var label2id))
                {
                    foreach (var prop in label2id.EnumerateObject())
                    {
                        _textLabelMap[prop.Name] = prop.Value.GetInt32();
                    }
                }
                if (doc.RootElement.TryGetProperty("id2label", out var id2label))
                {
                    foreach (var prop in id2label.EnumerateObject())
                    {
                        _textIdToLabel[int.Parse(prop.Name)] = prop.Value.GetString() ?? "unknown";
                    }
                }
                Console.WriteLine($"[ML] Loaded text label map: {_textIdToLabel.Count} categories");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ML] Failed to load label maps: {ex.Message}");
        }
    }

    private void LoadCategoryEmbeddings()
    {
        try
        {
            var path = Path.Combine(_modelPath, "category_embeddings.bin");
            if (!File.Exists(path)) return;

            using var reader = new BinaryReader(File.OpenRead(path));
            var numCategories = reader.ReadInt32();
            _categoryNames = new string[numCategories];
            _categoryEmbeddings = new float[numCategories][];

            for (int i = 0; i < numCategories; i++)
            {
                var nameLen = reader.ReadInt32();
                var nameBytes = reader.ReadBytes(nameLen);
                _categoryNames[i] = Encoding.UTF8.GetString(nameBytes);

                var embDim = reader.ReadInt32();
                _categoryEmbeddings[i] = new float[embDim];
                for (int j = 0; j < embDim; j++)
                {
                    _categoryEmbeddings[i][j] = reader.ReadSingle();
                }
            }
            Console.WriteLine($"[ML] Loaded CLIP category embeddings: {numCategories} categories, dim={_categoryEmbeddings[0]?.Length}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ML] Failed to load category embeddings: {ex.Message}");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  ML.NET FALLBACK (Legacy)
    // ═══════════════════════════════════════════════════════════════

    private void TrainTextModel()
    {
        var data = new List<TextData>
        {
            // --- TECH ---
            new TextData { Content = "I love this new tech and AI programming", Category = PostCategoryConstants.Tech },
            new TextData { Content = "coding in csharp is great", Category = PostCategoryConstants.Tech },
            new TextData { Content = "machine learning with ml.net", Category = PostCategoryConstants.Tech },
            new TextData { Content = "building a mobile app with flutter", Category = PostCategoryConstants.Tech },
            new TextData { Content = "backend development with asp.net core", Category = PostCategoryConstants.Tech },
            new TextData { Content = "frontend react component library", Category = PostCategoryConstants.Tech },
            new TextData { Content = "docker containerize my application", Category = PostCategoryConstants.Tech },
            new TextData { Content = "kubernetes cluster deployment", Category = PostCategoryConstants.Tech },
            new TextData { Content = "javascript framework comparison", Category = PostCategoryConstants.Tech },
            new TextData { Content = "database optimization for sql server", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Lập trình C# cơ bản cho người mới", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Công nghệ AI đang thay đổi thế giới", Category = PostCategoryConstants.Tech },

            // --- ART ---
            new TextData { Content = "Just finished a painting, digital art is fun", Category = PostCategoryConstants.Art },
            new TextData { Content = "oil painting on canvas", Category = PostCategoryConstants.Art },
            new TextData { Content = "sketching portrait of a friend", Category = PostCategoryConstants.Art },
            new TextData { Content = "watercolor landscape tutorial", Category = PostCategoryConstants.Art },
            new TextData { Content = "3d modeling with blender", Category = PostCategoryConstants.Art },
            new TextData { Content = "character design and illustration", Category = PostCategoryConstants.Art },
            new TextData { Content = "Vẽ tranh sơn dầu phong cảnh đẹp", Category = PostCategoryConstants.Art },
            new TextData { Content = "Hướng dẫn vẽ digital art cho người mới", Category = PostCategoryConstants.Art },

            // --- NATURE ---
            new TextData { Content = "Check out this sunset photography", Category = PostCategoryConstants.Nature },
            new TextData { Content = "forest hiking trails", Category = PostCategoryConstants.Nature },
            new TextData { Content = "mountain landscape photo", Category = PostCategoryConstants.Nature },
            new TextData { Content = "wildlife photography in africa", Category = PostCategoryConstants.Nature },
            new TextData { Content = "ocean waves on the beach", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Khám phá rừng nguyên sinh", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Leo núi Fansipan ngắm mây mờ", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Bảo tồn động vật hoang dã", Category = PostCategoryConstants.Nature },

            // --- GAMING ---
            new TextData { Content = "The game graphics on Xbox are amazing", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "playstation 5 exclusive games", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "esports tournament live stream", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "rpg games with deep stories", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Trải nghiệm game hành động cực đỉnh", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Livestream game Liên Quân Mobile", Category = PostCategoryConstants.Gaming },

            // --- MUSIC ---
            new TextData { Content = "New album from my favorite music artist", Category = PostCategoryConstants.Music },
            new TextData { Content = "piano concerto live", Category = PostCategoryConstants.Music },
            new TextData { Content = "guitar solo performance", Category = PostCategoryConstants.Music },
            new TextData { Content = "rock bands live in concert", Category = PostCategoryConstants.Music },
            new TextData { Content = "Hòa nhạc cổ điển thính phòng", Category = PostCategoryConstants.Music },
            new TextData { Content = "Ca sĩ trẻ ra mắt MV cực hot", Category = PostCategoryConstants.Music },

            // --- NEWS ---
            new TextData { Content = "Politics and world news updates", Category = PostCategoryConstants.News },
            new TextData { Content = "breaking news report", Category = PostCategoryConstants.News },
            new TextData { Content = "daily updates on global events", Category = PostCategoryConstants.News },
            new TextData { Content = "Bản tin thời sự tối nay", Category = PostCategoryConstants.News },
            new TextData { Content = "Tin tức nóng hổi trong 24 giờ qua", Category = PostCategoryConstants.News },

            // --- FOOD ---
            new TextData { Content = "Delicious pizza recipe for dinner", Category = PostCategoryConstants.Food },
            new TextData { Content = "healthy cooking tips for breakfast", Category = PostCategoryConstants.Food },
            new TextData { Content = "best restaurants in the city", Category = PostCategoryConstants.Food },
            new TextData { Content = "Món ngon mỗi ngày cho gia đình", Category = PostCategoryConstants.Food },
            new TextData { Content = "Hướng dẫn nấu phở bò chuẩn vị", Category = PostCategoryConstants.Food },

            // --- MOVIES ---
            new TextData { Content = "New Marvel superhero movie trailer", Category = PostCategoryConstants.Movies },
            new TextData { Content = "Oscar nominations and ceremony", Category = PostCategoryConstants.Movies },
            new TextData { Content = "Netflix original series review", Category = PostCategoryConstants.Movies },
            new TextData { Content = "Phim bom tấn Marvel mới chiếu rạp", Category = PostCategoryConstants.Movies },
        };

        var trainingData = _mlContext.Data.LoadFromEnumerable(data);

        var pipeline = _mlContext.Transforms.Conversion.MapValueToKey("Label", nameof(TextData.Category))
            .Append(_mlContext.Transforms.Text.FeaturizeText("Features", nameof(TextData.Content)))
            .Append(_mlContext.MulticlassClassification.Trainers.SdcaMaximumEntropy("Label", "Features"))
            .Append(_mlContext.Transforms.Conversion.MapKeyToValue("PredictedLabel"));

        _textModel = pipeline.Fit(trainingData);

        var textModelPath = Path.Combine(_modelPath, "text_model.zip");
        _mlContext.Model.Save(_textModel, trainingData.Schema, textModelPath);
        
        _textPredictionEngine = null;
    }

    private void EnsureTextPredictorInitialized()
    {
        if (_textPredictionEngine != null) return;

        LoadTextModel();
        if (_textModel != null)
        {
            _textPredictionEngine = _mlContext.Model.CreatePredictionEngine<TextData, TextPrediction>(_textModel);
        }
    }

    private void LoadTextModel()
    {
        var textModelPath = Path.Combine(_modelPath, "text_model.zip");
        if (File.Exists(textModelPath))
        {
            _textModel = _mlContext.Model.Load(textModelPath, out _);
        }
        else
        {
            TrainTextModel();
        }
    }

    public void Dispose()
    {
        _textClassifierSession?.Dispose();
        _textSemanticsSession?.Dispose();
        _imageClassifierSession?.Dispose();
        _visionModelSession?.Dispose();
        _textPredictionEngine?.Dispose();
    }
}
