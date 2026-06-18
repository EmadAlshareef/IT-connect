using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IEnrollmentApplicationService
{
    IReadOnlyList<EnrollmentApplicationRecord> ListForStudent(string studentId);
    EnrollmentApplicationRecord? GetForStudentCourse(string studentId, string branchId, string courseId);
    EnrollmentApplicationRecord StartEnrollment(
        string studentId,
        string studentEmail,
        string studentName,
        StartEnrollmentApplicationRequest request);
    EnrollmentApplicationRecord Submit(
        string studentId,
        string studentEmail,
        string studentName,
        SubmitEnrollmentApplicationRequest request,
        string cvFileName,
        Stream cvStream);

    IReadOnlyList<EnrollmentApplicationRecord> ListForTrainer(string trainerId, string trainerEmail, string? statusFilter);
    EnrollmentApplicationRecord? GetById(string id);
    EnrollmentApplicationRecord Approve(string applicationId, string reviewerId, string reviewerEmail);
    EnrollmentApplicationRecord Reject(string applicationId, string reviewerId, string reviewerEmail, string? rejectionReason);

    IReadOnlyList<PortalNotificationRecord> ListNotifications(string userId);
    int UnreadNotificationCount(string userId);
    void MarkNotificationRead(string userId, string notificationId);
    void MarkEnrollmentNotificationsRead(string userId, string applicationId);
}
