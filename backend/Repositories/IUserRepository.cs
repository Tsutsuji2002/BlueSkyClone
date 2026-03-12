using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByHandleAsync(string handle);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByDidAsync(string did);
}
