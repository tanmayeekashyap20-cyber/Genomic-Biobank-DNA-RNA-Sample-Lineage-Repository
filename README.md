# Genomic Biobank DNA/RNA Sample Lineage Repository

A Next.js application for managing genomic-biobank donor and sample records, processing, storage, experiments, sequencing-result metadata, and sample lineage.

## Architecture

- **Next.js App Router** serves the frontend and same-origin API route handlers from `frontend/app`.
- **PostgreSQL** is the source of truth for donors, consents, samples, researchers, processing, storage, experiments, sequencing results, and account/role data.
- **MongoDB** stores lineage event history (`genomic_biobank.lineage_events`). Relational sample and donor lineage is exposed by the PostgreSQL lineage APIs.
- **Authentication** uses the existing login API, an HttpOnly `biobank-session` cookie, and an eight-hour signed session. API route handlers verify current account state and permissions; frontend visibility is not an authorization boundary.
- `documentation/api_reference.md` documents the current API contracts. The frontend calls existing same-origin routes and does not require `NEXT_PUBLIC_API_BASE_URL`.

The donor, sample, processing, experiment, storage-assignment, sequencing-result, dashboard, and lineage views use existing APIs. The application currently has no audit-log API route, so the Activity Log page reports that audit records are unavailable instead of presenting synthetic activity as an audit trail. The Management page is an informational role view; no user-management API is currently exposed.

## Run locally

1. Install Node.js 20 LTS and PostgreSQL. MongoDB is also required for lineage event history.
2. Create and initialize a PostgreSQL database using the SQL files in `sql/`. The schema prerequisites and sample-data cautions are documented below and in the SQL files.
3. In `frontend`, install dependencies and create `.env.local` with server-only configuration:

   ```text
   DATABASE_URL=<PostgreSQL connection string>
   MONGODB_URI=<MongoDB connection string>
   AUTH_SECRET=<random secret of at least 32 characters>
   ```

   Keep secrets out of source control and never use `NEXT_PUBLIC_` for database credentials or the authentication secret.
4. Configure database user accounts with valid Argon2 password hashes and supported roles (`Admin`, `Researcher`, or `Lab Technician`) in the PostgreSQL schema.
5. From `frontend`, run:

   ```powershell
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000` and sign in with an account present in the configured database.

For static checks, run `npm run lint` and `npm run typecheck` from `frontend`. `npm run build` additionally requires valid environment configuration; it is not proof of a successful live database connection.

## Database setup

- `sql/schema.sql` contains the PostgreSQL schema.
- `sql/sample_data.sql` contains fictional records. Review its assumptions before importing; do not load it repeatedly into a working database.
- The schema may require PostgreSQL extensions already described in the SQL setup documentation.
- A configured environment variable is not proof that either database is reachable. Use the authenticated `/api/db-check` and `/api/mongodb-test` diagnostics (Admin-only) to verify live connectivity.

## Application routes

- `/login` — database-backed sign-in
- `/dashboard` — counts and charts fetched from PostgreSQL APIs
- `/donors`, `/samples`, `/processing`, `/experiments` — relational records and available registration/edit flows
- `/storage` — PostgreSQL storage-unit create/edit, Admin-only delete, assignment and removal workflows
- `/sequencing` — PostgreSQL sequencing-result metadata with edit and Admin-only delete (no synthetic read count or quality values)
- `/lineage` — PostgreSQL donor/sample graph and MongoDB lineage event history
- `/audit` — states that no audit-log API is currently available
- `/management` — role permissions; not a user-management interface

## Demonstration walkthrough

1. Start the configured application and sign in with a test account from PostgreSQL.
2. Capture the dashboard after it loads database-backed counts.
3. Register a fictional donor, then show its database-generated donor ID in the donor list and detail view.
4. Register a sample linked to that donor.
5. Record a processing event with distinct input/output samples and an experiment associated with a sample.
6. Create a storage unit, assign a sample to an available location, then demonstrate marking an active assignment removed.
7. Create a sequencing-result metadata record and edit its supported metadata fields.
8. Open Lineage to show the relational graph and available MongoDB event history.
9. Sign in with a Researcher account and, if available, a Lab Technician account to demonstrate role-specific controls. Confirm that forbidden API operations are rejected by the server.
10. Show the explicit audit-log limitation and the loading/error/empty states where appropriate.

Recommended screenshots: authenticated dashboard at desktop and mobile widths, donor list and edit form, sample list/details, processing and experiment records, storage-unit list and assignment, sequencing list/edit form, lineage graph with event detail, and the audit-unavailable notice. Use fictional data only and remove personal or secret information from screenshots.

## Current limitations

- Existing APIs are used as implemented; unsupported CRUD operations are not simulated as successful.
- The frontend adapts dashboards, navigation, forms, and horizontally scrollable tables for tablet/mobile viewports. Dashboard, list, and lineage data loading failures include retry actions; empty states distinguish missing records from failed requests.
- Admins and Researchers can use the current authorized record APIs; deletion is Admin-only. Lab Technician login is supported, but current data APIs do not authorize workspace records for that role. The API remains the security boundary.
- Processing and experiment details can be edited without changing their existing sample relationships. Admin deletion removes each relationship through its existing API before deleting the parent record. These requests are not transactional; the interface reports partial deletion and refreshes the list when one or more relationship deletes succeeded.
- Storage-unit and assignment, and sequencing-result list APIs are capped at 100 records; dashboard counts and client-side search/filtering reflect only the returned records. The API does not expose pagination or server-side search for these lists.
- The relationship-list APIs return at most 100 records. Deletion is blocked when a selected processing/experiment record has 100 or more relationships in the loaded set, because completeness cannot be established from the capped list.
- Processing and experiment creation use separate record and association API requests. Those API calls are not one transaction; the interface reports if the primary record is saved but its association fails.
- Audit-log records and user-management operations are not exposed by the current API routes.
- Live PostgreSQL/MongoDB functionality must be tested with the project’s actual configured services; static lint and type checking do not verify database connectivity.
