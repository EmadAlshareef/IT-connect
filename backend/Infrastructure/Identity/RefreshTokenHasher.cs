using System.Security.Cryptography;
using System.Text;

namespace TrainerPortal.Api.Infrastructure.Identity;

public static class RefreshTokenHasher
{
    public static string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}
