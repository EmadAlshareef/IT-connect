using System.Collections.Concurrent;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

/// <summary>
/// In-memory task store per trainee, seeded for demo accounts. Used by task listing and submission flows.
/// </summary>
public sealed class TaskRepository : ITaskRepository
{
    private readonly ConcurrentDictionary<string, List<TraineeTaskItem>> _tasksByStudent = new();

    public TaskRepository()
    {
        Seed("student-mohamed", BuildMohamedTasks());
        Seed("student-sara", BuildSaraTasks());
        Seed("student-hassan", BuildHassanTasks());
    }

    private static List<TraineeTaskItem> BuildMohamedTasks() =>
    [
        new()
        {
            Id = "task-ts-101",
            Title = "API integration checkpoint",
            Description = "Connect the Training Sphere dashboard to authenticated endpoints and handle 401/403 states.",
            DeadlineUtc = DateTime.UtcNow.AddDays(4),
            SubmissionStatus = "Pending Review",
            LastSubmissionId = "sub-demo-1",
        },
        new()
        {
            Id = "task-ts-102",
            Title = "Weekly learning journal",
            Description = "Submit a short reflection on blockers, learnings, and next steps.",
            DeadlineUtc = DateTime.UtcNow.AddDays(1),
            SubmissionStatus = "Not Submitted",
        },
        new()
        {
            Id = "task-ts-103",
            Title = "Capstone wireframes",
            Description = "Low-fidelity wireframes for the internship reporting module.",
            DeadlineUtc = DateTime.UtcNow.AddDays(10),
            SubmissionStatus = "Completed",
            LastSubmissionId = "sub-demo-0",
        },
    ];

    private static List<TraineeTaskItem> BuildSaraTasks() =>
    [
        new()
        {
            Id = "task-ts-201",
            Title = "Security review checklist",
            Description = "Complete the secure coding checklist for your assigned service.",
            DeadlineUtc = DateTime.UtcNow.AddDays(3),
            SubmissionStatus = "Not Submitted",
        },
        new()
        {
            Id = "task-ts-202",
            Title = "Unit tests for validators",
            Description = "Add tests covering edge cases for input validation helpers.",
            DeadlineUtc = DateTime.UtcNow.AddDays(6),
            SubmissionStatus = "Pending Review",
        },
    ];

    private static List<TraineeTaskItem> BuildHassanTasks() =>
    [
        new()
        {
            Id = "task-ts-301",
            Title = "Onboarding quiz",
            Description = "Finish the platform onboarding knowledge check.",
            DeadlineUtc = DateTime.UtcNow.AddDays(-1),
            SubmissionStatus = "Overdue",
        },
    ];

    private void Seed(string studentId, List<TraineeTaskItem> tasks) =>
        _tasksByStudent[studentId] = tasks;

    public IReadOnlyList<TraineeTaskItem> GetTasksForStudent(string studentId)
    {
        if (!_tasksByStudent.TryGetValue(studentId, out var list))
        {
            list =
            [
                new()
                {
                    Id = "task-ts-default",
                    Title = "Welcome task",
                    Description = "Confirm you can sign in, open the student dashboard, and read your assignments.",
                    DeadlineUtc = DateTime.UtcNow.AddDays(7),
                    SubmissionStatus = "Not Submitted",
                },
            ];
            _tasksByStudent[studentId] = list;
        }

        return list.OrderBy(t => t.DeadlineUtc).ToList();
    }

    public bool TryMarkTaskSubmitted(string studentId, string taskId, string submissionId, string status)
    {
        if (!_tasksByStudent.TryGetValue(studentId, out var list))
        {
            return false;
        }

        var task = list.FirstOrDefault(t => t.Id == taskId);
        if (task is null)
        {
            return false;
        }

        var index = list.IndexOf(task);
        list[index] = task with
        {
            SubmissionStatus = status,
            LastSubmissionId = submissionId,
        };
        return true;
    }
}
