-- ============================================================
-- Genomic Biobank & DNA/RNA Sample Lineage Repository
-- Bulk FICTIONAL demo data (~50-60 rows per table).
--
-- Every person, email, phone number and address below is invented.
-- Dummy rows are tagged with the domains @biobank-demo.example /
-- @donor-demo.example so they are easy to find and remove.
--
-- Run after schema.sql, sample_data.sql, advanced_features.sql and
-- migrations (`npm run db:setup -- --dummy-data` does this for you).
-- The whole load is one transaction and refuses to run twice.
--
-- All dummy login accounts use the password:  DemoPassword123
--
-- The `role` table is intentionally NOT expanded: the application
-- only recognises Admin, Researcher and Lab Technician.
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_researchers bigint[];
    v_donors      bigint[];
    v_types       bigint[];
    v_units       bigint[];
    v_samples     bigint[];
    v_processes   bigint[];
    v_experiments bigint[];
    v_users       bigint[];
    v_admin       bigint;
    v_role_admin  bigint;
    v_role_res    bigint;
    v_role_tech   bigint;

    first_names text[] := ARRAY[
        'Aditi','Rohan','Meera','Vikram','Sneha','Arjun','Kavya','Nikhil',
        'Priya','Siddharth','Ananya','Karan','Isha','Rahul','Tara','Dev',
        'Neha','Aman','Pooja','Varun','Lakshmi','Imran','Fatima','Zoya',
        'Elena','Lucas','Sofia','Mateo','Hannah','Noah','Amara','Kenji',
        'Yuki','Omar','Leila','Samuel','Grace','Daniel','Chloe','Ethan'];
    last_names text[] := ARRAY[
        'Iyer','Menon','Reddy','Bose','Chatterjee','Pillai','Gupta','Rao',
        'Joshi','Desai','Kulkarni','Banerjee','Singh','Verma','Khan','Das',
        'Fernandes','Mathew','Varghese','Patel','Lopez','Schmidt','Rossi',
        'Tanaka','Okafor','Haddad','Novak','Silva','Nguyen','Brown'];
    departments text[] := ARRAY[
        'Genomics','Molecular Biology','Bioinformatics','Pathology',
        'Oncology Research','Immunology','Biobank Operations',
        'Clinical Genetics','Transcriptomics','Epidemiology'];
    researcher_roles text[] := ARRAY[
        'Principal Investigator','Research Scientist','Postdoctoral Fellow',
        'PhD Student','Lab Manager','Research Associate','Bioinformatician'];
    cities text[] := ARRAY[
        'Pune','Bengaluru','Mumbai','Chennai','Hyderabad','Kolkata',
        'New Delhi','Kochi','Ahmedabad','Jaipur'];
    sites text[] := ARRAY[
        'Fictional City Hospital - Phlebotomy','Demo Cancer Centre - Theatre 2',
        'Sample Clinic North','Community Health Camp (fictional)',
        'University Research Hospital - Ward 5','Mobile Collection Unit A'];
    consent_types text[] := ARRAY[
        'Research Use','Genetic Testing','Biobank Storage','Data Sharing',
        'Recontact for Future Studies'];
    consent_statuses text[] := ARRAY[
        'active','active','active','active','withdrawn','expired','pending'];
    sample_statuses text[] := ARRAY[
        'collected','processing','processed','stored','stored','archived'];
    relationship_types text[] := ARRAY[
        'DNA extraction','RNA extraction','Aliquot','Plasma separation',
        'Library preparation','Derivative'];
    process_types text[] := ARRAY[
        'DNA extraction','RNA extraction','Aliquoting','Centrifugation',
        'Library preparation','Quality control','PCR amplification',
        'Bisulfite conversion'];
    units text[] := ARRAY['uL','mL','ng','ug'];
    experiment_types text[] := ARRAY[
        'Whole genome sequencing','Whole exome sequencing','RNA-seq',
        'Targeted panel','Methylation profiling','Single-cell RNA-seq',
        'Genotyping array'];
    experiment_topics text[] := ARRAY[
        'Breast cancer variant discovery','Type 2 diabetes cohort',
        'Rare disease trio analysis','Tumour transcriptome atlas',
        'Pharmacogenomics pilot','Immune repertoire profiling',
        'Cardiovascular risk markers','Microbiome host genetics',
        'Neurodevelopmental gene panel','Ageing epigenetic clock'];
    experiment_statuses text[] := ARRAY[
        'planned','in_progress','in_progress','completed','completed','on_hold'];
    platforms text[] := ARRAY[
        'Illumina NovaSeq 6000','Illumina NextSeq 2000','PacBio Sequel IIe',
        'Oxford Nanopore PromethION','Ion Torrent S5','Illumina MiSeq'];
    result_statuses text[] := ARRAY[
        'completed','completed','completed','pending','in_progress','failed'];
    storage_statuses text[] := ARRAY['available','available','maintenance'];
    temps numeric[] := ARRAY[-80, -80, -20, -196, 4];

    -- Real specimen / derivative types (kept to plausible names because
    -- they appear in the application's dropdowns).
    new_sample_types text[] := ARRAY[
        'Whole Blood','Plasma','Serum','Buffy Coat','PBMC','Saliva',
        'Buccal Swab','Urine','Cerebrospinal Fluid','Bone Marrow',
        'Cord Blood','FFPE Tissue','Fresh Frozen Tissue','Tumour Biopsy',
        'Skin Biopsy','Stool','Sputum','Nasopharyngeal Swab',
        'Dried Blood Spot','Amniotic Fluid','Synovial Fluid','Breast Milk',
        'Hair Follicle','Cell Line','Organoid','Genomic DNA','cfDNA',
        'ctDNA','Mitochondrial DNA','Total RNA','mRNA','miRNA',
        'Long non-coding RNA','cDNA','Sequencing Library','PCR Product',
        'Bisulfite-converted DNA','Protein Lysate','Extracellular Vesicles',
        'Exosomes','Platelet-rich Plasma','Red Blood Cells','Lymphocytes',
        'Fibroblasts','Induced Pluripotent Stem Cells','Placental Tissue'];

    n int;
    i int;
BEGIN
    IF EXISTS (SELECT 1 FROM public.researcher
               WHERE email LIKE '%@biobank-demo.example') THEN
        RAISE EXCEPTION 'Dummy data is already loaded (found @biobank-demo.example researchers). Nothing was changed.';
    END IF;

    SELECT role_id INTO v_role_admin FROM public.role WHERE role_name = 'Admin';
    SELECT role_id INTO v_role_res   FROM public.role WHERE role_name = 'Researcher';
    SELECT role_id INTO v_role_tech  FROM public.role WHERE role_name = 'Lab Technician';

    -- ---------------------------------------------------------- researchers
    INSERT INTO public.researcher (full_name, department, role, email, phone)
    SELECT
        'Dr. ' || first_names[1 + (g * 7) % array_length(first_names, 1)]
               || ' ' || last_names[1 + (g * 11) % array_length(last_names, 1)],
        departments[1 + g % array_length(departments, 1)],
        researcher_roles[1 + (g * 3) % array_length(researcher_roles, 1)],
        'researcher' || lpad(g::text, 2, '0') || '@biobank-demo.example',
        '+91-90000-' || lpad((1000 + g)::text, 5, '0')
    FROM generate_series(1, 53) AS g;

    SELECT array_agg(researcher_id ORDER BY researcher_id)
      INTO v_researchers FROM public.researcher;

    -- --------------------------------------------------------------- donors
    INSERT INTO public.donor
        (full_name, date_of_birth, gender, phone_number, email, address,
         registration_date)
    SELECT
        first_names[1 + (g * 13) % array_length(first_names, 1)] || ' '
            || last_names[1 + (g * 5) % array_length(last_names, 1)],
        DATE '1950-01-01' + ((g * 397) % 18000),
        (ARRAY['Female','Male','Female','Male','Non-binary','Prefer not to say'])
            [1 + g % 6],
        '+91-80000-' || lpad((2000 + g)::text, 5, '0'),
        'donor' || lpad(g::text, 2, '0') || '@donor-demo.example',
        (10 + g) || ' Sample Street, '
            || cities[1 + g % array_length(cities, 1)] || ' (fictional)',
        DATE '2025-01-06' + ((g * 6) % 300)
    FROM generate_series(1, 52) AS g;

    SELECT array_agg(donor_id ORDER BY donor_id)
      INTO v_donors FROM public.donor;

    -- ------------------------------------------------------------- consents
    INSERT INTO public.consent
        (donor_id, consent_type, consent_date, expiry_date, status, description)
    SELECT
        d.donor_id,
        consent_types[1 + g % array_length(consent_types, 1)],
        d.registration_date,
        CASE WHEN g % 4 = 0 THEN NULL
             ELSE d.registration_date + (365 * (1 + g % 5)) END,
        consent_statuses[1 + g % array_length(consent_statuses, 1)],
        'Fictional consent record for demo data'
    FROM generate_series(1, 53) AS g
    JOIN public.donor d
      ON d.donor_id = v_donors[1 + (g - 1) % array_length(v_donors, 1)];

    -- ---------------------------------------------------------- sample types
    INSERT INTO public.sample_type (sample_type_name, description)
    SELECT t, 'Demo specimen type'
    FROM unnest(new_sample_types) AS t
    ON CONFLICT (sample_type_name) DO NOTHING;

    SELECT array_agg(sample_type_id ORDER BY sample_type_id)
      INTO v_types FROM public.sample_type;

    -- -------------------------------------------------------- storage units
    INSERT INTO public.storage_unit
        (freezer_id, rack_no, box_no, position, temperature, status)
    SELECT
        'FZ-' || lpad((2 + (g - 1) / 12)::text, 2, '0'),
        'R' || lpad((1 + ((g - 1) / 4) % 3)::text, 2, '0'),
        'B' || lpad((1 + (g - 1) % 4)::text, 2, '0'),
        chr(65 + (g % 8)) || (1 + g % 9),
        temps[1 + g % array_length(temps, 1)],
        storage_statuses[1 + g % array_length(storage_statuses, 1)]
    FROM generate_series(1, 53) AS g;

    SELECT array_agg(storage_id ORDER BY storage_id)
      INTO v_units FROM public.storage_unit
     WHERE status <> 'maintenance';

    -- -------------------------------------------------------------- samples
    INSERT INTO public.sample
        (donor_id, sample_type_id, collection_date, collection_location,
         status, description)
    SELECT
        v_donors[1 + (g * 7) % array_length(v_donors, 1)],
        -- Mostly the core types (Blood/DNA/RNA/Tissue), some others.
        CASE WHEN g % 3 = 0
             THEN v_types[1 + (g * 5) % array_length(v_types, 1)]
             ELSE v_types[1 + g % 4] END,
        DATE '2025-02-01' + ((g * 5) % 280),
        sites[1 + g % array_length(sites, 1)],
        sample_statuses[1 + g % array_length(sample_statuses, 1)],
        'Fictional demo sample #' || g
    FROM generate_series(1, 56) AS g;

    SELECT array_agg(sample_id ORDER BY sample_id)
      INTO v_samples FROM public.sample;
    n := array_length(v_samples, 1);

    -- ------------------------------------------- lineage (parent -> child)
    -- Each child is derived from an earlier sample, so the graph is acyclic.
    INSERT INTO public.sample_lineage
        (parent_sample_id, child_sample_id, relationship_type, notes)
    SELECT DISTINCT ON (p, c) p, c, rel, 'Demo lineage link'
    FROM (
        SELECT
            v_samples[1 + ((g - 1) * 3) % (g + 4)] AS p,
            v_samples[g + 5] AS c,
            relationship_types[1 + g % array_length(relationship_types, 1)] AS rel
        FROM generate_series(1, LEAST(53, n - 5)) AS g
    ) AS links
    WHERE p <> c
    ON CONFLICT (parent_sample_id, child_sample_id) DO NOTHING;

    -- ------------------------------------------------------------ processes
    INSERT INTO public.process (process_type, process_date, performed_by, description)
    SELECT
        process_types[1 + g % array_length(process_types, 1)],
        DATE '2025-03-01' + ((g * 4) % 260),
        v_researchers[1 + (g * 3) % array_length(v_researchers, 1)],
        'Demo laboratory process #' || g
    FROM generate_series(1, 53) AS g;

    SELECT array_agg(process_id ORDER BY process_id)
      INTO v_processes FROM public.process
     WHERE description LIKE 'Demo laboratory process #%';

    -- ----------------- sample_process: follow the lineage links above
    INSERT INTO public.sample_process
        (process_id, input_sample_id, output_sample_id, quantity, unit)
    SELECT
        v_processes[1 + (row_number() OVER (ORDER BY l.lineage_id) - 1)::int
                    % array_length(v_processes, 1)],
        l.parent_sample_id,
        l.child_sample_id,
        round((5 + (l.lineage_id * 37) % 495)::numeric / 10, 1),
        units[1 + (l.lineage_id % array_length(units, 1))::int]
    FROM public.sample_lineage l
    WHERE l.notes = 'Demo lineage link';

    -- ---------------------------------------------------------- experiments
    -- Researchers 1 and 2 (the sample_data.sql researchers) get several
    -- experiments each so "My experiments" has content when they log in.
    INSERT INTO public.experiment
        (experiment_name, experiment_type, start_date, end_date,
         researcher_id, status, description)
    SELECT
        experiment_topics[1 + g % array_length(experiment_topics, 1)]
            || ' - phase ' || (1 + g % 3) || ' (demo ' || g || ')',
        experiment_types[1 + g % array_length(experiment_types, 1)],
        DATE '2025-03-15' + ((g * 6) % 250),
        CASE WHEN experiment_statuses[1 + g % 6] IN ('completed', 'on_hold')
             THEN DATE '2025-03-15' + ((g * 6) % 250) + (30 + g % 90)
             ELSE NULL END,
        CASE WHEN g <= 6 THEN v_researchers[1 + g % 2]
             ELSE v_researchers[1 + (g * 7) % array_length(v_researchers, 1)] END,
        experiment_statuses[1 + g % 6],
        'Fictional demo experiment'
    FROM generate_series(1, 54) AS g;

    SELECT array_agg(experiment_id ORDER BY experiment_id)
      INTO v_experiments FROM public.experiment;

    -- ---------------------------------------------- experiment <-> sample
    INSERT INTO public.experiment_sample (experiment_id, sample_id, date_added, notes)
    SELECT
        v_experiments[1 + (g - 1) % array_length(v_experiments, 1)],
        v_samples[1 + (g * 11) % n],
        DATE '2025-04-01' + ((g * 5) % 220),
        'Demo sample assignment'
    FROM generate_series(1, 53) AS g
    ON CONFLICT (experiment_id, sample_id) DO NOTHING;

    -- --------------------------------------------------- sequencing results
    INSERT INTO public.sequencing_result
        (sample_id, experiment_id, sequencing_platform, run_date, file_path,
         result_status, notes)
    SELECT
        es.sample_id,
        es.experiment_id,
        platforms[1 + (es.experiment_sample_id % array_length(platforms, 1))::int],
        es.date_added + 14,
        '/demo-data/runs/EXP' || es.experiment_id || '_S' || es.sample_id
            || '.fastq.gz',
        result_statuses[1 + (es.experiment_sample_id % 6)::int],
        'Fictional sequencing output; file not supplied'
    FROM public.experiment_sample es
    WHERE es.notes = 'Demo sample assignment'
    ORDER BY es.experiment_sample_id
    LIMIT 54;

    -- ------------------------------------------ sample storage placements
    -- One placement per new sample; every 7th has since been removed.
    INSERT INTO public.sample_storage (sample_id, storage_id, stored_date, removed_date)
    SELECT
        s.sample_id,
        v_units[1 + ((row_number() OVER (ORDER BY s.sample_id)) - 1)::int
                % array_length(v_units, 1)],
        s.collection_date + 1,
        CASE WHEN s.sample_id % 7 = 0 THEN s.collection_date + 120 END
    FROM public.sample s
    WHERE s.description LIKE 'Fictional demo sample #%'
    ORDER BY s.sample_id
    LIMIT 53;

    -- Mark units holding a current sample as occupied.
    UPDATE public.storage_unit su
       SET status = 'occupied'
     WHERE su.status = 'available'
       AND EXISTS (SELECT 1 FROM public.sample_storage ss
                   WHERE ss.storage_id = su.storage_id
                     AND ss.removed_date IS NULL);

    -- ---------------------------------------------------- application users
    SELECT user_id INTO v_admin FROM public.app_user
     WHERE role_id = v_role_admin AND is_active
     ORDER BY user_id LIMIT 1;

    -- 22 researchers (linked to researcher records), 26 lab technicians,
    -- 4 admins. Approval mix: pending, rejected and deactivated included.
    INSERT INTO public.app_user
        (username, email, password_hash, role_id, researcher_id, is_active,
         created_at, approval_status, approved_by, approved_at)
    SELECT
        u.username, u.email,
        '$argon2id$v=19$m=65536,t=3,p=4$M8mT3BsDZO72cY+sIAX36A$UIA8plWmYY/LO86s9lDzNrEd7lpSXpcM3KWAcDS0YlM',
        u.role_id, u.researcher_id,
        u.status = 'approved' AND g % 13 <> 0,
        TIMESTAMP '2025-06-01 09:00' + (g * INTERVAL '3 days 2 hours'),
        u.status,
        CASE WHEN u.status = 'pending' THEN NULL ELSE v_admin END,
        CASE WHEN u.status = 'pending' THEN NULL
             ELSE TIMESTAMP '2025-06-02 10:00' + (g * INTERVAL '3 days 2 hours') END
    FROM generate_series(1, 52) AS g
    CROSS JOIN LATERAL (
        SELECT
            CASE WHEN g <= 22 THEN 'demo_researcher' || lpad(g::text, 2, '0')
                 WHEN g <= 48 THEN 'demo_labtech' || lpad((g - 22)::text, 2, '0')
                 ELSE 'demo_admin' || (g - 48) END AS username,
            CASE WHEN g <= 22 THEN 'demo.researcher' || lpad(g::text, 2, '0')
                 WHEN g <= 48 THEN 'demo.labtech' || lpad((g - 22)::text, 2, '0')
                 ELSE 'demo.admin' || (g - 48) END
                || '@biobank-demo.example' AS email,
            CASE WHEN g <= 22 THEN v_role_res
                 WHEN g <= 48 THEN v_role_tech
                 ELSE v_role_admin END AS role_id,
            -- Link demo researchers to the demo researcher records 3..24.
            CASE WHEN g <= 22 THEN v_researchers[2 + g] END AS researcher_id,
            CASE WHEN g > 48 THEN 'approved'
                 WHEN g % 9 = 0 THEN 'pending'
                 WHEN g % 17 = 0 THEN 'rejected'
                 ELSE 'approved' END AS status
    ) AS u;

    SELECT array_agg(user_id ORDER BY user_id)
      INTO v_users FROM public.app_user
     WHERE email LIKE '%@biobank-demo.example';

    -- ------------------------------------------------------------ audit log
    INSERT INTO public.audit_log
        (user_id, action, table_name, record_id, action_timestamp, details)
    SELECT
        v_users[1 + (g * 5) % array_length(v_users, 1)],
        (ARRAY['INSERT','UPDATE','INSERT','VIEW','UPDATE','DELETE'])[1 + g % 6],
        (ARRAY['sample','donor','experiment','sequencing_result',
               'sample_storage','consent'])[1 + g % 6],
        1 + (g * 3) % 50,
        TIMESTAMP '2025-07-01 08:00' + (g * INTERVAL '1 day 3 hours'),
        'Demo audit entry #' || g
    FROM generate_series(1, 52) AS g;

    RAISE NOTICE 'Dummy data loaded.';
END;
$$;

COMMIT;
