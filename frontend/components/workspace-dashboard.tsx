"use client";

import { useEffect, useState } from "react";
import { Activity, Boxes, Dna, FlaskConical, Users } from "lucide-react";
import { Badge, PageHeading, Panel } from "@/components/ui";
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

const colors = ["#168b82", "#6589a0", "#d1a452", "#ba7770"];

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

export function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load dashboard information."
          );
        }

        if (active) {
          setDashboard(result.dashboard as DashboardData);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load dashboard information."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    {
      label: "Donors",
      value: dashboard?.donors ?? 0,
      note: "Registered donor records",
      icon: Users,
    },
    {
      label: "Samples",
      value: dashboard?.samples ?? 0,
      note: "Registered specimens",
      icon: Dna,
    },
    {
      label: "Experiments",
      value: dashboard?.experiments ?? 0,
      note: "Recorded experiments",
      icon: FlaskConical,
    },
    {
      label: "Sequencing results",
      value: dashboard?.sequencing_results ?? 0,
      note: "Recorded sequencing results",
      icon: Activity,
    },
    {
      label: "Active storage assignments",
      value: dashboard?.active_storage_assignments ?? 0,
      note: "Samples currently assigned to storage",
      icon: Boxes,
    },
  ];

  const typeData = dashboard?.sample_types ?? [];
  const statusData = dashboard?.sample_statuses ?? [];
  const trendData = dashboard?.collection_trend ?? [];
  const recentSamples = dashboard?.recent_samples ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Research workspace"
        title="Repository overview"
        subtitle="A live summary of records stored in the genomic biobank database."
      >
        <span className="badge info">Live PostgreSQL data</span>
      </PageHeading>

      {error && (
        <div className="panel" role="alert">
          <p>{error}</p>
          <button
            className="button"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </div>
      )}

      <div className="grid metric-grid">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <div className="metric-card" key={label}>
            <div className="metric-head">
              <span>{label}</span>
              <span className="metric-icon">
                <Icon size={15} />
              </span>
            </div>
            <div className="metric-value">
              {loading ? "—" : value.toLocaleString()}
            </div>
            <div className="metric-note">{note}</div>
          </div>
        ))}
      </div>

      <div className="grid dashboard-charts">
        <Panel
          title="Sample collection trend"
          caption="Samples collected during the latest six months"
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="tealFade"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#168b82" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#168b82" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1f1" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#788991" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#788991" }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#168b82"
                  strokeWidth={2}
                  fill="url(#tealFade)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Sample types" caption="Current sample inventory">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {typeData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#122b3b"
                  fontSize="20"
                  fontWeight="700"
                >
                  {dashboard?.samples ?? 0}
                </text>
                <text
                  x="50%"
                  y="59%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#71828a"
                  fontSize="9"
                >
                  SAMPLES
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 13,
              flexWrap: "wrap",
            }}
          >
            {typeData.map((item, index) => (
              <span
                key={item.name}
                style={{ color: "#708189", fontSize: 9 }}
              >
                <i
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    marginRight: 5,
                    borderRadius: 2,
                    background: colors[index % colors.length],
                  }}
                />
                {item.name} {item.value}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title="Sample status"
          caption="Current status of registered samples"
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#edf1f1" horizontal={false} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#647880" }}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                >
                  {statusData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid dashboard-lower">
        <Panel
          title="Recent samples"
          caption="Five most recently collected sample records"
          action={
            <Link className="table-link" href="/samples">
              View all
            </Link>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Type</th>
                  <th>Collected</th>
                  <th>Status</th>
                  <th>Lineage</th>
                </tr>
              </thead>
              <tbody>
                {recentSamples.map((sample) => (
                  <tr key={sample.sample_id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/samples?selected=${sample.sample_id}`}
                      >
                        {sample.sample_id}
                      </Link>
                    </td>
                    <td>{sample.sample_type_name}</td>
                    <td>{String(sample.collection_date).slice(0, 10)}</td>
                    <td>
                      <Badge
                        tone={
                          sample.status.toLowerCase() === "available"
                            ? "success"
                            : sample.status.toLowerCase() === "processing"
                              ? "warning"
                              : ""
                        }
                      >
                        {sample.status}
                      </Badge>
                    </td>
                    <td>
                      {sample.lineage_available
                        ? "Available"
                        : "Not recorded"}
                    </td>
                  </tr>
                ))}
                {!loading && recentSamples.length === 0 && (
                  <tr>
                    <td colSpan={5}>No sample records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="quick-actions">
            <Link className="button button-primary" href="/samples">
              <Dna size={14} /> Register sample
            </Link>
            <Link className="button" href="/donors">
              <Users size={14} /> Register donor
            </Link>
            <Link className="button" href="/lineage">
              <Activity size={14} /> Explore lineage
            </Link>
          </div>
        </Panel>

        <Panel
          title="Storage overview"
          caption="Current sample storage assignments"
        >
          <div className="activity-list">
            <div className="activity-row">
              <span className="activity-mark">
                <Boxes size={13} />
              </span>
              <div className="activity-copy">
                Active storage assignments
                <div className="activity-time">
                  Samples with a current storage location
                </div>
              </div>
              <strong>
                {loading
                  ? "—"
                  : (
                      dashboard?.active_storage_assignments ?? 0
                    ).toLocaleString()}
              </strong>
            </div>
            <div className="activity-row">
              <span className="activity-mark">
                <Activity size={13} />
              </span>
              <div className="activity-copy">
                Storage tracking
                <div className="activity-time">
                  Based on records without a removal date
                </div>
              </div>
            </div>
          </div>
          <p className="metric-note">
            Storage capacity is not defined in the current database schema,
            so a utilization percentage is not displayed.
          </p>
        </Panel>
      </div>
    </>
  );
}
