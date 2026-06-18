namespace TrainerPortal.Api.Domain.Entities.Portal;

/// <summary>Matches seed data in RefStatuses (ITConnectDb_v3).</summary>
public static class PortalStatusIds
{
    public const byte EnrollmentPending = 1;
    public const byte EnrollmentApproved = 2;
    public const byte EnrollmentRejected = 3;
    public const byte TrainingActive = 4;
    public const byte TrainingUpcoming = 5;
    public const byte SectionActive = 7;
    public const byte TaskNotSubmitted = 9;
    public const byte TaskPendingReview = 10;
    public const byte TaskCompleted = 11;
    public const byte TaskOverdue = 12;
    public const byte PostPublished = 13;
    public const byte PostPending = 14;
    public const byte ApplicantPending = 15;
    public const byte ApplicantInterviewed = 16;
    public const byte InternshipPending = 19;
    public const byte EvaluationEvaluated = 20;
    public const byte EvaluationPending = 21;
    public const byte EvaluationNotSubmitted = 22;

    private static readonly Dictionary<byte, string> Codes = new()
    {
        [EnrollmentPending] = "pending",
        [EnrollmentApproved] = "approved",
        [EnrollmentRejected] = "rejected",
        [TrainingActive] = "active",
        [TrainingUpcoming] = "upcoming",
        [SectionActive] = "active",
        [TaskNotSubmitted] = "not_submitted",
        [TaskPendingReview] = "pending_review",
        [TaskCompleted] = "completed",
        [TaskOverdue] = "overdue",
        [PostPublished] = "published",
        [PostPending] = "pending",
        [ApplicantPending] = "pending",
        [ApplicantInterviewed] = "interviewed",
        [InternshipPending] = "pending",
        [EvaluationEvaluated] = "evaluated",
        [EvaluationPending] = "pending_evaluation",
        [EvaluationNotSubmitted] = "not_submitted",
    };

    private static readonly Dictionary<string, byte> EnrollmentByCode = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pending"] = EnrollmentPending,
        ["approved"] = EnrollmentApproved,
        ["rejected"] = EnrollmentRejected,
    };

    private static readonly Dictionary<string, byte> TaskByCode = new(StringComparer.OrdinalIgnoreCase)
    {
        ["not_submitted"] = TaskNotSubmitted,
        ["Not Submitted"] = TaskNotSubmitted,
        ["pending_review"] = TaskPendingReview,
        ["Pending Review"] = TaskPendingReview,
        ["completed"] = TaskCompleted,
        ["Completed"] = TaskCompleted,
        ["overdue"] = TaskOverdue,
        ["Overdue"] = TaskOverdue,
    };

    public static string ToCode(byte statusId) =>
        Codes.TryGetValue(statusId, out var code) ? code : "unknown";

    public static string ToDisplayLabel(byte statusId) => statusId switch
    {
        TaskNotSubmitted => "Not Submitted",
        TaskPendingReview => "Pending Review",
        TaskCompleted => "Completed",
        TaskOverdue => "Overdue",
        InternshipPending => "Pending",
        EvaluationEvaluated => "Evaluated",
        EvaluationPending => "Pending Evaluation",
        EvaluationNotSubmitted => "Not Submitted",
        _ => ToCode(statusId),
    };

    public static byte EnrollmentFromCode(string code) =>
        EnrollmentByCode.TryGetValue(code.Trim(), out var id) ? id : EnrollmentPending;

    public static byte TaskFromDisplayOrCode(string status) =>
        TaskByCode.TryGetValue(status.Trim(), out var id) ? id : TaskNotSubmitted;
}
