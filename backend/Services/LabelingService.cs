using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;

namespace BSkyClone.Services;

public class LabelingService : ILabelingService
{
    private readonly IUnitOfWork _unitOfWork;

    public LabelingService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<Label>> GetLabelsAsync(string uri, string? cid = null)
    {
        var labels = await _unitOfWork.Labels.FindAsync(l => l.Uri == uri);
        if (!string.IsNullOrEmpty(cid))
        {
            return labels.Where(l => l.Cid == null || l.Cid == cid);
        }
        return labels;
    }

    public async Task<IEnumerable<Label>> GetLabelsForSubjectsAsync(IEnumerable<string> uris)
    {
        // This is a naive implementation; for production, we'd want a more optimized query
        var labels = await _unitOfWork.Labels.FindAsync(l => uris.Contains(l.Uri));
        return labels;
    }

    public async Task<Label> AddLabelAsync(string src, string uri, string val, string? cid = null, bool neg = false)
    {
        var label = new Label
        {
            Src = src,
            Uri = uri,
            Val = val,
            Cid = cid,
            Neg = neg,
            CreatedAt = DateTime.UtcNow
        };

        _unitOfWork.Labels.Add(label);
        await _unitOfWork.CompleteAsync();
        return label;
    }

    public async Task<Report> CreateReportAsync(Guid reporterId, string subjectType, string subjectUri, string reasonType, string? reasonText = null, string? subjectCid = null)
    {
        var report = new Report
        {
            ReporterId = reporterId,
            SubjectType = subjectType,
            SubjectUri = subjectUri,
            SubjectCid = subjectCid,
            ReasonType = reasonType,
            ReasonText = reasonText,
            CreatedAt = DateTime.UtcNow,
            Status = "open"
        };

        _unitOfWork.Reports.Add(report);
        await _unitOfWork.CompleteAsync();
        return report;
    }

    public async Task RunAutomatedLabelingAsync(Post post)
    {
        if (string.IsNullOrEmpty(post.Content)) return;

        // Simple keyword-based filter list
        var filters = new Dictionary<string[], string>
        {
            { new[] { "spam", "buy now", "free crypto" }, "spam" },
            { new[] { "offensive word", "insult" }, "harassment" },
            { new[] { "clickbait" }, "clickbait" }
        };

        var contentLower = post.Content.ToLowerInvariant();
        var didApply = false;

        foreach (var filter in filters)
        {
            if (filter.Key.Any(k => contentLower.Contains(k)))
            {
                var label = new Label
                {
                    Src = "at://system.labeler",
                    Uri = $"at://{post.Author?.Did ?? "unknown"}/app.bsky.feed.post/{post.Tid}",
                    Val = filter.Value,
                    CreatedAt = DateTime.UtcNow
                };
                _unitOfWork.Labels.Add(label);
                didApply = true;
            }
        }

        if (didApply)
        {
            await _unitOfWork.CompleteAsync();
        }
    }
}
