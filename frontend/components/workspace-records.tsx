
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  Badge,
  EmptyState,
  Notice,
  PageHeading,
  Panel,
} from "@/components/ui";

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
} from "@/lib/types";

type Section =
  | "donors"
  | "samples"
  | "processing"
  | "experiments"
  | "sequencing"
  | "storage"
  | "audit";

type RecordsData = {
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

type RecordItem =
  | DatabaseDonor
  | DatabaseSample
  | DatabaseProcess
  | DatabaseSampleProcess
  | DatabaseExperiment
  | DatabaseExperimentSample
  | DatabaseSequencingResult
  | DatabaseStorageUnit
  | DatabaseSampleStorage;

const emptyRecords: RecordsData = {
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

const headings: Record<
  Section,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    panelTitle: string;
    add?: string;
  }
> = {
  donors: {
    eyebrow: "Database records",
    title: "Donors",
    subtitle: "Donor registration records stored in PostgreSQL.",
    panelTitle: "Donor register",
    add: "Register donor",
  },
  samples: {
    eyebrow: "Specimen inventory",
    title: "Samples",
    subtitle:
      "Track sample collection, status, storage and recorded lineage.",
    panelTitle: "Sample register",
    add: "Register sample",
  },
  processing: {
    eyebrow: "Sample operations",
    title: "Processing",
    subtitle:
      "View processing operations and their input and output sample associations.",
    panelTitle: "Processing events",
    add: "Record event",
  },
  experiments: {
    eyebrow: "Research activity",
    title: "Experiments",
    subtitle:
      "View experiments and their associated samples.",
    panelTitle: "Experiment register",
    add: "Create experiment",
  },
  sequencing: {
    eyebrow: "Research outputs",
    title: "Sequencing results",
    subtitle:
      "Sequencing result records retrieved from PostgreSQL.",
    panelTitle: "Sequencing result register",
  },
  storage: {
    eyebrow: "Inventory operations",
    title: "Storage",
    subtitle:
      "View storage units and their sample assignments.",
    panelTitle: "Storage units",
  },
  audit: {
    eyebrow: "Activity history",
    title: "Activity log",
    subtitle:
      "Audit records are not yet exposed through this records endpoint.",
    panelTitle: "Audit records",
  },
};

function getRecordId(record: RecordItem): string {
  if ("donor_id" in record) return String(record.donor_id);
  if ("sample_id" in record && "collection_date" in record) {
    return String(record.sample_id);
  }
  if ("process_id" in record && "process_type" in record) {
    return String(record.process_id);
  }
  if ("sample_process_id" in record) {
    return String(record.sample_process_id);
  }
  if ("experiment_id" in record && "experiment_name" in record) {
    return String(record.experiment_id);
  }
  if ("experiment_sample_id" in record) {
    return String(record.experiment_sample_id);
  }
  if ("sequencing_result_id" in record) {
    return String(record.sequencing_result_id);
  }
  if ("storage_id" in record) return String(record.storage_id);
  if ("sample_storage_id" in record) {
    return String((record as DatabaseSampleStorage).sample_storage_id);
  }
  return "â€”";
}

function getStatus(record: RecordItem): string {
  if ("status" in record) return String(record.status);
  if ("result_status" in record) return String(record.result_status);
  if ("storage_status" in record) return String(record.storage_status);
  return "";
}

function getStatusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "" {
  const value = status.toLowerCase();

  if (
    value.includes("active") ||
    value.includes("complete") ||
    value.includes("available") ||
    value.includes("operational")
  ) {
    return "success";
  }

  if (
    value.includes("pending") ||
    value.includes("planned") ||
    value.includes("processing")
  ) {
    return "warning";
  }

  if (
    value.includes("withdrawn") ||
    value.includes("depleted") ||
    value.includes("failed")
  ) {
    return "danger";
  }

  if (value.includes("progress")) return "info";

  return "";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "â€”";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "â€”";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.map((item) => formatValue(item)).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .join(" Â· ");
  }

  return String(value);
}

