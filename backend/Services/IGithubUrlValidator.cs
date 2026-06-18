using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IGithubUrlValidator
{
    Task<GithubValidateResponse> ValidateAsync(string repositoryUrl, CancellationToken cancellationToken);
}
