-- ============================================================
-- Genomic Biobank & DNA/RNA Sample Lineage Repository
-- Fictional test data for academic development and testing.
-- Run only after schema.sql has been restored into a fresh DB.
-- ============================================================

BEGIN;

INSERT INTO public.sample_type (sample_type_name, description)
VALUES
    ('Blood', 'Fictional test sample type'),
    ('DNA', 'Fictional test sample type'),
    ('RNA', 'Fictional test sample type'),
    ('Tissue', 'Fictional test sample type');

INSERT INTO public.researcher (full_name, department, role, email, phone)
VALUES
    ('Aarav Mehta', 'Genomics', 'Researcher',
     'aarav.mehta@example.com', '9000000001'),
    ('Diya Sharma', 'Molecular Biology', 'Researcher',
     'diya.sharma@example.com', '9000000002');

INSERT INTO public.donor
    (full_name, date_of_birth, gender, email, registration_date)
VALUES
    ('Riya Kapoor', DATE '1995-04-12', 'Female',
     'riya.kapoor@example.com', DATE '2026-10-10'),
    ('Kabir Nair', DATE '1990-08-21', 'Male',
     'kabir.nair@example.com', DATE '2026-10-12');

INSERT INTO public.role (role_name, description)
VALUES
    ('Admin', 'Fictional test role'),
    ('Researcher', 'Fictional test role'),
    ('Lab Technician', 'Fictional test role');

INSERT INTO public.consent
    (donor_id, consent_type, consent_date, expiry_date, status, description)
VALUES
    (1, 'Research Use', DATE '2026-10-10',
     DATE '2027-10-10', 'active', 'Fictional test consent'),
    (2, 'Research Use', DATE '2026-10-12',
     NULL, 'active', 'Fictional test consent');

INSERT INTO public.sample
    (donor_id, sample_type_id, collection_date, collection_location, status, description)
VALUES
    (1, 1, DATE '2026-10-10', 'Fictional collection site A',
     'collected', 'Fictional blood sample'),
    (1, 2, DATE '2026-10-11', 'Fictional laboratory',
     'processed', 'Fictional DNA sample'),
    (1, 3, DATE '2026-10-11', 'Fictional laboratory',
     'processed', 'Fictional RNA sample'),
    (2, 1, DATE '2026-10-12', 'Fictional collection site B',
     'collected', 'Fictional blood sample');

INSERT INTO public.process
    (process_type, process_date, performed_by, description)
VALUES
    ('DNA extraction', DATE '2026-10-11', 1,
     'Fictional test process'),
    ('RNA extraction', DATE '2026-10-11', 2,
     'Fictional test process');

INSERT INTO public.sample_process
    (process_id, input_sample_id, output_sample_id, quantity, unit)
VALUES
    (1, 1, 2, NULL, NULL),
    (2, 1, 3, NULL, NULL);

INSERT INTO public.sample_lineage
    (parent_sample_id, child_sample_id, relationship_type, notes)
VALUES
    (1, 2, 'DNA extraction', 'Fictional lineage record'),
    (1, 3, 'RNA extraction', 'Fictional lineage record');

INSERT INTO public.storage_unit
    (freezer_id, rack_no, box_no, position, temperature, status)
VALUES
    ('FZ-01', 'R01', 'B01', 'A1', -80.00, 'occupied'),
    ('FZ-01', 'R01', 'B01', 'A2', -80.00, 'occupied');

INSERT INTO public.sample_storage
    (sample_id, storage_id, stored_date)
VALUES
    (2, 1, DATE '2026-10-10'),
    (3, 2, DATE '2026-10-10');

INSERT INTO public.experiment
    (experiment_name, experiment_type, start_date, end_date,
     researcher_id, status, description)
VALUES
    ('Gene Expression Pilot', 'Gene Expression Analysis',
     DATE '2026-10-13', DATE '2026-10-19',
     1, 'completed', 'Fictional test experiment');

INSERT INTO public.experiment_sample
    (experiment_id, sample_id, date_added, notes)
VALUES
    (1, 2, DATE '2026-10-13', 'Fictional DNA sample'),
    (1, 3, DATE '2026-10-13', 'Fictional RNA sample');

INSERT INTO public.sequencing_result
    (sample_id, experiment_id, sequencing_platform, run_date,
     file_path, result_status, notes)
VALUES
    (3, 1, 'Illumina', DATE '2026-10-18',
     '/test-data/fictional_rna_reads.fastq',
     'completed', 'Fictional test result; file not supplied');

INSERT INTO public.app_user
    (username, email, password_hash, role_id, researcher_id, is_active)
VALUES
    ('aarav_test', 'aarav.test@example.com',
     'NOT_A_REAL_PASSWORD_HASH', 2, 1, TRUE);

INSERT INTO public.audit_log
    (user_id, action, table_name, record_id, details)
VALUES
    (1, 'INSERT', 'sample', 2,
     'Illustrative fictional test audit entry');

COMMIT;
