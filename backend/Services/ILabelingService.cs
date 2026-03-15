using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface ILabelingService
{
    Task<IEnumerable<Label>> GetLabelsAsync(string uri, string? cid = null);
    Task<IEnumerable<Label>> GetLabelsForSubjectsAsync(IEnumerable<string> uris);
    Task<Label> AddLabelAsync(string src, string uri, string val, string? cid = null, bool neg = false);
    Task<Report> CreateReportAsync(Guid reporterId, string subjectType, string subjectUri, string reasonType, string? reasonText = null, string? subjectCid = null);
    Task<IEnumerable<Report>> GetReportsForSubjectAsync(string subjectUri);
    Task RunAutomatedLabelingAsync(Post post);
}
