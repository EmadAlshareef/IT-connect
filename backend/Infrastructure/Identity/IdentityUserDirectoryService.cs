using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Infrastructure.Persistence;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Identity;

public sealed class IdentityUserDirectoryService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager) : IUserDirectoryService
{
    public AuthUser? ValidateCredentials(string email, string password) => null;

    public AuthUser? GetById(string userId)
    {
        var user = dbContext.Users.AsNoTracking()
            .FirstOrDefault(u => u.LegacyUserId == userId || u.Id == userId);
        return user is null ? null : MapToAuthUser(user);
    }

    public AuthUser? GetByEmail(string email)
    {
        var normalized = email.Trim().ToUpperInvariant();
        var user = dbContext.Users.AsNoTracking()
            .FirstOrDefault(u => u.NormalizedEmail == normalized);
        return user is null ? null : MapToAuthUser(user);
    }

    public IReadOnlyList<AuthUser> GetStudentsForTrainer(string trainerId)
    {
        var trainer = dbContext.Users.AsNoTracking()
            .FirstOrDefault(u => u.LegacyUserId == trainerId || u.Id == trainerId);

        if (trainer is null)
        {
            return [];
        }

        return dbContext.Users.AsNoTracking()
            .Where(u =>
                u.AssignedTrainerUserId == trainer.Id
                || u.TrainerLegacyId == trainerId)
            .AsEnumerable()
            .Select(MapToAuthUser)
            .Where(u => u.Role == "Student")
            .ToList();
    }

    public AuthUser? GetTrainerForStudent(string studentId)
    {
        var student = GetById(studentId);
        if (student is null || student.Role != "Student" || string.IsNullOrWhiteSpace(student.TrainerId))
        {
            return null;
        }

        return GetById(student.TrainerId);
    }

    public bool CanCommunicate(string senderId, string receiverId)
    {
        if (string.Equals(senderId, receiverId, StringComparison.Ordinal))
        {
            return false;
        }

        var sender = GetById(senderId);
        var receiver = GetById(receiverId);
        if (sender is null || receiver is null) return false;
        if (sender.Role == "Admin" || receiver.Role == "Admin") return true;

        if (sender.Role == "Trainer" && receiver.Role == "Student")
        {
            return string.Equals(receiver.TrainerId, sender.Id, StringComparison.OrdinalIgnoreCase);
        }

        if (sender.Role == "Student" && receiver.Role == "Trainer")
        {
            return string.Equals(sender.TrainerId, receiver.Id, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    private string ResolveTrainerLegacyId(ApplicationUser user)
    {
        if (!string.IsNullOrWhiteSpace(user.TrainerLegacyId))
        {
            return user.TrainerLegacyId;
        }

        if (string.IsNullOrWhiteSpace(user.AssignedTrainerUserId))
        {
            return string.Empty;
        }

        var trainer = dbContext.Users.AsNoTracking()
            .FirstOrDefault(u => u.Id == user.AssignedTrainerUserId);
        return trainer?.LegacyUserId ?? string.Empty;
    }

    private AuthUser MapToAuthUser(ApplicationUser user)
    {
        var roles = userManager.GetRolesAsync(user).GetAwaiter().GetResult();
        var role = roles.FirstOrDefault() ?? "Student";
        return new AuthUser
        {
            Id = user.LegacyUserId.Length > 0 ? user.LegacyUserId : user.Id,
            Email = user.Email ?? string.Empty,
            Password = string.Empty,
            Name = user.FullName,
            Role = role,
            TrainerId = ResolveTrainerLegacyId(user),
        };
    }
}
