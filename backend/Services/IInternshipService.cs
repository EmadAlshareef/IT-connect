using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IInternshipService
{
    IReadOnlyList<InternshipProgram> ListPrograms();
    IReadOnlyList<InternshipApplicationRecord> GetApplicationsForStudent(string studentId);
    InternshipApplicationRecord Apply(string studentId, InternshipApplicationRequest request);
}
