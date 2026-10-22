"use client";

import { useMemo } from "react";
import { Activity, Boxes, Dna, FlaskConical, Users } from "lucide-react";
import { useDemoData } from "@/components/demo-data-provider";
import { Badge, PageHeading, Panel } from "@/components/ui";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";

const colors = ["#168b82", "#6589a0", "#d1a452", "#ba7770"];

export function Dashboard() {
  const { data } = useDemoData();
  const typeData = useMemo(() => ["DNA", "RNA", "Other"].map((type) => ({ name: type, value: data.samples.filter((sample) => sample.type === type).length })), [data.samples]);
  const statusData = useMemo(() => ["Available", "Processing", "Archived", "Depleted"].map((name) => ({ name, count: data.samples.filter((sample) => sample.status === name).length })), [data.samples]);
  const trendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, index) => ({ month, collected: data.samples.filter((sample) => new Date(sample.collectionDate).getMonth() === index).length }));
  }, [data.samples]);
  const occupied = data.storage.reduce((total, unit) => total + unit.occupied, 0);
  const capacity = data.storage.reduce((total, unit) => total + unit.capacity, 0);
  const metrics = [
    { label: "Donors", value: data.donors.length, note: "Coded records", icon: Users },
    { label: "Samples", value: data.samples.length, note: "Registered specimens", icon: Dna },
    { label: "Experiments", value: data.experiments.length, note: "Across all statuses", icon: FlaskConical },
    { label: "Sequencing results", value: data.results.length, note: "Synthetic result metrics", icon: Activity },
    { label: "Storage utilization", value: `${Math.round((occupied / capacity) * 100)}%`, note: `${occupied.toLocaleString()} / ${capacity.toLocaleString()} positions`, icon: Boxes },
  ];

  return <>
    <PageHeading eyebrow="Research workspace" title="Repository overview" subtitle="A live view of synthetic records in this browser session."><span className="badge info">Synthetic demo dataset</span></PageHeading>
    <div className="grid metric-grid">{metrics.map(({ label, value, note, icon: Icon }) => <div className="metric-card" key={label}><div className="metric-head"><span>{label}</span><span className="metric-icon"><Icon size={15} /></span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>)}</div>
    <div className="grid dashboard-charts">
      <Panel title="Sample collection trend" caption="New samples by collection month · synthetic"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="tealFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168b82" stopOpacity={0.2} /><stop offset="100%" stopColor="#168b82" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#edf1f1" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#788991" }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#788991" }} /><Tooltip /><Area type="monotone" dataKey="collected" stroke="#168b82" strokeWidth={2} fill="url(#tealFade)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel title="Sample types" caption="Current sample inventory"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>{typeData.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}</Pie><Tooltip /><text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#122b3b" fontSize="20" fontWeight="700">{data.samples.length}</text><text x="50%" y="59%" textAnchor="middle" dominantBaseline="middle" fill="#71828a" fontSize="9">SAMPLES</text></PieChart></ResponsiveContainer></div><div style={{ display: "flex", justifyContent: "center", gap: 13 }}>{typeData.map((item, index) => <span key={item.name} style={{ color: "#708189", fontSize: 9 }}><i style={{ display: "inline-block", width: 7, height: 7, marginRight: 5, borderRadius: 2, background: colors[index] }} />{item.name} {item.value}</span>)}</div></Panel>
      <Panel title="Processing status" caption="Current state of sample records"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}><CartesianGrid stroke="#edf1f1" horizontal={false} /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="name" width={75} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#647880" }} /><Tooltip /><Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>{statusData.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
    </div>
    <div className="grid dashboard-lower">
      <Panel title="Recent samples" caption="Latest sample records" action={<Link className="table-link" href="/samples">View all</Link>}>
        <div className="table-scroll"><table><thead><tr><th>Sample ID</th><th>Type</th><th>Collected</th><th>Status</th><th>Lineage</th></tr></thead><tbody>{data.samples.slice(0, 5).map((sample) => <tr key={sample.id}><td><Link className="table-link" href={`/samples?selected=${sample.id}`}>{sample.id}</Link></td><td>{sample.type}</td><td>{sample.collectionDate}</td><td><Badge tone={sample.status === "Available" ? "success" : sample.status === "Processing" ? "warning" : ""}>{sample.status}</Badge></td><td>{sample.lineageAvailable ? "Available" : "Not recorded"}</td></tr>)}</tbody></table></div>
        <div className="quick-actions"><Link className="button button-primary" href="/samples"><Dna size={14} /> Register sample</Link><Link className="button" href="/donors"><Users size={14} /> Register donor</Link><Link className="button" href="/lineage"><Activity size={14} /> Explore lineage</Link></div>
      </Panel>
      <Panel title="Recent activity" caption="Simulated activity · not a security audit record"><div className="activity-list">{data.activity.slice(0, 5).map((item) => <div className="activity-row" key={item.id}><span className="activity-mark"><Activity size={13} /></span><div className="activity-copy">{item.action}<div className="activity-time">{item.actor} · {new Date(item.timestamp).toLocaleString()}</div></div></div>)}</div></Panel>
    </div>
  </>;
}