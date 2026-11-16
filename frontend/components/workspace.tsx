
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

import { Badge, Notice, PageHeading, Panel, useToast } from "@/components/ui";
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
import {
  SECTION_ACCESS,
  canView,
  canWrite,
  sectionLabel,
  type DbRole,
} from "@/lib/permissions";

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

function toDbRole(role: UserRole): DbRole {
  return role === "Administrator" ? "Admin" : role;
}

function isKnownSection(section: string): boolean {
  return section in SECTION_ACCESS;
}

function mapRole(databaseRole: string): UserRole {
  if (databaseRole === "Admin") return "Administrator";
  if (databaseRole === "Lab Technician") return "Lab Technician";
  return "Researcher";
}

export function Workspace() {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1] || "dashboard";

  const [role, setRole] = useState<UserRole>("Researcher");
  const [researcherId, setResearcherId] = useState<number | null>(null);
  const dbRole = toDbRole(role);
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

        const authenticatedRole = mapRole(result.user.role);
        setRole(authenticatedRole);
        setResearcherId(
          typeof result.user.researcherId === "number"
            ? result.user.researcherId
            : null
        );

        // Send users away from sections their role cannot open.
        if (
          isKnownSection(section) &&
          !canView(toDbRole(authenticatedRole), section)
        ) {
          router.replace("/dashboard");
          return;
        }

        setAuthChecked(true);
      } catch {
        router.replace("/login");
      }
    }

    void checkSession();

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
          router.refresh();
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
                      canView(dbRole, item.href.slice(1)),
                  )
                  .map(({ href, label: defaultLabel, icon: Icon }) => {
                    const label = sectionLabel(dbRole, href.slice(1), defaultLabel);
                    return (
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
                    );
                  })}
              </nav>
            </div>
          ),
        )}

        <div className="sidebar-foot">
          <div className="demo-note">
            <span className="demo-dot" />
            <span>
              PostgreSQL and MongoDB integration
              <br />
              Some modules are still being connected
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
            Repository&nbsp; / &nbsp;
            {sectionLabel(dbRole, section, titles[section] ?? "Overview")}
          </div>

          <div className="top-actions">
            <span className="badge info">DATABASE INTEGRATION</span>

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

          {isKnownSection(section) &&
            !canView(dbRole, section) &&
            section !== "management" && (
              <Notice warning>
                Your role does not have access to this section.
              </Notice>
            )}

          {![
            "dashboard",
            "lineage",
            "management",
            "login",
          ].includes(section) &&
            (!isKnownSection(section) || canView(dbRole, section)) && (
            <RecordsPage
              section={section as Parameters<typeof RecordsPage>[0]["section"]}
              title={sectionLabel(dbRole, section, "")}
              canAdd={canWrite(dbRole, section)}
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
          donorId={editingDonorId}
          ownResearcherId={dbRole === "Researcher" ? researcherId : undefined}
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
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
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

      onLogin(mapRole(data.user.role));
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
          <span>Sign in using your registered biobank account.</span>
        </div>
      </aside>

      <main className="login-main">
        {mode === "register" ? (
          <RegisterForm
            onCancel={() => setMode("login")}
            onRegistered={(message, registeredEmail) => {
              setMode("login");
              setEmail(registeredEmail);
              setPassword("");
              setError("");
              setNotice(message);
            }}
          />
        ) : (
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

          {notice && (
            <div style={{ marginTop: 13 }} role="status">
              <Notice>{notice}</Notice>
            </div>
          )}

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

          <p className="auth-switch">
            New to the biobank?{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setError("");
                setNotice("");
                setMode("register");
              }}
            >
              Create an account
            </button>
          </p>
        </form>
        )}
      </main>
    </div>
  );
}

const REQUESTABLE_ROLES = ["Researcher", "Lab Technician"] as const;

