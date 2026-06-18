using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ITaskRepository
{
    IReadOnlyList<TraineeTaskItem> GetTasksForStudent(string studentId);
    bool TryMarkTaskSubmitted(string studentId, string taskId, string submissionId, string status);
}
