"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge, EmptyState, Notice, PageHeading, Panel } from "@/components/ui";
import type {
  DatabaseSample,
  DatabaseDonor,
  DatabaseExperiment,
  DatabaseExperimentSample,
  DatabaseProcess,
  DatabaseSampleProcess,
  DatabaseSampleStorage,
  DatabaseSequencingResult,
  DatabaseStorageUnit,
} from "@/lib/types";

type Section = "donors" | "samples" | "processing" | "experiments" | "sequencing" | "storage" | "audit";

async function deleteApiRecord(path: string): Promise<void> {
  const response = await fetch(path, {
    method: "DELETE",
    credentials: "include",
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed with status ${response.status}.`);
  }
}

export function RecordsPage({ section, onAdd, onAssignStorage, onEditDonor, onEditSample, onEditProcess, onEditExperiment, onEditStorageUnit, onEditSequencingResult, onDonorDeleted, onSampleDeleted, onRelatedRecordChanged, canWriteRecords, canDeleteDonor, canDeleteSample, canDeleteResearchRecords, canDeleteStorageUnit, canDeleteSequencingResult, donorRefreshKey = 0, recordsRefreshKey = 0 }: { section: string; onAdd: () => void; onAssignStorage: () => void; onEditDonor: (donor: DatabaseDonor) => void; onEditSample: (sample: DatabaseSample) => void; onEditProcess: (process: DatabaseProcess, links: DatabaseSampleProcess[]) => void; onEditExperiment: (experiment: DatabaseExperiment, links: DatabaseExperimentSample[]) => void; onEditStorageUnit: (storageUnit: DatabaseStorageUnit) => void; onEditSequencingResult: (result: DatabaseSequencingResult) => void; onDonorDeleted: () => void; onSampleDeleted: () => void; onRelatedRecordChanged: (message: string) => void; canWriteRecords: boolean; canDeleteDonor: boolean; canDeleteSample: boolean; canDeleteResearchRecords: boolean; canDeleteStorageUnit: boolean; canDeleteSequencingResult: boolean; donorRefreshKey?: number; recordsRefreshKey?: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState("id");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [databaseDonors, setDatabaseDonors] = useState<DatabaseDonor[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [donorsError, setDonorsError] = useState("");
  const [donorDeleteError, setDonorDeleteError] = useState("");
  const [deletingDonor, setDeletingDonor] = useState(false);
  const [confirmDonorDelete, setConfirmDonorDelete] = useState(false);
  const [sampleDeleteError, setSampleDeleteError] = useState("");
  const [deletingSample, setDeletingSample] = useState(false);
  const [confirmSampleDelete, setConfirmSampleDelete] = useState(false);
  const [databaseSamples, setDatabaseSamples] = useState<DatabaseSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesError, setSamplesError] = useState("");
  const [databaseProcesses, setDatabaseProcesses] = useState<DatabaseProcess[]>([]);
  const [databaseSampleProcesses, setDatabaseSampleProcesses] = useState<DatabaseSampleProcess[]>([]);
  const [databaseExperiments, setDatabaseExperiments] = useState<DatabaseExperiment[]>([]);
  const [databaseExperimentSamples, setDatabaseExperimentSamples] = useState<DatabaseExperimentSample[]>([]);
  const [databaseStorageUnits, setDatabaseStorageUnits] = useState<DatabaseStorageUnit[]>([]);
  const [databaseSampleStorage, setDatabaseSampleStorage] = useState<DatabaseSampleStorage[]>([]);
  const [databaseSequencingResults, setDatabaseSequencingResults] = useState<DatabaseSequencingResult[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [confirmResearchDelete, setConfirmResearchDelete] = useState(false);
  const [researchDeleteError, setResearchDeleteError] = useState("");
  const [deletingResearchRecord, setDeletingResearchRecord] = useState(false);
  const [confirmStorageDelete, setConfirmStorageDelete] = useState(false);
  const [storageDeleteError, setStorageDeleteError] = useState("");
  const [deletingStorageUnit, setDeletingStorageUnit] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);
  const [assignmentActionError, setAssignmentActionError] = useState("");
  const [confirmSequencingDelete, setConfirmSequencingDelete] = useState(false);
  const [sequencingDeleteError, setSequencingDeleteError] = useState("");
  const [deletingSequencingResult, setDeletingSequencingResult] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
 const safeSection = (section in headings ? section : "samples") as Section;
 const heading = headings[safeSection];

useEffect(() => {
  setSelected(null);
  setQuery("");
  setFilter("All");
  setSortKey(heading.sortKeys?.[0]?.[0] ?? "id");
  setConfirmDonorDelete(false);
  setConfirmSampleDelete(false);
  setConfirmResearchDelete(false);
  setResearchDeleteError("");
  setConfirmStorageDelete(false);
  setStorageDeleteError("");
  setAssignmentActionError("");
  setConfirmSequencingDelete(false);
  setSequencingDeleteError("");
}, [heading.sortKeys, safeSection]);

useEffect(() => {
  if (safeSection !== "donors") return;

  let cancelled = false;

  async function loadDonors() {
    setDonorsLoading(true);
    setDonorsError("");

    try {
      const response = await fetch("/api/donors", {
        credentials: "include",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        donors?: DatabaseDonor[];
      };

      if (!response.ok || !result.success || !result.donors) {
        throw new Error(result.message || "Could not load donors.");
      }

      if (!cancelled) {
        setDatabaseDonors(result.donors);
        setSelected((current) => {
          if (!current || !("full_name" in current)) return current;
          return result.donors?.find(
            (donor) => donor.donor_id === current.donor_id
          ) ?? null;
        });
      }
    } catch (error) {
      if (!cancelled) {
        setDonorsError(
          error instanceof Error ? error.message : "Could not load donors."
        );
      }
    } finally {
      if (!cancelled) setDonorsLoading(false);
    }
  }

  void loadDonors();

  return () => {
    cancelled = true;
  };
}, [donorRefreshKey, safeSection, retryKey]);

useEffect(() => {
  if (safeSection !== "samples") return;

  let cancelled = false;

  async function loadSamples() {
    setSamplesLoading(true);
    setSamplesError("");

    try {
      const response = await fetch("/api/samples");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load samples.");
      }

      if (!cancelled) {
        const samples = result.samples as DatabaseSample[];
        setDatabaseSamples(samples);
        setSelected((current) => {
          if (!current || !("sample_type_name" in current)) return current;
          return samples.find((sample) => sample.sample_id === current.sample_id) ?? null;
        });
      }
    } catch (error) {
      if (!cancelled) {
        setSamplesError(
          error instanceof Error
            ? error.message
            : "Could not load samples from PostgreSQL."
        );
      }
    } finally {
      if (!cancelled) setSamplesLoading(false);
    }
  }

  void loadSamples();

  return () => {
    cancelled = true;
  };
}, [safeSection, recordsRefreshKey, retryKey]);

useEffect(() => {
  const routes: Partial<Record<Section, string[]>> = {
    processing: ["/api/processes", "/api/sample-processes"],
    experiments: ["/api/experiments", "/api/experiment-samples"],
    sequencing: ["/api/sequencing-results"],
    storage: ["/api/storage-units", "/api/sample-storage"],
  };
  const sectionRoutes = routes[safeSection];
  if (!sectionRoutes) return;

  let cancelled = false;
  async function loadRecords() {
    setRecordsLoading(true);
    setRecordsError("");
    try {
      const responses = await Promise.all(
        sectionRoutes!.map((route) => fetch(route, { credentials: "include", cache: "no-store" }))
      );
      const bodies = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex(
        (response, index) => !response.ok || !bodies[index].success
      );
      if (failedIndex >= 0) {
        throw new Error(
          bodies[failedIndex].message || `Could not load ${safeSection} records.`
        );
      }
      if (cancelled) return;
      if (safeSection === "processing") {
        setDatabaseProcesses(bodies[0].processes as DatabaseProcess[]);
        setDatabaseSampleProcesses(bodies[1].sample_processes as DatabaseSampleProcess[]);
      } else if (safeSection === "experiments") {
        setDatabaseExperiments(bodies[0].experiments as DatabaseExperiment[]);
        setDatabaseExperimentSamples(bodies[1].experiment_samples as DatabaseExperimentSample[]);
      } else if (safeSection === "sequencing") {
        const results = bodies[0].sequencing_results as DatabaseSequencingResult[];
        setDatabaseSequencingResults(results);
        setSelected((current) => {
          if (!current || !("sequencing_result_id" in current)) return current;
          return results.find((result) => result.sequencing_result_id === current.sequencing_result_id) ?? null;
        });
      } else if (safeSection === "storage") {
        const storageUnits = bodies[0].storage_units as DatabaseStorageUnit[];
        const assignments = bodies[1].sample_storage as DatabaseSampleStorage[];
        setDatabaseStorageUnits(storageUnits);
        setDatabaseSampleStorage(assignments);
        setSelected((current) => {
          if (!current || !("storage_id" in current)) return current;
          return storageUnits.find((unit) => unit.storage_id === current.storage_id) ?? null;
        });
      }
    } catch (error) {
      if (!cancelled) {
        setRecordsError(
          error instanceof Error ? error.message : `Could not load ${safeSection} records.`
        );
      }
    } finally {
      if (!cancelled) setRecordsLoading(false);
    }
  }
  void loadRecords();
  return () => {
    cancelled = true;
  };
}, [safeSection, recordsRefreshKey, retryKey]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    if (safeSection === "donors") return databaseDonors.filter((item) => `${item.donor_id} ${item.full_name} ${item.email ?? ""} ${item.phone_number ?? ""}`.toLowerCase().includes(needle));
    if (safeSection === "samples") {
  return databaseSamples.filter((item) => {
    const searchable = [
      item.sample_id,
      item.donor_id,
      item.sample_type_name,
      item.collection_date,
      item.collection_location ?? "",
      item.status,
      item.description ?? "",
    ].join(" ").toLowerCase();

    return (
      searchable.includes(needle) &&
      (filter === "All" ||
        item.status === filter ||
        item.sample_type_name === filter)
    );
  });
}
    if (safeSection === "processing") return databaseProcesses.filter((item) => `${item.process_id} ${item.process_type} ${item.researcher_name} ${databaseSampleProcesses.filter((link) => link.process_id === item.process_id).map((link) => `${link.input_sample_id} ${link.output_sample_id}`).join(" ")}`.toLowerCase().includes(needle));
    if (safeSection === "experiments") return databaseExperiments.filter((item) => `${item.experiment_id} ${item.experiment_name} ${item.experiment_type ?? ""} ${item.researcher_name} ${item.status} ${databaseExperimentSamples.filter((link) => link.experiment_id === item.experiment_id).map((link) => link.sample_id).join(" ")}`.toLowerCase().includes(needle) && (filter === "All" || item.status === filter));
    if (safeSection === "sequencing") return databaseSequencingResults.filter((item) => {
      const searchable = `${item.sequencing_result_id} ${item.sample_id} ${item.sample_status} ${item.experiment_id ?? ""} ${item.experiment_name ?? ""} ${item.sequencing_platform ?? ""} ${item.run_date ?? ""} ${item.file_path ?? ""} ${item.result_status} ${item.notes ?? ""}`.toLowerCase();
      return searchable.includes(needle) && (filter === "All" || item.result_status.toLowerCase() === filter.toLowerCase());
    });
    if (safeSection === "storage") return databaseStorageUnits.filter((item) => {
      const activeAssignments = databaseSampleStorage.filter(
        (assignment) => assignment.storage_id === item.storage_id && !assignment.removed_date
      );
      const searchable = `${item.storage_id} ${item.freezer_id ?? ""} ${item.rack_no ?? ""} ${item.box_no ?? ""} ${item.position ?? ""} ${item.status} ${activeAssignments.map((assignment) => assignment.sample_id).join(" ")}`.toLowerCase();
      return searchable.includes(needle) &&
        (filter === "All" || item.status.toLowerCase() === filter.toLowerCase());
    });
    return [];
  }, [databaseDonors, databaseSamples, databaseProcesses, databaseSampleProcesses, databaseExperiments, databaseExperimentSamples, databaseSequencingResults, databaseStorageUnits, databaseSampleStorage, filter, query, safeSection]);
  const sorted = useMemo(() => [...filtered].sort((left, right) => {
    const activeSortKey = safeSection === "donors" && sortKey === "id"
      ? "donor_id"
      : sortKey;
    const leftValue = sortValue(left, activeSortKey);
    const rightValue = sortValue(right, activeSortKey);
    if (typeof leftValue === "number" && typeof rightValue === "number") return rightValue - leftValue;
    return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
  }), [filtered, safeSection, sortKey]);

  const deleteSelectedDonor = async () => {
    if (!selected || !("full_name" in selected)) return;

    setDeletingDonor(true);
    setDonorDeleteError("");

    try {
      const response = await fetch(
        `/api/donors?id=${encodeURIComponent(selected.donor_id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete donor.");
      }

      setSelected(null);
      setConfirmDonorDelete(false);
      onDonorDeleted();
    } catch (error) {
      setDonorDeleteError(
        error instanceof Error ? error.message : "Could not delete donor."
      );
    } finally {
      setDeletingDonor(false);
    }
  };

  const deleteSelectedSample = async () => {
    if (!selected || !("sample_type_name" in selected)) return;
    setDeletingSample(true);
    setSampleDeleteError("");
    try {
      const response = await fetch(
        `/api/samples?id=${encodeURIComponent(selected.sample_id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete sample.");
      }
      setSelected(null);
      setConfirmSampleDelete(false);
      onSampleDeleted();
    } catch (error) {
      setSampleDeleteError(
        error instanceof Error ? error.message : "Could not delete sample."
      );
    } finally {
      setDeletingSample(false);
    }
  };

  const deleteSelectedResearchRecord = async () => {
    setDeletingResearchRecord(true);
    setResearchDeleteError("");
    let removedAssociations = 0;
    let target: "process" | "experiment" | null = null;
    try {
      if (safeSection === "processing" && selected && "process_type" in selected) {
        target = "process";
        if (!Number.isSafeInteger(selected.process_id) || selected.process_id <= 0) {
          throw new Error("Cannot delete a process without a valid PostgreSQL ID.");
        }
        const links = databaseSampleProcesses.filter(
          (link) => link.process_id === selected.process_id
        );
        if (links.length >= 100) {
          throw new Error(
            "This process has 100 or more listed sample relationships. The API returns at most 100 relationships, so deletion is blocked to avoid leaving an unknown partial set."
          );
        }
        for (const link of links) {
          if (!Number.isSafeInteger(link.sample_process_id) || link.sample_process_id <= 0) {
            throw new Error("A sample relationship has an invalid PostgreSQL ID.");
          }
          await deleteApiRecord(
            `/api/sample-processes?id=${encodeURIComponent(String(link.sample_process_id))}`
          );
          removedAssociations += 1;
        }
        await deleteApiRecord(
          `/api/processes?id=${encodeURIComponent(String(selected.process_id))}`
        );
      } else if (safeSection === "experiments" && selected && "experiment_type" in selected) {
        target = "experiment";
        if (!Number.isSafeInteger(selected.experiment_id) || selected.experiment_id <= 0) {
          throw new Error("Cannot delete an experiment without a valid PostgreSQL ID.");
        }
        const links = databaseExperimentSamples.filter(
          (link) => link.experiment_id === selected.experiment_id
        );
        if (links.length >= 100) {
          throw new Error(
            "This experiment has 100 or more listed sample associations. The API returns at most 100 associations, so deletion is blocked to avoid leaving an unknown partial set."
          );
        }
        for (const link of links) {
          if (!Number.isSafeInteger(link.experiment_sample_id) || link.experiment_sample_id <= 0) {
            throw new Error("A sample association has an invalid PostgreSQL ID.");
          }
          await deleteApiRecord(
            `/api/experiment-samples?id=${encodeURIComponent(String(link.experiment_sample_id))}`
          );
          removedAssociations += 1;
        }
        await deleteApiRecord(
          `/api/experiments?id=${encodeURIComponent(String(selected.experiment_id))}`
        );
      } else {
        return;
      }

      setSelected(null);
      setConfirmResearchDelete(false);
      onRelatedRecordChanged(
        `${target === "process" ? "Processing record" : "Experiment"} deleted successfully.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "The delete request failed.";
      if (removedAssociations > 0) {
        setSelected(null);
        setConfirmResearchDelete(false);
        onRelatedRecordChanged(
          `Partial deletion: ${removedAssociations} sample association(s) were removed, but the ${target} record could not be deleted. ${message}`
        );
      } else {
        setResearchDeleteError(message);
      }
    } finally {
      setDeletingResearchRecord(false);
    }
  };

  const deleteSelectedStorageUnit = async () => {
    if (!selected || !("storage_id" in selected)) return;
    setDeletingStorageUnit(true);
    setStorageDeleteError("");
    try {
      await deleteApiRecord(`/api/storage-units?id=${encodeURIComponent(String(selected.storage_id))}`);
      setSelected(null);
      setConfirmStorageDelete(false);
      onRelatedRecordChanged(`Storage unit ${selected.storage_id} was deleted.`);
    } catch (error) {
      setStorageDeleteError(error instanceof Error ? error.message : "Could not delete storage unit.");
    } finally {
      setDeletingStorageUnit(false);
    }
  };

  const removeStorageAssignment = async (assignment: DatabaseSampleStorage) => {
    if (!Number.isSafeInteger(assignment.sample_storage_id) || assignment.sample_storage_id <= 0) {
      setAssignmentActionError("Cannot remove an assignment without a valid PostgreSQL ID.");
      return;
    }
    setRemovingAssignmentId(assignment.sample_storage_id);
    setAssignmentActionError("");
    const now = new Date();
    const removedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    try {
      const response = await fetch(
        `/api/sample-storage?id=${encodeURIComponent(String(assignment.sample_storage_id))}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ removed_date: removedDate }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Request failed with status ${response.status}.`);
      }
      onRelatedRecordChanged(`Sample ${assignment.sample_id} was removed from storage.`);
    } catch (error) {
      setAssignmentActionError(error instanceof Error ? error.message : "Could not remove sample from storage.");
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const deleteSelectedSequencingResult = async () => {
    if (!selected || !("sequencing_result_id" in selected)) return;
    if (!Number.isSafeInteger(selected.sequencing_result_id) || selected.sequencing_result_id <= 0) {
      setSequencingDeleteError("Cannot delete a sequencing result without a valid PostgreSQL ID.");
      return;
    }
    setDeletingSequencingResult(true);
    setSequencingDeleteError("");
    try {
      await deleteApiRecord(
        `/api/sequencing-results?id=${encodeURIComponent(String(selected.sequencing_result_id))}`
      );
      setSelected(null);
      setConfirmSequencingDelete(false);
      onRelatedRecordChanged(`Sequencing result ${selected.sequencing_result_id} was deleted.`);
    } catch (error) {
      setSequencingDeleteError(error instanceof Error ? error.message : "Could not delete sequencing result.");
    } finally {
      setDeletingSequencingResult(false);
    }
  };

  return <>
    <PageHeading eyebrow={heading.eyebrow} title={heading.title} subtitle={heading.subtitle}>
      {heading.add && canWriteRecords && (
        safeSection === "storage"
          ? <div style={{ display: "flex", gap: 8 }}><button className="button" onClick={onAssignStorage}>Assign sample</button><button className="button button-primary" onClick={onAdd}><Plus size={14} />{heading.add}</button></div>
          : <button className="button button-primary" onClick={onAdd}><Plus size={14} />{heading.add}</button>
      )}
    </PageHeading>
    {safeSection === "audit" && <div style={{ marginBottom: 15 }}><Notice warning>No audit-log API route is currently available. Synthetic browser activity is not displayed as an audit trail.</Notice></div>}
    <div className="split-layout"><Panel title={heading.panelTitle} caption={
  safeSection === "samples"
    ? `${filtered.length} database ${filtered.length === 1 ? "sample" : "samples"} from PostgreSQL`
    : safeSection === "donors"
      ? `${filtered.length} database ${filtered.length === 1 ? "donor" : "donors"} from PostgreSQL`
      : safeSection === "audit"
        ? "No audit data available from the current API"
        : `${filtered.length} database ${filtered.length === 1 ? "record" : "records"} from PostgreSQL`
} className="table-panel">
      <div className="table-toolbar"><div className="search-box"><Search size={14} /><input aria-label={`Search ${heading.title}`} placeholder={`Search ${heading.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></div><div style={{ display: "flex", gap: 8 }}>{heading.filters && <select className="filter-select" aria-label="Filter records" value={filter} onChange={(event) => setFilter(event.target.value)}>{(safeSection === "sequencing" ? ["All", ...new Set(databaseSequencingResults.map((item) => item.result_status))] : heading.filters).map((option) => <option key={option}>{option}</option>)}</select>}{heading.sortKeys && <select className="filter-select" aria-label="Sort records" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>{heading.sortKeys.map(([key, label]) => <option key={key} value={key}>Sort: {label}</option>)}</select>}</div></div>
      {safeSection === "samples" && samplesLoading && (
  <Notice>Loading samples from PostgreSQL...</Notice>
)}

{safeSection === "samples" && samplesError && (
  <Notice warning>{samplesError} <button type="button" className="button" onClick={() => setRetryKey((current) => current + 1)}>Retry</button></Notice>
)}
{safeSection === "donors" && donorsLoading && (
  <Notice>Loading donors from PostgreSQL...</Notice>
)}

{safeSection === "donors" && donorsError && (
  <Notice warning>{donorsError} <button type="button" className="button" onClick={() => setRetryKey((current) => current + 1)}>Retry</button></Notice>
)}
{["processing", "experiments", "sequencing", "storage"].includes(safeSection) && recordsLoading && (
  <Notice>Loading {heading.title.toLowerCase()} from PostgreSQL...</Notice>
)}
{["processing", "experiments", "sequencing", "storage"].includes(safeSection) && recordsError && (
  <Notice warning>{recordsError} <button type="button" className="button" onClick={() => setRetryKey((current) => current + 1)}>Retry</button></Notice>
)}
      <div className="table-scroll" role="region" aria-label={`${heading.title} records table`} tabIndex={0}>
        {safeSection === "donors" && (donorsLoading || donorsError)
          ? null
          : (safeSection === "donors" && sorted.length === 0)
            ? <EmptyState
                title={query ? "No matching donors" : "No donor records"}
                detail={query ? "Try a different search." : "Register a donor to get started."}
              />
            : safeSection === "samples" && (samplesLoading || samplesError)
              ? null
              : ["processing", "experiments", "sequencing", "storage"].includes(safeSection) && (recordsLoading || recordsError)
                ? null
                : safeSection === "audit"
                  ? <EmptyState title="Audit log unavailable" detail="The backend does not currently expose an audit-log API." />
                  : sorted.length === 0
                    ? <EmptyState title={query ? "No matching records" : `No ${heading.title.toLowerCase()} records`} detail={query ? "Try a different search or filter." : `Create a ${heading.title.toLowerCase()} record to get started.`} />
            : <RecordTable
                section={safeSection}
                items={sorted}
                sampleProcesses={databaseSampleProcesses}
                experimentSamples={databaseExperimentSamples}
                sampleStorage={databaseSampleStorage}
                onSelect={setSelected}
              />}
      </div>
    </Panel>
    <aside className="grid" style={{ alignContent: "start", gap: 12 }}>
      {selected && (
        <Panel
          title="Record details"
          action={
            <>
              {safeSection === "donors" && "full_name" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditDonor(selected)}>Edit</button>}
                  {canDeleteDonor && <button className="button button-quiet" onClick={() => { setDonorDeleteError(""); setConfirmDonorDelete(true); }}>Delete</button>}
                </>
              )}
              {safeSection === "samples" && "sample_type_name" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditSample(selected)}>Edit</button>}
                  {canDeleteSample && <button className="button button-quiet" onClick={() => { setSampleDeleteError(""); setConfirmSampleDelete(true); }}>Delete</button>}
                </>
              )}
              {safeSection === "processing" && "process_type" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditProcess(selected, databaseSampleProcesses.filter((link) => link.process_id === selected.process_id))}>Edit</button>}
                  {canDeleteResearchRecords && <button className="button button-quiet" onClick={() => { setResearchDeleteError(""); setConfirmResearchDelete(true); }}>Delete</button>}
                </>
              )}
              {safeSection === "experiments" && "experiment_type" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditExperiment(selected, databaseExperimentSamples.filter((link) => link.experiment_id === selected.experiment_id))}>Edit</button>}
                  {canDeleteResearchRecords && <button className="button button-quiet" onClick={() => { setResearchDeleteError(""); setConfirmResearchDelete(true); }}>Delete</button>}
                </>
              )}
              {safeSection === "storage" && "storage_id" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditStorageUnit(selected)}>Edit</button>}
                  {canDeleteStorageUnit && <button className="button button-quiet" onClick={() => { setStorageDeleteError(""); setConfirmStorageDelete(true); }}>Delete</button>}
                </>
              )}
              {safeSection === "sequencing" && "sequencing_result_id" in selected && (
                <>
                  {canWriteRecords && <button className="button button-quiet" onClick={() => onEditSequencingResult(selected)}>Edit</button>}
                  {canDeleteSequencingResult && <button className="button button-quiet" onClick={() => { setSequencingDeleteError(""); setConfirmSequencingDelete(true); }}>Delete</button>}
                </>
              )}
              <button className="button button-quiet" onClick={() => { setSelected(null); setConfirmDonorDelete(false); setConfirmSampleDelete(false); setConfirmResearchDelete(false); setConfirmStorageDelete(false); setConfirmSequencingDelete(false); }} aria-label="Clear selection">Clear</button>
            </>
          }
        >
          <Detail section={safeSection} record={selected} />
          {safeSection === "donors" && confirmDonorDelete && (
            <div role="alert" style={{ marginTop: 16 }}>
              <p>Delete donor {"full_name" in selected ? selected.donor_id : ""}? This cannot be undone.</p>
              {donorDeleteError && <p className="field-error">{donorDeleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={deletingDonor} onClick={() => setConfirmDonorDelete(false)}>Cancel</button>
                <button className="button button-primary" disabled={deletingDonor} onClick={() => void deleteSelectedDonor()}>{deletingDonor ? "Deleting..." : "Confirm delete"}</button>
              </div>
            </div>
          )}
          {safeSection === "samples" && confirmSampleDelete && (
            <div role="alert" style={{ marginTop: 16 }}>
              <p>Delete sample {"sample_type_name" in selected ? selected.sample_id : ""}? This cannot be undone.</p>
              {sampleDeleteError && <p className="field-error">{sampleDeleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={deletingSample} onClick={() => setConfirmSampleDelete(false)}>Cancel</button>
                <button className="button button-primary" disabled={deletingSample} onClick={() => void deleteSelectedSample()}>{deletingSample ? "Deleting..." : "Confirm delete"}</button>
              </div>
            </div>
          )}
          {(safeSection === "processing" || safeSection === "experiments") && confirmResearchDelete && (
            <div role="alert" style={{ marginTop: 16 }}>
              <p>
                Delete this {safeSection === "processing" ? "processing record" : "experiment"}?
                {" "}                Its linked sample relationships will also be deleted first. The operation may be partial if a later API request fails.
              </p>
              {researchDeleteError && <p className="field-error">{researchDeleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={deletingResearchRecord} onClick={() => setConfirmResearchDelete(false)}>Cancel</button>
                <button className="button button-primary" disabled={deletingResearchRecord} onClick={() => void deleteSelectedResearchRecord()}>{deletingResearchRecord ? "Deleting..." : "Confirm delete"}</button>
              </div>
            </div>
          )}
          {safeSection === "storage" && confirmStorageDelete && selected && "storage_id" in selected && (
            <div role="alert" style={{ marginTop: 16 }}>
              <p>Delete storage unit {selected.storage_id}? The backend may reject deletion if sample-storage records reference it.</p>
              {storageDeleteError && <p className="field-error">{storageDeleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={deletingStorageUnit} onClick={() => setConfirmStorageDelete(false)}>Cancel</button>
                <button className="button button-primary" disabled={deletingStorageUnit} onClick={() => void deleteSelectedStorageUnit()}>{deletingStorageUnit ? "Deleting..." : "Confirm delete"}</button>
              </div>
            </div>
          )}
          {safeSection === "storage" && selected && "storage_id" in selected && (
            <div style={{ marginTop: 18 }}>
              <h3 className="panel-title">Sample assignments</h3>
              {assignmentActionError && <p className="field-error" role="alert">{assignmentActionError}</p>}
              {databaseSampleStorage.filter((assignment) => assignment.storage_id === selected.storage_id).length === 0
                ? <p className="panel-caption">No assignments are available for this location.</p>
                : databaseSampleStorage.filter((assignment) => assignment.storage_id === selected.storage_id).map((assignment) => (
                  <div key={assignment.sample_storage_id} className="detail-block">
                    <div className="detail-label">Sample {assignment.sample_id} · {assignment.removed_date ? "Removed" : "Current"}</div>
                    <div className="detail-value">Stored {assignment.stored_date}{assignment.removed_date ? ` · Removed ${assignment.removed_date}` : ""}</div>
                    {!assignment.removed_date && canWriteRecords && (
                      <button
                        className="button button-quiet"
                        disabled={removingAssignmentId !== null}
                        onClick={() => void removeStorageAssignment(assignment)}
                      >
                        {removingAssignmentId === assignment.sample_storage_id ? "Removing..." : "Mark removed"}
                      </button>
                    )}
                  </div>
                ))}
              <p className="panel-caption">Assignment history is limited to the first 100 records returned by the existing API.</p>
            </div>
          )}
          {safeSection === "sequencing" && confirmSequencingDelete && selected && "sequencing_result_id" in selected && (
            <div role="alert" style={{ marginTop: 16 }}>
              <p>Delete sequencing result {selected.sequencing_result_id}? This cannot be undone.</p>
              {sequencingDeleteError && <p className="field-error">{sequencingDeleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" disabled={deletingSequencingResult} onClick={() => setConfirmSequencingDelete(false)}>Cancel</button>
                <button className="button button-primary" disabled={deletingSequencingResult} onClick={() => void deleteSelectedSequencingResult()}>{deletingSequencingResult ? "Deleting..." : "Confirm delete"}</button>
              </div>
            </div>
          )}
        </Panel>
      )}
      {safeSection === "samples" && <Panel title="Lineage data" caption="Relationships recorded in PostgreSQL"><div className="detail-value">{databaseSampleProcesses.length} sample processing relationships</div><p className="panel-caption">Lineage is based on explicit processing inputs and outputs.</p></Panel>}
      {safeSection === "storage" && <Panel title="Storage status"><div className="detail-value">{databaseStorageUnits.filter((unit) => unit.status.toLowerCase() === "available").length} locations available</div><div className="detail-value">{databaseStorageUnits.filter((unit) => unit.status.toLowerCase() === "occupied").length} locations occupied</div><p className="panel-caption">{databaseSampleStorage.filter((item) => !item.removed_date).length} active sample assignments · API lists are capped at 100 records.</p></Panel>}
    </aside>
  </div>
  </>;
}

const headings: Record<Section, { eyebrow: string; title: string; subtitle: string; panelTitle: string; add?: string; filters?: string[]; sortKeys?: [string, string][] }> = {
  donors: { eyebrow: "Donor records", title: "Donors", subtitle: "PostgreSQL donor records.", panelTitle: "Donor register", add: "Register donor", sortKeys: [["donor_id", "donor ID"], ["full_name", "name"], ["registration_date", "registration date"]] },
  samples: { eyebrow: "Specimen inventory", title: "Samples", subtitle: "PostgreSQL collection, status, storage, and explicit lineage records.", panelTitle: "Sample register", add: "Register sample", filters: ["All", "DNA", "RNA", "collected", "processing", "processed", "stored", "archived"], sortKeys: [["sample_id", "sample ID"], ["collection_date", "collection date"], ["status", "status"], ["sample_type_name", "sample type"]] },
  processing: { eyebrow: "Sample operations", title: "Processing", subtitle: "PostgreSQL process records and explicit sample input/output relationships.", panelTitle: "Processing events", add: "Record event", sortKeys: [["process_id", "process ID"], ["process_date", "date"], ["process_type", "process type"]] },
  experiments: { eyebrow: "Research activity", title: "Experiments", subtitle: "PostgreSQL experiments and their sample associations.", panelTitle: "Experiment register", add: "Create experiment", filters: ["All", "planned", "in_progress", "completed", "on_hold"], sortKeys: [["experiment_id", "experiment ID"], ["start_date", "start date"], ["status", "status"], ["experiment_type", "type"]] },
  sequencing: { eyebrow: "Research outputs", title: "Sequencing results", subtitle: "PostgreSQL sequencing result metadata; no synthetic read-count or quality metrics.", panelTitle: "Result register", add: "Record result", filters: ["All"], sortKeys: [["sequencing_result_id", "result ID"], ["run_date", "run date"], ["result_status", "status"]] },
  storage: { eyebrow: "Inventory operations", title: "Storage", subtitle: "PostgreSQL storage units, availability, and sample assignments.", panelTitle: "Storage units", add: "Create storage unit", filters: ["All", "available", "occupied"], sortKeys: [["storage_id", "location ID"], ["freezer_id", "freezer"], ["status", "status"]] },
  audit: { eyebrow: "Activity history", title: "Activity log", subtitle: "Audit records are not available through the current backend API.", panelTitle: "Audit log" },
};

function sortValue(item: unknown, key: string): string | number {
  if (typeof item !== "object" || item === null) return "";
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "number" ? value : String(value ?? "");
}

type RecordItem = DatabaseDonor | DatabaseSample | DatabaseProcess | DatabaseExperiment | DatabaseSequencingResult | DatabaseStorageUnit;
function RecordTable({ section, items, sampleProcesses, experimentSamples, sampleStorage, onSelect }: { section: Section; items: unknown[]; sampleProcesses: DatabaseSampleProcess[]; experimentSamples: DatabaseExperimentSample[]; sampleStorage: DatabaseSampleStorage[]; onSelect: (record: RecordItem) => void }) {
  if (!items.length) return <EmptyState title="No matching records" detail="Try a different search or filter." />;
  const click = (record: RecordItem) => onSelect(record);
  if (section === "donors") return <table><thead><tr><th>Donor ID</th><th>Full name</th><th>Date of birth</th><th>Gender</th><th>Email</th><th>Phone</th><th>Registered</th></tr></thead><tbody>{(items as DatabaseDonor[]).map((donor) => <tr key={donor.donor_id} onClick={() => click(donor)}><td><button className="table-link">{donor.donor_id}</button></td><td>{donor.full_name}</td><td>{donor.date_of_birth ?? "—"}</td><td>{donor.gender ?? "—"}</td><td>{donor.email ?? "—"}</td><td>{donor.phone_number ?? "—"}</td><td>{donor.registration_date}</td></tr>)}</tbody></table>;

if (section === "samples") return (
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
        <tr key={sample.sample_id} onClick={() => click(sample)}>
          <td><button className="table-link">{sample.sample_id}</button></td>
          <td>{sample.donor_id}</td>
          <td>{sample.sample_type_name}</td>
          <td>{sample.collection_date ? new Date(sample.collection_date).toLocaleDateString() : "—"}</td>
          <td>
            <Badge tone={sample.status === "processed" ? "success" : sample.status === "collected" ? "warning" : ""}>
              {sample.status}
            </Badge>
          </td>
          <td>
            {sample.storage_locations?.length
              ? sample.storage_locations.map((location) =>
                  `${location.freezer_id} / ${location.position}`
                ).join(", ")
              : "Not stored"}
          </td>
          <td>
            {sample.lineage_children?.length || sample.lineage_parents?.length
              ? <Badge tone="info">Recorded</Badge>
              : "None"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

  if (section === "processing") return <table><thead><tr><th>Process ID</th><th>Process</th><th>Date</th><th>Researcher</th><th>Input samples</th><th>Output samples</th></tr></thead><tbody>{(items as DatabaseProcess[]).map((process) => { const links = sampleProcesses.filter((link) => link.process_id === process.process_id); return <tr key={process.process_id} onClick={() => click(process)}><td><button className="table-link">{process.process_id}</button></td><td>{process.process_type}</td><td>{process.process_date}</td><td>{process.researcher_name}</td><td>{links.map((link) => link.input_sample_id).join(", ") || "None"}</td><td>{links.map((link) => link.output_sample_id).join(", ") || "None"}</td></tr>; })}</tbody></table>;
  if (section === "experiments") return <table><thead><tr><th>Experiment</th><th>Type</th><th>Researcher</th><th>Start date</th><th>End date</th><th>Samples</th><th>Status</th></tr></thead><tbody>{(items as DatabaseExperiment[]).map((experiment) => { const samples = experimentSamples.filter((link) => link.experiment_id === experiment.experiment_id); return <tr key={experiment.experiment_id} onClick={() => click(experiment)}><td><button className="table-link">{experiment.experiment_name}</button><div className="panel-caption">ID {experiment.experiment_id}</div></td><td>{experiment.experiment_type ?? "—"}</td><td>{experiment.researcher_name}</td><td>{experiment.start_date ?? "—"}</td><td>{experiment.end_date ?? "—"}</td><td>{samples.map((link) => link.sample_id).join(", ") || "None"}</td><td><Badge tone={experiment.status === "completed" ? "success" : experiment.status === "in_progress" ? "info" : "warning"}>{experiment.status}</Badge></td></tr>; })}</tbody></table>;
  if (section === "sequencing") return <table><thead><tr><th>Result</th><th>Sample</th><th>Experiment</th><th>Platform</th><th>Run date</th><th>Status</th><th>Notes</th></tr></thead><tbody>{(items as DatabaseSequencingResult[]).map((result) => <tr key={result.sequencing_result_id} onClick={() => click(result)}><td><button className="table-link">{result.sequencing_result_id}</button></td><td>{result.sample_id}</td><td>{result.experiment_name ?? result.experiment_id ?? "—"}</td><td>{result.sequencing_platform ?? "—"}</td><td>{result.run_date ?? "—"}</td><td><Badge>{result.result_status}</Badge></td><td>{result.notes ?? "—"}</td></tr>)}</tbody></table>;
  if (section === "storage") return <table><thead><tr><th>Storage ID</th><th>Location</th><th>Temperature</th><th>Status</th><th>Active samples</th></tr></thead><tbody>{(items as DatabaseStorageUnit[]).map((unit) => { const location = [unit.freezer_id, unit.rack_no, unit.box_no, unit.position].filter(Boolean).join(" / "); const assignments = sampleStorage.filter((assignment) => assignment.storage_id === unit.storage_id && !assignment.removed_date); return <tr key={unit.storage_id} onClick={() => click(unit)}><td><button className="table-link">{unit.storage_id}</button></td><td>{location || "—"}</td><td>{unit.temperature ?? "—"}</td><td><Badge tone={unit.status === "available" ? "success" : ""}>{unit.status}</Badge></td><td>{assignments.map((assignment) => assignment.sample_id).join(", ") || "None"}</td></tr>; })}</tbody></table>;
  return <EmptyState title="Audit log unavailable" detail="No audit-log API route exists in the current backend." />;
}


function Detail({ section, record }: { section: Section; record: RecordItem }) {
  let entries: [string, string][];

  if (section === "donors" && "full_name" in record) {
    entries = [
      ["Donor ID", record.donor_id],
      ["Full name", record.full_name],
      ["Date of birth", record.date_of_birth ?? "None"],
      ["Gender", record.gender ?? "None"],
      ["Phone number", record.phone_number ?? "None"],
      ["Email", record.email ?? "None"],
      ["Address", record.address ?? "None"],
      ["Registration date", record.registration_date],
    ];
  } else if (section === "samples" && "sample_type_name" in record) {
    const storageLocations = record.storage_locations
      ?.map((location) =>
        [location.freezer_id, location.rack_no, location.box_no, location.position]
          .filter(Boolean)
          .join(" / ")
      )
      .join(", ");
    const parents = record.lineage_parents
      ?.map((parent) => `${parent.related_sample_id} (${parent.relationship_type})`)
      .join(", ");
    const children = record.lineage_children
      ?.map((child) => `${child.related_sample_id} (${child.relationship_type})`)
      .join(", ");

    entries = [
      ["Sample ID", record.sample_id],
      ["Donor ID", record.donor_id],
      ["Sample type", record.sample_type_name],
      ["Collection", record.collection_date],
      ["Collection location", record.collection_location ?? "None"],
      ["Status", record.status],
      ["Description", record.description ?? "None"],
      ["Storage locations", storageLocations || "None"],
      ["Lineage parents", parents || "None"],
      ["Lineage children", children || "None"],
    ];
  } else if (section === "processing" && "process_type" in record) {
    entries = [
      ["Process ID", String(record.process_id)],
      ["Process type", record.process_type],
      ["Date", record.process_date],
      ["Researcher", record.researcher_name],
      ["Description", record.description ?? "None"],
    ];
  } else if (section === "experiments" && "experiment_type" in record) {
    entries = [
      ["Experiment ID", String(record.experiment_id)],
      ["Name", record.experiment_name],
      ["Type", record.experiment_type ?? "None"],
      ["Researcher", record.researcher_name],
      ["Dates", `${record.start_date ?? "None"} to ${record.end_date ?? "None"}`],
      ["Status", record.status],
      ["Description", record.description ?? "None"],
    ];
  } else if (section === "sequencing" && "sequencing_result_id" in record) {
    entries = [
      ["Result ID", String(record.sequencing_result_id)],
      ["Sample ID", String(record.sample_id)],
      ["Experiment", record.experiment_name ?? (record.experiment_id === null ? "None" : String(record.experiment_id))],
      ["Platform", record.sequencing_platform ?? "None"],
      ["Run date", record.run_date ?? "None"],
      ["File path", record.file_path ?? "None"],
      ["Status", record.result_status],
      ["Notes", record.notes ?? "None"],
    ];
  } else if (section === "storage" && "storage_id" in record) {
    entries = [
      ["Storage ID", String(record.storage_id)],
      ["Freezer", record.freezer_id ?? "None"],
      ["Rack", record.rack_no ?? "None"],
      ["Box", record.box_no ?? "None"],
      ["Position", record.position ?? "None"],
      ["Temperature", record.temperature === null ? "None" : String(record.temperature)],
      ["Status", record.status],
    ];
  } else {
    entries = [];
  }

  return (
    <div>
      {entries.map(([label, value]) => (
        <div key={label} className="detail-block">
          <div className="detail-label">{label}</div>
          <div className="detail-value">{value || "None"}</div>
        </div>
      ))}
    </div>
  );
}
