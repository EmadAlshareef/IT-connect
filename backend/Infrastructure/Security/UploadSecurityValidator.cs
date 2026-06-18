using Microsoft.AspNetCore.Http;

namespace TrainerPortal.Api.Infrastructure.Security;

public enum UploadProfile
{
    EnrollmentCv,
    TopicMedia,
}

public static class UploadSecurityValidator
{
    private const long MaxEnrollmentCvBytes = 12 * 1024 * 1024;
    private const long MaxTopicMediaBytes = 50 * 1024 * 1024;

    private static readonly Dictionary<string, string[]> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = ["application/pdf"],
        [".doc"] = ["application/msword", "application/octet-stream"],
        [".docx"] = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
        [".png"] = ["image/png"],
        [".jpg"] = ["image/jpeg"],
        [".jpeg"] = ["image/jpeg"],
        [".mp4"] = ["video/mp4", "application/octet-stream"],
        [".webm"] = ["video/webm", "application/octet-stream"],
    };

    public static async Task ValidateAsync(IFormFile file, UploadProfile profile, CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0) throw new ArgumentException("File is empty.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = profile == UploadProfile.EnrollmentCv
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".pdf", ".doc", ".docx" }
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".pdf", ".png", ".jpg", ".jpeg", ".mp4", ".webm" };

        if (!allowedExtensions.Contains(ext))
        {
            throw new ArgumentException($"File type '{ext}' is not supported.");
        }

        var maxBytes = profile == UploadProfile.EnrollmentCv ? MaxEnrollmentCvBytes : MaxTopicMediaBytes;
        if (file.Length > maxBytes)
        {
            throw new ArgumentException($"File is too large. Maximum allowed size is {maxBytes / 1024 / 1024} MB.");
        }

        if (AllowedContentTypes.TryGetValue(ext, out var contentTypes) &&
            !contentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException("File content type does not match the allowed type.");
        }

        await using var stream = file.OpenReadStream();
        var header = new byte[16];
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        if (!HasValidSignature(ext, header.AsSpan(0, read)))
        {
            throw new ArgumentException("File signature does not match the declared file type.");
        }
    }

    private static bool HasValidSignature(string extension, ReadOnlySpan<byte> header) =>
        extension switch
        {
            ".pdf" => StartsWith(header, [0x25, 0x50, 0x44, 0x46]),
            ".doc" => StartsWith(header, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
            ".docx" => StartsWith(header, [0x50, 0x4B, 0x03, 0x04]) || StartsWith(header, [0x50, 0x4B, 0x05, 0x06]) || StartsWith(header, [0x50, 0x4B, 0x07, 0x08]),
            ".png" => StartsWith(header, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            ".jpg" or ".jpeg" => StartsWith(header, [0xFF, 0xD8, 0xFF]),
            ".mp4" => header.Length >= 12 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70,
            ".webm" => StartsWith(header, [0x1A, 0x45, 0xDF, 0xA3]),
            _ => false,
        };

    private static bool StartsWith(ReadOnlySpan<byte> value, ReadOnlySpan<byte> prefix)
    {
        return value.Length >= prefix.Length && value[..prefix.Length].SequenceEqual(prefix);
    }
}
