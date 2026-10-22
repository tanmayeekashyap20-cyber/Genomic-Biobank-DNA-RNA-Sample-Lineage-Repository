"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useDemoData } from "@/components/demo-data-provider";
import { Badge, EmptyState, Notice, PageHeading, Panel } from "@/components/ui";
import type { Donor, Experiment, ProcessingEvent, Sample } from "@/lib/types";

type Section = "donors" | "samples" | "processing" | "experiments" | "sequencing" | "storage" | "audit";

export function RecordsPage({ section, onAdd, onEditDonor }: { section: string; onAdd: () => void; onEditDonor: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState("id");
  const [selected, setSelected] = useState<Donor | Sample | ProcessingEvent | Experiment | null>(null);
  const { data } = useDemoData();
  const safeSection = (section in headings ? section : "samples") as Section;
  const heading = headings[safeSection];
  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    if (safeSection === "donors") return data.donors.filter((item) => `${item.id} ${item.codedId} ${item.cohort} ${item.consentStatus}`.toLowerCase().includes(needle) && (filter === "All" || item.consentStatus === filter));
    if (safeSection === "samples") return data.samples.filter((item) => `${item.id} ${item.donorId} ${item.type} ${item.status} ${item.storageUnitId}`.toLowerCase().includes(needle) && (filter === "All" || item.status === filter || item.type === filter));
    if (safeSection === "processing") return data.processing.filter((item) => `${item.id} ${item.processType} ${item.researcher} ${item.inputSampleIds.join(" ")} ${item.outputSampleIds.join(" ")}`.toLowerCase().includes(needle));
    if (safeSection === "experiments") return data.experiments.filter((item) => `${item.id} ${item.type} ${item.researcher} ${item.status} ${item.sampleIds.join(" ")}`.toLowerCase().includes(needle) && (filter === "All" || item.status === filter));
    if (safeSection === "sequencing") return data.results.filter((item) => `${item.id} ${item.sampleId} ${item.experimentId} ${item.platform} ${item.status}`.toLowerCase().includes(needle));
    if (safeSection === "storage") return data.storage.filter((item) => `${item.id} ${item.name} ${item.location} ${item.status}`.toLowerCase().includes(needle));
    return data.activity.filter((item) => `${item.id} ${item.action} ${item.actor}`.toLowerCase().includes(needle));
  }, [data, filter, query, safeSection]);
  const sorted = useMemo(() => [...filtered].sort((left, right) => {
    const leftValue = sortValue(left, sortKey);
    const rightValue = sortValue(right, sortKey);
    if (typeof leftValue === "number" && typeof rightValue === "number") return rightValue - leftValue;
    return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
  }), [filtered, sortKey]);

  return <>
    <PageHeading eyebrow={heading.eyebrow} title={heading.title} subtitle={heading.subtitle}>
      {heading.add && <button className="button button-primary" onClick={onAdd}><Plus size={14} />{heading.add}</button>}
    </PageHeading>
    {(safeSection === "sequencing" || safeSection === "audit") && <div style={{ marginBottom: 15 }}><Notice warning>{safeSection === "sequencing" ? "All read counts and quality scores are synthetic demonstration metrics, not patient results." : "Simulated activity only. These entries are not actual security audit records."}</Notice></div>}
    <div className="split-layout"><Panel title={heading.panelTitle} caption={`${filtered.length} ${filtered.length === 1 ? "record" : "records"} · synthetic demo data`} className="table-panel">
      <div className="table-toolbar"><div className="search-box"><Search size={14} /><input aria-label={`Search ${heading.title}`} placeholder={`Search ${heading.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></div><div style={{ display: "flex", gap: 8 }}>{heading.filters && <select className="filter-select" aria-label="Filter records" value={filter} onChange={(event) => setFilter(event.target.value)}>{heading.filters.map((option) => <option key={option}>{option}</option>)}</select>}{heading.sortKeys && <select className="filter-select" aria-label="Sort records" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>{heading.sortKeys.map(([key, label]) => <option key={key} value={key}>Sort: {label}</option>)}</select>}</div></div>
      <div className="table-scroll"><RecordTable section={safeSection} items={sorted} data={data} onSelect={setSelected} /></div>
    </Panel>
    <aside className="grid" style={{ alignContent: "start", gap: 12 }}>{selected && <Panel title="Record details" action={<>{safeSection === "donors" && "codedId" in selected && <button className="button button-quiet" onClick={() => onEditDonor(selected.id)}>Edit</button>}<button className="button button-quiet" onClick={() => setSelected(null)} aria-label="Clear selection">Clear</button></>}><Detail section={safeSection} record={selected} /></Panel>}{safeSection === "samples" && <Panel title="Lineage data" caption="Relationships are explicit only"><div className="detail-value">{data.processing.length} processing events recorded</div><p className="panel-caption">A sample is shown as derived only when a processing record explicitly names it as output.</p></Panel>}{safeSection === "storage" && <Panel title="Storage status"><div className="detail-value">{data.storage.filter((item) => item.status === "Operational").length} units operational</div><p className="panel-caption">Locations and capacities are synthetic.</p></Panel>}</aside></div>
  </>;
}

const headings: Record<Section, { eyebrow: string; title: string; subtitle: string; panelTitle: string; add?: string; filters?: string[]; sortKeys?: [string, string][] }> = {
  donors: { eyebrow: "Coded records", title: "Donors", subtitle: "Pseudonymous research cohort records. No direct identifiers are stored here.", panelTitle: "Donor register", add: "Register donor", filters: ["All", "Active", "Pending", "Withdrawn"], sortKeys: [["id", "donor ID"], ["codedId", "coded identifier"], ["registeredAt", "registration date"]] },
  samples: { eyebrow: "Specimen inventory", title: "Samples", subtitle: "Track collection, status, storage, and explicitly recorded lineage.", panelTitle: "Sample register", add: "Register sample", filters: ["All", "DNA", "RNA", "Other", "Available", "Processing", "Archived", "Depleted"], sortKeys: [["id", "sample ID"], ["collectionDate", "collection date"], ["status", "status"], ["type", "sample type"]] },
  processing: { eyebrow: "Sample operations", title: "Processing", subtitle: "Processing events link input samples to output samples explicitly.", panelTitle: "Processing events", add: "Record event", sortKeys: [["id", "event ID"], ["date", "date"], ["processType", "process type"]] },
  experiments: { eyebrow: "Research activity", title: "Experiments", subtitle: "Research plans and sample associations in the demo repository.", panelTitle: "Experiment register", add: "Create experiment", filters: ["All", "Planned", "In progress", "Complete", "On hold"], sortKeys: [["id", "experiment ID"], ["startDate", "start date"], ["status", "status"], ["type", "type"]] },
  sequencing: { eyebrow: "Research outputs", title: "Sequencing results", subtitle: "Demonstration-only metrics associated with synthetic samples and experiments.", panelTitle: "Result register", sortKeys: [["id", "result ID"], ["readCount", "read count"], ["qualityScore", "quality score"]] },
  storage: { eyebrow: "Inventory operations", title: "Storage", subtitle: "Synthetic storage units, occupancy, and sample assignments.", panelTitle: "Storage units", sortKeys: [["id", "unit ID"], ["occupied", "occupancy"], ["capacity", "capacity"]] },
  audit: { eyebrow: "Activity history", title: "Activity log", subtitle: "Simulated application events. Not a security audit trail.", panelTitle: "Recent activity", sortKeys: [["timestamp", "timestamp"], ["actor", "actor"]] },
};

function sortValue(item: unknown, key: string): string | number {
  if (typeof item !== "object" || item === null) return "";
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "number" ? value : String(value ?? "");
}

type RecordItem = Donor | Sample | ProcessingEvent | Experiment;
function RecordTable({ section, items, data, onSelect }: { section: Section; items: unknown[]; data: ReturnType<typeof useDemoData>["data"]; onSelect: (record: RecordItem) => void }) {
  if (!items.length) return <EmptyState title="No matching records" detail="Try a different search or filter." />;
  const click = (record: RecordItem) => onSelect(record);
  if (section === "donors") return <table><thead><tr><th>Donor ID</th><th>Coded identifier</th><th>Consent</th><th>Registered</th><th>Cohort</th><th>Age band</th></tr></thead><tbody>{(items as Donor[]).map((donor) => <tr key={donor.id} onClick={() => click(donor)}><td><button className="table-link">{donor.id}</button></td><td>{donor.codedId}</td><td><Badge tone={donor.consentStatus === "Active" ? "success" : donor.consentStatus === "Pending" ? "warning" : "danger"}>{donor.consentStatus}</Badge></td><td>{donor.registeredAt}</td><td>{donor.cohort}</td><td>{donor.ageBand}</td></tr>)}</tbody></table>;
  if (section === "samples") return <table><thead><tr><th>Sample ID</th><th>Donor ID</th><th>Type</th><th>Collection date</th><th>Status</th><th>Storage</th><th>Lineage</th></tr></thead><tbody>{(items as Sample[]).map((sample) => <tr key={sample.id} onClick={() => click(sample)}><td><button className="table-link">{sample.id}</button></td><td>{sample.donorId}</td><td>{sample.type}</td><td>{sample.collectionDate}</td><td><Badge tone={sample.status === "Available" ? "success" : sample.status === "Processing" ? "warning" : ""}>{sample.status}</Badge></td><td>{sample.storageUnitId}</td><td>{sample.lineageAvailable ? <Badge tone="info">Recorded</Badge> : "None"}</td></tr>)}</tbody></table>;
  if (section === "processing") return <table><thead><tr><th>Event ID</th><th>Process</th><th>Date</th><th>Researcher</th><th>Input samples</th><th>Output samples</th></tr></thead><tbody>{(items as ProcessingEvent[]).map((event) => <tr key={event.id} onClick={() => click(event)}><td><button className="table-link">{event.id}</button></td><td>{event.processType}</td><td>{event.date}</td><td>{event.researcher}</td><td>{event.inputSampleIds.join(", ")}</td><td>{event.outputSampleIds.join(", ")}</td></tr>)}</tbody></table>;
  if (section === "experiments") return <table><thead><tr><th>Experiment</th><th>Type</th><th>Researcher</th><th>Start date</th><th>Samples</th><th>Status</th></tr></thead><tbody>{(items as Experiment[]).map((item) => <tr key={item.id} onClick={() => click(item)}><td><button className="table-link">{item.id}</button></td><td>{item.type}</td><td>{item.researcher}</td><td>{item.startDate}</td><td>{item.sampleIds.join(", ")}</td><td><Badge tone={item.status === "Complete" ? "success" : item.status === "In progress" ? "info" : "warning"}>{item.status}</Badge></td></tr>)}</tbody></table>;
  if (section === "sequencing") return <table><thead><tr><th>Result</th><th>Sample</th><th>Experiment</th><th>Platform</th><th>Read count*</th><th>Quality*</th><th>Status</th></tr></thead><tbody>{data.results.filter((item) => (items as typeof data.results).some((entry) => entry.id === item.id)).map((result) => <tr key={result.id}><td>{result.id}</td><td>{result.sampleId}</td><td>{result.experimentId}</td><td>{result.platform}</td><td>{result.readCount.toLocaleString()}</td><td>{result.qualityScore}%</td><td><Badge tone={result.status === "Complete" ? "success" : "warning"}>{result.status}</Badge></td></tr>)}</tbody></table>;
  if (section === "storage") return <table><thead><tr><th>Unit</th><th>Location</th><th>Assigned samples</th><th>Occupancy</th><th>Capacity</th><th>Utilization</th><th>Status</th></tr></thead><tbody>{data.storage.filter((item) => (items as typeof data.storage).some((entry) => entry.id === item.id)).map((unit) => <tr key={unit.id}><td>{unit.name}<div className="panel-caption">{unit.id}</div></td><td>{unit.location}</td><td>{data.samples.filter((sample) => sample.storageUnitId === unit.id).map((sample) => sample.id).join(", ") || "None"}</td><td>{unit.occupied}</td><td>{unit.capacity}</td><td>{Math.round((unit.occupied / unit.capacity) * 100)}%</td><td><Badge tone={unit.status === "Operational" ? "success" : "warning"}>{unit.status}</Badge></td></tr>)}</tbody></table>;
  return <table><thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th></tr></thead><tbody>{data.activity.filter((item) => (items as typeof data.activity).some((entry) => entry.id === item.id)).map((item) => <tr key={item.id}><td>{new Date(item.timestamp).toLocaleString()}</td><td>{item.action}</td><td>{item.actor}</td></tr>)}</tbody></table>;
}

function Detail({ section, record }: { section: Section; record: RecordItem }) {
  const { data } = useDemoData();
  const entries: [string, string][] = section === "donors" && "codedId" in record
    ? [["Donor ID", record.id], ["Coded identifier", record.codedId], ["Consent", record.consentStatus], ["Registration date", record.registeredAt], ["Cohort", record.cohort], ["Age band", record.ageBand]]
    : section === "samples" && "donorId" in record
      ? [["Sample ID", record.id], ["Donor ID", record.donorId], ["Sample type", record.type], ["Collection", record.collectionDate], ["Status", record.status], ["Storage unit", record.storageUnitId], ["Lineage", record.lineageAvailable ? "Recorded" : "No relationship recorded"], ["Processing", data.processing.filter((event) => event.inputSampleIds.includes(record.id) || event.outputSampleIds.includes(record.id)).map((event) => event.id).join(", ") || "None"], ["Experiments", data.experiments.filter((experiment) => experiment.sampleIds.includes(record.id)).map((experiment) => experiment.id).join(", ") || "None"], ["Sequencing results", data.results.filter((result) => result.sampleId === record.id).map((result) => result.id).join(", ") || "None"]]
      : "processType" in record
        ? [["Event ID", record.id], ["Process type", record.processType], ["Date", record.date], ["Researcher", record.researcher], ["Input samples", record.inputSampleIds.join(", ")], ["Output samples", record.outputSampleIds.join(", ")]]
        : [["Experiment ID", record.id], ["Type", record.type], ["Researcher", record.researcher], ["Dates", `${record.startDate} to ${record.endDate}`], ["Associated samples", record.sampleIds.join(", ")], ["Status", record.status]];
  return <div>{entries.map(([label, value]) => <div key={label} className="detail-block"><div className="detail-label">{label}</div><div className="detail-value">{value || "None"}</div></div>)}</div>;
}