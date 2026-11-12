
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Boxes,
  ClipboardList,
  Dna,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Menu,
  Microscope,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  Badge,
  Notice,
  PageHeading,
  Panel,
  useToast,
} from "@/components/ui";

import { Dashboard } from "@/components/workspace-dashboard";
import {
  DonorForm,
  ExperimentForm,
  ProcessingForm,
  SampleForm,
} from "@/components/workspace-forms";
import { LineageExplorer } from "@/components/workspace-lineage";
import { RecordsPage } from "@/components/workspace-records";
import type { UserRole } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { href: "/donors", label: "Donors", icon: Users, group: "Workspace" },
  { href: "/samples", label: "Samples", icon: Dna, group: "Workspace" },
  { href: "/lineage", label: "Lineage explorer", icon: GitBranch, group: "Workspace" },
  { href: "/processing", label: "Processing", icon: FlaskConical, group: "Research" },
  { href: "/experiments", label: "Experiments", icon: Microscope, group: "Research" },
  { href: "/sequencing", label: "Sequencing results", icon: Activity, group: "Research" },
  { href: "/storage", label: "Storage", icon: Boxes, group: "Operations" },
  { href: "/audit", label: "Activity log", icon: ClipboardList, group: "Operations" },
  { href: "/management", label: "User & roles", icon: ShieldCheck, group: "Administration", admin: true },
];

const titles: Record<string, string> = {
  dashboard: "Overview",
  donors: "Donors",
  samples: "Samples",
  lineage: "Sample lineage",
  processing: "Processing",
  experiments: "Experiments",
  sequencing: "Sequencing results",
  storage: "Storage",
  audit: "Activity log",
  management: "User & roles",
  login: "Sign in",
};

export function Workspace() {
  const pathname = usePathname();
  const router = useRouter();

  const section = pathname.split("/")[1] || "dashboard";

  const [role, setRole] = useState<UserRole>("Researcher");
  const [modal, setModal] = useState("");
  const [editingDonorId, setEditingDonorId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const { show, Toast } = useToast();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (section === "login") {
        setAuthChecked(true);
        return;
      }

      setAuthChecked(false);

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const result = await response.json();

        if (!active) return;

        const databaseRole = result.user.role;
        const frontendRole =
          databaseRole === "Admin" ? "Administrator" : databaseRole === "Lab Technician" ? "Lab Technician" : "Researcher";

        setRole(frontendRole as UserRole);

        if (
          frontendRole === "Researcher" &&
          section === "management"
        ) {
          router.replace("/dashboard");
          return;
        }

        setAuthChecked(true);
      } catch {
        router.replace("/login");
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [section, router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setRole("Researcher");
      router.replace("/login");
      router.refresh();
    }
  }

  if (section === "login") {
    return (
      <LoginPage
        onLogin={(selectedRole) => {
          setRole(selectedRole);
          router.push("/dashboard");
        }}
      />
    );
  }

  if (!authChecked) {
    return <div className="login-page">Verifying your session...</div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <Link
          href="/dashboard"
          className="brand"
          aria-label="Genomic Biobank overview"
        >
          <span className="brand-mark">
            <Dna size={19} />
          </span>

          <span className="brand-copy">
            <span className="brand-name">GENOMIC BIOBANK</span>
            <span className="brand-caption">
              Sample lineage repository
            </span>
          </span>
        </Link>

        {Array.from(new Set(navItems.map((item) => item.group))).map(
          (group) => (
            <div key={group}>
              <div className="nav-caption">{group}</div>

              <nav
                className="nav-list"
                aria-label={`${group} navigation`}
              >
                {navItems
                  .filter(
                    (item) =>
                      item.group === group &&
                      (!item.admin || role === "Administrator")
                  )
                  .map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`nav-link ${
                        section === href.slice(1) ? "active" : ""
                      }`}
                      onClick={() => setMobileOpen(false)}
                      aria-label={label}
                      aria-current={
                        section === href.slice(1) ? "page" : undefined
                      }
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  ))}
              </nav>
            </div>
          )
        )}

        <div className="sidebar-foot">
          <div className="demo-note">
            <span className="demo-dot" />
            <span>
              Database-backed workspace
              <br />
              PostgreSQL and MongoDB
            </span>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="crumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            Repository&nbsp; / &nbsp;{titles[section] ?? "Overview"}
          </div>

          <div className="top-actions">
            <span className="badge info">
              DATABASE INTEGRATION
            </span>

            <div className="avatar" aria-label={`${role} account`}>
              {role === "Administrator" ? "AD" : role === "Lab Technician" ? "LT" : "RS"}
            </div>

            <button
              type="button"
              className="button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="main-content">
          {section === "dashboard" && <Dashboard />}

          {section === "lineage" && <LineageExplorer />}

          {section === "management" && role === "Administrator" && (
            <ManagementPage role={role} />
          )}

          {section === "management" && role !== "Administrator" && (
            <Notice warning>
              Access to role management is restricted.
            </Notice>
          )}

          {![
            "dashboard",
            "lineage",
            "management",
            "login",
          ].includes(section) && (
            <RecordsPage
              section={section}
              onAdd={() => {
                setEditingDonorId("");
                setModal(section);
              }}
              onEditDonor={(id) => {
                setEditingDonorId(id);
                setModal("edit-donor");
              }}
            />
          )}
        </main>
      </div>

      {modal && (
        <EntryModal
          type={modal}
          initialDonorId={editingDonorId}
          close={() => {
            setModal("");
            setEditingDonorId("");
          }}
          done={(message) => {
            setModal("");
            setEditingDonorId("");
            show(message);
          }}
        />
      )}

      <Toast />
    </div>
  );
}