function RegisterForm({
  onCancel,
  onRegistered,
}: {
  onCancel: () => void;
  onRegistered: (message: string, email: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!role) {
      setError("Select the role you are requesting.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Registration failed.");
        return;
      }

      onRegistered(data.message, email.trim());
    } catch {
      setError("Unable to connect to the registration server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleRegister}>
      <div className="eyebrow">REQUEST ACCESS</div>
      <h2>Create an account</h2>
      <p className="page-subtitle" style={{ marginBottom: 22 }}>
        Choose the role you need. An administrator reviews every request
        before the account can sign in.
      </p>

      <div className="field-group">
        <label className="field-label" htmlFor="register-username">
          Username
        </label>
        <input
          id="register-username"
          className="field-input"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={100}
          pattern="[A-Za-z0-9._\-]+"
          title="Letters, numbers, dots, dashes and underscores"
          required
        />
      </div>

      <div className="field-group" style={{ marginTop: 13 }}>
        <label className="field-label" htmlFor="register-email">
          Email address
        </label>
        <input
          id="register-email"
          className="field-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={255}
          required
        />
      </div>

      <div className="field-group" style={{ marginTop: 13 }}>
        <label className="field-label" htmlFor="register-role">
          Requested role
        </label>
        <select
          id="register-role"
          className="field-select"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          required
        >
          <option value="" disabled>
            Select a role
          </option>
          {REQUESTABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group" style={{ marginTop: 13 }}>
        <label className="field-label" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          className="field-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={10}
          maxLength={256}
          placeholder="At least 10 characters"
          required
        />
      </div>

      <div className="field-group" style={{ marginTop: 13 }}>
        <label className="field-label" htmlFor="register-confirm">
          Confirm password
        </label>
        <input
          id="register-confirm"
          className="field-input"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={10}
          maxLength={256}
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
        {loading ? "Submitting..." : "Request account"}
      </button>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="link-button" onClick={onCancel}>
          Sign in
        </button>
      </p>
    </form>
  );
}

function EntryModal({
  type,
  donorId,
  ownResearcherId,
  close,
  done,
}: {
  type: string;
  donorId?: string;
  ownResearcherId?: number | null;
  close: () => void;
  done: (message: string) => void;
}) {
  if (type === "donors" || type === "edit-donor") {
    return (
      <DonorForm
        initialDonorId={donorId}
        close={close}
        done={done}
      />
    );
  }

  if (type === "samples") return <SampleForm close={close} done={done} />;

  if (type === "processing") {
    return <ProcessingForm close={close} done={done} />;
  }

  if (type === "experiments") {
    return (
      <ExperimentForm
        close={close}
        done={done}
        ownResearcherId={ownResearcherId}
      />
    );
  }

  return null;
}

function ManagementPage({ role }: { role: UserRole }) {
  type UserRecord = {
    user_id: number;
    username: string;
    email: string;
    researcher_id: number | null;
    is_active: boolean;
    approval_status: "pending" | "approved" | "rejected";
    created_at: string;
    role_name: string;
  };

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("Researcher");
  const [researcherId, setResearcherId] = useState("");

  async function loadUsers() {
    setLoading(true);

    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load users.");
      }

      // node-postgres returns BIGINT columns as strings; normalise ids to
      // numbers so they match the API's validation and compare correctly.
      setUsers(
        (data.users as UserRecord[]).map((user) => ({
          ...user,
          user_id: Number(user.user_id),
          researcher_id:
            user.researcher_id === null ? null : Number(user.researcher_id),
        }))
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // Load once on mount; loadUsers is re-invoked explicitly after changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setEmail("");
    setPassword("");
    setSelectedRole("Researcher");
    setResearcherId("");
  }

  function startEditing(user: UserRecord) {
    setEditingId(user.user_id);
    setUsername(user.username);
    setEmail(user.email);
    setPassword("");
    setSelectedRole(user.role_name);
    setResearcherId(
      user.researcher_id === null ? "" : String(user.researcher_id)
    );
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        role: selectedRole,
        researcher_id:
          selectedRole === "Researcher" && researcherId.trim()
            ? Number(researcherId)
            : null,
        ...(editingId !== null
          ? {
              user_id: editingId,
              ...(password ? { password } : {}),
            }
          : { password }),
      };

      const response = await fetch("/api/users", {
        method: editingId !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save user.");
      }

      setMessage(data.message || "User saved successfully.");
      resetForm();
      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function patchUser(body: Record<string, unknown>) {
    setMessage("");

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change account status.");
      }

      setMessage(data.message);
      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to change account status."
      );
    }
  }

  async function toggleStatus(user: UserRecord) {
    const action = user.is_active ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.username}?`)) {
      return;
    }

    await patchUser({
      action: "set-active",
      user_id: user.user_id,
      is_active: !user.is_active,
    });
  }

  // Role the admin will grant for each pending request (defaults to the
  // role the applicant asked for).
  const [grantRoles, setGrantRoles] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  async function reviewRegistration(
    user: UserRecord,
    action: "approve" | "reject"
  ) {
    setReviewingId(user.user_id);
    await patchUser(
      action === "approve"
        ? {
            action,
            user_id: user.user_id,
            role: grantRoles[user.user_id] ?? user.role_name,
          }
        : { action, user_id: user.user_id }
    );
    setReviewingId(null);
  }

  const pendingUsers = users.filter(
    (user) => user.approval_status === "pending"
  );
  const reviewedUsers = users.filter(
    (user) => user.approval_status !== "pending"
  );

  function statusBadge(user: UserRecord) {
    if (user.approval_status === "rejected") {
      return <Badge tone="danger">Rejected</Badge>;
    }
    return (
      <Badge tone={user.is_active ? "success" : ""}>
        {user.is_active ? "Active" : "Inactive"}
      </Badge>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border, #d1d5db)",
    borderRadius: 8,
    background: "var(--surface, white)",
    color: "inherit",
    font: "inherit",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid var(--border, #d1d5db)",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="User & role management"
        subtitle="Create accounts, manage permissions and control user access."
      />

      {message && (
        <div style={{ marginBottom: 16 }} role="status">
          <Notice>{message}</Notice>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <Panel
          title={`Pending registrations (${pendingUsers.length})`}
          caption="Self-registered accounts cannot sign in until you approve them. You can change the granted role before approving."
        >
          {loading ? (
            <p>Loading registration requests...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="detail-label">No registrations awaiting approval.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    {["Applicant", "Email", "Requested", "Grant role", "Submitted", "Decision"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "12px 10px",
                            borderBottom: "1px solid var(--border, #ddd)",
                            fontSize: 13,
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td style={{ padding: 10 }}>
                        <strong>{user.username}</strong>
                        <div className="detail-label">ID: {user.user_id}</div>
                      </td>
                      <td style={{ padding: 10 }}>{user.email}</td>
                      <td style={{ padding: 10 }}>
                        <Badge tone="warning">{user.role_name}</Badge>
                      </td>
                      <td style={{ padding: 10 }}>
                        <select
                          className="field-select"
                          aria-label={`Role to grant ${user.username}`}
                          value={grantRoles[user.user_id] ?? user.role_name}
                          onChange={(event) =>
                            setGrantRoles((current) => ({
                              ...current,
                              [user.user_id]: event.target.value,
                            }))
                          }
                        >
                          <option value="Researcher">Researcher</option>
                          <option value="Lab Technician">Lab Technician</option>
                        </select>
                      </td>
                      <td style={{ padding: 10 }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={reviewingId === user.user_id}
                            onClick={() => void reviewRegistration(user, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="button"
                            disabled={reviewingId === user.user_id}
                            onClick={() => {
                              if (window.confirm(`Reject the registration for ${user.username}?`)) {
                                void reviewRegistration(user, "reject");
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title={editingId !== null ? "Edit user account" : "Create user account"}
        caption="Manage application credentials and access permissions."
      >
        <form onSubmit={handleSubmit}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <label>
              <span className="detail-label">Username</span>
              <input
                style={fieldStyle}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={100}
                required
                placeholder="Enter username"
              />
            </label>

            <label>
              <span className="detail-label">Email address</span>
              <input
                style={fieldStyle}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="Enter email"
              />
            </label>

            <label>
              <span className="detail-label">Application role</span>
              <select
                style={fieldStyle}
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="Researcher">Researcher</option>
                <option value="Lab Technician">Lab Technician</option>
              </select>
            </label>

            {selectedRole === "Researcher" && (
              <label>
                <span className="detail-label">Researcher ID (optional)</span>
                <input
                  style={fieldStyle}
                  type="number"
                  min="1"
                  value={researcherId}
                  onChange={(event) => setResearcherId(event.target.value)}
                  placeholder="Enter researcher ID"
                />
              </label>
            )}

            <label style={{ gridColumn: "1 / -1" }}>
              <span className="detail-label">
                {editingId !== null
                  ? "New password (leave blank to keep current password)"
                  : "Initial password"}
              </span>
              <input
                style={fieldStyle}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={editingId === null}
                minLength={10}
                maxLength={256}
                autoComplete="new-password"
                placeholder={
                  editingId !== null
                    ? "Leave blank to keep current password"
                    : "At least 10 characters"
                }
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                background: "var(--primary, #2563eb)",
                color: "white",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : "Create account"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={buttonStyle}
              >
                Cancel editing
              </button>
            )}
          </div>
        </form>
      </Panel>


      <div style={{ marginTop: 24 }}>
        <Panel
          title="Registered users"
          caption="Accounts and their current access status."
        >
          {loading ? (
            <p>Loading user accounts...</p>
          ) : reviewedUsers.length === 0 ? (
            <p>No user accounts found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "User",
                      "Email",
                      "Role",
                      "Researcher ID",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "12px 10px",
                          borderBottom: "1px solid var(--border, #ddd)",
                          fontSize: 13,
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {reviewedUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td style={{ padding: 10 }}>
                        <strong>{user.username}</strong>
                        <div className="detail-label">
                          ID: {user.user_id}
                        </div>
                      </td>

                      <td style={{ padding: 10 }}>{user.email}</td>

                      <td style={{ padding: 10 }}>{user.role_name}</td>

                      <td style={{ padding: 10 }}>
                        {user.researcher_id ?? "—"}
                      </td>

                      <td style={{ padding: 10 }}>
                        {statusBadge(user)}
                      </td>

                      <td style={{ padding: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            style={buttonStyle}
                            onClick={() => startEditing(user)}
                          >
                            Edit
                          </button>

                          {user.approval_status === "approved" && (
                            <button
                              type="button"
                              style={buttonStyle}
                              onClick={() => void toggleStatus(user)}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Notice>
          Current signed-in role: {role}. Account management operations are
          restricted to administrators by the backend API.
        </Notice>
      </div>
    </>
  );
}
