-- Advanced SQL: automatically audit sample updates

CREATE OR REPLACE FUNCTION public.log_sample_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.audit_log
        (action, table_name, record_id, details)
    VALUES
        ('UPDATE', 'sample', NEW.sample_id,
         jsonb_build_object(
             'old_status', OLD.status,
             'new_status', NEW.status
         )::text);

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER sample_update_audit_trigger
AFTER UPDATE ON public.sample
FOR EACH ROW
EXECUTE FUNCTION public.log_sample_update();

-- Advanced Concept 4: Indexing
-- Helps PostgreSQL find samples belonging to a donor efficiently.

CREATE INDEX IF NOT EXISTS idx_sample_donor_id
ON public.sample (donor_id);
