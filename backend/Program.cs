using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TrainerPortal.Api.Application.Interfaces;
using TrainerPortal.Api.Application.Validators;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Infrastructure.Email;
using TrainerPortal.Api.Infrastructure.Identity;
using TrainerPortal.Api.Infrastructure.Persistence;
using TrainerPortal.Api.Infrastructure.Persistence.Services;
using TrainerPortal.Api.Infrastructure.Security;
using TrainerPortal.Api.Middleware;
using TrainerPortal.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

static string? FirstConfigured(params string?[] values)
{
    foreach (var value in values)
    {
        if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
    }

    return null;
}

static string RequiredSecret(WebApplicationBuilder builder, string name, string? configured, string? developmentFallback = null)
{
    if (!string.IsNullOrWhiteSpace(configured)) return configured;
    if (builder.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(developmentFallback)) return developmentFallback;
    throw new InvalidOperationException($"Missing required secret/configuration: {name}.");
}

var connectionString = FirstConfigured(
        Environment.GetEnvironmentVariable("CONNECTIONSTRINGS__DEFAULTCONNECTION"),
        builder.Configuration.GetConnectionString("DefaultConnection"))
    ?? "Data Source=trainerportal.db";

var useSqlServer = connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (useSqlServer)
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = PasswordPolicyValidator.MinimumLength;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredUniqueChars = 4;

        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = false;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultEmailProvider;
    options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultProvider;
});

builder.Services.AddScoped<IAuthService, IdentityAuthService>();
builder.Services.AddScoped<IdentityUserDirectoryService>();
builder.Services.AddScoped<IUserDirectoryService, IdentityUserDirectoryService>();
builder.Services.AddScoped<IMemberAdminService, MemberAdminService>();
builder.Services.AddScoped<PortalUserResolver>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddSingleton<DevEmailSender>();
builder.Services.AddSingleton<SmtpEmailSender>();
builder.Services.AddSingleton<IEmailSender, CompositeEmailSender>();

if (useSqlServer)
{
    builder.Services.AddScoped<IMessageService, EfMessageService>();
    builder.Services.AddScoped<ITaskRepository, EfTaskRepository>();
    builder.Services.AddScoped<IPortalNotificationService, EfPortalNotificationService>();
    builder.Services.AddScoped<ISubmissionRepository, EfSubmissionRepository>();
    builder.Services.AddScoped<IInternshipService, EfInternshipService>();
    builder.Services.AddScoped<IFeedbackService, EfFeedbackService>();
    builder.Services.AddScoped<IEnrollmentApplicationService, EfEnrollmentApplicationService>();
    builder.Services.AddScoped<ICatalogService, EfCatalogService>();
    builder.Services.AddScoped<ICompanyPortalService, EfCompanyPortalService>();
    builder.Services.AddScoped<ITrainerTaskBriefService, EfTrainerTaskBriefService>();
    builder.Services.AddScoped<ITrainingTopicService, EfTrainingTopicService>();
}
else
{
    builder.Services.AddSingleton<IUserDirectoryService, UserDirectoryFacade>();
    builder.Services.AddSingleton<IMessageService, MessageService>();
    builder.Services.AddSingleton<ITaskRepository, TaskRepository>();
    builder.Services.AddSingleton<ISubmissionRepository, SubmissionRepository>();
    builder.Services.AddSingleton<IInternshipService, InternshipService>();
    builder.Services.AddSingleton<IFeedbackService, FeedbackService>();
    builder.Services.AddSingleton<IEnrollmentApplicationService, EnrollmentApplicationService>();
}
builder.Services.AddScoped<ICourseAccessAuthorizationService, CourseAccessAuthorizationService>();
builder.Services.AddSingleton<ILearningAssistantService, LearningAssistantService>();
builder.Services.AddHttpClient<IGithubUrlValidator, GithubUrlValidator>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("TrainingSphere-Api/1.0");
});
builder.Services.AddHttpClient();

var jwtKey = RequiredSecret(
    builder,
    "Jwt:Key or JWT_KEY",
    FirstConfigured(Environment.GetEnvironmentVariable("JWT_KEY"), builder.Configuration["Jwt:Key"]),
    "ThisDevelopmentKeyMustBeOverriddenOutsideDevelopment12345!");
var jwtIssuer = RequiredSecret(builder, "Jwt:Issuer", builder.Configuration["Jwt:Issuer"], "TrainerPortal");
var jwtAudience = RequiredSecret(builder, "Jwt:Audience", builder.Configuration["Jwt:Audience"], "TrainerPortalClient");

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175",
                "http://localhost:4173",
                "http://127.0.0.1:4173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

await IdentityDataSeeder.SeedAsync(app.Services);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await CompanyTrainingCatalogSync.BackfillMissingPublishedTrainingsAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    app.Run($"http://0.0.0.0:{port}");
}
else
{
    app.Run();
}
