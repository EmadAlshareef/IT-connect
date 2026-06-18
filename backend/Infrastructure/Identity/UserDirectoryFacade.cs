using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Identity;

/// <summary>
/// Singleton facade so in-memory singleton services can resolve scoped user lookups safely.
/// </summary>
public sealed class UserDirectoryFacade(IServiceScopeFactory scopeFactory) : IUserDirectoryService
{
    public AuthUser? ValidateCredentials(string email, string password) =>
        Execute(service => service.ValidateCredentials(email, password));

    public AuthUser? GetById(string userId) =>
        Execute(service => service.GetById(userId));

    public AuthUser? GetByEmail(string email) =>
        Execute(service => service.GetByEmail(email));

    public IReadOnlyList<AuthUser> GetStudentsForTrainer(string trainerId) =>
        Execute(service => service.GetStudentsForTrainer(trainerId));

    public AuthUser? GetTrainerForStudent(string studentId) =>
        Execute(service => service.GetTrainerForStudent(studentId));

    public bool CanCommunicate(string senderId, string receiverId) =>
        Execute(service => service.CanCommunicate(senderId, receiverId));

    private T Execute<T>(Func<IdentityUserDirectoryService, T> action)
    {
        using var scope = scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IdentityUserDirectoryService>();
        return action(service);
    }
}
