-- Genomic Biobank: SQL query demonstrations
-- Run against genomic_biobank_test.

-- 1. SELECT and ORDER BY
SELECT sample_id, donor_id, sample_type_id, collection_date, status
FROM public.sample
ORDER BY collection_date DESC, sample_id;

-- 2. JOIN: samples, donors, and sample types
SELECT s.sample_id, d.full_name AS donor_name,
       st.sample_type_name, s.collection_date, s.status
FROM public.sample AS s
JOIN public.donor AS d ON d.donor_id = s.donor_id
JOIN public.sample_type AS st
  ON st.sample_type_id = s.sample_type_id
ORDER BY d.full_name, s.sample_id;

-- 3. GROUP BY and aggregate
SELECT st.sample_type_name, COUNT(s.sample_id) AS total_samples
FROM public.sample_type AS st
LEFT JOIN public.sample AS s
  ON s.sample_type_id = st.sample_type_id
GROUP BY st.sample_type_id, st.sample_type_name
ORDER BY total_samples DESC, st.sample_type_name;

-- 4. HAVING: donors with more than one sample
SELECT d.donor_id, d.full_name, COUNT(s.sample_id) AS total_samples
FROM public.donor AS d
JOIN public.sample AS s ON s.donor_id = d.donor_id
GROUP BY d.donor_id, d.full_name
HAVING COUNT(s.sample_id) > 1
ORDER BY total_samples DESC;

-- 5. Subquery: samples with sequencing results
SELECT sample_id, status
FROM public.sample
WHERE sample_id IN (
    SELECT sample_id FROM public.sequencing_result
)
ORDER BY sample_id;

-- 6. Sample lineage
SELECT sample_lineage_id, parent_sample_id, child_sample_id,
       relationship_type, created_at
FROM public.sample_lineage
ORDER BY created_at, sample_lineage_id;

-- 7. UPDATE demonstration, rolled back after inspection
BEGIN;
UPDATE public.sample
SET description = 'Temporary UPDATE demonstration'
WHERE sample_id = 4;
SELECT sample_id, description
FROM public.sample WHERE sample_id = 4;
ROLLBACK;

-- 8. DELETE demonstration, rolled back after inspection
BEGIN;
DELETE FROM public.sample_storage
WHERE sample_id = 2 AND storage_id = 1;
SELECT sample_id, storage_id
FROM public.sample_storage
WHERE sample_id = 2 AND storage_id = 1;
ROLLBACK;

-- 9. Advanced SQL: reusable view for sample inventory
CREATE OR REPLACE VIEW public.sample_inventory_view AS
SELECT
    s.sample_id,
    d.full_name AS donor_name,
    st.sample_type_name,
    s.collection_date,
    s.status
FROM public.sample AS s
JOIN public.donor AS d
    ON d.donor_id = s.donor_id
JOIN public.sample_type AS st
    ON st.sample_type_id = s.sample_type_id;

-- Demonstrate the view
SELECT *
FROM public.sample_inventory_view
ORDER BY sample_id;
