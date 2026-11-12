# Database Design Decisions

## 1. Introduction

The Genomic Biobank & DNA/RNA Sample Lineage Repository uses a database design intended to organize donor information, biological samples, laboratory activities, and sample history.

The project uses PostgreSQL for structured relational information and MongoDB for lineage event documents.

## 2. PostgreSQL Design Decisions

### 2.1 Relational Data Storage

PostgreSQL is used to store structured information such as:

- Donor records
- Consent records
- Biological samples
- Sample types
- Researchers
- Processing activities
- Sample lineage relationships
- Storage units and sample storage records
- Experiments and experiment-sample relationships
- Sequencing results
- User roles and application users
- Audit records

### 2.2 Use of Primary Keys

Primary keys uniquely identify records in database tables. They help distinguish individual donors, samples, experiments, and other entities.

### 2.3 Use of Foreign Keys

Foreign keys represent relationships between related records. They help maintain consistency when connecting donors, samples, consent records, experiments, and other entities.

### 2.4 Data Validation and Constraints

Database constraints are used to prevent invalid data from being stored. Examples include:

- Preventing a sample from being its own parent in a lineage relationship.
- Preventing duplicate parent-child lineage pairs.
- Validating date ranges for consent, experiments, and sample storage.
- Preventing negative sample processing quantities where quantities are recorded.
- Enforcing uniqueness for selected identifiers and records.

### 2.5 Relational Queries

SQL queries are used to retrieve and manage structured records and to combine related information through database relationships.

## 3. MongoDB Design Decisions

### 3.1 Document-Oriented Storage

MongoDB is used for the `lineage_events` collection.

Lineage events are represented as documents, allowing event-related information to be stored together in a flexible document structure.

### 3.2 Event Information

A lineage event may contain information such as:

- Associated sample identifier
- Event type
- Description
- Event date
- Performer or responsible person

The exact fields are determined by the application's implemented event schema.

### 3.3 Cross-Database Reference

The application checks that the associated sample exists in PostgreSQL before creating a lineage event in MongoDB.

This allows event documents to refer to samples managed by the relational database.

## 4. Why Two Databases Are Used

The project uses a polyglot persistence approach, meaning different database technologies are used for different data requirements.

| Database | Project responsibility |
|---|---|
| PostgreSQL | Structured records, relationships, constraints, and relational queries |
| MongoDB | Document-based lineage event storage |

This separation allows the project to demonstrate both relational database management and document-oriented data storage.

## 5. Data Integrity Considerations

- PostgreSQL constraints help maintain relational consistency.
- Application-level validation checks submitted records.
- MongoDB lineage events are associated with sample identifiers from PostgreSQL.
- Cross-database references require application-level coordination because the databases do not share a single relational transaction.

## 6. Security Considerations

- Database credentials should be stored in environment variables.
- Database access should be restricted to the application and authorized administrators.
- API routes should enforce authentication and authorization.
- Sensitive donor and sample information should only be exposed to permitted users.

## 7. Future Improvements

Possible future improvements include:

- More comprehensive audit tracking.
- Automated database backup and recovery procedures.
- Additional indexes based on query patterns.
- Stronger cross-database consistency and recovery mechanisms.
- More detailed lineage event history and reporting.
- Evaluation of graph database support if required by future project scope.

## 8. Conclusion

The database design separates structured relational information from document-oriented lineage events. PostgreSQL provides relational tables, constraints, and queries, while MongoDB stores lineage event documents. Together, they support the project's genomic biobank record-management and sample-tracking goals.
