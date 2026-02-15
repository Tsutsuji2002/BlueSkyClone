
namespace BSkyClone.Services.ML;

public class SimpleBertTokenizer
{
    private readonly Dictionary<string, int> _vocab;
    private readonly Dictionary<int, string> _paramsCache; // Not really needed for encoding
    private const string UnknownToken = "[UNK]";
    private const string ClassToken = "[CLS]";
    private const string SeparatorToken = "[SEP]";
    private const string MaskToken = "[MASK]";

    public SimpleBertTokenizer(Stream vocabStream)
    {
        _vocab = new Dictionary<string, int>();
        using (var reader = new StreamReader(vocabStream))
        {
            string line;
            int index = 0;
            while ((line = reader.ReadLine()) != null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                {
                    _vocab[line.Trim()] = index;
                }
                index++;
            }
        }
    }

    public List<long> Encode(string text)
    {
        var tokens = new List<string>();
        tokens.Add(ClassToken);

        // Basic normalization (lower case if uncased model, otherwise keep case)
        // Assume cased multilingual model as per plan, so we don't lowercase everything blindly.
        // But traditional BERT tokenization does some basic cleanup.
        // For simplicity: split by whitespace.
        
        var words = text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var word in words)
        {
            // WordPiece tokenization
            var subTokens = WordPieceTokenize(word);
            tokens.AddRange(subTokens);
        }

        tokens.Add(SeparatorToken);

        // Convert to IDs
        var ids = new List<long>();
        foreach (var token in tokens)
        {
            if (_vocab.TryGetValue(token, out int id))
            {
                ids.Add(id);
            }
            else
            {
                if (_vocab.TryGetValue(UnknownToken, out int unkId))
                    ids.Add(unkId);
            }
        }

        return ids;
    }

    private List<string> WordPieceTokenize(string word)
    {
        var outputTokens = new List<string>();
        if (string.IsNullOrEmpty(word)) return outputTokens;

        // Naive implementation of WordPiece
        // Max chars per word
        if (word.Length > 200)
        {
            outputTokens.Add(UnknownToken);
            return outputTokens;
        }

        bool isBad = false;
        int start = 0;
        var subTokens = new List<string>();

        while (start < word.Length)
        {
            int end = word.Length;
            string curSubStr = null;
            bool found = false;

            while (start < end)
            {
                var subStr = word.Substring(start, end - start);
                if (start > 0) subStr = "##" + subStr;

                if (_vocab.ContainsKey(subStr))
                {
                    curSubStr = subStr;
                    found = true;
                    break;
                }
                end--;
            }

            if (!found)
            {
                isBad = true;
                break;
            }

            subTokens.Add(curSubStr);
            start = end;
        }

        if (isBad)
        {
            outputTokens.Add(UnknownToken);
        }
        else
        {
            outputTokens.AddRange(subTokens);
        }

        return outputTokens;
    }
}
