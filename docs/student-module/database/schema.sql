-- Training Sphere — Student module schema (PostgreSQL-flavored; adapt types for SQL Server)
-- Run in a dedicated schema: student_module

CREATE SCHEMA IF NOT EXISTS student_module;

-- Students
CREATE TABLE student_module.students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(320) NOT NULL UNIQUE,
    password_hash       VARCHAR(500) NOT NULL,
    full_name           VARCHAR(200) NOT NULL,
    phone               VARCHAR(50),
    university          VARCHAR(200),
    specialization      VARCHAR(120),
    bio                 TEXT,
    avatar_url          VARCHAR(500),
    github_username     VARCHAR(100),
    preferred_github_repo_url VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internships (catalog; published rows visible to students)
CREATE TABLE student_module.internships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(300) NOT NULL,
    company_name        VARCHAR(200) NOT NULL,
    specialization      VARCHAR(120),
    training_type       VARCHAR(80),
    summary             TEXT,
    description         TEXT,
    location            VARCHAR(200),
    seats_total         INT NOT NULL DEFAULT 0,
    seats_filled        INT NOT NULL DEFAULT 0,
    opens_on_utc        TIMESTAMPTZ,
    closes_on_utc       TIMESTAMPTZ,
    status              VARCHAR(30) NOT NULL DEFAULT 'Draft',
    created_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_internship_status CHECK (status IN ('Draft', 'Published', 'Closed'))
);

CREATE INDEX ix_internships_published ON student_module.internships (status, closes_on_utc)
    WHERE status = 'Published';

-- Applications
CREATE TABLE student_module.internship_applications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES student_module.students(id) ON DELETE CASCADE,
    internship_id       UUID NOT NULL REFERENCES student_module.internships(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL DEFAULT 'Pending',
    cover_letter        TEXT,
    cv_file_name        VARCHAR(260),
    cv_storage_key      VARCHAR(500),
    submitted_at_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at_utc     TIMESTAMPTZ,
    rejection_reason    VARCHAR(500),
    CONSTRAINT uq_application_student_internship UNIQUE (student_id, internship_id),
    CONSTRAINT chk_application_status CHECK (status IN ('Pending', 'UnderReview', 'Accepted', 'Rejected', 'Withdrawn'))
);

CREATE INDEX ix_applications_student ON student_module.internship_applications (student_id, submitted_at_utc DESC);

-- Tasks (assigned to one student)
CREATE TABLE student_module.tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id       UUID REFERENCES student_module.internships(id) ON DELETE SET NULL,
    training_session_id UUID,
    assigned_student_id UUID NOT NULL REFERENCES student_module.students(id) ON DELETE CASCADE,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    deadline_utc        TIMESTAMPTZ NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    created_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_task_status CHECK (status IN ('Assigned', 'Closed'))
);

CREATE INDEX ix_tasks_student ON student_module.tasks (assigned_student_id, deadline_utc);

-- Submissions
CREATE TABLE student_module.task_submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES student_module.tasks(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES student_module.students(id) ON DELETE CASCADE,
    version             INT NOT NULL DEFAULT 1,
    submission_type     VARCHAR(20) NOT NULL,
    submission_link     VARCHAR(500),
    file_name           VARCHAR(260),
    file_storage_key    VARCHAR(500),
    github_repo_url     VARCHAR(500),
    notes               TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'Submitted',
    submitted_at_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_task_student_version UNIQUE (task_id, student_id, version),
    CONSTRAINT chk_submission_type CHECK (submission_type IN ('File', 'Link', 'Github')),
    CONSTRAINT chk_submission_status CHECK (status IN ('Submitted', 'PendingReview', 'Returned', 'Accepted'))
);

CREATE INDEX ix_submissions_student ON student_module.task_submissions (student_id, submitted_at_utc DESC);

-- Evaluations (trainer-authored; student read-only)
CREATE TABLE student_module.evaluations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_submission_id  UUID NOT NULL UNIQUE REFERENCES student_module.task_submissions(id) ON DELETE CASCADE,
    trainer_id          UUID NOT NULL,
    grade               VARCHAR(10),
    feedback            TEXT,
    evaluated_at_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress (one row per student)
CREATE TABLE student_module.progress_tracking (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL UNIQUE REFERENCES student_module.students(id) ON DELETE CASCADE,
    completion_percent      INT NOT NULL DEFAULT 0,
    attendance_percent      INT NOT NULL DEFAULT 0,
    performance_score       DECIMAL(4,2) NOT NULL DEFAULT 0,
    completed_tasks_count   INT NOT NULL DEFAULT 0,
    pending_tasks_count     INT NOT NULL DEFAULT 0,
    last_activity_at_utc    TIMESTAMPTZ,
    weekly_activity_json    JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Notifications
CREATE TABLE student_module.notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES student_module.students(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    body                TEXT,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_notifications_student_unread ON student_module.notifications (student_id, is_read, created_at_utc DESC);
