"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Boxes, Dna, FlaskConical, Users } from "lucide-react";
import { Badge, EmptyState, Notice, PageHeading, Panel } from "@/components/ui";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";

type DashboardSample = {
  sample_id: number | string;
  sample_type_name: string;
  collection_date: string | null;
  status: string;
};

type DashboardData = {
  donors: { donor_id: number | string }[];
  samples: DashboardSample[];
  experiments: { experiment_id: number | string }[];
  results: { sequencing_result_id: number | string }[];
  storageUnits: { storage_id: number | string; status: string }[];
  assignments: { sample_storage_id: number | string; removed_date: string | null }[];
};

const colors = ["#168b82", "#6589a0", "#d1a452", "#ba7770"];
const emptyData: DashboardData = {
  donors: [],
  samples: [],
  experiments: [],
  results: [],
  storageUnits: [],
  assignments: [],
};

async function loadCollection(path: string, key: string) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.success || !Array.isArray(body[key])) {
    throw new Error(body.message || `Could not load ${key}.`);
  }
  return body[key];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const [donors, samples, experiments, results, storageUnits, assignments] =
          await Promise.all([
            loadCollection("/api/donors", "donors"),
            loadCollection("/api/samples", "samples"),
            loadCollection("/api/experiments", "experiments"),
            loadCollection("/api/sequencing-results", "sequencing_results"),
            loadCollection("/api/storage-units", "storage_units"),
            loadCollection("/api/sample-storage", "sample_storage"),
          ]);
        if (active) {
          setData({ donors, samples, experiments, results, storageUnits, assignments });
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load dashboard records."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, [retryKey]);

  const typeData = useMemo(
    () => [...new Set(data.samples.map((sample) => sample.sample_type_name))].map((type) => ({
        name: type,
        value: data.samples.filter((sample) => sample.sample_type_name === type).length,
      })),
    [data.samples]
  );
  const statusData = useMemo(() => {
    const statuses = [...new Set(data.samples.map((sample) => sample.status))];
    return statuses.map((name) => ({
      name,
      count: data.samples.filter((sample) => sample.status === name).length,
    }));
  }, [data.samples]);
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      const month = monthDate.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
      const collected = data.samples.filter((sample) => {
        if (!sample.collection_date) return false;
        const date = new Date(sample.collection_date);
        return date.getUTCFullYear() === monthDate.getUTCFullYear() &&
          date.getUTCMonth() === monthDate.getUTCMonth();
      }).length;
      return { month, collected };
    });
  }, [data.samples]);

  const activeAssignments = data.assignments.filter((item) => !item.removed_date).length;
  const metrics = [
    { label: "Donors", value: data.donors.length, note: "API result (max 100)", icon: Users },
    { label: "Samples", value: data.samples.length, note: "API result (max 100)", icon: Dna },
    { label: "Experiments", value: data.experiments.length, note: "API result (max 100)", icon: FlaskConical },
    { label: "Sequencing results", value: data.results.length, note: "API result (max 100)", icon: Activity },
    { label: "Active storage assignments", value: activeAssignments, note: `${data.storageUnits.length} locations returned (max 100)`, icon: Boxes },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Research workspace"
        title="Repository overview"
        subtitle="Counts and charts summarize PostgreSQL API results (each current list endpoint is capped at 100 records)."
      >
        <Badge tone="success">PostgreSQL data</Badge>
      </PageHeading>
      {loading && <Notice>Loading dashboard records...</Notice>}
      {error && <Notice warning>{error} <button type="button" className="button" onClick={() => setRetryKey((current) => current + 1)}>Retry</button></Notice>}
      {!loading && !error && (
        <>
          <div className="grid metric-grid">
            {metrics.map(({ label, value, note, icon: Icon }) => (
              <div className="metric-card" key={label}>
                <div className="metric-head">
                  <span>{label}</span>
                  <span className="metric-icon"><Icon size={15} /></span>
                </div>
                <div className="metric-value">{value.toLocaleString()}</div>
                <div className="metric-note">{note}</div>
              </div>
            ))}
          </div>
          <div className="grid dashboard-charts">
            <Panel title="Sample collection trend" caption="Records by collection month · last 6 months">
              {data.samples.length === 0 ? <EmptyState title="No collection data" detail="Collection trends will appear after sample records are available." /> : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                      <defs><linearGradient id="tealFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168b82" stopOpacity={0.2} /><stop offset="100%" stopColor="#168b82" stopOpacity={0.01} /></linearGradient></defs>
                      <CartesianGrid stroke="#edf1f1" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#788991" }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#788991" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="collected" stroke="#168b82" strokeWidth={2} fill="url(#tealFade)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel title="Sample types" caption="Current PostgreSQL inventory">
              {data.samples.length === 0 ? <EmptyState title="No samples" detail="Register a sample to populate this chart." /> : (
                <>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                          {typeData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                        </Pie>
                        <Tooltip />
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#122b3b" fontSize="20" fontWeight="700">{data.samples.length}</text>
                        <text x="50%" y="59%" textAnchor="middle" dominantBaseline="middle" fill="#71828a" fontSize="9">SAMPLES</text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 13 }}>
                    {typeData.map((item, index) => <span key={item.name} style={{ color: "#708189", fontSize: 9 }}><i style={{ display: "inline-block", width: 7, height: 7, marginRight: 5, borderRadius: 2, background: colors[index % colors.length] }} />{item.name} {item.value}</span>)}
                  </div>
                </>
              )}
            </Panel>
            <Panel title="Sample status" caption="Current PostgreSQL inventory">
              {statusData.length === 0 ? <EmptyState title="No samples" detail="Status counts will appear when sample records exist." /> : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="#edf1f1" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="name" width={75} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#647880" }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                        {statusData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
          <div className="grid dashboard-lower">
            <Panel title="Recent samples" caption="Latest records returned by PostgreSQL" action={<Link className="table-link" href="/samples">View all</Link>}>
              {data.samples.length === 0 ? <EmptyState title="No sample records" detail="Register a sample to get started." /> : (
                <div className="table-scroll" role="region" aria-label="Recent samples table" tabIndex={0}><table><thead><tr><th>Sample ID</th><th>Type</th><th>Collected</th><th>Status</th></tr></thead><tbody>
                  {[...data.samples].slice(-5).reverse().map((sample) => <tr key={sample.sample_id}><td><Link className="table-link" href={`/samples?selected=${sample.sample_id}`}>{sample.sample_id}</Link></td><td>{sample.sample_type_name}</td><td>{sample.collection_date ?? "—"}</td><td><Badge>{sample.status}</Badge></td></tr>)}
                </tbody></table></div>
              )}
              <div className="quick-actions"><Link className="button button-primary" href="/samples"><Dna size={14} /> Register sample</Link><Link className="button" href="/donors"><Users size={14} /> Register donor</Link><Link className="button" href="/lineage"><Activity size={14} /> Explore lineage</Link></div>
            </Panel>
            <Panel title="Data sources" caption="Database-backed application modules">
              <div className="activity-list">
                <div className="activity-row"><span className="activity-mark"><Users size={13} /></span><div className="activity-copy">Donors, samples, processing and experiments<div className="activity-time">PostgreSQL API</div></div></div>
                <div className="activity-row"><span className="activity-mark"><Boxes size={13} /></span><div className="activity-copy">Storage and sequencing result metadata<div className="activity-time">PostgreSQL API</div></div></div>
                <div className="activity-row"><span className="activity-mark"><Activity size={13} /></span><div className="activity-copy">Lineage event history<div className="activity-time">MongoDB API</div></div></div>
              </div>
              <Notice warning>Security audit records are not exposed by the current backend API.</Notice>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
