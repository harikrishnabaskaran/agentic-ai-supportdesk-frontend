import { uuid } from "./lib/id";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Headset,
  LayoutDashboard,
  Inbox,
  Users,
  BookOpen,
  ChartNoAxesCombined,
  Sparkles,
  Activity as ActivityIcon,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Plus,
  Menu,
  X,
  Check,
  AlertCircle,
  Sun,
  Moon,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, isDemo } from "./lib/api";
import { initials, date } from "./lib/format";
import { Button, Skeleton, ErrorBox } from "./components/UI";
import TicketDialog from "./components/TicketDialog";
import Overview from "./pages/Overview";
import Tickets from "./pages/Tickets";
import Customers from "./pages/Customers";
import Knowledge from "./pages/Knowledge";
import Reports from "./pages/Reports";
import Agent from "./pages/Agent";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/tickets", "Ticket inbox", Inbox],
  ["/customers", "Customers", Users],
  ["/knowledge", "Knowledge base", BookOpen],
  ["/reports", "Reports & insights", ChartNoAxesCombined],
  ["/agent", "AI workspace", Sparkles],
  ["/activity", "Agent activity", ActivityIcon],
];
export default function App() {
  const [stats, setStats] = useState(null),
    [health, setHealth] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [bell, setBell] = useState(false),
    [ticket, setTicket] = useState(undefined),
    [toasts, setToasts] = useState([]),
    [theme, setTheme] = useState(
      () => localStorage.getItem("supportdesk-theme") || "light",
    ),
    [displayName, setDisplayName] = useState(
      () => localStorage.getItem("supportdesk-name") || "Hari Krishna",
    );
  const location = useLocation(),
    navigate = useNavigate(),
    searchRef = useRef(null),
    reloadId = useRef(0),
    healthAt = useRef(0),
    timers = useRef([]);
  const notify = useCallback((message, type = "success") => {
    const id = uuid();
    setToasts((s) => [...s.slice(-3), { id, message, type }]);
    timers.current.push(
      setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 4500),
    );
  }, []);
  const reload = useCallback(async (force = false) => {
    const n = ++reloadId.current;
    const includeHealth = force || Date.now() - healthAt.current > 30000;
    const values = await Promise.allSettled([
      api.stats(),
      includeHealth ? api.health() : Promise.resolve(null),
    ]);
    if (n !== reloadId.current) return;
    const [s, h] = values;
    if (s.status === "fulfilled") {
      setStats(s.value);
      setError("");
      setVersion((v) => v + 1);
    } else setError(s.reason.message);
    if (h.status === "fulfilled" && h.value) {
      setHealth(h.value);
      healthAt.current = Date.now();
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    reload();
    return () => {
      reloadId.current++;
      timers.current.forEach(clearTimeout);
    };
  }, [reload]);
  useEffect(() => {
    localStorage.setItem("supportdesk-name", displayName);
  }, [displayName]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    }
    apply();
    localStorage.setItem("supportdesk-theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    setMobile(false);
    setBell(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    function key(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setBell(false);
        setMobile(false);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const close = useCallback(() => setTicket(undefined), []);
  const workspace = {
    stats,
    health,
    version,
    reload,
    notify,
    openTicket: setTicket,
    theme,
    setTheme,
    displayName,
    setDisplayName,
  };
  const active = stats ? stats.total - (stats.statuses.resolved || 0) : 0;
  const pageName =
    nav.find(([path]) => path === location.pathname)?.[1] ||
    (location.pathname === "/settings" ? "Settings" : "Workspace");
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Headset size={22} />
          </span>
          <span>
            supportdesk<span className="brand-period">.</span>
          </span>
        </Link>
        <button
          className="workspace-switch"
          onClick={() => navigate("/settings")}
        >
          <span className="workspace-avatar">S</span>
          <span>
            <strong>Support workspace</strong>
            <small>Local team workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              end={path === "/"}
              key={path}
              to={path}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {path === "/tickets" && active > 0 && (
                <small className="nav-count">{active}</small>
              )}
              {path === "/agent" && <small className="nav-ai">AI</small>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div>
              <span className="tiny-orbit">
                <Sparkles size={18} />
              </span>
              <strong>
                Thoughtful support.
                <br />A little less effort.
              </strong>
            </div>
            <p>Your local agent is ready to lend a hand.</p>
            <Link to="/agent">
              Meet Orbit
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <NavLink className="settings-link" to="/settings">
            <SettingsIcon size={18} />
            <span>Settings</span>
          </NavLink>
          <div className="sidebar-profile">
            <span className="profile-avatar">{initials(displayName)}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Workspace operator</small>
            </span>
            <button
              className="icon-button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          {collapsed && (
            <button
              className="icon-button desktop-expand"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
            >
              <PanelLeftOpen size={19} />
            </button>
          )}
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{pageName}</strong>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/tickets?q=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={15} />
            <input
              ref={searchRef}
              aria-label="Search workspace"
              placeholder="Search your workspace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="topbar-actions">
            <span className="local-indicator">
              <i />
              Local workspace
            </span>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark",
                )
              }
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Show queue notifications"
                onClick={() => setBell(!bell)}
                aria-expanded={bell}
              >
                <Bell size={18} />
                {(stats?.overdue || 0) > 0 && <i />}
              </button>
              {bell && (
                <div className="notification-dropdown">
                  <h3>A little attention needed</h3>
                  <p>{stats?.overdue || 0} active tickets are overdue.</p>
                  <p>{active} tickets are currently active.</p>
                  <Link to="/tickets" onClick={() => setBell(false)}>
                    Open the support queue
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <button
              className="topbar-avatar"
              aria-label="Open preferences"
              onClick={() => navigate("/settings")}
            >
              {initials(displayName)}
            </button>
          </div>
        </header>
        {isDemo && (
          <div className="demo-banner">
            <ShieldCheck size={13} />
            <span>
              Preview workspace · Changes stay in this browser. Run the local
              backend to use the real Ollama agent.
            </span>
          </div>
        )}
        <main className="main-content">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="connection-error">
              <span className="empty-icon">
                <Headset size={30} />
              </span>
              <h1>Let’s connect your support desk.</h1>
              <ErrorBox message={error} />
              <p>
                Start MongoDB, then run the FastAPI backend. Ollama is needed
                for the agent workspace.
              </p>
              <code>
                python -m uvicorn main:app --host 127.0.0.1 --port 8000
              </code>
              <Button
                onClick={() => {
                  setLoading(true);
                  reload(true);
                }}
              >
                <RefreshCw size={16} />
                Try connecting again
              </Button>
            </div>
          ) : (
            stats && (
              <Routes>
                <Route path="/" element={<Overview workspace={workspace} />} />
                <Route
                  path="/tickets"
                  element={<Tickets workspace={workspace} />}
                />
                <Route
                  path="/customers"
                  element={<Customers workspace={workspace} />}
                />
                <Route
                  path="/knowledge"
                  element={<Knowledge workspace={workspace} />}
                />
                <Route
                  path="/reports"
                  element={<Reports workspace={workspace} />}
                />
                <Route
                  path="/agent"
                  element={<Agent workspace={workspace} />}
                />
                <Route
                  path="/activity"
                  element={<Activity workspace={workspace} />}
                />
                <Route
                  path="/settings"
                  element={<Settings workspace={workspace} />}
                />
                <Route
                  path="*"
                  element={
                    <div className="empty">
                      <h1>This page took a wrong turn.</h1>
                      <Link className="button" to="/">
                        Back to overview
                      </Link>
                    </div>
                  }
                />
              </Routes>
            )
          )}
          <footer className="workspace-footer">
            <span>Made for the people behind the conversations.</span>
            <span>
              <span className="dot" />
              Supportdesk · Local edition
            </span>
          </footer>
        </main>
      </div>
      {ticket !== undefined && (
        <TicketDialog
          ticket={ticket}
          onClose={close}
          onSaved={reload}
          notify={notify}
        />
      )}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.type === "error" ? (
              <AlertCircle size={17} />
            ) : (
              <Check size={17} />
            )}
            <span>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
