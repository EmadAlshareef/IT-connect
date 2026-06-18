using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class InternshipService : IInternshipService
{
    private readonly List<InternshipProgram> _programs =
    [
        new()
        {
            Id = "prog-cloud-01",
            Title = "Cloud reliability intern",
            Company = "Northwind Labs",
            Specialization = "Cloud / DevOps",
            TrainingType = "Internship",
            Summary = "Shadow on-call rotations, build runbooks, and automate health checks.",
            OpensOnUtc = DateTime.UtcNow.AddMonths(-1),
            ClosesOnUtc = DateTime.UtcNow.AddMonths(2),
        },
        new()
        {
            Id = "prog-sec-02",
            Title = "Application security residency",
            Company = "Contoso Security",
            Specialization = "Cybersecurity",
            TrainingType = "Residency",
            Summary = "Threat modeling, secure code review, and tooling integration sprints.",
            OpensOnUtc = DateTime.UtcNow.AddDays(-14),
            ClosesOnUtc = DateTime.UtcNow.AddDays(30),
        },
        new()
        {
            Id = "prog-fe-03",
            Title = "Product engineering trainee",
            Company = "Fabrikam Digital",
            Specialization = "Frontend",
            TrainingType = "Traineeship",
            Summary = "Ship UI experiments, instrument analytics, and pair with designers.",
            OpensOnUtc = DateTime.UtcNow.AddDays(-7),
            ClosesOnUtc = DateTime.UtcNow.AddDays(45),
        },
    ];

    private readonly List<InternshipApplicationRecord> _applications =
    [
        new()
        {
            Id = "app-demo-1",
            StudentId = "student-mohamed",
            ProgramId = "prog-cloud-01",
            Status = "Pending",
            CoverLetter = "Excited about reliability work and on-call culture.",
            CvFileName = "Mohamed_Ali_CV.pdf",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-5),
            Timeline =
            [
                new ApplicationTimelineStep { Label = "Application received", State = "Complete", AtUtc = DateTime.UtcNow.AddDays(-5) },
                new ApplicationTimelineStep { Label = "Recruiter screen", State = "In progress", AtUtc = DateTime.UtcNow.AddDays(-3) },
                new ApplicationTimelineStep { Label = "Technical interview", State = "Upcoming", AtUtc = DateTime.UtcNow.AddDays(2) },
            ],
        },
    ];

    public IReadOnlyList<InternshipProgram> ListPrograms() => _programs;

    public IReadOnlyList<InternshipApplicationRecord> GetApplicationsForStudent(string studentId) =>
        _applications.Where(a => a.StudentId == studentId).OrderByDescending(a => a.CreatedAtUtc).ToList();

    public InternshipApplicationRecord Apply(string studentId, InternshipApplicationRequest request)
    {
        var program = _programs.FirstOrDefault(p => p.Id == request.ProgramId);
        if (program is null)
        {
            throw new InvalidOperationException("Unknown program.");
        }

        var now = DateTime.UtcNow;
        var record = new InternshipApplicationRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            StudentId = studentId,
            ProgramId = program.Id,
            Status = "Pending",
            CoverLetter = string.IsNullOrWhiteSpace(request.CoverLetter) ? null : request.CoverLetter.Trim(),
            CvFileName = string.IsNullOrWhiteSpace(request.CvFileName) ? null : request.CvFileName.Trim(),
            CreatedAtUtc = now,
            Timeline =
            [
                new ApplicationTimelineStep { Label = "Application received", State = "Complete", AtUtc = now },
                new ApplicationTimelineStep { Label = "Recruiter screen", State = "Upcoming", AtUtc = now.AddDays(2) },
            ],
        };
        _applications.Add(record);
        return record;
    }
}
