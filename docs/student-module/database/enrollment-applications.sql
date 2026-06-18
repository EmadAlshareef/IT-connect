-- Enrollment applications (post-catalog-enroll onboarding)
-- Links student, course, and assigned trainer

CREATE TABLE IF NOT EXISTS enrollment_applications (
    id                  VARCHAR(64) PRIMARY KEY,
    user_id             VARCHAR(64) NOT NULL,
    user_email          VARCHAR(320) NOT NULL,
    user_name           VARCHAR(200) NOT NULL,
    branch_id           VARCHAR(64) NOT NULL,
    course_id           VARCHAR(64) NOT NULL,
    course_title        VARCHAR(300) NOT NULL,
    trainer_id          VARCHAR(64) NOT NULL,
    trainer_email       VARCHAR(320) NOT NULL,
    trainer_name        VARCHAR(200) NOT NULL,
    motivation_reason   TEXT NOT NULL,
    university_name     VARCHAR(200) NOT NULL,
    major               VARCHAR(120) NOT NULL,
    gpa                 VARCHAR(40) NOT NULL,
    previous_studies    TEXT NOT NULL,
    cv_file_name        VARCHAR(260) NOT NULL,
    cv_file_url         VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT NULL,
    reviewed_at_utc     TIMESTAMPTZ NULL,
    reviewed_by         VARCHAR(64) NULL,
    created_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enrollment_app_user_course UNIQUE (user_id, branch_id, course_id),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS ix_enrollment_app_trainer_status
    ON enrollment_applications (trainer_email, status, created_at_utc DESC);
