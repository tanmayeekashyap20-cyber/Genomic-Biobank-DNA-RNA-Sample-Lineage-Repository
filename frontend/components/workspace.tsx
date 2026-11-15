"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Boxes, ClipboardList, Dna, FlaskConical, GitBranch, LayoutDashboard, Menu, Microscope, ShieldCheck, Users, X } from "lucide-react";
import { Badge, Notice, PageHeading, Panel, useToast } from "@/components/ui";
import { Dashboard } from "@/components/workspace-dashboard";
import {
  DonorForm,
  ExperimentForm,
  ProcessingForm,
  SampleForm,
  SequencingResultForm,
  StorageAssignmentForm,
  StorageUnitForm,
} from "@/components/workspace-forms";
import { LineageExplorer } from "@/components/workspace-lineage";
import { RecordsPage } from "@/components/workspace-records";
import type {
  DatabaseDonor,
  DatabaseExperiment,
  DatabaseExperimentSample,
  DatabaseProcess,
  DatabaseSample,
  DatabaseSampleProcess,
  DatabaseSequencingResult,
  DatabaseStorageUnit,
  UserRole,
} from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { href: "/donors", label: "Donors", icon: Users, group: "Workspace" },
  { href: "/samples", label: "Samples", icon: Dna, group: "Workspace" },
  { href: "/lineage", label: "Lineage explorer", icon: GitBranch, group: "Workspace" },
  { href: "/processing", label: "Processing", icon: FlaskConical, group: "Research" },
  { href: "/experiments", label: "Experiments", icon: Microscope, group: "Research" },
  { href: "/sequencing", label: "Sequencing results", icon: Activity, group: "Research" },
  { href: "/storage", label: "Storage", icon: Boxes, group: "Operations" },
  { href: "/audit", label: "Activity log", icon: ClipboardList, group: "Operations", admin: true },
  { href: "/management", label: "Role permissions", icon: ShieldCheck, group: "Administration", admin: true },
];

const titles: Record<string, string> = {
  dashboard: "Overview", donors: "Donors", samples: "Samples", lineage: "Sample lineage",
  processing: "Processing", experiments: "Experiments", sequencing: "Sequencing results",
  storage: "Storage", audit: "Activity log", management: "Role permissions", login: "Sign in",
};

function toFrontendRole(role: unknown): UserRole | null {
  if (role === "Admin") return "Administrator";
  if (role === "Researcher" || role === "Lab Technician") return role;
  return null;
}