export function RecordsPage({
  section,
  onAdd,
  onEditDonor,
}: {
  section: string;
  onAdd: () => void;
  onEditDonor: (id: string) => void;
}) {
  const safeSection = (
    section in headings ? section : "samples"
  ) as Section;

  const heading = headings[safeSection];

  const [records, setRecords] = useState<RecordsData>(emptyRecords);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState("id");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/records", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || result.message || "Could not load records."
          );
        }

        if (!cancelled) {
          setRecords({
            ...emptyRecords,
            ...result.records,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load records from PostgreSQL."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentRecords = useMemo<RecordItem[]>(() => {
    switch (safeSection) {
      case "donors":
        return records.donors;
      case "samples":
        return records.samples;
      case "processing":
        return [
          ...records.processes,
          ...records.sample_processes,
        ];
      case "experiments":
        return [
          ...records.experiments,
          ...records.experiment_samples,
        ];
      case "sequencing":
        return records.sequencing_results;
      case "storage":
        return [
          ...records.storage_units,
          ...records.sample_storage,
        ];
      case "audit":
        return [];
      default:
        return [];
    }
  }, [records, safeSection]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return currentRecords.filter((record) => {
      const searchable = JSON.stringify(record).toLowerCase();

      const matchesSearch = searchable.includes(needle);

      const status = getStatus(record);
      const matchesFilter =
        filter === "All" ||
        status.toLowerCase() === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [currentRecords, filter, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((left, right) => {
      let leftValue: unknown = getRecordId(left);
      let rightValue: unknown = getRecordId(right);

      if (sortKey !== "id") {
        leftValue = (left as unknown as Record<string, unknown>)[sortKey];
        rightValue = (right as unknown as Record<string, unknown>)[sortKey];
      }

      return String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        undefined,
        { numeric: true }
      );
    });
  }, [filtered, sortKey]);

  const filterOptions = useMemo(() => {
    const statuses = currentRecords
      .map((record) => getStatus(record))
      .filter(Boolean);

    return ["All", ...Array.from(new Set(statuses))];
  }, [currentRecords]);

  if (safeSection === "audit") {
    return <AuditLogPanel />;
  }

  return (
    <>
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        subtitle={heading.subtitle}
      >
        {heading.add && (
          <button
            className="button button-primary"
            onClick={onAdd}
          >
            <Plus size={14} />
            {heading.add}
          </button>
        )}
      </PageHeading>

      {error && (
        <div style={{ marginBottom: 15 }}>
          <Notice warning>{error}</Notice>
        </div>
      )}

      <div className="split-layout">
        <Panel
          title={heading.panelTitle}
          caption={`${filtered.length} ${
            filtered.length === 1 ? "record" : "records"
          } from the database`}
          className="table-panel"
        >
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={14} />
              <input
                aria-label={`Search ${heading.title}`}
                placeholder={`Search ${heading.title.toLowerCase()}...`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {filterOptions.length > 1 && (
                <select
                  className="filter-select"
                  aria-label="Filter records"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {filterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              )}

              <select
                className="filter-select"
                aria-label="Sort records"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value)}
              >
                <option value="id">Sort: ID</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
          </div>

          {loading && (
            <Notice>Loading records from PostgreSQL...</Notice>
          )}

          {!loading && !error && (
            <div className="table-scroll">
              <RecordTable
                section={safeSection}
                items={sorted}
                onSelect={setSelected}
              />
            </div>
          )}
        </Panel>

        <aside
          className="grid"
          style={{ alignContent: "start", gap: 12 }}
        >
          {selected && (
            <Panel
              title="Record details"
              action={
                <>
                  {safeSection === "donors" &&
                    "donor_id" in selected && (
                      <button
                        className="button button-quiet"
                        onClick={() =>
                          onEditDonor(String(selected.donor_id))
                        }
                      >
                        Edit
                      </button>
                    )}

                  <button
                    className="button button-quiet"
                    onClick={() => setSelected(null)}
                    aria-label="Clear selection"
                  >
                    Clear
                  </button>
                </>
              }
            >
              <Detail record={selected} />
            </Panel>
          )}

          {safeSection === "samples" && (
            <Panel
              title="Lineage data"
              caption="Recorded sample relationships"
            >
              <div className="detail-value">
                {records.sample_processes.length} sample processing
                associations
              </div>
              <p className="panel-caption">
                Relationships are displayed from recorded database
                associations.
              </p>
            </Panel>
          )}

          {safeSection === "storage" && (
            <Panel title="Storage overview">
              <div className="detail-value">
                {records.storage_units.length} storage units
              </div>
              <p className="panel-caption">
                {records.sample_storage.length} sample storage
                assignments recorded.
              </p>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function RecordTable({
  section,
  items,
  onSelect,
}: {
  section: Section;
  items: RecordItem[];
  onSelect: (record: RecordItem) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title="No matching records"
        detail="Try a different search or filter. If the database contains no records, register one using the available action."
      />
    );
  }

  if (section === "donors") {
    return (
      <table>
        <thead>
          <tr>
            <th>Donor ID</th>
            <th>Registration date</th>
            <th>Consent status</th>
          </tr>
        </thead>
        <tbody>
          {(items as DatabaseDonor[]).map((donor) => (
            <tr
              key={donor.donor_id}
              onClick={() => onSelect(donor)}
            >
              <td>
                <button className="table-link">
                  {donor.donor_id}
                </button>
              </td>
              <td>{formatDate(donor.registration_date)}</td>
              <td>
                <Badge tone={getStatusTone(donor.consent_status ?? "")}>
                  {donor.consent_status ?? "Unknown"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (section === "samples") {
    return (
      <table>
        <thead>
          <tr>
            <th>Sample ID</th>
            <th>Donor ID</th>
            <th>Type</th>
            <th>Collection date</th>
            <th>Status</th>
            <th>Storage</th>
            <th>Lineage</th>
          </tr>
        </thead>
        <tbody>
          {(items as DatabaseSample[]).map((sample) => (
            <tr
              key={sample.sample_id}
              onClick={() => onSelect(sample)}
            >
              <td>
                <button className="table-link">
                  {sample.sample_id}
                </button>
              </td>
              <td>{sample.donor_id}</td>
              <td>{sample.sample_type_name}</td>
              <td>{formatDate(sample.collection_date)}</td>
              <td>
                <Badge tone={getStatusTone(sample.status)}>
                  {sample.status}
                </Badge>
              </td>
              <td>
                {sample.storage_locations?.length
                  ? sample.storage_locations
                      .map(
                        (location) =>
                          `${location.freezer_id ?? "â€”"} / ${
                            location.position ?? "â€”"
                          }`
                      )
                      .join(", ")
                  : "Not stored"}
              </td>
              <td>
                {sample.lineage_children?.length ||
                sample.lineage_parents?.length ? (
                  <Badge tone="info">Recorded</Badge>
                ) : (
                  "None"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (section === "processing") {
    return (
      <table>
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Process</th>
            <th>Date</th>
            <th>Researcher</th>
            <th>Input sample</th>
            <th>Output sample</th>
          </tr>
        </thead>
        <tbody>
          {items.map((record) => {
            if ("sample_process_id" in record) {
              return (
                <tr
                  key={record.sample_process_id}
                  onClick={() => onSelect(record)}
                >
                  <td>{record.sample_process_id}</td>
                  <td>{record.process_type}</td>
                  <td>â€”</td>
                  <td>â€”</td>
                  <td>{record.input_sample_id}</td>
                  <td>{record.output_sample_id}</td>
                </tr>
              );
            }

            const process = record as DatabaseProcess;

            return (
              <tr
                key={process.process_id}
                onClick={() => onSelect(process)}
              >
                <td>{process.process_id}</td>
                <td>{process.process_type}</td>
                <td>{formatDate(process.process_date)}</td>
                <td>{process.researcher_name}</td>
                <td>See sample associations</td>
                <td>See sample associations</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  if (section === "experiments") {
    return (
      <table>
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Experiment</th>
            <th>Type</th>
            <th>Researcher</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((record) => {
            if ("experiment_sample_id" in record) {
              return (
                <tr
                  key={record.experiment_sample_id}
                  onClick={() => onSelect(record)}
                >
                  <td>{record.experiment_sample_id}</td>
                  <td>{record.experiment_name}</td>
                  <td>Sample association</td>
                  <td>â€”</td>
                  <td>{formatDate(record.date_added)}</td>
                  <td>{record.sample_status}</td>
                </tr>
              );
            }

            const experiment = record as DatabaseExperiment;

            return (
              <tr
                key={experiment.experiment_id}
                onClick={() => onSelect(experiment)}
              >
                <td>{experiment.experiment_id}</td>
                <td>{experiment.experiment_name}</td>
                <td>{experiment.experiment_type ?? "â€”"}</td>
                <td>{experiment.researcher_name}</td>
                <td>{formatDate(experiment.start_date)}</td>
                <td>
                  <Badge tone={getStatusTone(experiment.status)}>
                    {experiment.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  if (section === "sequencing") {
    return (
      <table>
        <thead>
          <tr>
            <th>Result ID</th>
            <th>Sample</th>
            <th>Experiment</th>
            <th>Platform</th>
            <th>Run date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(items as DatabaseSequencingResult[]).map((result) => (
            <tr
              key={result.sequencing_result_id}
              onClick={() => onSelect(result)}
            >
              <td>{result.sequencing_result_id}</td>
              <td>{result.sample_id}</td>
              <td>{result.experiment_name ?? result.experiment_id ?? "â€”"}</td>
              <td>{result.sequencing_platform ?? "â€”"}</td>
              <td>{formatDate(result.run_date)}</td>
              <td>
                <Badge tone={getStatusTone(result.result_status)}>
                  {result.result_status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (section === "storage") {
    return (
      <table>
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Freezer</th>
            <th>Rack</th>
            <th>Box</th>
            <th>Position</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((record) => {
            if ("sample_storage_id" in record) {
              return (
                <tr
                  key={record.sample_storage_id}
                  onClick={() => onSelect(record)}
                >
                  <td>{record.sample_storage_id}</td>
                  <td>{record.freezer_id ?? "â€”"}</td>
                  <td>{record.rack_no ?? "â€”"}</td>
                  <td>{record.box_no ?? "â€”"}</td>
                  <td>{record.position ?? "â€”"}</td>
                  <td>
                    <Badge tone={getStatusTone(record.storage_status)}>
                      {record.storage_status}
                    </Badge>
                  </td>
                </tr>
              );
            }

            const unit = record as DatabaseStorageUnit;

            return (
              <tr
                key={unit.storage_id}
                onClick={() => onSelect(unit)}
              >
                <td>{unit.storage_id}</td>
                <td>{unit.freezer_id ?? "â€”"}</td>
                <td>{unit.rack_no ?? "â€”"}</td>
                <td>{unit.box_no ?? "â€”"}</td>
                <td>{unit.position ?? "â€”"}</td>
                <td>
                  <Badge tone={getStatusTone(unit.status)}>
                    {unit.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <EmptyState
      title="No audit records available"
      detail="Audit records are not currently returned by the records API."
    />
  );
}

function Detail({ record }: { record: RecordItem }) {
  const entries = Object.entries(
    record as unknown as Record<string, unknown>
  );

  return (
    <div>
      {entries.map(([label, value]) => (
        <div key={label} className="detail-block">
          <div className="detail-label">
            {label.replaceAll("_", " ")}
          </div>
          <div className="detail-value">
            {formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
}


type AuditLogEntry = {
  audit_id: number;
  user_id: number | null;
  action: string;
  table_name: string | null;
  record_id: number | null;
  action_timestamp: string;
  details: string | null;
};

function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/audit-logs?limit=100", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load audit history."
          );
        }

        if (!cancelled) {
          setEntries(result.audit_logs ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load audit history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <>
      <PageHeading
        eyebrow="Activity history"
        title="Audit log"
        subtitle="Review recorded database actions and sample status changes."
      />

      <Panel
        title="Audit records"
        caption={`${entries.length} recorded ${
          entries.length === 1 ? "event" : "events"
        }`}
      >
        {loading && <Notice>Loading audit history...</Notice>}

        {error && <Notice warning>{error}</Notice>}

        {!loading && !error && entries.length === 0 && (
          <EmptyState
            title="No audit records available"
            detail="No audit events have been recorded yet."
          />
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>User ID</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.audit_id}>
                    <td>{entry.audit_id}</td>
                    <td>
                      <Badge tone="info">{entry.action}</Badge>
                    </td>
                    <td>{entry.table_name ?? "—"}</td>
                    <td>{entry.record_id ?? "—"}</td>
                    <td>{entry.user_id ?? "System / unknown"}</td>
                    <td>
                      {new Date(entry.action_timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        {entry.details ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}



