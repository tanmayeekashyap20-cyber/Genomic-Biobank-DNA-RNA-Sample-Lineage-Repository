"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Boxes, ClipboardList, Dna, FlaskConical, GitBranch, LayoutDashboard, Menu, Microscope, ShieldCheck, Users, X } from "lucide-react";
import { useDemoData } from "@/components/demo-data-provider";
import { Badge, Notice, PageHeading, Panel, useToast } from "@/components/ui";
import { Dashboard } from "@/components/workspace-dashboard";
import { DonorForm, ExperimentForm, ProcessingForm, SampleForm } from "@/components/workspace-forms";
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
  dashboard: "Overview", donors: "Donors", samples: "Samples", lineage: "Sample lineage",
  processing: "Processing", experiments: "Experiments", sequencing: "Sequencing results",
  storage: "Storage", audit: "Activity log", management: "User & roles", login: "Sign in",
};


export function Workspace() {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1] || "dashboard";
  const { data, role, setRole } = useDemoData();
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
          databaseRole === "Admin" ? "Administrator" : databaseRole;

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
  }, [section, router, setRole]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
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
          <span className="brand-mark"><Dna size={19} /></span>
          <span className="brand-copy">
            <span className="brand-name">GENOMIC BIOBANK</span>
            <span className="brand-caption">Sample lineage repository</span>
          </span>
        </Link>

        {Array.from(new Set(navItems.map((item) => item.group))).map(
          (group) => (
            <div key={group}>
              <div className="nav-caption">{group}</div>
              <nav className="nav-list" aria-label={`${group} navigation`}>
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
              Mixed database and demo data
              <br />
              Some modules use demo data
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
            <span className="badge info">PARTIAL DB INTEGRATION</span>

            <div className="avatar" aria-label={`${role} account`}>
              {role === "Administrator" ? "AD" : "RS"}
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
              onAdd={() => setModal(section)}
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
          donor={data.donors.find(
            (donor) => donor.id === editingDonorId
          )}
          close={() => setModal("")}
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



function LoginPage({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
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
        setError(data.error || "Login failed. Check your credentials.");
        return;
      }

      const databaseRole = data.user.role;
      const frontendRole =
        databaseRole === "Admin" ? "Administrator" : databaseRole;

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
            <span className="brand-caption" style={{ display: "block" }}>
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
            A research environment for tracking biobank specimens and
            exploring their research lineage.
          </p>
        </div>

        <div className="demo-note">
          <span className="demo-dot" />
          <span>All records and metrics are synthetic demonstration data.</span>
        </div>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="eyebrow">SECURE ACCOUNT ACCESS</div>
          <h2>Welcome back</h2>
          <p className="page-subtitle" style={{ marginBottom: 22 }}>
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
            style={{ width: "100%", marginTop: 18, height: 40 }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}


function EntryModal({ type, donor, close, done }: { type: string; donor?: import("@/lib/types").Donor; close: () => void; done: (message: string) => void }) {
  if (type === "donors" || type === "edit-donor") return <DonorForm initialDonor={donor} close={close} done={done} />;
  if (type === "samples") return <SampleForm close={close} done={done} />;
  if (type === "processing") return <ProcessingForm close={close} done={done} />;
  if (type === "experiments") return <ExperimentForm close={close} done={done} />;
  return null;
}

function ManagementPage({ role }: { role: UserRole }) {
  return <><PageHeading eyebrow="Administration" title="User & role management" subtitle="Demonstration of role-specific access. Enforcement is frontend-only." /><div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}><Panel title="Administrator" caption="Full access in this demo"><div className="detail-value">Manage records, view activity, and access this page</div><Badge tone={role === "Administrator" ? "success" : ""}>{role === "Administrator" ? "Active demo role" : "Available role"}</Badge></Panel><Panel title="Researcher" caption="Research operations access"><div className="detail-value">View research workspace and create demonstration records</div><Badge tone={role === "Researcher" ? "success" : ""}>{role === "Researcher" ? "Active demo role" : "Available role"}</Badge></Panel></div><div style={{ marginTop: 16 }}><Notice warning>These role restrictions exist only in the frontend. Production authorization must be enforced by the backend. No actual user accounts are stored.</Notice></div></>;
}