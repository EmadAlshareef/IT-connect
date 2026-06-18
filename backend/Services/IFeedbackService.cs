using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IFeedbackService
{
    IReadOnlyList<TrainerFeedbackItem> GetForStudent(string studentId);

    TrainerFeedbackItem Add(string trainerId, CreateTrainerFeedbackRequest request);
}
