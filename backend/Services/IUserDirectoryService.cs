using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IUserDirectoryService
{
    AuthUser? ValidateCredentials(string email, string password);
    AuthUser? GetById(string userId);

    AuthUser? GetByEmail(string email);
    IReadOnlyList<AuthUser> GetStudentsForTrainer(string trainerId);
    AuthUser? GetTrainerForStudent(string studentId);
    bool CanCommunicate(string senderId, string receiverId);
}
