
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  Badge,
  EmptyState,
  Notice,
  PageHeading,
  Panel,
} from "./ui";
import type {
  DatabaseDonor,
  DatabaseSample,
  DatabaseProcess,
  DatabaseSampleProcess,
  DatabaseExperiment,
  DatabaseExperimentSample,
  DatabaseSequencingResult,
  DatabaseStorageUnit,
  DatabaseSampleStorage,
} from "../lib/types";

type Section =
  | "donors"
  | "samples"
  | "processing"
  | "experiments"
  | "sequencing"
  | "storage"
  | "audit";

type RecordsPayload = {
  donors: DatabaseDonor[];
  samples: DatabaseSample[];
  processes: DatabaseProcess[];
  sample_processes: DatabaseSampleProcess[];
  experiments: DatabaseExperiment[];
  experiment_samples: DatabaseExperimentSample[];
  sequencing_results: DatabaseSequencingResult[];
  storage_units: DatabaseStorageUnit[];
  sample_storage: DatabaseSampleStorage[];
};

type RecordRow = Record<string, unknown>;

const emptyRecords: RecordsPayload = {
  donors: [],
  samples: [],
  processes: [],
  sample_processes: [],
  experiments: [],
  experiment_samples: [],
  sequencing_results: [],
  storage_units: [],
  sample_storage: [],
};

