"use client";

import { useEffect, useState } from "react";
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
  collection_date: string;
  status: string;
  lineage_available: boolean;
};

type DashboardData = {
  donors: number;
  samples: number;
  experiments: number;
  sequencing_results: number;
  active_storage_assignments: number;
  sample_types: { name: string; value: number }[];
  sample_statuses: { name: string; count: number }[];
  collection_trend: { month: string; collected: number }[];
  recent_samples: DashboardSample[];
};

const colors = ["#168b82", "#6589a0", "#d1a452", "#ba7770"];
const emptyData: DashboardData = {
  donors: 0,
  samples: 0,
  experiments: 0,
  sequencing_results: 0,
  active_storage_assignments: 0,
  sample_types: [],
  sample_statuses: [],
  collection_trend: [],
  recent_samples: [],
};

async function fetchDashboard() {
  const response = await fetch("/api/dashboard", {
    credentials: "include",
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.success || !body.dashboard) {
    throw new Error(body.message || "Could not load dashboard records.");
  }
  return body.dashboard as DashboardData;
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
        if (active) {
          setData(await fetchDashboard());
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

  const metrics = [
    { label: "Donors", value: data.donors, note: "Total PostgreSQL records", icon: Users },
    { label: "Samples", value: data.samples, note: "Total PostgreSQL records", icon: Dna },
    { label: "Experiments", value: data.experiments, note: "Total PostgreSQL records", icon: FlaskConical },
    { label: "Sequencing results", value: data.sequencing_results, note: "Total PostgreSQL records", icon: Activity },
    { label: "Active storage assignments", value: data.active_storage_assignments, note: "Current assignments", icon: Boxes },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Research workspace"
        title="Repository overview"
        subtitle="Repository-wide counts and sample summaries are calculated by the PostgreSQL dashboard API."
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
              {data.samples === 0 ? <EmptyState title="No collection data" detail="Collection trends will appear after sample records are available." /> : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.collection_trend} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
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
              {data.samples === 0 ? <EmptyState title="No samples" detail="Register a sample to populate this chart." /> : (
                <>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.sample_types} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                          {data.sample_types.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                        </Pie>
                        <Tooltip />
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#122b3b" fontSize="20" fontWeight="700">{data.samples}</text>
                        <text x="50%" y="59%" textAnchor="middle" dominantBaseline="middle" fill="#71828a" fontSize="9">SAMPLES</text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 13 }}>
                    {data.sample_types.map((item, index) => <span key={item.name} style={{ color: "#708189", fontSize: 9 }}><i style={{ display: "inline-block", width: 7, height: 7, marginRight: 5, borderRadius: 2, background: colors[index % colors.length] }} />{item.name} {item.value}</span>)}
                  </div>
                </>
              )}
            </Panel>
            <Panel title="Sample status" caption="Current PostgreSQL inventory">
              {data.samples === 0 ? <EmptyState title="No samples" detail="Status counts will appear when sample records exist." /> : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.sample_statuses} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="#edf1f1" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="name" width={75} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#647880" }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                        {data.sample_statuses.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
          <div className="grid dashboard-lower">
            <Panel title="Recent samples" caption="Latest records returned by the PostgreSQL dashboard API" action={<Link className="table-link" href="/samples">View all</Link>}>
              {data.recent_samples.length === 0 ? <EmptyState title="No sample records" detail="Register a sample to get started." /> : (
                <div className="table-scroll" role="region" aria-label="Recent samples table" tabIndex={0}><table><thead><tr><th>Sample ID</th><th>Type</th><th>Collected</th><th>Status</th></tr></thead><tbody>
                  {data.recent_samples.map((sample) => <tr key={sample.sample_id}><td><Link className="table-link" href={`/samples?selected=${sample.sample_id}`}>{sample.sample_id}</Link></td><td>{sample.sample_type_name}</td><td>{sample.collection_date}</td><td><Badge>{sample.status}</Badge></td></tr>)}
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
              <Notice>Audit records are available to Admin users through the Activity log.</Notice>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
