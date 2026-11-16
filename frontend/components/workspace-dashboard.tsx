
"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  Dna,
  FlaskConical,
  Users,
} from "lucide-react";
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

type DashboardData = {
  donors: number;
  samples: number;
  experiments: number;
  sequencing_results: number;
  active_storage_assignments: number;
  sample_types: {
    name: string;
    value: number;
  }[];
  sample_statuses: {
    name: string;
    count: number;
  }[];
  collection_trend: {
    month: string;
    collected: number;
  }[];
  recent_samples: {
    sample_id: number | string;
    sample_type_name: string;
    collection_date: string;
    status: string;
    lineage_available: boolean;
  }[];
};

const emptyDashboard: DashboardData = {
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

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusTone(status: string): "success" | "warning" | "" {
  const normalized = status.toLowerCase();

  if (["available", "collected", "stored", "completed", "processed"].includes(normalized)) {
    return "success";
  }

  if (["processing", "in_progress", "pending"].includes(normalized)) {
    return "warning";
  }

  return "";
}

export function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load dashboard information.",
          );
        }

        if (!cancelled) {
          setDashboard({
            ...emptyDashboard,
            ...result.dashboard,
            sample_types: result.dashboard.sample_types ?? [],
            sample_statuses: result.dashboard.sample_statuses ?? [],
            collection_trend: result.dashboard.collection_trend ?? [],
            recent_samples: result.dashboard.recent_samples ?? [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load dashboard information.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = [
    {
      label: "Donors",
      value: dashboard.donors,
      note: "Registered donor records",
      icon: Users,
    },
    {
      label: "Samples",
      value: dashboard.samples,
      note: "Registered specimens",
      icon: Dna,
    },
    {
      label: "Experiments",
      value: dashboard.experiments,
      note: "Database experiments",
      icon: FlaskConical,
    },
    {
      label: "Sequencing results",
      value: dashboard.sequencing_results,
      note: "Recorded sequencing results",
      icon: Activity,
    },
    {
      label: "Active storage assignments",
      value: dashboard.active_storage_assignments,
      note: "Currently active sample placements",
      icon: Boxes,
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeading
          eyebrow="Research workspace"
          title="Repository overview"
          subtitle="Loading repository information from PostgreSQL."
        />
        <div className="panel" style={{ padding: 24 }}>
          Loading dashboard information...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeading
          eyebrow="Research workspace"
          title="Repository overview"
          subtitle="The dashboard could not retrieve repository information."
        />
        <div className="panel" style={{ padding: 24 }}>
          <p className="field-error" role="alert">{error}</p>
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Research workspace"
        title="Repository overview"
        subtitle="A live overview of genomic biobank records stored in PostgreSQL."
      >
        <span className="badge success">PostgreSQL connected</span>
      </PageHeading>

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
              {Number(value ?? 0).toLocaleString()}
            </div>

            <div className="metric-note">{note}</div>
          </div>
        ))}
      </div>

      <div className="grid dashboard-charts">
        <Panel
          title="Sample collection trend"
          caption="New samples collected over the last six months"
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dashboard.collection_trend}
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
                    <stop
                      offset="0%"
                      stopColor="#168b82"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="#168b82"
                      stopOpacity={0.01}
                    />
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

        <Panel
          title="Sample types"
          caption="Current sample inventory by type"
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.sample_types}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {dashboard.sample_types.map((item, index) => (
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
                  {dashboard.samples}
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
            {dashboard.sample_types.map((item, index) => (
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
          title="Processing status"
          caption="Current state of sample records"
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.sample_statuses}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#edf1f1"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  hide
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#647880" }}
                  tickFormatter={formatStatus}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                >
                  {dashboard.sample_statuses.map((item, index) => (
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
          caption="Latest sample records from PostgreSQL"
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
                {dashboard.recent_samples.length > 0 ? (
                  dashboard.recent_samples.map((sample) => (
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

                      <td>
                        {sample.collection_date
                          ? String(sample.collection_date).slice(0, 10)
                          : "—"}
                      </td>

                      <td>
                        <Badge tone={getStatusTone(sample.status)}>
                          {formatStatus(sample.status)}
                        </Badge>
                      </td>

                      <td>
                        {sample.lineage_available
                          ? "Available"
                          : "Not recorded"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No sample records available.</td>
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
          caption="Active sample storage assignments"
        >
          <div style={{ padding: "20px 0" }}>
            <div className="metric-value">
              {dashboard.active_storage_assignments.toLocaleString()}
            </div>

            <p className="metric-note">
              Samples with an active storage assignment in PostgreSQL.
            </p>

            <div style={{ marginTop: 20 }}>
              <Link className="button" href="/storage">
                View storage records
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
