import { Link } from "react-router-dom";
import {
  Inbox,
  CheckCheck,
  Clock3,
  Users,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  BookOpen,
  Plus,
  CalendarDays,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge, Button, Empty, TicketTable } from "../components/UI";
import { title, date } from "../lib/format";
export const COLORS = [
  "#3c8d75",
  "#76b49b",
  "#b5d2c5",
  "#e7a761",
  "#e27c74",
  "#99a8d0",
];
export function VolumeChart({ data, height = 235 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 15, right: 12, left: -22, bottom: 0 }}
      >
        <defs>
          <linearGradient id="openedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#33866b" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#33866b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="4 4"
          stroke="var(--line)"
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "short",
            })
          }
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#87928c" }}
          dy={8}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#87928c" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--text)",
          }}
          labelFormatter={(v) => date(v)}
        />
        <Area
          name="Opened"
          type="monotone"
          dataKey="opened"
          stroke="#2d886a"
          strokeWidth={2.5}
          fill="url(#openedFill)"
        />
        <Area
          name="Resolved"
          type="monotone"
          dataKey="resolved"
          stroke="#a5bdaf"
          strokeDasharray="5 4"
          strokeWidth={2}
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function CategoryChart({ data }) {
  const values = Object.entries(data || {}).map(([name, value]) => ({
    name: title(name),
    value,
  }));
  return values.length ? (
    <div className="donut-layout">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={values}
            dataKey="value"
            innerRadius={55}
            outerRadius={77}
            paddingAngle={4}
            stroke="none"
          >
            {values.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              background: "var(--panel)",
              color: "var(--text)",
              border: "1px solid var(--line)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-key">
        {values.map((d, i) => (
          <div key={d.name}>
            <span>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              {d.name}
            </span>
            <strong>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty
      title="Your trends start here"
      text="Create a ticket to see its category distribution."
    />
  );
}
export default function Overview({ workspace: w }) {
  const s = w.stats,
    active = s.total - (s.statuses.resolved || 0),
    resolved = s.statuses.resolved || 0,
    rate = s.total ? Math.round((resolved / s.total) * 100) : 0;
  const cards = [
    {
      name: "Active tickets",
      value: active,
      note: "Across your support queue",
      Icon: Inbox,
      color: "green",
    },
    {
      name: "Resolved tickets",
      value: resolved,
      note: `${rate}% of all tickets`,
      Icon: CheckCheck,
      color: "blue",
    },
    {
      name: "Overdue tickets",
      value: s.overdue,
      note: "Open tickets past their due date",
      Icon: Clock3,
      color: "orange",
    },
    {
      name: "Customers",
      value: s.customers,
      note: "People behind the conversations",
      Icon: Users,
      color: "purple",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SUPPORT, AT A GLANCE</span>
          <h1>
            A little clarity. A better day<span className="heading-dot">.</span>
          </h1>
          <p>Good support starts with seeing the whole picture.</p>
        </div>
        <Button onClick={() => w.openTicket(null)}>
          <Plus size={17} />
          Create ticket
        </Button>
      </div>
      <div className="stats-grid">
        {cards.map(({ name, value, note, Icon, color }) => (
          <div className="stat-card" key={name}>
            <div className="stat-top">
              <span>{name}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={18} />
              </span>
            </div>
            <strong className="stat-value">{value.toLocaleString()}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel volume-panel">
          <div className="section-heading">
            <div>
              <h2>Ticket activity</h2>
              <p>Every conversation is a chance to help.</p>
            </div>
            <span className="period-label">
              <CalendarDays size={14} />
              Last 7 days
            </span>
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
          <VolumeChart data={s.weekly} />
        </section>
        <section className="panel category-panel">
          <div className="section-heading">
            <div>
              <h2>Topics in your inbox</h2>
              <p>What your customers are asking about.</p>
            </div>
          </div>
          <CategoryChart data={s.categories} />
        </section>
        <section className="panel recent-panel">
          <div className="section-heading">
            <div>
              <h2>Recent conversations</h2>
              <p>A small next step can make someone’s day.</p>
            </div>
            <Link className="text-link" to="/tickets">
              View all tickets
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {s.recent.length ? (
            <TicketTable items={s.recent} onOpen={w.openTicket} compact />
          ) : (
            <Empty
              action={
                <Button onClick={() => w.openTicket(null)}>
                  Create your first ticket
                </Button>
              }
            />
          )}
        </section>
        <section className="orbit-card">
          <div className="orbit-orb">
            <Sparkles size={26} />
            <span />
            <i />
          </div>
          <Badge type="orbit">YOUR LOCAL SUPPORT PARTNER</Badge>
          <h2>
            A second pair
            <br />
            of thoughtful eyes.
          </h2>
          <p>
            Let Orbit organize your queue, categorize issues and help you write
            the next reply.
          </p>
          <Link className="button" to="/agent">
            Open AI workspace
            <ArrowUpRight size={16} />
          </Link>
          <small>
            <span
              className={w.health?.model?.connected ? "dot" : "dot offline"}
            />
            {w.health?.model?.connected
              ? "Ollama is connected"
              : "Connect Ollama to get started"}
          </small>
        </section>
        <section className="panel getting-started">
          <div className="section-heading">
            <h2>A workspace that works with you</h2>
            <span className="muted">One good step at a time.</span>
          </div>
          <div className="quick-links">
            <Link to="/tickets">
              <span className="quick-icon">
                <Inbox size={21} />
              </span>
              <div>
                <strong>Make room for the next conversation</strong>
                <small>Organize your support queue</small>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/knowledge">
              <span className="quick-icon sand">
                <BookOpen size={21} />
              </span>
              <div>
                <strong>Keep good answers close</strong>
                <small>{s.articles} published knowledge articles</small>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/activity">
              <span className="quick-icon lilac">
                <Activity size={21} />
              </span>
              <div>
                <strong>See what Orbit has been doing</strong>
                <small>Follow every agent action</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
