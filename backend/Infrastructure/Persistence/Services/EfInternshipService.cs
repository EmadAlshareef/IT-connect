using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfInternshipService(ApplicationDbContext db, PortalUserResolver users) : IInternshipService
{
    public IReadOnlyList<Models.InternshipProgram> ListPrograms() =>
        db.InternshipPrograms.AsNoTracking()
            .Where(p => !p.IsDeleted)
            .OrderBy(p => p.OpensOnUtc)
            .Select(p => new Models.InternshipProgram
            {
                Id = p.Id,
                Title = p.Title,
                Company = p.Company,
                Specialization = p.Specialization,
                TrainingType = p.TrainingType,
                Summary = p.Summary ?? string.Empty,
                OpensOnUtc = p.OpensOnUtc,
                ClosesOnUtc = p.ClosesOnUtc,
            })
            .ToList();

    public IReadOnlyList<InternshipApplicationRecord> GetApplicationsForStudent(string studentId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return [];

        return db.InternshipApplications.AsNoTracking()
            .Include(a => a.TimelineSteps)
            .Where(a => a.StudentUserId == user.Id)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => Map(a, studentId))
            .ToList();
    }

    public InternshipApplicationRecord Apply(string studentId, InternshipApplicationRequest request)
    {
        var user = users.FindByLegacyOrId(studentId)
            ?? throw new InvalidOperationException("Student not found.");

        var program = db.InternshipPrograms.AsNoTracking()
            .FirstOrDefault(p => p.Id == request.ProgramId && !p.IsDeleted)
            ?? throw new InvalidOperationException("Unknown program.");

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid().ToString("N");
        var application = new InternshipApplication
        {
            Id = id,
            StudentUserId = user.Id,
            ProgramId = program.Id,
            StatusId = PortalStatusIds.InternshipPending,
            CoverLetter = string.IsNullOrWhiteSpace(request.CoverLetter) ? null : request.CoverLetter.Trim(),
            CvFileName = string.IsNullOrWhiteSpace(request.CvFileName) ? null : request.CvFileName.Trim(),
            CreatedAtUtc = now,
            TimelineSteps =
            [
                new InternshipApplicationTimelineStep
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = id,
                    StepOrder = 1,
                    Label = "Application received",
                    State = "Complete",
                    AtUtc = now,
                },
                new InternshipApplicationTimelineStep
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = id,
                    StepOrder = 2,
                    Label = "Recruiter screen",
                    State = "Upcoming",
                    AtUtc = now.AddDays(2),
                },
            ],
        };

        db.InternshipApplications.Add(application);
        db.SaveChanges();

        return Map(application, studentId);
    }

    private static InternshipApplicationRecord Map(InternshipApplication a, string studentLegacyId) =>
        new()
        {
            Id = a.Id,
            StudentId = studentLegacyId,
            ProgramId = a.ProgramId,
            Status = PortalStatusIds.ToDisplayLabel(a.StatusId),
            CoverLetter = a.CoverLetter,
            CvFileName = a.CvFileName,
            CreatedAtUtc = a.CreatedAtUtc,
            Timeline = a.TimelineSteps
                .OrderBy(s => s.StepOrder)
                .Select(s => new ApplicationTimelineStep
                {
                    Label = s.Label,
                    State = s.State,
                    AtUtc = s.AtUtc,
                })
                .ToList(),
        };
}
