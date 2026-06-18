using System.Text.RegularExpressions;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed partial class GithubUrlValidator(HttpClient httpClient) : IGithubUrlValidator
{
    [GeneratedRegex(@"^https?://(www\.)?github\.com/[\w\.\-]+/[\w\.\-]+/?$", RegexOptions.IgnoreCase)]
    private static partial Regex GitHubRepoPattern();

    public async Task<GithubValidateResponse> ValidateAsync(string repositoryUrl, CancellationToken cancellationToken)
    {
        var trimmed = repositoryUrl.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return new GithubValidateResponse { IsValid = false, Message = "Repository URL is required." };
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return new GithubValidateResponse { IsValid = false, Message = "Enter a valid absolute URL (https://...)." };
        }

        if (!GitHubRepoPattern().IsMatch(trimmed))
        {
            return new GithubValidateResponse
            {
                IsValid = false,
                Message = "Use a public GitHub repository URL like https://github.com/org/repo",
            };
        }

        var normalized = $"{uri.Scheme}://{uri.Host}{uri.AbsolutePath}".TrimEnd('/');
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Head, normalized);
            using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new GithubValidateResponse
                {
                    IsValid = false,
                    Message = "GitHub returned 404 for that path. Check the org/repo name.",
                    NormalizedUrl = normalized,
                };
            }

            return new GithubValidateResponse
            {
                IsValid = true,
                Message = "Repository URL validated.",
                NormalizedUrl = normalized,
            };
        }
        catch (HttpRequestException)
        {
            return new GithubValidateResponse
            {
                IsValid = false,
                Message = "Could not reach GitHub from the server. The URL format looks acceptable; try again later.",
                NormalizedUrl = normalized,
            };
        }
    }
}
