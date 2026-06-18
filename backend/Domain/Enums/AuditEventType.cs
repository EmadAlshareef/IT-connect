namespace TrainerPortal.Api.Domain.Enums;

public enum AuditEventType
{
    LoginSuccess = 1,
    LoginFailed = 2,
    Logout = 3,
    Registration = 4,
    EmailVerified = 5,
    PasswordChanged = 6,
    PasswordResetRequested = 7,
    PasswordResetCompleted = 8,
    RefreshTokenIssued = 9,
    RefreshTokenRevoked = 10,
    AccountLockedOut = 11,
    AdminAction = 12,
}
