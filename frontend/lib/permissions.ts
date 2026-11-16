// Single source of truth for role-based access. Used by the sidebar,
// page guards and API routes so the UI and backend always agree.
// Safe to import from both client and server code (no server imports).

export type DbRole = "Admin" | "Researcher" | "Lab Technician";

export type Section =
  | "dashboard"
  | "donors"
  | "samples"
  | "lineage"
  | "processing"
  | "experiments"
  | "sequencing"
  | "storage"
  | "audit"
  | "management";

const ALL: DbRole[] = ["Admin", "Researcher", "Lab Technician"];

// Who may open each section (and call its read endpoints).
export const SECTION_ACCESS: Record<Section, DbRole[]> = {
  dashboard: ALL,
  donors: ALL,
  samples: ALL,
  lineage: ALL,
  processing: ALL,
  experiments: ALL, // Researchers only see their own ("My experiments")
  sequencing: ALL,
  storage: ALL, // Researchers: read-only "Sample availability & storage"
  audit: ["Admin", "Lab Technician"],
  management: ["Admin"],
};

// Sections a role may view but not create or modify records in.
const READ_ONLY: Partial<Record<DbRole, Section[]>> = {
  Researcher: ["storage"],
};

// Role-specific sidebar / page titles.
const LABELS: Partial<Record<DbRole, Partial<Record<Section, string>>>> = {
  Researcher: {
    experiments: "My experiments",
    storage: "Sample availability & storage",
  },
  "Lab Technician": {
    storage: "Storage management",
    audit: "Audit history",
  },
};

export function canView(role: string, section: string): boolean {
  const allowed = SECTION_ACCESS[section as Section];
  return Boolean(allowed && allowed.includes(role as DbRole));
}

export function canWrite(role: string, section: string): boolean {
  if (!canView(role, section)) return false;
  return !(READ_ONLY[role as DbRole] ?? []).includes(section as Section);
}

export function sectionLabel(
  role: string,
  section: string,
  fallback: string
): string {
  return LABELS[role as DbRole]?.[section as Section] ?? fallback;
}

// Role lists for API route checks.
export const ROLES = {
  all: ALL,
  // Create/update in storage-units and sample-storage.
  storageWriters: ["Admin", "Lab Technician"] as DbRole[],
  // Read audit history.
  auditReaders: SECTION_ACCESS.audit,
  // Deletes remain administrator-only everywhere.
  admin: ["Admin"] as DbRole[],
};
