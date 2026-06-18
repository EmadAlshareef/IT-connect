using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Entities.Portal;

namespace TrainerPortal.Api.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLogEntry> AuditLogs => Set<AuditLogEntry>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<UserCompany> UserCompanies => Set<UserCompany>();
    public DbSet<CompanyTrainer> CompanyTrainers => Set<CompanyTrainer>();
    public DbSet<CompanyTrainerLinkedTrack> CompanyTrainerLinkedTracks => Set<CompanyTrainerLinkedTrack>();
    public DbSet<CompanyTrackRequest> CompanyTrackRequests => Set<CompanyTrackRequest>();
    public DbSet<CompanyTrainingRequest> CompanyTrainingRequests => Set<CompanyTrainingRequest>();
    public DbSet<CompanyPostRequest> CompanyPostRequests => Set<CompanyPostRequest>();
    public DbSet<CompanySelectedTrack> CompanySelectedTracks => Set<CompanySelectedTrack>();
    public DbSet<Track> Tracks => Set<Track>();
    public DbSet<Training> Trainings => Set<Training>();
    public DbSet<TrainingSection> TrainingSections => Set<TrainingSection>();
    public DbSet<SectionEnrollment> SectionEnrollments => Set<SectionEnrollment>();
    public DbSet<CompanyPost> CompanyPosts => Set<CompanyPost>();
    public DbSet<JobApplicant> JobApplicants => Set<JobApplicant>();
    public DbSet<EnrollmentApplication> EnrollmentApplications => Set<EnrollmentApplication>();
    public DbSet<PortalNotification> PortalNotifications => Set<PortalNotification>();
    public DbSet<TraineeTask> TraineeTasks => Set<TraineeTask>();
    public DbSet<TrainerTaskBrief> TrainerTaskBriefs => Set<TrainerTaskBrief>();
    public DbSet<TrainingTopic> TrainingTopics => Set<TrainingTopic>();
    public DbSet<TaskSubmission> TaskSubmissions => Set<TaskSubmission>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<TrainerFeedback> TrainerFeedbackEntries => Set<TrainerFeedback>();
    public DbSet<TraineeEvaluation> TraineeEvaluations => Set<TraineeEvaluation>();
    public DbSet<InternshipProgram> InternshipPrograms => Set<InternshipProgram>();
    public DbSet<InternshipApplication> InternshipApplications => Set<InternshipApplication>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ConfigurePortalEntities();

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
            entity.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AuditLogEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.EventType);
            entity.Property(x => x.Email).HasMaxLength(256);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.Property(x => x.UserAgent).HasMaxLength(512);
            entity.Property(x => x.Details).HasMaxLength(2000);
        });

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(x => x.FullName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.LegacyUserId).HasMaxLength(64).IsRequired();
            entity.Property(x => x.TrainerLegacyId).HasMaxLength(64);
            entity.Property(x => x.AssignedTrainerUserId).HasMaxLength(450);
            entity.HasIndex(x => x.LegacyUserId);
            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(x => x.AssignedTrainerUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<UserCompany>(entity =>
        {
            entity.ToTable("UserCompanies");
            entity.HasKey(x => new { x.UserId, x.CompanyId });
            entity.Property(x => x.UserId).HasMaxLength(450);
            entity.Property(x => x.CompanyId).HasMaxLength(64);
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.UserId)
                .IsUnique()
                .HasFilter("[IsPrimary] = 1")
                .HasDatabaseName("UX_UserCompanies_PrimaryPerUser");
            entity.HasOne(x => x.User)
                .WithMany(x => x.CompanyMemberships)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Company)
                .WithMany(x => x.UserMemberships)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
