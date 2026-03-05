using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface ISupportRequestService
{
    Task<SupportRequestDto> SubmitRequestAsync(CreateSupportRequestDto dto, Guid? userId);
    Task<IEnumerable<SupportRequestDto>> GetAllRequestsAsync();
    Task<SupportRequestDto?> GetRequestByIdAsync(Guid id);
    Task<bool> UpdateStatusAsync(Guid id, string status);
}