export function Workspace() {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1] || "dashboard";
  const [role, setRole] = useState<UserRole | null>(null);
  const [modal, setModal] = useState("");
  const [editingDonor, setEditingDonor] = useState<DatabaseDonor>();
  const [editingSample, setEditingSample] = useState<DatabaseSample>();
  const [editingProcess, setEditingProcess] = useState<DatabaseProcess>();
  const [editingProcessLinks, setEditingProcessLinks] = useState<DatabaseSampleProcess[]>([]);
  const [editingExperiment, setEditingExperiment] = useState<DatabaseExperiment>();
  const [editingExperimentLinks, setEditingExperimentLinks] = useState<DatabaseExperimentSample[]>([]);
  const [editingStorageUnit, setEditingStorageUnit] = useState<DatabaseStorageUnit>();
  const [editingSequencingResult, setEditingSequencingResult] = useState<DatabaseSequencingResult>();
  const [donorRefreshKey, setDonorRefreshKey] = useState(0);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const { show, Toast } = useToast();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (section === "login") {
        setAuthChecked(false);
        try {
          const response = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
          });
          if (response.status === 401) {
            if (active) setAuthChecked(true);
            return;
          }
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || `Session check failed (HTTP ${response.status}).`);
          }
          const frontendRole = toFrontendRole(result.user?.role);
          if (!frontendRole) {
            throw new Error("The server returned an unsupported account role.");
          }
          if (!active) return;
          setRole(frontendRole);
          router.replace("/dashboard");
        } catch (error) {
          if (active) {
            setAuthError(error instanceof Error ? error.message : "Unable to verify the current session.");
            setAuthChecked(true);
          }
        }
        return;
      }

      setAuthChecked(false);
      setAuthError("");

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `Session check failed (HTTP ${response.status}).`);
        }

        if (!active) return;

        const frontendRole = toFrontendRole(result.user?.role);
        if (!frontendRole) {
          throw new Error("The server returned an unsupported account role.");
        }

        setRole(frontendRole);
        setAuthChecked(true);
      } catch (error) {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "Unable to verify the current session.");
        setAuthChecked(true);
      }
    }

    void checkSession();
    const sessionTimer = section === "login"
      ? undefined
      : window.setInterval(async () => {
          try {
            const response = await fetch("/api/auth/me", {
              credentials: "include",
              cache: "no-store",
            });
            if (response.status === 401) {
              router.replace("/login");
            } else if (!response.ok) {
              show(`Session check failed (HTTP ${response.status}).`);
            } else {
              const result = await response.json();
              const currentRole = toFrontendRole(result.user?.role);
              if (!currentRole) {
                router.replace("/login");
              } else {
                setRole(currentRole);
              }
            }
          } catch (error) {
            show(error instanceof Error ? error.message : "Session revalidation failed.");
          }
        }, 60_000);

    return () => {
      active = false;
      if (sessionTimer !== undefined) window.clearInterval(sessionTimer);
    };
  }, [section, router, setRole, show]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "The server could not end this session.");
      }
      router.replace("/login");
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  if (section === "login") {
    if (!authChecked) {
      return <div className="login-page" role="status">Checking for an active session...</div>;
    }
    return (
      <LoginPage
        sessionError={authError}
        onLogin={(selectedRole) => {
          setRole(selectedRole);
          router.push("/dashboard");
          router.refresh();
        }}
      />
    );
  }

  if (!authChecked) {
    return <div className="login-page">Verifying your session...</div>;
  }

  if (authError) {
    return (
      <div className="login-page">
        <Panel title="Unable to verify your session">
          <Notice warning>{authError}</Notice>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Retry</button>
            <Link className="button" href="/login">Go to sign in</Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (role === "Lab Technician") {
    return (
      <div className="login-page">
        <Panel title="Workspace access unavailable">
          <Notice warning>
            You are signed in as a Lab Technician. The current record and dashboard APIs authorize Admin and Researcher roles only, so no workspace data or write actions are available for this account.
          </Notice>
          <button type="button" className="button button-primary" onClick={handleLogout}>
            Sign out
          </button>
        </Panel>
      </div>
    );
  }

  if (section === "management" && role !== "Administrator") {
    return (
      <div className="login-page">
        <Panel title="Permission required">
          <Notice warning>
            Role permissions are available to Administrators only. Your Researcher account can use the authorized record and research modules.
          </Notice>
          <Link className="button button-primary" href="/dashboard">Return to overview</Link>
        </Panel>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside id="workspace-navigation" className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
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
              PostgreSQL record APIs
              <br />
              MongoDB lineage events
            </span>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <div className="crumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              aria-controls="workspace-navigation"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            Repository&nbsp; / &nbsp;{titles[section] ?? "Overview"}
          </div>

          <div className="top-actions">
            <span className="badge info">DATABASE INTEGRATION</span>
            <span className="badge">{role}</span>

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
              onAdd={() => setModal(section === "storage" ? "storage-unit" : section)}
              onAssignStorage={() => setModal("storage")}
              donorRefreshKey={donorRefreshKey}
              recordsRefreshKey={recordsRefreshKey}
              canWriteRecords={role === "Administrator" || role === "Researcher"}
              canDeleteDonor={role === "Administrator"}
              canDeleteSample={role === "Administrator"}
              canDeleteResearchRecords={role === "Administrator"}
              canDeleteStorageUnit={role === "Administrator"}
              canDeleteSequencingResult={role === "Administrator"}
              onRelatedRecordChanged={(message) => {
                setRecordsRefreshKey((current) => current + 1);
                show(message);
              }}
              onDonorDeleted={() => {
                setDonorRefreshKey((current) => current + 1);
                show("Donor deleted successfully.");
              }}
              onEditSample={(sample) => {
                setEditingSample(sample);
                setModal("edit-sample");
              }}
              onEditProcess={(process, links) => {
                setEditingProcess(process);
                setEditingProcessLinks(links);
                setModal("edit-processing");
              }}
              onEditExperiment={(experiment, links) => {
                setEditingExperiment(experiment);
                setEditingExperimentLinks(links);
                setModal("edit-experiment");
              }}
              onEditStorageUnit={(storageUnit) => {
                setEditingStorageUnit(storageUnit);
                setModal("edit-storage-unit");
              }}
              onEditSequencingResult={(result) => {
                setEditingSequencingResult(result);
                setModal("edit-sequencing");
              }}
              onSampleDeleted={() => {
                setRecordsRefreshKey((current) => current + 1);
                show("Sample deleted successfully.");
              }}
              onEditDonor={(donor) => {
                setEditingDonor(donor);
                setModal("edit-donor");
              }}
            />
          )}
        </main>
      </div>

      {modal && (
        <EntryModal
          type={modal}
          donor={editingDonor}
          sample={editingSample}
          process={editingProcess}
          processLinks={editingProcessLinks}
          experiment={editingExperiment}
          experimentLinks={editingExperimentLinks}
          storageUnit={editingStorageUnit}
          sequencingResult={editingSequencingResult}
          close={() => {
            setModal("");
            setEditingDonor(undefined);
            setEditingSample(undefined);
            setEditingProcess(undefined);
            setEditingProcessLinks([]);
            setEditingExperiment(undefined);
            setEditingExperimentLinks([]);
            setEditingStorageUnit(undefined);
            setEditingSequencingResult(undefined);
          }}
          done={(message) => {
            if (modal === "donors" || modal === "edit-donor") {
              setDonorRefreshKey((current) => current + 1);
            }
            setRecordsRefreshKey((current) => current + 1);
            setModal("");
            setEditingDonor(undefined);
            setEditingSample(undefined);
            setEditingProcess(undefined);
            setEditingProcessLinks([]);
            setEditingExperiment(undefined);
            setEditingExperimentLinks([]);
            setEditingStorageUnit(undefined);
            setEditingSequencingResult(undefined);
            show(message);
          }}
        />
      )}

      <Toast />
    </div>
  );
}