const headings: Record<Section, { title: string; description: string }> = {
  donors: {
    title: "Donor records",
    description: "Donor registration and consent information from PostgreSQL.",
  },
  samples: {
    title: "Sample records",
    description: "Registered biological samples and their lineage and storage details.",
  },
  processing: {
    title: "Processing records",
    description: "Recorded laboratory processes and their input and output samples.",
  },
  experiments: {
    title: "Experiments",
    description: "Research experiments and their linked samples.",
  },
  sequencing: {
    title: "Sequencing results",
    description: "Sequencing runs and their recorded result details.",
  },
  storage: {
    title: "Storage records",
    description: "Storage units and current sample assignments.",
  },
  audit: {
    title: "Audit log",
    description: "Database audit information.",
  },
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return String(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  return <Badge>{value.replaceAll("_", " ")}</Badge>;
}

function Table({
  columns,
  rows,
  onSelect,
}: {
  columns: { key: string; label: string }[];
  rows: RecordRow[];
  onSelect?: (row: RecordRow) => void;
}) {
  if (rows.length === 0) {
   return <EmptyState title="No records found" detail="There are no matching PostgreSQL records in this section." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(row.id ?? row.sample_id ?? row.donor_id ?? row.process_id ?? row.experiment_id ?? row.sequencing_result_id ?? row.storage_id ?? index)}
              className={`border-b last:border-0 ${onSelect ? "cursor-pointer hover:bg-muted/40" : ""}`}
              onClick={() => onSelect?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 align-top">
                  {column.key === "status" ||
                  column.key === "consent_status" ||
                  column.key === "result_status" ||
                  column.key === "storage_status" ? (
                    <StatusBadge value={row[column.key] as string | null} />
                  ) : (
                    display(row[column.key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({
  section,
  row,
  records,
}: {
  section: Section;
  row: RecordRow | null;
  records: RecordsPayload;
}) {
  if (!row) {
    return (
      <EmptyState
        title="Select a record"
        detail="Choose a row to view its available database details."
      />
    );
  }

  const sampleId = String(row.sample_id ?? "");
  const processId = String(row.process_id ?? "");
  const experimentId = String(row.experiment_id ?? "");
  const storageId = String(row.storage_id ?? "");

  let details: [string, unknown][] = Object.entries(row);

  if (section === "samples") {
    const sample = records.samples.find((item) => item.sample_id === sampleId);
    details = [
      ["Sample ID", sample?.sample_id],
      ["Donor ID", sample?.donor_id],
      ["Sample type", sample?.sample_type_name],
      ["Collection date", formatDate(sample?.collection_date)],
      ["Collection location", sample?.collection_location],
      ["Status", sample?.status],
      ["Description", sample?.description],
      ["Parent samples", sample?.lineage_parents?.map((item) => item.related_sample_id).join(", ")],
      ["Child samples", sample?.lineage_children?.map((item) => item.related_sample_id).join(", ")],
      ["Storage locations", sample?.storage_locations?.map((item) => `${item.freezer_id} / ${item.rack_no} / ${item.box_no} / ${item.position}`).join("; ")],
    ];
  } else if (section === "donors") {
    details = [
      ["Donor ID", row.donor_id],
      ["Registration date", formatDate(String(row.registration_date ?? ""))],
      ["Consent status", row.consent_status],
    ];
  } else if (section === "processing") {
    details = [
      ["Process ID", row.process_id],
      ["Process type", row.process_type],
      ["Process date", formatDate(String(row.process_date ?? ""))],
      ["Performed by", row.researcher_name],
      ["Description", row.description],
      ["Sample operations", records.sample_processes
        .filter((item) => item.process_id === processId)
        .map((item) => `${item.input_sample_id} → ${item.output_sample_id}`)
        .join("; ")],
    ];
  } else if (section === "experiments") {
    details = [
      ["Experiment ID", row.experiment_id],
      ["Name", row.experiment_name],
      ["Type", row.experiment_type],
      ["Researcher", row.researcher_name],
      ["Start date", formatDate(String(row.start_date ?? ""))],
      ["End date", formatDate(String(row.end_date ?? ""))],
      ["Status", row.status],
      ["Description", row.description],
      ["Linked samples", records.experiment_samples
        .filter((item) => item.experiment_id === experimentId)
        .map((item) => item.sample_id)
        .join(", ")],
    ];
  } else if (section === "sequencing") {
    details = [
      ["Sequencing result ID", row.sequencing_result_id],
      ["Sample ID", row.sample_id],
      ["Experiment", row.experiment_name ?? row.experiment_id],
      ["Platform", row.sequencing_platform],
      ["Run date", formatDate(String(row.run_date ?? ""))],
      ["Result status", row.result_status],
      ["File path", row.file_path],
      ["Notes", row.notes],
    ];
  } else if (section === "storage") {
    details = [
      ["Storage ID", row.storage_id],
      ["Freezer", row.freezer_id],
      ["Rack", row.rack_no],
      ["Box", row.box_no],
      ["Position", row.position],
      ["Temperature", row.temperature],
      ["Status", row.status],
      ["Currently assigned samples", records.sample_storage
        .filter((item) => item.storage_id === storageId && !item.removed_date)
        .map((item) => item.sample_id)
        .join(", ")],
    ];
  }

  return (
    <div className="space-y-3">
      {details.map(([label, value]) => (
        <div key={label} className="border-b pb-2 last:border-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 break-words text-sm">{display(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function RecordsPage({
  section,
  title: titleOverride,
  canAdd = true,
  onAdd,
  onEditDonor,
}: {
  section: Section;
  // Role-specific page title (e.g. "My experiments"); empty = default.
  title?: string;
  // False for sections the current role may only view.
  canAdd?: boolean;
  onAdd: () => void;
  onEditDonor: (id: string) => void;
}) {
  const [records, setRecords] = useState<RecordsPayload>(emptyRecords);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [auditRows, setAuditRows] = useState<RecordRow[]>([]);

  // Audit history comes from its own endpoint (Admin / Lab Technician).
  useEffect(() => {
    if (section !== "audit") return;
    let cancelled = false;

    async function loadAudit() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/audit-logs?limit=100", {
          credentials: "include",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load audit history.");
        }

        if (!cancelled) setAuditRows(result.audit_logs as RecordRow[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load audit history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAudit();

    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/records", {
          credentials: "include",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load records.");
        }

        if (!cancelled) {
          setRecords({
            ...emptyRecords,
            ...result.records,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load records.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelected(null);
    setQuery("");
  }, [section]);

  const rows = useMemo<RecordRow[]>(() => {
    let result: RecordRow[] = [];

    switch (section) {
      case "donors":
        result = records.donors as unknown as RecordRow[];
        break;
      case "samples":
        result = records.samples as unknown as RecordRow[];
        break;
      case "processing":
        result = records.processes as unknown as RecordRow[];
        break;
      case "experiments":
        result = records.experiments as unknown as RecordRow[];
        break;
      case "sequencing":
        result = records.sequencing_results as unknown as RecordRow[];
        break;
      case "storage":
        result = records.storage_units as unknown as RecordRow[];
        break;
      case "audit":
        result = auditRows;
        break;
    }

    const search = query.trim().toLowerCase();
    if (!search) return result;

    return result.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(search),
      ),
    );
  }, [records, auditRows, section, query]);

  const columns = useMemo(() => {
    switch (section) {
      case "donors":
        return [
          { key: "donor_id", label: "Donor ID" },
          { key: "registration_date", label: "Registration date" },
          { key: "consent_status", label: "Consent status" },
        ];
      case "samples":
        return [
          { key: "sample_id", label: "Sample ID" },
          { key: "donor_id", label: "Donor ID" },
          { key: "sample_type_name", label: "Sample type" },
          { key: "collection_date", label: "Collection date" },
          { key: "status", label: "Status" },
        ];
      case "processing":
        return [
          { key: "process_id", label: "Process ID" },
          { key: "process_type", label: "Process type" },
          { key: "process_date", label: "Process date" },
          { key: "researcher_name", label: "Performed by" },
        ];
      case "experiments":
        return [
          { key: "experiment_id", label: "Experiment ID" },
          { key: "experiment_name", label: "Experiment" },
          { key: "experiment_type", label: "Type" },
          { key: "researcher_name", label: "Researcher" },
          { key: "status", label: "Status" },
        ];
      case "sequencing":
        return [
          { key: "sequencing_result_id", label: "Result ID" },
          { key: "sample_id", label: "Sample ID" },
          { key: "experiment_name", label: "Experiment" },
          { key: "sequencing_platform", label: "Platform" },
          { key: "result_status", label: "Result status" },
        ];
      case "storage":
        return [
          { key: "storage_id", label: "Storage ID" },
          { key: "freezer_id", label: "Freezer" },
          { key: "rack_no", label: "Rack" },
          { key: "box_no", label: "Box" },
          { key: "position", label: "Position" },
          { key: "status", label: "Status" },
        ];
      case "audit":
        return [
          { key: "audit_id", label: "Audit ID" },
          { key: "action_timestamp", label: "When" },
          { key: "action", label: "Action" },
          { key: "table_name", label: "Table" },
          { key: "record_id", label: "Record ID" },
          { key: "user_id", label: "User ID" },
          { key: "details", label: "Details" },
        ];
    }
  }, [section]);

  const title = {
    ...headings[section],
    title: titleOverride || headings[section].title,
  };

  return (
    <div className="space-y-6">
      <PageHeading
  eyebrow="PostgreSQL"
  title={title.title}
  subtitle={title.description}
>
  {section !== "audit" && canAdd ? (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      <Plus className="h-4 w-4" />
      Add record
    </button>
  ) : undefined}
</PageHeading>
      <Notice>
        Records are loaded from PostgreSQL. The API currently returns up to 100
        rows per record category; the displayed rows are not necessarily the
        complete database totals.
      </Notice>

      {error ? <Notice>{error}</Notice> : null}

      <Panel title="PostgreSQL records" caption="Search and browse database records">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records..."
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {loading ? "Loading records..." : `${rows.length} records shown`}
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading PostgreSQL records...
          </div>
        ) : section === "audit" ? (
          <Table columns={columns} rows={rows} />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            onSelect={(row) => {
              setSelected(row);
              if (section === "donors" && row.donor_id !== undefined) {
                onEditDonor(String(row.donor_id));
              }
            }}
          />
        )}
      </Panel>

      {section !== "audit" ? (
        <Panel title="Record details" caption="Details available from the PostgreSQL records">
          <div className="border-b p-4">
            <h3 className="font-semibold">Record details</h3>
            <p className="text-sm text-muted-foreground">
              Details available from the PostgreSQL records.
            </p>
          </div>
          <div className="p-4">
            <Detail section={section} row={selected} records={records} />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
