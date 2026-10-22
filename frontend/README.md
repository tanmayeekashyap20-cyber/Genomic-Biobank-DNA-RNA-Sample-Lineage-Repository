# Genomic Biobank Frontend

Next.js App Router frontend for the Genomic Biobank & DNA/RNA Sample Lineage Repository. The current application is a local demonstration: all records, activity, chart values, and sequencing metrics are synthetic. No backend API, PostgreSQL database, or Neo4j connection was present in the repository when this frontend was created.

## Run on Windows

1. Install Node.js 20 LTS (npm is included) and reopen VS Code so the terminal PATH refreshes.
2. Open a PowerShell terminal in this `frontend` directory.
3. Install packages with `npm install`.
4. Start the development server with `npm run dev`.
5. Open `http://localhost:3000`.

Use `npm run typecheck`, `npm run lint`, and `npm run build` for checks. This workspace did not have Node.js/npm available during implementation, so package installation and these commands still need to be run locally.

## Routes

- `/login` - local demo role selection and sign-in form
- `/dashboard` - synthetic counts, charts, recent samples, and activity
- `/donors` - searchable donor registry, details, and register/edit forms
- `/samples` - searchable inventory, details, and sample registration
- `/lineage` - React Flow lineage graph, relationship filters, sample search, and parent/derived sample tracing
- `/processing` - explicit input/output processing events
- `/experiments` - experiment register, details, and creation form
- `/sequencing` - synthetic sequencing metrics
- `/storage` - synthetic unit occupancy and status
- `/audit` - simulated activity log, not a security audit trail
- `/management` - frontend-only Administrator and Researcher role demonstration

## Demo Access

Choose Administrator or Researcher on `/login`. The prefilled demo email is `admin@biobank.demo`; the password may be any value of at least six characters. No credentials are transmitted or authenticated. Demo role selection is stored in `sessionStorage`. Administrator can see User & Role Management; Researcher navigation is restricted in the frontend only.

Production authentication and authorization must be implemented and enforced by the backend. Do not treat this demo login or its role checks as security controls.

## Demo Data

Initial records use coded identifiers and synthetic cohort metadata only. Create/update actions write to `sessionStorage` for the current browser tab session; refreshing that tab retains local demo changes, while a new session starts from the synthetic seed data. No real donor identities, patient results, or genomic measurements are included. All read counts and quality scores are illustrative demo values.

Lineage links are generated from explicit relationships only: donor/sample association, processing event input/output, experiment/sample association, and sequencing result associations. Parent-sample and derived-sample tracing follows processing input/output records only. The graph is not proof of a biological relationship.

## Environment and Backend Integration

Copy `.env.example` to `.env.local` if configuring an API base URL. `NEXT_PUBLIC_API_BASE_URL` is an optional placeholder; no endpoint paths or contracts are assumed because the repository contained no backend implementation or schema. `lib/api.ts` provides a typed request boundary, and `lib/lineage-adapter.ts` maps the current demo provider into React Flow nodes and edges. Replace these adapters once the backend team publishes verified endpoint contracts and the Neo4j relationship schema.

The planned relational entities (donor, consent, sample type, sample, researcher, process, sample process, storage, experiment, sequencing result, role, user, and audit log) were not defined in existing SQL/schema files. This demo consequently avoids defining database contracts. Keep PostgreSQL access behind backend APIs; never put database or Neo4j credentials in browser code.