function LoginPage({ onLogin, sessionError }: { onLogin: (role: UserRole) => void; sessionError: string }) {
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

      const frontendRole = toFrontendRole(data.user?.role);
      if (!frontendRole) {
        setError("The server returned an unsupported account role.");
        return;
      }
      onLogin(frontendRole);
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
          <span>Use an authorized account and follow institutional data-handling requirements.</span>
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
          {sessionError && (
            <Notice warning>{sessionError} You may still attempt to sign in.</Notice>
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


function EntryModal({
  type,
  donor,
  sample,
  process,
  processLinks,
  experiment,
  experimentLinks,
  storageUnit,
  sequencingResult,
  close,
  done,
}: {
  type: string;
  donor?: DatabaseDonor;
  sample?: DatabaseSample;
  process?: DatabaseProcess;
  processLinks: DatabaseSampleProcess[];
  experiment?: DatabaseExperiment;
  experimentLinks: DatabaseExperimentSample[];
  storageUnit?: DatabaseStorageUnit;
  sequencingResult?: DatabaseSequencingResult;
  close: () => void;
  done: (message: string) => void;
}) {
  if (type === "donors" || type === "edit-donor") return <DonorForm initialDonor={donor} close={close} done={done} />;
  if (type === "samples" || type === "edit-sample") return <SampleForm initialSample={sample} close={close} done={done} />;
  if (type === "processing" || type === "edit-processing") return <ProcessingForm initialProcess={process} sampleProcesses={processLinks} close={close} done={done} />;
  if (type === "experiments" || type === "edit-experiment") return <ExperimentForm initialExperiment={experiment} experimentSamples={experimentLinks} close={close} done={done} />;
  if (type === "storage") return <StorageAssignmentForm close={close} done={done} />;
  if (type === "storage-unit" || type === "edit-storage-unit") return <StorageUnitForm initialStorageUnit={storageUnit} close={close} done={done} />;
  if (type === "sequencing" || type === "edit-sequencing") return <SequencingResultForm initialResult={sequencingResult} close={close} done={done} />;
  return null;
}

function ManagementPage({ role }: { role: UserRole }) {
  return (
    <>
      <PageHeading eyebrow="Administration" title="Role permissions" subtitle="API-backed role enforcement for the current authenticated account." />
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
        <Panel title="Administrator" caption="Admin API role">
          <div className="detail-value">Access to authorized record APIs, Admin-only deletion actions, and this role information page.</div>
          <Badge tone={role === "Administrator" ? "success" : ""}>{role === "Administrator" ? "Current role" : "API role"}</Badge>
        </Panel>
        <Panel title="Researcher" caption="Research API role">
          <div className="detail-value">Access to authorized record APIs and record creation/update. Admin-only deletions remain unavailable.</div>
          <Badge tone={role === "Researcher" ? "success" : ""}>{role === "Researcher" ? "Current role" : "API role"}</Badge>
        </Panel>
      </div>
      <div style={{ marginTop: 16 }}>
        <Notice warning>
          The backend does not currently expose account or role-management routes. The API remains authoritative for every operation.
        </Notice>
      </div>
    </>
  );
}