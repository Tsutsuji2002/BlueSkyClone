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
        if (_textPredictionEngine == null)
        {
            LoadTextModel();
            if (_textModel == null) return "unknown";
            _textPredictionEngine = _mlContext.Model.CreatePredictionEngine<TextData, TextPrediction>(_textModel);
        }

        var prediction = _textPredictionEngine.Predict(new TextData { Content = content });
        return PostCategoryConstants.Normalize(prediction.Category);
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
            new TextData { Content = "I love this new tech and AI programming", Category = PostCategoryConstants.Tech },
            new TextData { Content = "Check out this sunset photography", Category = PostCategoryConstants.Nature },
            new TextData { Content = "The game graphics on Xbox are amazing", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "New album from my favorite music artist", Category = PostCategoryConstants.Music },
            new TextData { Content = "Politics and world news updates", Category = PostCategoryConstants.News },
            new TextData { Content = "Just finished a painting, digital art is fun", Category = PostCategoryConstants.Art },
            new TextData { Content = "coding in csharp is great", Category = PostCategoryConstants.Tech },
            new TextData { Content = "forest hiking trails", Category = PostCategoryConstants.Nature },
            new TextData { Content = "playstation 5 exclusive games", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "piano concerto live", Category = PostCategoryConstants.Music },
            new TextData { Content = "breaking news report", Category = PostCategoryConstants.News },
            new TextData { Content = "oil painting on canvas", Category = PostCategoryConstants.Art },
            new TextData { Content = "machine learning with ml.net", Category = PostCategoryConstants.Tech },
            new TextData { Content = "mountain landscape photo", Category = PostCategoryConstants.Nature },
            new TextData { Content = "steam deck gaming", Category = PostCategoryConstants.Gaming },
            new TextData { Content = "guitar solo performance", Category = PostCategoryConstants.Music }
        };

        var trainingData = _mlContext.Data.LoadFromEnumerable(data);

        var pipeline = _mlContext.Transforms.Conversion.MapValueToKey("Label", nameof(TextData.Category))
            .Append(_mlContext.Transforms.Text.FeaturizeText("Features", nameof(TextData.Content)))
            .Append(_mlContext.MulticlassClassification.Trainers.SdcaMaximumEntropy("Label", "Features"))
            .Append(_mlContext.Transforms.Conversion.MapKeyToValue("PredictedLabel"));

        _textModel = pipeline.Fit(trainingData);

        var textModelPath = Path.Combine(_modelPath, "text_model.zip");
        _mlContext.Model.Save(_textModel, trainingData.Schema, textModelPath);
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
