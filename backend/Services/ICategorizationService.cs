using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface ICategorizationService
{
    Task<List<int>> CategorizePostAsync(string content, List<string>? imageUrls = null);
}
