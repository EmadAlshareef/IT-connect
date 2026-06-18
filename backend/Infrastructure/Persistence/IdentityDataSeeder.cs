using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;

namespace TrainerPortal.Api.Infrastructure.Persistence;

public static class IdentityDataSeeder
{
    public static readonly string[] Roles = ["Admin", "Student", "Trainer", "Company"];

    private sealed record SeedUser(
        string LegacyId,
        string Email,
        string PasswordConfigKey,
        string FullName,
        string Role,
        string? TrainerLegacyId = null);

    private static readonly SeedUser[] Users =
    [
        new("admin", "admin123@gmail.com", "SeedUsers:AdminPassword", "Administrator", "Admin"),
        new("trainer-2000", "trainer2000@gmail.com", "SeedUsers:Trainer2000Password", "Trainer User 2000", "Trainer"),
        new("trainer-2003", "trainer2003@gmail.com", "SeedUsers:Trainer2003Password", "Trainer User", "Trainer"),
        new("student-mohamed", "mohamed.ali@example.com", "SeedUsers:StudentPassword", "Mohamed Ali", "Student", "trainer-2003"),
        new("student-sara", "sara.ahmed@example.com", "SeedUsers:StudentPassword", "Sara Ahmed", "Student", "trainer-2003"),
        new("student-hassan", "hassan@example.com", "SeedUsers:StudentPassword", "Hassan Ibrahim", "Student", "trainer-2003"),
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var environment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        if (db.Database.IsSqlite())
        {
            await db.Database.MigrateAsync();
        }
        else if (!await db.Database.CanConnectAsync())
        {
            throw new InvalidOperationException("Cannot connect to the configured database.");
        }

        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        string? trainerUserId = null;
        foreach (var seed in Users)
        {
            var existing = await userManager.FindByEmailAsync(seed.Email);
            if (existing is not null)
            {
                var existingSeedPassword = ResolveSeedPassword(configuration, environment, seed);
                if (environment.IsDevelopment() && !string.IsNullOrWhiteSpace(existingSeedPassword))
                {
                    await EnsureSeedUserHealthyAsync(userManager, existing, seed, existingSeedPassword);
                }

                if (seed.Role == "Trainer")
                {
                    trainerUserId = existing.Id;
                }
                continue;
            }

            var user = new ApplicationUser
            {
                UserName = seed.Email,
                Email = seed.Email,
                EmailConfirmed = true,
                FullName = seed.FullName,
                LegacyUserId = seed.LegacyId,
                TrainerLegacyId = seed.TrainerLegacyId,
                AssignedTrainerUserId = seed.TrainerLegacyId is not null ? trainerUserId : null,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
            };

            var seedPassword = ResolveSeedPassword(configuration, environment, seed);
            if (string.IsNullOrWhiteSpace(seedPassword))
            {
                continue;
            }

            var result = await userManager.CreateAsync(user, seedPassword);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to seed user {seed.Email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }

            await userManager.AddToRoleAsync(user, seed.Role);

            if (seed.Role == "Trainer")
            {
                trainerUserId = user.Id;
            }
        }
    }

    private static async Task EnsureSeedUserHealthyAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        SeedUser seed,
        string seedPassword)
    {
        if (user.IsDeleted) return;

        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        await userManager.UpdateAsync(user);

        if (!await userManager.CheckPasswordAsync(user, seedPassword))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var reset = await userManager.ResetPasswordAsync(user, token, seedPassword);
            if (!reset.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to reset seed password for {seed.Email}: {string.Join(", ", reset.Errors.Select(e => e.Description))}");
            }
        }

        var roles = await userManager.GetRolesAsync(user);
        if (!roles.Contains(seed.Role))
        {
            if (roles.Count > 0)
            {
                await userManager.RemoveFromRolesAsync(user, roles);
            }

            await userManager.AddToRoleAsync(user, seed.Role);
        }
    }

    private static string? ResolveSeedPassword(IConfiguration configuration, IHostEnvironment environment, SeedUser seed)
    {
        var password = configuration[seed.PasswordConfigKey];
        if (!string.IsNullOrWhiteSpace(password)) return password;
        if (environment.IsDevelopment())
        {
            return configuration[$"Development:{seed.PasswordConfigKey}"];
        }

        return null;
    }
}
