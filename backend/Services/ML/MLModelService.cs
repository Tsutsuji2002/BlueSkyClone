using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.ML;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using BSkyClone.Constants;

namespace BSkyClone.Services.ML;

public interface IMLModelService
{
    Task<string> PredictTextCategoryAsync(string content);
    Task<(string Label, float Probability)> PredictTextCategoryWithScoreAsync(string content);
    Task<string> PredictImageLabelAsync(string imageUrl);
    Task<bool> IsNsfwImageAsync(string imageUrl);
    void TrainModels();
}

public class MLModelService : IMLModelService
{
    private readonly MLContext _mlContext;
    private readonly HttpClient _httpClient;
    private ITransformer? _textModel;
    private PredictionEngine<TextData, TextPrediction>? _textPredictionEngine;
    private readonly string _modelPath = Path.Combine(AppContext.BaseDirectory, "MLModels");

    public MLModelService(HttpClient httpClient)
    {
        _mlContext = new MLContext(seed: 1);
        _httpClient = httpClient;
        if (!Directory.Exists(_modelPath))
        {
            Directory.CreateDirectory(_modelPath);
        }
    }

    public void TrainModels()
    {
        TrainTextModel();
        // Image model training usually requires a lot of local images or pre-trained models.
        // For this demo, we'll focus on the text classification infrastructure.
    }

    public async Task<string> PredictTextCategoryAsync(string content)
    {
        EnsureTextPredictorInitialized();
        if (_textPredictionEngine == null) return "unknown";

        var prediction = _textPredictionEngine.Predict(new TextData { Content = content });
        return PostCategoryConstants.Normalize(prediction.Category);
    }

    public async Task<(string Label, float Probability)> PredictTextCategoryWithScoreAsync(string content)
    {
        EnsureTextPredictorInitialized();
        if (_textPredictionEngine == null) return ("unknown", 0f);

        var prediction = _textPredictionEngine.Predict(new TextData { Content = content });
        var normalizedLabel = PostCategoryConstants.Normalize(prediction.Category);
        
        // Get the probability score if available
        float maxScore = 0;
        if (prediction.Score != null && prediction.Score.Length > 0)
        {
            maxScore = prediction.Score.Max();
        }

        return (normalizedLabel, maxScore);
    }

    public async Task<string> PredictImageLabelAsync(string imageUrl)
    {
        try
        {
            // 1. Check for ONNX model existence
            var onnxModelPath = Path.Combine(_modelPath, "vision_model.onnx");
            if (File.Exists(onnxModelPath))
            {
                var imageBytes = await DownloadImageAsync(imageUrl);
                if (imageBytes.Length > 0)
                {
                    return await PredictWithOnnxAsync(imageBytes, onnxModelPath);
                }
            }

            // 2. Fallback: Fast URL analysis
            var lowerUrl = imageUrl.ToLower();
            if (lowerUrl.Contains("photo") || lowerUrl.Contains("camera") || lowerUrl.Contains("shot")) return PostCategoryConstants.Photography;
            if (lowerUrl.Contains("art") || lowerUrl.Contains("draw") || lowerUrl.Contains("paint") || lowerUrl.Contains("illustration")) return PostCategoryConstants.Art;
            if (lowerUrl.Contains("game") || lowerUrl.Contains("xbox") || lowerUrl.Contains("playstation")) return PostCategoryConstants.Gaming;
            if (lowerUrl.Contains("nature") || lowerUrl.Contains("mountain") || lowerUrl.Contains("forest") || lowerUrl.Contains("beach")) return PostCategoryConstants.Nature;

            return "neutral";
        }
        catch (Exception ex)
        {
            // Log error if needed: Console.WriteLine($"ONNX Error: {ex.Message}");
            return "unknown";
        }
    }

