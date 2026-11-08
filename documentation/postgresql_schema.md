# PostgreSQL Database Schema Documentation

## 1. Overview

The Genomic Biobank & DNA/RNA Sample Lineage Repository uses PostgreSQL to store and manage structured genomic biobank data.

The database contains 16 tables covering donors, consent records, biological samples, sample types, researchers, laboratory processes, sample lineage, storage, experiments, sequencing results, application users, roles, and audit records.

The schema uses primary keys, foreign keys, unique constraints, and check constraints to maintain data integrity.

## 2. Database Tables

| Table | Description |
|---|---|
| donor | Stores donor information. |
| consent | Stores donor consent records. |
| sample | Stores biological sample information. |
| sample_type | Stores sample categories. |
| researcher | Stores researcher information. |
| process | Stores laboratory process information. |
| sample_process | Records input and output samples associated with a process. |
| sample_lineage | Records parent-child relationships between samples. |
| storage_unit | Stores laboratory storage locations. |
| sample_storage | Records sample storage assignments and removal dates. |
| experiment | Stores experiment information. |
| experiment_sample | Associates samples with experiments. |
| sequencing_result | Stores sequencing result metadata. |
| role | Stores application roles. |
| app_user | Stores application account information. |
| audit_log | Stores application audit records. |

## 3. Primary Keys

Each table has a primary key identifying its records.

| Table | Primary Key |
|---|---|
| donor | donor_id |
| consent | consent_id |
| sample | sample_id |
| sample_type | sample_type_id |
| researcher | researcher_id |
| process | process_id |
| sample_process | sample_process_id |
| sample_lineage | lineage_id |
| storage_unit | storage_id |
| sample_storage | sample_storage_id |
| experiment | experiment_id |
| experiment_sample | experiment_sample_id |
| sequencing_result | sequencing_result_id |
| role | role_id |
| app_user | user_id |
| audit_log | audit_id |

## 4. Foreign-Key Relationships

| Child Table | Foreign Key | Referenced Table |
|---|---|---|
| consent | donor_id | donor |
| sample | donor_id | donor |
| sample | sample_type_id | sample_type |
| process | performed_by | researcher |
| sample_process | process_id | process |
| sample_process | input_sample_id | sample |
| sample_process | output_sample_id | sample |
| sample_lineage | parent_sample_id | sample |
| sample_lineage | child_sample_id | sample |
| sample_storage | sample_id | sample |
| sample_storage | storage_id | storage_unit |
| experiment | researcher_id | researcher |
| experiment_sample | experiment_id | experiment |
| experiment_sample | sample_id | sample |
| sequencing_result | sample_id | sample |
| sequencing_result | experiment_id | experiment |
| app_user | role_id | role |
| app_user | researcher_id | researcher |
| audit_log | user_id | app_user |

## 5. Unique Constraints

The schema includes the following unique constraints:

- app_user.username
- app_user.email
- researcher.email
- role.role_name
- sample_type.sample_type_name
- experiment_sample(experiment_id, sample_id)
- sample_lineage(parent_sample_id, child_sample_id)

These constraints prevent duplicate values or duplicate associations in the specified columns.

## 6. Check Constraints

The schema includes the following check constraints:

### Consent

A consent expiry date must be NULL or greater than or equal to its consent date.

### Experiment

When both experiment start and end dates are provided, the end date must not be earlier than the start date.

### Sample Lineage

A sample cannot be its own parent and child in the same lineage relationship.

### Sample Process

An input sample cannot be the same as its output sample.

The process quantity must be NULL or greater than or equal to zero.

### Sample Storage

A removal date must be NULL or greater than or equal to the storage date.

## 7. Relationship Overview

- A donor can have multiple consent records.
- A donor can provide multiple samples.
- Each sample belongs to a sample type.
- A researcher can perform multiple processes.
- A researcher can lead multiple experiments.
- A process can have multiple sample-process records.
- Samples can participate in processing as input or output.
- Samples can have parent-child lineage relationships.
- Samples can have storage assignment records.
- Storage units can be associated with sample storage records.
- Experiments can include multiple samples.
- Samples can participate in multiple experiments.
- Samples can have multiple sequencing results.
- Sequencing results can optionally reference an experiment.
- Application users are assigned roles.
- Application users can optionally link to researcher records.
- Audit records can optionally reference application users.

## 8. Data Integrity

The database uses relational constraints to maintain consistency between related records.

Foreign keys prevent references to missing parent records. Primary keys uniquely identify records. Unique constraints prevent duplicate associations and identifiers. Check constraints enforce date, quantity, and lineage rules.

The application also uses validation and transactional operations in backend APIs for selected workflows.

## 9. Related Files

- `sql/schema.sql` — Database schema.
- `sql/er_schema_dump.sql` — Schema dump.
- `sql/sample_data.sql` — Sample data.
- `sql/queries.sql` — SQL queries.
- `sql/advanced_features.sql` — Advanced SQL features.
- `documentation/er_diagram.mmd` — Entity relationship diagram.
