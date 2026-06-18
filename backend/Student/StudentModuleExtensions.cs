using TrainerPortal.Student.Application.Contracts;

namespace TrainerPortal.Student;

/// <summary>
/// Wire Student module services when EF/repository implementations are ready.
/// Call from Program.cs: builder.Services.AddStudentModule(builder.Configuration);
/// </summary>
public static class StudentModuleExtensions
{
    public static IServiceCollection AddStudentModule(this IServiceCollection services, IConfiguration _)
    {
        // TODO: Register implementations, e.g.:
        // services.AddScoped<IStudentAuthService, StudentAuthService>();
        // services.AddScoped<IStudentRepository, StudentRepository>();
        // services.AddDbContext<StudentDbContext>(...);
        return services;
    }
}
