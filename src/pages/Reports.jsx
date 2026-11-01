import { CheckCheck, Inbox, Clock3, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { VolumeChart, CategoryChart, COLORS } from "./Overview";
import { title } from "../lib/format";
export default function Reports({ workspace: w }) {
  const s = w.stats,
    rate = s.total
      ? Math.round(((s.statuses.resolved || 0) / s.total) * 100)
      : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE STORY BEHIND YOUR SUPPORT</span>
          <h1>
            Support insights<span className="heading-dot">.</span>
          </h1>
          <p>Real conversations. A clearer picture of your workload.</p>
        </div>
        <span className="period-label">Current workspace</span>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Resolution rate</span>
          <strong className="stat-value">{rate}%</strong>
          <small>Resolved tickets / all tickets</small>
        </div>
        <div className="stat-card">
          <span>Opened in 7 days</span>
          <strong className="stat-value">
            {s.weekly.reduce((n, d) => n + d.opened, 0)}
          </strong>
          <small>Tickets created during the period</small>
        </div>
        <div className="stat-card">
          <span>Resolved in 7 days</span>
          <strong className="stat-value">
            {s.weekly.reduce((n, d) => n + d.resolved, 0)}
          </strong>
          <small>Current resolution timestamps</small>
        </div>
        <div className="stat-card">
          <span>Urgent tickets</span>
          <strong className="stat-value">{s.priorities.urgent || 0}</strong>
          <small>Across all ticket statuses</small>
        </div>
      </div>
      <div className="report-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Support volume</h2>
              <p>Opened and resolved over the last seven days.</p>
            </div>
          </div>
          <div className="legend">
            <span>
              <i />
              Opened
            </span>
            <span>
              <i className="pale" />
              Resolved
            </span>
          </div>
          <VolumeChart data={s.weekly} height={280} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Category distribution</h2>
              <p>The topics behind the tickets.</p>
            </div>
          </div>
          <CategoryChart data={s.categories} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Priority distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={["low", "medium", "high", "urgent"].map((name) => ({
                name: title(name),
                count: s.priorities[name] || 0,
              }))}
              margin={{ left: -20, right: 20 }}
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                }}
              />
              <Bar
                dataKey="count"
                name="Tickets"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              >
                {COLORS.slice(0, 4).map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel status-panel">
          <div className="section-heading">
            <h2>Queue health</h2>
          </div>
          {Object.entries({
            open: "Open",
            in_progress: "In progress",
            waiting: "Waiting",
            resolved: "Resolved",
          }).map(([k, label]) => (
            <div className="status-progress" key={k}>
              <div>
                <span>{label}</span>
                <strong>{s.statuses[k] || 0}</strong>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${s.total ? ((s.statuses[k] || 0) / s.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <p className="muted">
            {s.overdue} active ticket{s.overdue === 1 ? "" : "s"} past the due
            date.
          </p>
        </section>
      </div>
    </>
  );
}