function LoginPage({
  onLogin,
}: {
  onLogin: (role: UserRole) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Login failed. Check your credentials.");
        return;
      }

      const databaseRole = data.user.role;
      const frontendRole =
        databaseRole === "Admin" ? "Administrator" : databaseRole === "Lab Technician" ? "Lab Technician" : "Researcher";

      onLogin(frontendRole as UserRole);
    } catch {
      setError("Unable to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <Link
          href="/login"
          className="brand"
          style={{ padding: 0, border: 0 }}
        >
          <span className="brand-mark">
            <Dna size={19} />
          </span>

          <span>
            <span className="brand-name">GENOMIC BIOBANK</span>
            <span
              className="brand-caption"
              style={{ display: "block" }}
            >
              Research repository
            </span>
          </span>
        </Link>

        <div>
          <div className="eyebrow" style={{ color: "#8dd4ca" }}>
            UNIVERSITY RESEARCH WORKSPACE
          </div>

          <h1 className="serif">From sample to discovery.</h1>

          <p>
            A research environment for managing biobank specimens,
            experiments, storage and sample lineage.
          </p>
        </div>

        <div className="demo-note">
          <span className="demo-dot" />
          <span>
            Secure access to the genomic biobank repository.
          </span>
        </div>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="eyebrow">SECURE ACCOUNT ACCESS</div>

          <h2>Welcome back</h2>

          <p
            className="page-subtitle"
            style={{ marginBottom: 22 }}
          >
            Sign in using your registered biobank account.
          </p>

          <div className="field-group">
            <label className="field-label" htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              className="field-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field-group" style={{ marginTop: 13 }}>
            <label className="field-label" htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button button-primary"
            style={{
              width: "100%",
              marginTop: 18,
              height: 40,
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}

function EntryModal({
  type,
  initialDonorId,
  close,
  done,
}: {
  type: string;
  initialDonorId?: string;
  close: () => void;
  done: (message: string) => void;
}) {
  if (type === "donors" || type === "edit-donor") {
    return (
      <DonorForm
        initialDonorId={initialDonorId}
        close={close}
        done={done}
      />
    );
  }

  if (type === "samples") {
    return <SampleForm close={close} done={done} />;
  }

  if (type === "processing") {
    return <ProcessingForm close={close} done={done} />;
  }

  if (type === "experiments") {
    return <ExperimentForm close={close} done={done} />;
  }

  return null;
}

function ManagementPage({ role }: { role: UserRole }) {
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="User & role management"
        subtitle="Review the roles used by the genomic biobank application."
      />

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        }}
      >
        <Panel
          title="Administrator"
          caption="Administrative access"
        >
          <div className="detail-value">
            Manage repository records and access administrative
            functions.
          </div>

          <Badge tone={role === "Administrator" ? "success" : ""}>
            {role === "Administrator" ? "Current role" : "Application role"}
          </Badge>
        </Panel>

        <Panel
          title="Researcher"
          caption="Research workspace access"
        >
          <div className="detail-value">
            Access research records and permitted research operations.
          </div>

          <Badge tone={role === "Researcher" ? "success" : ""}>
            {role === "Researcher" ? "Current role" : "Application role"}
          </Badge>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Notice>
          User authentication and role authorization are enforced
          through the backend. This page currently provides role
          information; user account creation and editing are not
          implemented here.
        </Notice>
      </div>
    </>
  );
}


