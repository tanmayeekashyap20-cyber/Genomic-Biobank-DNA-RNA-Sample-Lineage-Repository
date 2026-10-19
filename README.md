# Genomic Biobank & DNA/RNA Sample Lineage Repository

## Project Overview

This project aims to manage genomic biobank donors, consent records, biological samples, sample processing, sample lineage, storage locations, experiments, and sequencing results.

## Database

The current database implementation uses PostgreSQL. The project schema includes tables for donors, samples, consent, researchers, processing activities, sample lineage, storage, experiments, sequencing results, application users, roles, and audit logs.

## Project Status

- [x] GitHub repository cloned locally
- [x] PostgreSQL database created
- [x] Initial database tables created
- [ ] Database schema and relationships validated
- [ ] SQL scripts organized in the repository
- [ ] Project documentation completed

## Note

This is an academic project. Any sample and donor records used for testing should be fictional.

## PostgreSQL Setup

### Files

- `sql/schema.sql` contains the exported PostgreSQL schema.
- `sql/sample_data.sql` contains fictional test records.

### Restore the schema

Create a fresh, empty database named `genomic_biobank_test` before restoring the schema. The PostgreSQL `vector` extension must be installed on the server.

From the Ubuntu/WSL terminal, run:

```bash
createdb -U postgres genomic_biobank_test
psql -U postgres -d genomic_biobank_test -f /mnt/c/Users/DELL/Documents/Genomic-Biobank-DNA-RNA-Sample-Lineage-Repository/sql/schema.sql
```

### Load fictional test data

Only after the schema has been restored successfully, run:

```bash
psql -U postgres -d genomic_biobank_test -f /mnt/c/Users/DELL/Documents/Genomic-Biobank-DNA-RNA-Sample-Lineage-Repository/sql/sample_data.sql
```

**Important:** These instructions are for a fresh test database, not the existing working database. The sample data assumes identity IDs start at 1, and should not be loaded repeatedly into the same database. The password field is a placeholder, and the sequencing file path is illustrative.