    private async Task<string> PredictWithOnnxAsync(byte[] imageBytes, string modelPath)
    {
        try 
        {
            using var session = new InferenceSession(modelPath);
            
            // 1. Preprocess with ImageSharp
            using var image = Image.Load<Rgb24>(imageBytes);
            image.Mutate(x => x.Resize(new ResizeOptions {
                Size = new Size(224, 224),
                Mode = ResizeMode.Crop
            }));

            // 2. Convert to Tensor (Normalize: ImageNet mean/std)
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

            var inputName = session.InputMetadata.Keys.First();
            var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor(inputName, inputTensor) };
            
            using var results = session.Run(inputs);
            var output = results.First().AsEnumerable<float>().ToArray();
            
            // Use the comprehensive ImageNet mapper with softmax confidence
            var (category, confidence) = ImageNetCategoryMapper.MapWithConfidence(output);
            
            // Only return a category if confidence is reasonable
            return confidence > 0.1f ? category : "neutral";
        }
        catch 
        {
            return "neutral";
        }
    }

    private async Task<byte[]> DownloadImageAsync(string url)
    {
        try
        {
            // Handle relative URLs if any (though typically they are absolute in this app)
            return await _httpClient.GetByteArrayAsync(url);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<bool> IsNsfwImageAsync(string imageUrl)
    {
        // In a real implementation, this would use a vision model to detect NSFW content.
        // For this demo, we'll flag images with "nsfw" or "adult" in the name as a mockup.
        var lowerUrl = imageUrl.ToLower();
        return lowerUrl.Contains("nsfw") || lowerUrl.Contains("adult") || lowerUrl.Contains("sensitive");
    }

    private void TrainTextModel()
    {
        // Sample dataset for training
        var data = new List<TextData>
        {
            // --- TECH (English & Vietnamese) ---
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
            new TextData { Content = "Hướng dẫn học Python hiệu quả", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Phát triển web với React và Nodejs", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Công nghệ AI đang thay đổi thế giới", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Mã nguồn mở Github rất hữu ích", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Cách fix bug hiệu quả trong dự án", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Triển khai Docker cho ứng dụng web", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Lập trình viên fullstack nên học gì", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Học máy và trí tuệ nhân tạo chuyên sâu", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Tối ưu hóa cơ sở dữ liệu SQL", Category = PostCategoryConstants.Tech },

            // --- ART (English & Vietnamese) ---
            new TextData { Content = "Just finished a painting, digital art is fun", Category = PostCategoryConstants.Art },
            new TextData { Content = "oil painting on canvas", Category = PostCategoryConstants.Art },
            new TextData { Content = "sketching portrait of a friend", Category = PostCategoryConstants.Art },
            new TextData { Content = "watercolor landscape tutorial", Category = PostCategoryConstants.Art },
            new TextData { Content = "3d modeling with blender", Category = PostCategoryConstants.Art },
            new TextData { Content = "character design and illustration", Category = PostCategoryConstants.Art },
            new TextData { Content = "concept art for video games", Category = PostCategoryConstants.Art },
            new TextData { Content = "abstract art gallery exhibition", Category = PostCategoryConstants.Art },
            new TextData { Content = "Vẽ tranh sơn dầu phong cảnh đẹp", Category = PostCategoryConstants.Art },
            new TextData { Content = "Hướng dẫn vẽ digital art cho người mới", Category = PostCategoryConstants.Art },
            new TextData { Content = "Phác thảo chân dung bằng bút chì", Category = PostCategoryConstants.Art },
            new TextData { Content = "Triển lãm nghệ thuật đương đại", Category = PostCategoryConstants.Art },
            new TextData { Content = "Thiết kế nhân vật anime cực chất", Category = PostCategoryConstants.Art },
            new TextData { Content = "Mỹ thuật và hội họa truyền thống", Category = PostCategoryConstants.Art },

            // --- NATURE (English & Vietnamese) ---
            new TextData { Content = "Check out this sunset photography", Category = PostCategoryConstants.Nature },
            new TextData { Content = "forest hiking trails", Category = PostCategoryConstants.Nature },
            new TextData { Content = "mountain landscape photo", Category = PostCategoryConstants.Nature },
            new TextData { Content = "wildlife photography in africa", Category = PostCategoryConstants.Nature },
            new TextData { Content = "ocean waves on the beach", Category = PostCategoryConstants.Nature },
            new TextData { Content = "camping under the stars", Category = PostCategoryConstants.Nature },
            new TextData { Content = "beautiful garden and flowers", Category = PostCategoryConstants.Nature },
            new TextData { Content = "protecting the environment and climate", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Khám phá rừng nguyên sinh đại ngàn", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Leo núi Fansipan ngắm mây mờ", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Bảo tồn động vật hoang dã quý hiếm", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Vẻ đẹp của biển xanh cát trắng", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Hoàng hôn trên sông rất lãng mạn", Category = PostCategoryConstants.Nature },
            new TextData { Content = "Môi trường xanh sạch đẹp cho tương lai", Category = PostCategoryConstants.Nature },

            // --- GAMING (English & Vietnamese) ---
            new TextData { Content = "The game graphics on Xbox are amazing", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "playstation 5 exclusive games", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "steam deck gaming", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "esports tournament live stream", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "league of legends worlds matches", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "rpg games with deep stories", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "fps games pro tactics", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Trải nghiệm game hành động cực đỉnh", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Livestream game Liên Quân Mobile", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Giải đấu thể thao điện tử chuyên nghiệp", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Review máy chơi game Playstation 5", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Game nhập vai hay nhất năm nay", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "Tải game miễn phí trên kho ứng dụng", Category = PostCategoryConstants.Gaming },

            // --- MUSIC (English & Vietnamese) ---
            new TextData { Content = "New album from my favorite music artist", Category = PostCategoryConstants.Music },
            new TextData { Content = "piano concerto live", Category = PostCategoryConstants.Music },
            new TextData { Content = "guitar solo performance", Category = PostCategoryConstants.Music },
            new TextData { Content = "rock bands live in concert", Category = PostCategoryConstants.Music },
            new TextData { Content = "jazz music for relaxing", Category = PostCategoryConstants.Music },
            new TextData { Content = "pop stars music video", Category = PostCategoryConstants.Music },
            new TextData { Content = "Hòa nhạc cổ điển thính phòng", Category = PostCategoryConstants.Music },
            new TextData { Content = "Ca sĩ trẻ ra mắt MV cực hot", Category = PostCategoryConstants.Music },
            new TextData { Content = "Học đàn guitar cho người mới bắt đầu", Category = PostCategoryConstants.Music },
            new TextData { Content = "Nhạc trẻ hot nhất bảng xếp hạng", Category = PostCategoryConstants.Music },
            new TextData { Content = "Phòng trà ca nhạc cuối tuần", Category = PostCategoryConstants.Music },

            // --- NEWS (English & Vietnamese) ---
            new TextData { Content = "Politics and world news updates", Category = PostCategoryConstants.News },
            new TextData { Content = "breaking news report", Category = PostCategoryConstants.News },
            new TextData { Content = "daily updates on global events", Category = PostCategoryConstants.News },
            new TextData { Content = "economy and financial news", Category = PostCategoryConstants.News },
            new TextData { Content = "health and wellness tips in news", Category = PostCategoryConstants.News },
            new TextData { Content = "Bản tin thời sự tối nay có gì", Category = PostCategoryConstants.News },
            new TextData { Content = "Tin tức nóng hổi trong 24 giờ qua", Category = PostCategoryConstants.News },
            new TextData { Content = "Tình hình kinh tế thế giới biến động", Category = PostCategoryConstants.News },
            new TextData { Content = "Thông tin mới nhất về chính sách", Category = PostCategoryConstants.News },
            new TextData { Content = "Báo chí và truyền thông hiện đại", Category = PostCategoryConstants.News },

            // --- FOOD (English & Vietnamese) ---
            new TextData { Content = "Delicious pizza recipe for dinner", Category = PostCategoryConstants.Food },
            new TextData { Content = "healthy cooking tips for breakfast", Category = PostCategoryConstants.Food },
            new TextData { Content = "best restaurants in the city", Category = PostCategoryConstants.Food },
            new TextData { Content = "street food tour around the world", Category = PostCategoryConstants.Food },
            new TextData { Content = "baking cakes and desserts", Category = PostCategoryConstants.Food },
            new TextData { Content = "Món ngon mỗi ngày cho gia đình", Category = PostCategoryConstants.Food },
            new TextData { Content = "Hướng dẫn nấu phở bò chuẩn vị", Category = PostCategoryConstants.Food },
            new TextData { Content = "Địa điểm ăn vặt ngon ở Sài Gòn", Category = PostCategoryConstants.Food },
            new TextData { Content = "Ẩm thực truyền thống Việt Nam", Category = PostCategoryConstants.Food },
            new TextData { Content = "Công thức làm bánh ngọt đơn giản", Category = PostCategoryConstants.Food }
        };

        var trainingData = _mlContext.Data.LoadFromEnumerable(data);

        var pipeline = _mlContext.Transforms.Conversion.MapValueToKey("Label", nameof(TextData.Category))
            .Append(_mlContext.Transforms.Text.FeaturizeText("Features", nameof(TextData.Content)))
            .Append(_mlContext.MulticlassClassification.Trainers.SdcaMaximumEntropy("Label", "Features"))
            .Append(_mlContext.Transforms.Conversion.MapKeyToValue("PredictedLabel"));

        _textModel = pipeline.Fit(trainingData);

        var textModelPath = Path.Combine(_modelPath, "text_model.zip");
        _mlContext.Model.Save(_textModel, trainingData.Schema, textModelPath);
        
        // Reset engine so it's recreated with the new model
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
}
