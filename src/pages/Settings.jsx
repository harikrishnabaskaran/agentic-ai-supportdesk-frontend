import { useState } from "react";
import {
  Database,
  Monitor,
  Moon,
  Sun,
  Check,
  RefreshCw,
  Copy,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button, Badge } from "../components/UI";
import { isDemo } from "../lib/api";
export default function Settings({ workspace: w }) {
  const [name, setName] = useState(w.displayName),
    [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    await w.reload(true);
    setBusy(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE A LITTLE ROOM FOR YOURSELF</span>
          <h1>
            Your workspace<span className="heading-dot">.</span>
          </h1>
          <p>Simple preferences for a calmer support day.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Personal preferences</h2>
          <p>Your display name is saved on this browser.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              w.setDisplayName(name.trim() || "Support team");
              w.notify("Preferences saved.");
            }}
          >
            <label>
              Display name
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>Appearance</label>
            <div className="theme-options">
              {[
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Monitor],
              ].map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  className={w.theme === value ? "active" : ""}
                  onClick={() => w.setTheme(value)}
                >
                  <Icon size={21} />
                  {label}
                  {w.theme === value && <Check size={14} />}
                </button>
              ))}
            </div>
            <Button type="submit">Save preferences</Button>
          </form>
        </section>
        <section className="panel settings-panel">
          <div className="section-heading">
            <h2>Workspace connections</h2>
            <button
              className="icon-button"
              aria-label="Refresh connections"
              onClick={check}
              disabled={busy}
            >
              <RefreshCw className={busy ? "spin" : ""} size={17} />
            </button>
          </div>
          <div className="connection-row">
            <span className="stat-icon green">
              <Database size={18} />
            </span>
            <div>
              <strong>MongoDB</strong>
              <small>
                {isDemo ? "Browser preview data" : "Local support records"}
              </small>
            </div>
            <Badge type={isDemo ? "waiting" : "connected"}>
              {isDemo ? "Preview" : "Connected"}
            </Badge>
          </div>
          <div className="connection-row">
            <span className="stat-icon purple">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>Ollama</strong>
              <small>{w.health?.model?.name || "qwen3.5:4b"}</small>
            </div>
            <Badge type={w.health?.model?.connected ? "connected" : "waiting"}>
              {w.health?.model?.connected ? "Connected" : "Offline"}
            </Badge>
          </div>
          <div className="connection-details">
            <span>
              Native tool support
              <strong>
                {w.health?.model?.supports_tools ? "Available" : "Not detected"}
              </strong>
            </span>
            <span>
              Agents<strong>1 · Orbit</strong>
            </span>
            <span>
              Model response timeout
              <strong>{w.health?.ollama_timeout || 300} seconds</strong>
            </span>
            <span>
              Workspace timezone
              <strong>{w.health?.timezone || "Europe/Berlin"}</strong>
            </span>
          </div>
          <p className="muted">
            Manual ticket and article management remains available when Ollama
            is offline.
          </p>
        </section>
        <section className="panel settings-panel full">
          <div className="privacy-note">
            <ShieldCheck size={24} />
            <div>
              <h2>Your support workspace, on your device.</h2>
              <p>
                This version is designed for one operator running locally.
                Ticket data stays in your configured MongoDB database and AI
                requests go to your local Ollama instance. Customer email
                addresses identify records; they are not login accounts.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
