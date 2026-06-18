using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;

namespace TrainerPortal.Api.Infrastructure.Persistence;

internal static class PortalModelConfiguration
{
    public static void ConfigurePortalEntities(this ModelBuilder builder)
    {
        builder.Entity<RefStatus>(e => { e.ToTable("RefStatuses"); e.HasKey(x => x.Id); });
        builder.Entity<RefNotificationTone>(e => { e.ToTable("RefNotificationTones"); e.HasKey(x => x.Code); });
        builder.Entity<RefCourseCategory>(e => { e.ToTable("RefCourseCategories"); e.HasKey(x => x.Code); });
        builder.Entity<RefTag>(e => { e.ToTable("RefTags"); e.HasKey(x => x.Id); });

        builder.Entity<Branch>(e =>
        {
            e.ToTable("Branches");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
        });

        builder.Entity<Company>(e =>
        {
            e.ToTable("Companies");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Phone).HasMaxLength(32);
            e.Property(x => x.LogoUrl).HasColumnType("nvarchar(max)");
            e.Property(x => x.Industry).HasMaxLength(120);
            e.Property(x => x.Location).HasMaxLength(200);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.IsActive);
            e.HasIndex(x => x.LegacyLocalId);
            e.HasIndex(x => x.Email);
        });

        builder.Entity<CompanyTrainer>(e =>
        {
            e.ToTable("CompanyTrainers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CompanyId).HasMaxLength(64);
            e.Property(x => x.CompanyEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(120).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.CompanyPosition).HasMaxLength(120);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasOne(x => x.Company).WithMany(x => x.Trainers).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
            e.HasIndex(x => x.CompanyEmail);
        });

        builder.Entity<CompanyTrainerLinkedTrack>(e =>
        {
            e.ToTable("CompanyTrainerLinkedTracks");
            e.HasKey(x => new { x.TrainerId, x.TrackTitle });
            e.Property(x => x.TrainerId).HasMaxLength(64);
            e.Property(x => x.TrackTitle).HasMaxLength(200);
            e.HasOne(x => x.Trainer).WithMany(x => x.LinkedTracks).HasForeignKey(x => x.TrainerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CompanyTrackRequest>(e =>
        {
            e.ToTable("CompanyTrackRequests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CompanyId).HasMaxLength(64);
            e.Property(x => x.CompanyEmail).HasMaxLength(256);
            e.Property(x => x.BranchId).HasMaxLength(64).IsRequired();
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.RequestedBy).HasMaxLength(120);
            e.Property(x => x.RequestedByEmail).HasMaxLength(256);
            e.Property(x => x.Status).HasMaxLength(32).IsRequired();
            e.Property(x => x.ApprovedTrackId).HasMaxLength(64);
            e.Property(x => x.ReviewedBy).HasMaxLength(120);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasOne(x => x.Company).WithMany(x => x.TrackRequests).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => x.CompanyId);
            e.HasIndex(x => new { x.BranchId, x.Status });
        });

        builder.Entity<CompanyTrainingRequest>(e =>
        {
            e.ToTable("CompanyTrainingRequests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CompanyId).HasMaxLength(64);
            e.Property(x => x.CompanyEmail).HasMaxLength(256);
            e.Property(x => x.BranchId).HasMaxLength(64).IsRequired();
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.TrackRequestId).HasMaxLength(64);
            e.Property(x => x.TrackTitle).HasMaxLength(200);
            e.Property(x => x.TrainerName).HasMaxLength(120);
            e.Property(x => x.TrainerEmail).HasMaxLength(256);
            e.Property(x => x.TrainingStatus).HasMaxLength(32).IsRequired();
            e.Property(x => x.DocumentFileName).HasMaxLength(260);
            e.Property(x => x.RequestedBy).HasMaxLength(120);
            e.Property(x => x.RequestedByEmail).HasMaxLength(256);
            e.Property(x => x.ReviewStatus).HasMaxLength(32).IsRequired();
            e.Property(x => x.ReviewedBy).HasMaxLength(120);
            e.Property(x => x.PublishedTrainingId).HasMaxLength(64);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasOne(x => x.Company).WithMany(x => x.TrainingRequests).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => x.CompanyId);
            e.HasIndex(x => x.BranchId);
        });

        builder.Entity<CompanyPostRequest>(e =>
        {
            e.ToTable("CompanyPostRequests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CompanyId).HasMaxLength(64);
            e.Property(x => x.CompanyEmail).HasMaxLength(256);
            e.Property(x => x.BranchId).HasMaxLength(64).IsRequired();
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.TrainingTitle).HasMaxLength(300);
            e.Property(x => x.CompanyTrainingRequestId).HasMaxLength(64);
            e.Property(x => x.SkillsRaw).HasMaxLength(500);
            e.Property(x => x.RequestedBy).HasMaxLength(120);
            e.Property(x => x.RequestedByEmail).HasMaxLength(256);
            e.Property(x => x.ReviewStatus).HasMaxLength(32).IsRequired();
            e.Property(x => x.ReviewedBy).HasMaxLength(120);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasOne(x => x.Company).WithMany(x => x.PostRequests).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => x.CompanyId);
            e.HasIndex(x => x.BranchId);
        });

        builder.Entity<CompanySelectedTrack>(e =>
        {
            e.ToTable("CompanySelectedTracks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.CompanyId).HasMaxLength(64);
            e.Property(x => x.CompanyEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.TrackValue).HasMaxLength(200).IsRequired();
            e.Property(x => x.Title).HasMaxLength(200);
            e.HasOne(x => x.Company).WithMany(x => x.SelectedTracks).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
            e.HasIndex(x => new { x.CompanyEmail, x.TrackValue }).IsUnique();
        });

        builder.Entity<Track>(e =>
        {
            e.ToTable("Tracks");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<Training>(e =>
        {
            e.ToTable("Trainings");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Track).WithMany().HasForeignKey(x => x.TrackId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<TrainingSection>(e =>
        {
            e.ToTable("TrainingSections");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.CompanyEntity).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<SectionEnrollment>(e =>
        {
            e.ToTable("SectionEnrollments");
            e.HasKey(x => new { x.SectionId, x.StudentUserId });
        });

        builder.Entity<CompanyPost>(e =>
        {
            e.ToTable("CompanyPosts");
            e.HasKey(x => x.Id);
            e.HasMany(x => x.Tags).WithOne().HasForeignKey(x => x.PostId);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<CompanyPostTag>(e =>
        {
            e.ToTable("CompanyPostTags");
            e.HasKey(x => new { x.PostId, x.TagId });
            e.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId);
        });

        builder.Entity<JobApplicant>(e =>
        {
            e.ToTable("JobApplicants");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<EnrollmentApplication>(e =>
        {
            e.ToTable("EnrollmentApplications");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<PortalNotification>(e =>
        {
            e.ToTable("PortalNotifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.SubmissionId).HasMaxLength(64);
            e.Property(x => x.TopicId).HasMaxLength(64);
            e.Property(x => x.StudentLegacyId).HasMaxLength(64);
            e.Property(x => x.TargetPath).HasMaxLength(260);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<TraineeTask>(e =>
        {
            e.ToTable("Tasks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.StudentUserId).HasMaxLength(450);
            e.Property(x => x.SectionId).HasMaxLength(128);
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Description).HasColumnType("nvarchar(max)");
            e.Property(x => x.LastSubmissionId).HasMaxLength(64);
            e.Property(x => x.TrainerEmail).HasMaxLength(256);
            e.Property(x => x.TrainerName).HasMaxLength(120);
            e.Property(x => x.SessionTitle).HasMaxLength(300);
            e.Property(x => x.TrainingSessionId).HasMaxLength(64);
            e.Property(x => x.Deadline).HasMaxLength(32);
            e.Property(x => x.AttachmentName).HasMaxLength(260);
            e.Property(x => x.AttachmentDataUrl).HasColumnType("nvarchar(max)");
            e.Property(x => x.BranchId).HasMaxLength(64);
            e.Property(x => x.CourseId).HasMaxLength(64);
            e.Property(x => x.CourseTitle).HasMaxLength(300);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasIndex(x => x.TrainerEmail);
            e.HasIndex(x => x.SectionId);
            e.HasIndex(x => new { x.BranchId, x.CourseId, x.IsPublished });
        });

        builder.Entity<TrainingTopic>(e =>
        {
            e.ToTable("TrainingTopics");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.TrainerEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.TrainingSessionId).HasMaxLength(64).IsRequired();
            e.Property(x => x.TrainingTitle).HasMaxLength(300);
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Explanation).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Status).HasMaxLength(32).IsRequired();
            e.Property(x => x.ContentKey).HasMaxLength(200);
            e.Property(x => x.VideoUrl).HasColumnType("nvarchar(max)");
            e.Property(x => x.VideoCaption).HasMaxLength(500);
            e.Property(x => x.VideoSource).HasMaxLength(64);
            e.Property(x => x.VideoFileName).HasMaxLength(260);
            e.Property(x => x.VideoBlobUrl).HasMaxLength(500);
            e.Property(x => x.SectionsJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.AttachmentsJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.EnrolledStudentIdsJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.BranchId).HasMaxLength(64);
            e.Property(x => x.CourseId).HasMaxLength(64);
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasIndex(x => x.TrainerEmail);
            e.HasIndex(x => x.TrainingSessionId);
            e.HasIndex(x => new { x.Status, x.TrainingSessionId });
        });

        builder.Entity<TrainerTaskBrief>(e =>
        {
            e.ToTable("TrainerTaskBriefs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.RequestedByEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.TrainerName).HasMaxLength(120);
            e.Property(x => x.SessionId).HasMaxLength(64).IsRequired();
            e.Property(x => x.SessionTitle).HasMaxLength(300);
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Description).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Deadline).HasMaxLength(32);
            e.Property(x => x.AttachmentName).HasMaxLength(260);
            e.Property(x => x.BranchId).HasMaxLength(64);
            e.Property(x => x.CourseId).HasMaxLength(64);
            e.Property(x => x.CourseTitle).HasMaxLength(300);
            e.Property(x => x.Status).HasMaxLength(32).IsRequired();
            e.Property(x => x.LegacyLocalId).HasMaxLength(64);
            e.HasIndex(x => x.RequestedByEmail);
            e.HasIndex(x => x.SessionId);
            e.HasIndex(x => new { x.BranchId, x.CourseId, x.Status });
        });

        builder.Entity<TaskSubmission>(e =>
        {
            e.ToTable("TaskSubmissions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Status).HasMaxLength(64);
            e.Property(x => x.Grade).HasMaxLength(16);
            e.Property(x => x.EvaluationFeedback).HasColumnType("nvarchar(max)");
            e.Property(x => x.TaskTitle).HasMaxLength(300);
        });

        builder.Entity<Message>(e => { e.ToTable("Messages"); e.HasKey(x => x.Id); });

        builder.Entity<TrainerFeedback>(e => { e.ToTable("TrainerFeedback"); e.HasKey(x => x.Id); });

        builder.Entity<TraineeEvaluation>(e =>
        {
            e.ToTable("TraineeEvaluations");
            e.HasKey(x => x.Id);
            e.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.EvaluationId);
        });

        builder.Entity<EvaluationTaskItem>(e => { e.ToTable("EvaluationTaskItems"); e.HasKey(x => x.Id); });

        builder.Entity<InternshipProgram>(e =>
        {
            e.ToTable("InternshipPrograms");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.CompanyEntity).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CompanyId);
        });

        builder.Entity<InternshipApplication>(e =>
        {
            e.ToTable("InternshipApplications");
            e.HasKey(x => x.Id);
            e.HasMany(x => x.TimelineSteps).WithOne().HasForeignKey(x => x.ApplicationId);
        });

        builder.Entity<InternshipApplicationTimelineStep>(e =>
        {
            e.ToTable("InternshipApplicationTimelineSteps");
            e.HasKey(x => x.Id);
        });
    }
}
