# Genomic Biobank Frontend

Next.js App Router application with same-origin API routes. PostgreSQL is the source of truth for relational records; MongoDB is used for lineage event history. The browser does not connect directly to either database.

## Setup and run

Requirements: Node.js 20 LTS, PostgreSQL, MongoDB, and an initialized project database.

1. In this directory, install dependencies:

   ```powershell
   npm install
   ```

2. Create `.env.local` with server-only settings:

   ```text
   DATABASE_URL=<PostgreSQL connection string>
   MONGODB_URI=<MongoDB connection string>
   AUTH_SECRET=<random secret, at least 32 characters>
   ```

   Do not commit `.env.local`. Do not prefix database credentials or `AUTH_SECRET` with `NEXT_PUBLIC_`. See `../sql/` and `../documentation/api_reference.md` for database and API details.

3. Ensure the PostgreSQL database has the schema and user accounts required by the API. Login accounts must have valid Argon2 password hashes and one of the supported roles.
4. Start the development server:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000` and sign in using a configured account.

Run static checks from this directory:

```powershell
npm run lint
npm run typecheck
npm run build
```

Build/lint/typecheck do not establish database connectivity. Admin users can use the existing `/api/db-check` and `/api/mongodb-test` diagnostics when the app is running.

## Frontend architecture

- `app/` contains pages and API route handlers.
- `components/workspace.tsx` verifies the session, maps database roles to UI roles, hosts navigation, and opens forms.
- `components/workspace-records.tsx` loads donor, sample, processing, experiment, sequencing, and storage data from existing APIs and renders request loading/error/empty states with retry actions.
- `components/workspace-forms.tsx` preserves the shared modal/form styling and Zod validation while submitting supported API payloads.
- `components/workspace-dashboard.tsx` derives metrics/charts from PostgreSQL APIs.
- `components/workspace-lineage.tsx` combines the PostgreSQL lineage graph with MongoDB event history.
- `components/demo-data-provider.tsx` still supports legacy/demo surfaces; it is not the source of truth for the live records, dashboard, or lineage modules described above.
- `lib/auth.ts` and `lib/db.ts` are server-side utilities. `src/lib/mongodb.ts` creates the MongoDB client. API route authorization is authoritative; hiding a button in the frontend is not security enforcement.

The browser uses same-origin `/api/...` routes and cookie credentials. `NEXT_PUBLIC_API_BASE_URL` is not required for these routes.

### API integration map

- **Authentication and session:** `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout`; the session is carried in the existing HttpOnly cookie.
- **Relational records:** `/api/donors`, `/api/samples`, `/api/sample-options`, `/api/consents`, `/api/researchers`, `/api/processes`, `/api/sample-processes`, `/api/experiments`, `/api/experiment-samples`, `/api/storage-units`, `/api/sample-storage`, and `/api/sequencing-results`.
- **Dashboard:** derives metrics from the donor, sample, experiment, sequencing-result, storage-unit, and sample-storage list APIs.
- **Lineage:** `/api/lineage-graph` provides relational graph data; `/api/lineage-events` provides MongoDB event history. The browser does not connect directly to PostgreSQL or MongoDB.
- **Diagnostics:** `/api/db-check` and `/api/mongodb-test` are existing Admin-only connection checks.

The UI follows the implemented request and response contracts. Consult `../documentation/api_reference.md` and the API route handlers for supported methods, payload fields, role restrictions, and error responses; do not infer database fields or endpoints from form labels.

## Routes

- `/login` — authenticates against `POST /api/auth/login`.
- `/dashboard` — donor, sample, experiment, sequencing-result, and storage assignment data from APIs.
- `/donors` — PostgreSQL donor list, create/edit, and Admin-only delete.
- `/samples` — PostgreSQL sample list and registration.
- `/processing` — PostgreSQL process and sample-process records; edit preserves current sample links and Admin deletion removes links before the process.
- `/experiments` — PostgreSQL experiment and sample association records; edit preserves current sample associations and Admin deletion removes associations before the experiment.
- `/storage` — PostgreSQL storage-unit create/edit, Admin-only delete, sample assignment/removal, active-location status, and assignment history.
- `/sequencing` — PostgreSQL result metadata with create/edit and Admin-only delete. Editing preserves sample/experiment links; no read-count or quality metrics are fabricated.
- `/lineage` — PostgreSQL donor/sample relationships and MongoDB `lineage_events`.
- `/audit` — displays an explicit unavailable state because there is no audit-log route in the current backend.
- `/management` — role permissions; there is no user-management API in the current backend.

## API and database behavior

Use the existing routes described by `../documentation/api_reference.md`; do not infer endpoint contracts from UI labels. API errors are displayed in the relevant view or form. Processing/experiment create requests save the parent and sample relationship separately, so a failed second request can leave the primary record saved; the interface reports this partial outcome. Deletion also requires multiple requests and is not transactional; partial relationship removals are reported and the list refreshes. The APIs cap relationship-list responses at 100, so deletion is blocked when 100 or more matching relationships are loaded because the frontend cannot establish that the list is complete.

The current UI does not claim support for CRUD operations that have no corresponding implemented interaction. Authorization and role-specific access are enforced by the API. Admin and Researcher accounts can use the current authorized record APIs; delete actions are Admin-only. Lab Technician login is supported, but current data APIs do not authorize workspace records for this role. The UI labels Admin as Administrator. Frontend visibility is not a security boundary.

The donor, sample, process, experiment, sequencing-result, storage-unit, and sample-storage list routes return at most 100 records and do not expose pagination or server-side search. Dashboard totals and client-side search/filtering apply to the API records returned, not necessarily every row in a larger database.

At narrow viewports, the sidebar becomes a collapsible navigation drawer, dashboard cards and charts reflow into fewer columns, and wide data tables scroll horizontally rather than compressing columns until values become unreadable. Dashboard, list, and lineage API failures display an error with a retry action; empty results are shown only after a successful load.

## Manual demo and screenshot checklist

Use fictional donor/sample data and test accounts only:

1. Sign in with an existing PostgreSQL account.
2. Show the database-backed dashboard and donor list.
3. Register a donor, edit it, and verify that the displayed ID is the numeric PostgreSQL ID.
4. Register a sample for that donor.
5. Record a processing operation and experiment, then inspect their sample relationships.
6. Create a storage unit, assign a sample to an available location, then mark the active assignment removed.
7. Create a sequencing result metadata record and edit its supported metadata fields.
8. Open the lineage graph and inspect MongoDB event history where events exist.
9. Test sign-out, then sign in with Researcher/Lab Technician accounts as available; confirm restricted actions are rejected by the backend.
10. Capture the audit-log unavailable state rather than representing synthetic activity as an audit trail.

Suggested screenshots:

- Dashboard at desktop width and a narrow mobile width, showing the reflowed metric cards and charts.
- Donor list/detail and donor create/edit form.
- Sample list/detail and processing/experiment records with their linked samples.
- Storage-unit list with availability/occupancy, assignment history, and the sample-assignment form.
- Sequencing-result list/detail and metadata edit form.
- Lineage graph plus event detail where MongoDB events are present.
- Admin navigation versus Researcher navigation, the Lab Technician access explanation, and the audit-unavailable notice.
- A loading/error/empty state if it occurs naturally during testing; do not use fabricated records or screenshots to imply a database result that was not returned.

Use fictional data and non-production test accounts only. Exclude credentials, cookies, database connection strings, secrets, and real personal/health information from all screenshots.
