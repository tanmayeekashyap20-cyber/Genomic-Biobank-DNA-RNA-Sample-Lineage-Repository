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

### Which server?

The app connects to the server in `DATABASE_URL` (`frontend/.env.local`),
which is the **Windows PostgreSQL service** (`postgresql-x64-18`) on
`127.0.0.1:5432`. Do **not** load the schema with `psql` inside WSL/Ubuntu:
WSL runs its own, separate PostgreSQL, and tables created there are never
visible to the app.

### Files

- `sql/schema.sql`: PostgreSQL schema (portable, no extensions required)
- `sql/sample_data.sql`: fictional test records
- `sql/advanced_features.sql`: audit trigger and index (safe to re-run)
- `sql/migrations/*.sql`: incremental, re-runnable schema changes applied
  by `npm run db:setup` in filename order (e.g. `001_user_approval.sql`
  adds the self-registration approval workflow)

### Registration and approval

Visitors can request an account from the login page ("Create an account"),
choosing **Researcher** or **Lab Technician**. New accounts are stored as
*pending* and cannot sign in until an Admin approves them under
**User & role management → Pending registrations**, where the Admin can
also change the granted role or reject the request.

### Configure

Copy `frontend/.env.example` to `frontend/.env.local` and fill in
`DATABASE_URL`, `AUTH_SECRET` (32+ characters) and `MONGODB_URI`.

### Create the database, schema and sample data

From `frontend/`:

```bash
npm run db:setup                   # creates DB/schema/sample data if missing; idempotent
npm run db:setup -- --reset        # DROPS all tables and rebuilds them from scratch
npm run db:setup -- --no-sample-data
```

The script prints the host, port and server version it connected to, so you
can confirm it is the same server the app uses.

To also create a loginable Admin account, set `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` (and optionally `SEED_ADMIN_USERNAME`) in
`.env.local` before running `npm run db:setup`. The `aarav_test` user in
`sample_data.sql` has a placeholder password hash and cannot log in.

Manual alternative (Windows `psql`, run in this order):

```bash
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE genomic_biobank_test"
psql -h 127.0.0.1 -U postgres -d genomic_biobank_test -f sql/schema.sql
psql -h 127.0.0.1 -U postgres -d genomic_biobank_test -f sql/sample_data.sql
psql -h 127.0.0.1 -U postgres -d genomic_biobank_test -f sql/advanced_features.sql
```
