-- Self-registration with administrator approval.
-- Existing accounts are treated as already approved. Accounts created
-- through the public sign-up form start as 'pending' and inactive until
-- an administrator approves (or rejects) them. Safe to re-run.

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS approval_status character varying(20)
        DEFAULT 'approved' NOT NULL;

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS approved_by bigint;

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS approved_at timestamp without time zone;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'app_user_approval_status_check'
    ) THEN
        ALTER TABLE public.app_user
            ADD CONSTRAINT app_user_approval_status_check
            CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'app_user_approved_by_fkey'
    ) THEN
        ALTER TABLE public.app_user
            ADD CONSTRAINT app_user_approved_by_fkey
            FOREIGN KEY (approved_by) REFERENCES public.app_user (user_id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_app_user_pending
    ON public.app_user (created_at)
    WHERE approval_status = 'pending';
