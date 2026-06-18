namespace TrainerPortal.Api.Infrastructure.Security;

public static class WeakPasswordList
{
    private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "password12", "password123", "password1234",
        "123456", "12345678", "123456789", "1234567890", "qwerty", "qwerty123",
        "admin", "admin123", "administrator", "letmein", "welcome", "welcome1",
        "iloveyou", "monkey", "dragon", "master", "login", "passw0rd",
        "student123", "trainer2000", "trainer2003", "student1234",
        "changeme", "secret", "football", "baseball", "sunshine", "princess",
        "abc123", "111111", "000000", "trustno1", "superman", "batman",
    };

    public static bool IsWeak(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return true;
        }

        var normalized = password.Trim();
        if (CommonPasswords.Contains(normalized))
        {
            return true;
        }

        if (normalized.Length < 12 && CommonPasswords.Contains(normalized.ToLowerInvariant()))
        {
            return true;
        }

        return false;
    }
}
