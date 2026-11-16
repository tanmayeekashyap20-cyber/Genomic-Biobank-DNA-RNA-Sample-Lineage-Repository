# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Database Data Dictionary

## 1. Introduction

This document describes the PostgreSQL database structure used in the
Genomic Biobank & DNA/RNA Sample Lineage Repository.

It explains the purpose of each table, its important attributes,
primary keys, foreign keys, and database relationships.

The database supports donor registration, consent management,
biological sample tracking, laboratory processing, sample lineage,
storage management, experiments, sequencing results, user roles,
and audit logging.

## 2. Database Tables

The PostgreSQL database contains the following 16 tables:

1. donor
2. consent
3. sample
4. sample_type
5. researcher
6. process
7. sample_process
8. sample_lineage
9. storage_unit
10. sample_storage
11. experiment
12. experiment_sample
13. sequencing_result
14. role
15. app_user
16. audit_log

## 3. Table Descriptions

### 3.1 donor

Purpose: Stores personal and registration information about biological
sample donors.

Important attributes:
- donor_id: Unique identifier for each donor.
- full_name: Donor's full name.
- date_of_birth: Donor's date of birth.
- gender: Donor's gender information.
- phone_number: Contact number.
- email: Email address.
- address: Residential address.
- registration_date: Date the donor was registered.

### 3.2 consent

Purpose: Stores donor consent information and permission records.

Important attributes:
- consent_id: Unique identifier for each consent record.
- donor_id: References the donor who provided consent.
- consent_date: Date consent was provided.
- expiry_date: Consent expiry date, when applicable.
- consent_type: Type of consent.
- consent_status: Current consent status.

### 3.3 sample

Purpose: Stores information about biological samples collected
from registered donors.

Important attributes:
- sample_id: Unique sample identifier.
- donor_id: References the donor.
- sample_type_id: References the sample type.
- collection_date: Date of sample collection.
- location: Collection location.
- status: Current sample status.
- description: Additional sample information.

### 3.4 sample_type

Purpose: Maintains the categories of biological samples.

Important attributes:
- sample_type_id: Unique sample type identifier.
- sample_type_name: Name of the sample type.
- description: Description of the sample type.

### 3.5 researcher

Purpose: Stores information about researchers associated with
biobank activities.

Important attributes:
- researcher_id: Unique researcher identifier.
- full_name: Researcher's name.
- department: Department or organization.
- role: Researcher's professional role.
- email: Researcher's email address.
- phone: Contact number.

### 3.6 process

Purpose: Stores laboratory procedures and processing activities.

Important attributes:
- process_id: Unique process identifier.
- process_name: Name of the laboratory process.
- description: Description of the process.
- process_date: Date of the process, if defined in the schema.

### 3.7 sample_process

Purpose: Records the processing relationship between samples.

Important attributes:
- sample_process_id: Unique processing record identifier.
- input_sample_id: Sample used as input.
- output_sample_id: Sample produced as output.
- process_id: Associated process.
- quantity: Quantity associated with processing, where applicable.
- process_date: Processing date, if defined in the schema.

### 3.8 sample_lineage

Purpose: Maintains parent-child relationships between samples.

Important attributes:
- lineage_id: Unique lineage record identifier.
- parent_sample_id: Parent sample identifier.
- child_sample_id: Child sample identifier.
- relationship_type: Type of lineage relationship, if defined.

This table helps trace the origin and history of biological samples.

### 3.9 storage_unit

Purpose: Stores information about physical sample storage locations.

Important attributes:
- storage_unit_id: Unique storage unit identifier.
- storage_name: Storage unit name.
- storage_type: Type of storage unit.
- location: Physical location.
- capacity: Storage capacity, if defined.

### 3.10 sample_storage

Purpose: Records where samples are stored and their storage history.

Important attributes:
- sample_storage_id: Unique storage record identifier.
- sample_id: Stored sample identifier.
- storage_unit_id: Associated storage unit.
- stored_date: Date the sample was stored.
- removed_date: Date the sample was removed, where applicable.

### 3.11 experiment

Purpose: Stores research experiment information.

Important attributes:
- experiment_id: Unique experiment identifier.
- experiment_name: Name of the experiment.
- start_date: Experiment start date.
- end_date: Experiment end date.
- researcher_id: Researcher responsible for the experiment.
- status: Current experiment status.

### 3.12 experiment_sample

Purpose: Connects biological samples with research experiments.

Important attributes:
- experiment_sample_id: Unique experiment-sample relationship identifier.
- experiment_id: Associated experiment.
- sample_id: Associated sample.

### 3.13 sequencing_result

Purpose: Stores sequencing result information associated with samples.

Important attributes:
- sequencing_result_id: Unique sequencing result identifier.
- sample_id: Associated biological sample.
- sequencing_type: Type of sequencing.
- result_file: Result file location or reference.
- result_date: Date of sequencing.
- status: Result status.

### 3.14 role

Purpose: Stores the available application roles.

Important attributes:
- role_id: Unique role identifier.
- role_name: Name of the application role.
- description: Description of role permissions.

### 3.15 app_user

Purpose: Stores application user account information.

Important attributes:
- user_id: Unique user identifier.
- username: Login username.
- email: User email address.
- password_hash: Securely stored password hash.
- role_id: References the user's assigned role.
- is_active: Indicates whether the account is active.

### 3.16 audit_log

Purpose: Maintains records of database-related activities for
accountability and traceability.

Important attributes:
- audit_id: Unique audit record identifier.
- table_name: Name of the affected table.
- operation: Type of operation performed.
- record_id: Identifier of the affected record.
- changed_at: Date and time of the change.
- changed_by: User associated with the change.
- old_data: Previous record data, where available.
- new_data: Updated record data, where available.

## 4. Database Relationships

The database uses primary keys and foreign keys to maintain
relationships between records.

Important relationships include:

- A donor can have multiple consent records.
- A donor can provide multiple biological samples.
- Each sample belongs to a sample type.
- Researchers can be associated with experiments.
- Samples can participate in laboratory processing.
- Samples can have parent-child lineage relationships.
- Samples can be assigned to storage units.
- Experiments can contain multiple samples.
- Samples can have sequencing results.
- Application users are assigned roles.
- Database operations can be recorded in the audit log.

## 5. Data Integrity

The database uses constraints to maintain data accuracy.

Important integrity rules include:

- Primary keys uniquely identify records.
- Foreign keys maintain valid relationships.
- Unique constraints prevent duplicate values where required.
- Consent expiry dates cannot be earlier than consent dates.
- Experiment end dates cannot be earlier than start dates.
- A sample cannot be its own parent or child in a lineage relationship.
- Duplicate parent-child lineage pairs are prevented.
- Processing input and output samples must be different.
- Processing quantities cannot be negative when provided.
- Sample storage removal dates cannot precede storage dates.

## 6. Database Technology

Primary database: PostgreSQL

PostgreSQL is used for structured and relational information,
including donors, samples, consent, processing, experiments,
storage, sequencing results, application users, and audit records.

MongoDB is used separately for lineage event history.

## 7. Conclusion

The data dictionary provides an overview of the database structure
and the purpose of its tables.

It supports database understanding, application development,
data management, and future maintenance of the
Genomic Biobank & DNA/RNA Sample Lineage Repository.
