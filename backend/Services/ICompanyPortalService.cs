using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ICompanyPortalService
{
    Task<IReadOnlyList<CompanyDto>> ListCompaniesAsync(string? email = null, CancellationToken cancellationToken = default);
    Task<CompanyDto?> GetCompanyAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanyDto> CreateCompanyAsync(CreateCompanyRequest request, CancellationToken cancellationToken = default);
    Task<CompanyDto?> UpdateCompanyAsync(string id, UpdateCompanyRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompanyTrainerDto>> ListCompanyTrainersAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? trainerEmail = null,
        CancellationToken cancellationToken = default);
    Task<CompanyTrainerDto?> GetCompanyTrainerAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanyTrainerDto> CreateCompanyTrainerAsync(CreateCompanyTrainerRequest request, CancellationToken cancellationToken = default);
    Task<CompanyTrainerDto?> UpdateCompanyTrainerAsync(string id, UpdateCompanyTrainerRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyTrainerAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompanyTrackRequestDto>> ListCompanyTrackRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        CancellationToken cancellationToken = default);
    Task<CompanyTrackRequestDto?> GetCompanyTrackRequestAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanyTrackRequestDto> CreateCompanyTrackRequestAsync(CreateCompanyTrackRequestRequest request, CancellationToken cancellationToken = default);
    Task<CompanyTrackRequestDto?> UpdateCompanyTrackRequestAsync(string id, UpdateCompanyTrackRequestRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyTrackRequestAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompanyTrainingRequestDto>> ListCompanyTrainingRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        string? trainerEmail = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CompanyEnrolledStudentDto>> ListCompanyEnrolledStudentsAsync(
        string? companyId = null,
        string? companyEmail = null,
        CancellationToken cancellationToken = default);
    Task<CompanyTrainingRequestDto?> GetCompanyTrainingRequestAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanyTrainingRequestDto> CreateCompanyTrainingRequestAsync(CreateCompanyTrainingRequestRequest request, CancellationToken cancellationToken = default);
    Task<CompanyTrainingRequestDto?> UpdateCompanyTrainingRequestAsync(string id, UpdateCompanyTrainingRequestRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyTrainingRequestAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompanyPostRequestDto>> ListCompanyPostRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        CancellationToken cancellationToken = default);
    Task<CompanyPostRequestDto?> GetCompanyPostRequestAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanyPostRequestDto> CreateCompanyPostRequestAsync(CreateCompanyPostRequestRequest request, CancellationToken cancellationToken = default);
    Task<CompanyPostRequestDto?> UpdateCompanyPostRequestAsync(string id, UpdateCompanyPostRequestRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyPostRequestAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompanySelectedTrackDto>> ListCompanySelectedTracksAsync(
        string? companyId = null,
        string? companyEmail = null,
        CancellationToken cancellationToken = default);
    Task<CompanySelectedTrackDto?> GetCompanySelectedTrackAsync(string id, CancellationToken cancellationToken = default);
    Task<CompanySelectedTrackDto> CreateCompanySelectedTrackAsync(CreateCompanySelectedTrackRequest request, CancellationToken cancellationToken = default);
    Task<CompanySelectedTrackDto?> UpdateCompanySelectedTrackAsync(string id, UpdateCompanySelectedTrackRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanySelectedTrackAsync(string id, CancellationToken cancellationToken = default);
}
