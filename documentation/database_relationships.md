# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Database Relationships Documentation

## 1. Introduction

The database uses a relational structure to organize donor,
consent, sample, researcher, laboratory, storage, experiment,
and sequencing information.

Primary keys uniquely identify records, while foreign keys
connect related records across tables.

This document explains the major relationships between the
16 PostgreSQL tables.

## 2. Overview of Database Tables

The database contains the following tables:

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

## 3. Donor Relationships

### Donor and Consent

Relationship: One-to-Many

A donor can have multiple consent records.

The donor identifier connects consent records to the donor
who provided the consent.

### Donor and Sample

Relationship: One-to-Many

A donor can provide multiple biological samples.

Each sample is associated with its donor through the donor
identifier.

## 4. Sample Relationships

### Sample and Sample Type

Relationship: One-to-Many

A sample type can be associated with multiple samples.

Each sample belongs to a sample type.

### Sample and Sample Process

The sample_process table records laboratory processing
relationships involving samples.

It connects input samples and output samples with the
corresponding laboratory process.

### Sample and Sample Lineage

Relationship: Self-referencing relationship

The sample_lineage table records relationships between
parent samples and child samples.

A parent sample may have multiple child samples.

This structure supports sample traceability across
multiple generations.

### Sample and Sample Storage

A sample can have storage records describing where and
when it was stored.

The sample_storage table connects samples with storage units
and records storage history.

### Sample and Sequencing Result

A sample can have sequencing result records.

The sequencing_result table stores information associated
with sequencing activities performed on samples.

## 5. Researcher Relationships

### Researcher and Experiment

Relationship: One-to-Many

A researcher can be associated with multiple experiments.

The experiment table stores the researcher identifier
to identify the researcher associated with an experiment.

## 6. Laboratory Process Relationships

### Process and Sample Process

A process can be associated with multiple sample processing
records.

The sample_process table connects laboratory processes
with their input and output samples.

This helps maintain a record of sample transformations
and laboratory activities.

## 7. Storage Relationships

### Storage Unit and Sample Storage

A storage unit can have multiple sample storage records.

The sample_storage table maintains the relationship between
a biological sample and its storage location.

Stored and removed dates help maintain storage history.

## 8. Experiment Relationships

### Experiment and Experiment Sample

The experiment_sample table connects experiments with
their associated biological samples.

### Sample and Experiment Sample

The experiment_sample table also connects samples with
experiments.

Together, these relationships support a Many-to-Many
relationship between experiments and samples.

An experiment can involve multiple samples, and a sample
can participate in multiple experiments.

## 9. User and Role Relationships

### Role and App User

Relationship: One-to-Many

A role can be assigned to multiple application users.

Each application user is associated with a role.

The role table maintains available application roles,
while app_user stores user account information.

## 10. Audit Log

The audit_log table maintains records of relevant
database activities.

It supports accountability and traceability by recording
information about operations and affected records.

## 11. Summary of Major Relationships

| Parent Table | Related Table | Relationship |
|---|---|---|
| donor | consent | One-to-Many |
| donor | sample | One-to-Many |
| sample_type | sample | One-to-Many |
| process | sample_process | One-to-Many |
| sample | sample_process | Input/Output relationship |
| sample | sample_lineage | Self-referencing |
| storage_unit | sample_storage | One-to-Many |
| sample | sample_storage | One-to-Many |
| researcher | experiment | One-to-Many |
| experiment | experiment_sample | One-to-Many |
| sample | experiment_sample | One-to-Many |
| sample | sequencing_result | One-to-Many |
| role | app_user | One-to-Many |

## 12. Data Integrity Rules

The database uses constraints to protect relationships
and maintain data consistency.

Important rules include:

- Primary keys uniquely identify records.
- Foreign keys maintain valid table relationships.
- A sample cannot be its own parent or child.
- Duplicate parent-child lineage pairs are prevented.
- Input and output samples in a processing record
  must be different.
- Consent expiry dates cannot precede consent dates.
- Experiment end dates cannot precede start dates.
- Sample storage removal dates cannot precede stored dates.

## 13. Conclusion

The relational structure connects donor information,
consent records, biological samples, laboratory processes,
sample lineage, storage, experiments, sequencing results,
and application users.

These relationships support data integrity and help maintain
the traceability of biological samples throughout their
lifecycle.
