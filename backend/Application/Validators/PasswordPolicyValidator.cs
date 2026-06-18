using System.Text.RegularExpressions;
using TrainerPortal.Api.Infrastructure.Security;

namespace TrainerPortal.Api.Application.Validators;

public static partial class PasswordPolicyValidator
{
    public const int MinimumLength = 12;

    private static readonly Regex UppercaseRegex = UppercasePattern();
    private static readonly Regex LowercaseRegex = LowercasePattern();
    private static readonly Regex DigitRegex = DigitPattern();
    private static readonly Regex SpecialRegex = SpecialPattern();

    public static IReadOnlyList<string> Validate(string password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Password is required.");
            return errors;
        }

        if (password.Length < MinimumLength)
        {
            errors.Add($"Password must be at least {MinimumLength} characters.");
        }

        if (!UppercaseRegex.IsMatch(password))
        {
            errors.Add("Password must contain at least one uppercase letter.");
        }

        if (!LowercaseRegex.IsMatch(password))
        {
            errors.Add("Password must contain at least one lowercase letter.");
        }

        if (!DigitRegex.IsMatch(password))
        {
            errors.Add("Password must contain at least one number.");
        }

        if (!SpecialRegex.IsMatch(password))
        {
            errors.Add("Password must contain at least one special character.");
        }

        if (WeakPasswordList.IsWeak(password))
        {
            errors.Add("This password is too common. Choose a stronger password.");
        }

        return errors;
    }

    public static bool IsValid(string password) => Validate(password).Count == 0;

    [GeneratedRegex("[A-Z]")]
    private static partial Regex UppercasePattern();

    [GeneratedRegex("[a-z]")]
    private static partial Regex LowercasePattern();

    [GeneratedRegex("[0-9]")]
    private static partial Regex DigitPattern();

    [GeneratedRegex(@"[^A-Za-z0-9]")]
    private static partial Regex SpecialPattern();
}
