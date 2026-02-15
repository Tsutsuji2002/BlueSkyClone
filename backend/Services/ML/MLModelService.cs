using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.ML;
using Microsoft.ML.Data;
using Microsoft.ML.Vision;
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
    private ITransformer? _textModel;
    private PredictionEngine<TextData, TextPrediction>? _textPredictionEngine;
    private readonly string _modelPath = Path.Combine(AppContext.BaseDirectory, "MLModels");

    public MLModelService()
    {
        _mlContext = new MLContext(seed: 1);
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
        // Placeholder: Image prediction logic using Vision/TensorFlow
        // In a real app, this would download the image and run it through a vision model.
        return "neutral"; 
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
