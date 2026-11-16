# Genomic Biobank & DNA/RNA Sample Lineage Repository
# SQL Queries and Advanced Database Features

## 1. Introduction

This document describes the SQL operations and advanced
database features used in the Genomic Biobank & DNA/RNA
Sample Lineage Repository.

The database uses PostgreSQL to store and manage structured
biological sample and research information.

The SQL implementation is organized into schema definitions,
sample data, queries, and advanced database features.

## 2. SQL Project Files

The project contains the following SQL files:

### schema.sql
Defines the relational database schema and creates the
required database tables and relationships.

### er_schema_dump.sql
Contains the database schema representation used for
database structure documentation.

### sample_data.sql
Contains example records used to populate the database.

### queries.sql
Contains SQL queries for retrieving and working with
database information.

### advanced_features.sql
Contains additional database features, including
audit-related trigger functionality and indexes.

## 3. Database Schema

The PostgreSQL database contains 16 main tables:

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

These tables organize information about donors, consent,
samples, laboratory activities, storage, experiments,
sequencing, application users, and auditing.

## 4. SQL Data Retrieval

SQL queries are used to retrieve information from
the relational database.

The project query file is:

sql/queries.sql

Queries support database operations such as:

- Retrieving donor information.
- Accessing sample records.
- Viewing related sample information.
- Retrieving researcher and experiment information.
- Accessing storage records.
- Viewing sequencing information.
- Exploring sample lineage relationships.

The exact query definitions are maintained in
sql/queries.sql.

## 5. SQL Joins and Relationships

SQL joins allow related information to be retrieved
from multiple relational tables.

Examples of useful relationships include:

- Donors and their samples.
- Donors and their consent records.
- Samples and sample types.
- Researchers and experiments.
- Samples and sequencing results.
- Samples and storage records.
- Experiments and their associated samples.

These relationships allow the application to retrieve
connected information without unnecessarily duplicating
relational data.

## 6. Data Integrity Constraints

Database constraints help maintain accurate and
consistent information.

The project includes integrity rules such as:

### Primary Key Constraints
Ensure that records have unique identifiers.

### Foreign Key Constraints
Maintain valid relationships between related tables.

### Unique Constraints
Prevent duplicate values in fields where uniqueness
is required.

### Check Constraints
Restrict invalid values.

Important validation rules include:

- Consent expiry dates cannot precede consent dates.
- Experiment end dates cannot precede start dates.
- A sample cannot be its own parent or child.
- Duplicate parent-child lineage pairs are prevented.
- Processing input and output samples must be different.
- Processing quantities cannot be negative when provided.
- Storage removal dates cannot precede storage dates.

## 7. Advanced Database Features

The project includes additional PostgreSQL features
defined in:

sql/advanced_features.sql

### 7.1 Audit Logging

Audit logging supports accountability by recording
changes to database records.

The project includes audit-related trigger functionality
for recording relevant sample update operations.

The audit_log table maintains audit information.

Audit records can help identify:
- Which records were changed.
- What operation was performed.
- When a change occurred.
- Previous and updated record information,
  where captured by the implementation.

### 7.2 Database Triggers

A database trigger allows PostgreSQL to execute
a predefined operation automatically when a
specified database event occurs.

The project uses trigger functionality for
audit-related record updates.

### 7.3 Database Indexes

Indexes help PostgreSQL locate records more efficiently.

The project includes index definitions in
sql/advanced_features.sql.

Indexes are useful for improving data retrieval
when queries frequently search or filter records.

## 8. Transactions and Data Consistency

Database transactions help group related database
operations into a logical unit.

A transaction can ensure that related operations
are committed together or rolled back when an
operation fails.

Transactions are particularly useful for operations
involving related sample and storage records.

The exact transaction behavior is determined by
the application backend implementation.

## 9. SQL and Backend Integration

The Next.js backend communicates with PostgreSQL
to perform application database operations.

The backend uses database operations for:

- Donor management.
- Consent management.
- Sample registration.
- Researcher management.
- Laboratory processing.
- Sample lineage.
- Storage management.
- Experiment management.
- Sequencing result management.
- User and audit management.

API requests are validated and authorized before
protected database operations are performed.

## 10. Importance of Advanced Features

The SQL implementation supports:

- Structured data organization.
- Referential integrity.
- Prevention of invalid relationships.
- Efficient record retrieval.
- Auditability of database changes.
- Consistent management of biological sample records.

## 11. Conclusion

The PostgreSQL implementation combines relational
table design, SQL queries, constraints, indexes,
and audit-related trigger functionality.

These features support reliable data management
and traceability within the Genomic Biobank & DNA/RNA
Sample Lineage Repository.

The detailed SQL definitions are maintained in
the project's sql directory.
