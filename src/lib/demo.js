import { uuid } from "./id";
import sample from "../data/sample.json";
const KEY = "supportdesk-preview-v1";
const now = () => new Date().toISOString();
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
const id = () => uuid().replaceAll("-", "").slice(0, 24);
function initial() {
  return {
    tickets: sample.tickets.map((t, i) => ({
      ...t,
      id: String(i + 1).padStart(24, "0"),
      number: `SD-${1001 + i}`,
      due_date: t.due_offset === null ? null : day(t.due_offset),
      created_at: new Date(
        Date.now() - t.created_offset * 86400000,
      ).toISOString(),
      updated_at: now(),
      resolved_at:
        t.status === "resolved"
          ? new Date(
              Date.now() - (t.resolved_offset || 0) * 86400000,
            ).toISOString()
          : null,
      messages: [],
      revision: 1,
      resolution: t.resolution || "",
    })),
    articles: sample.articles.map((a, i) => ({
      ...a,
      id: String(i + 30).padStart(24, "0"),
      created_at: now(),
      updated_at: now(),
      revision: 1,
    })),
  };
}
let state;
try {
  state = JSON.parse(localStorage.getItem(KEY)) || initial();
} catch {
  state = initial();
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
const call =
  (fn) =>
  async (...args) => {
    await new Promise((r) => setTimeout(r, 120));
    const result = fn(...args);
    save();
    return structuredClone(result);
  };
function filtered(params = {}) {
  return state.tickets
    .filter((t) =>
      ["status", "priority", "category"].every(
        (k) => !params[k] || t[k] === params[k],
      ),
    )
    .filter(
      (t) =>
        !params.query ||
        [
          t.title,
          t.description,
          t.number,
          t.customer_name,
          t.customer_email,
          t.resolution,
        ]
          .join(" ")
          .toLowerCase()
          .includes(params.query.toLowerCase()),
    )
    .sort((a, b) =>
      params.sort === "priority"
        ? ["low", "medium", "high", "urgent"].indexOf(b.priority) -
          ["low", "medium", "high", "urgent"].indexOf(a.priority)
        : params.sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
    );
}
function page(items, p = {}) {
  const n = Number(p.page || 1),
    limit = Number(p.limit || 20);
  return {
    items: items.slice((n - 1) * limit, n * limit),
    total: items.length,
    has_more: n * limit < items.length,
    page: n,
    limit,
  };
}
function get(ticketId) {
  const t = state.tickets.find((t) => t.id === ticketId);
  if (!t) throw new Error("Ticket not found.");
  return t;
}
function stats() {
  const statuses = {},
    priorities = {},
    categories = {};
  for (const t of state.tickets) {
    statuses[t.status] = (statuses[t.status] || 0) + 1;
    priorities[t.priority] = (priorities[t.priority] || 0) + 1;
    categories[t.category] = (categories[t.category] || 0) + 1;
  }
  return {
    total: state.tickets.length,
    statuses,
    priorities,
    categories,
    customers: new Set(state.tickets.map((t) => t.customer_email)).size,
    articles: state.articles.filter((a) => a.published).length,
    overdue: state.tickets.filter(
      (t) => t.status !== "resolved" && t.due_date && t.due_date < day(0),
    ).length,
    today: day(0),
    recent: [...state.tickets]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6),
    weekly: Array.from({ length: 7 }, (_, i) => {
      const date = day(i - 6);
      return {
        date,
        opened: state.tickets.filter((t) => t.created_at.slice(0, 10) === date)
          .length,
        resolved: state.tickets.filter(
          (t) => t.resolved_at?.slice(0, 10) === date,
        ).length,
      };
    }),
  };
}
export const demoApi = {
  tickets: call((p) => page(filtered(p), p)),
  ticket: call(get),
  stats: call(stats),
  create: call((data) => {
    const t = {
      ...data,
      id: id(),
      number: `SD-${Math.max(1000, ...state.tickets.map((t) => Number(t.number.slice(3)))) + 1}`,
      created_at: now(),
      updated_at: now(),
      revision: 1,
      messages: [],
      resolved_at: data.status === "resolved" ? now() : null,
    };
    state.tickets.unshift(t);
    return t;
  }),
  update: call((ticketId, data) => {
    const t = get(ticketId);
    Object.assign(t, data, { updated_at: now(), revision: t.revision + 1 });
    if (data.status) t.resolved_at = data.status === "resolved" ? now() : null;
    return t;
  }),
  remove: call((ticketId) => {
    get(ticketId);
    state.tickets = state.tickets.filter((t) => t.id !== ticketId);
    return { deleted: true };
  }),
  message: call((ticketId, data) => {
    const t = get(ticketId),
      existing = t.messages.find((m) => m.id === data.request_id);
    if (existing) return existing;
    const m = {
      id: data.request_id,
      body: data.body,
      kind: data.kind,
      author: "Support team",
      created_at: now(),
    };
    t.messages.push(m);
    t.updated_at = now();
    return m;
  }),
  customers: call((p = {}) => {
    const emails = [...new Set(state.tickets.map((t) => t.customer_email))];
    return page(
      emails
        .map((email) => {
          const ts = state.tickets.filter((t) => t.customer_email === email);
          return {
            id: email,
            name: ts[0].customer_name,
            email,
            tickets: ts.length,
            open_tickets: ts.filter((t) => t.status !== "resolved").length,
            created_at: ts[0].created_at,
          };
        })
        .filter(
          (c) =>
            !p.query ||
            `${c.name} ${c.email}`
              .toLowerCase()
              .includes(p.query.toLowerCase()),
        ),
      { ...p, limit: p.limit || 30 },
    );
  }),
  articles: call((p = {}) =>
    page(
      state.articles.filter(
        (a) =>
          (!p.category || a.category === p.category) &&
          (!p.query ||
            `${a.title} ${a.content}`
              .toLowerCase()
              .includes(p.query.toLowerCase())),
      ),
      { ...p, limit: p.limit || 30 },
    ),
  ),
  article: call((articleId) => state.articles.find((a) => a.id === articleId)),
  createArticle: call((data) => {
    const a = {
      ...data,
      id: id(),
      revision: 1,
      created_at: now(),
      updated_at: now(),
    };
    state.articles.unshift(a);
    return a;
  }),
  updateArticle: call((articleId, data) => {
    const a = state.articles.find((a) => a.id === articleId);
    if (!a) throw new Error("Article not found.");
    Object.assign(a, data, { revision: a.revision + 1, updated_at: now() });
    return a;
  }),
  removeArticle: call((articleId) => {
    state.articles = state.articles.filter((a) => a.id !== articleId);
    return { deleted: true };
  }),
  health: call(() => ({
    database: "preview",
    model: { connected: false, name: "qwen3.5:4b", supports_tools: false },
    agent_count: 1,
    rag_enabled: false,
    timezone: "Europe/Berlin",
    ollama_timeout: 300,
    turn_timeout: 480,
  })),
  activity: call(() => ({ items: [], total: 0, has_more: false })),
  conversations: call(() => ({ items: [] })),
  conversation: call(() => ({ messages: [], pending_actions: [] })),
  newConversation: async () => {
    throw new Error("Connect the local backend to start a conversation.");
  },
  chat: async () => {
    throw new Error(
      "Connect your local backend to use the Ollama agent. Preview mode contains no simulated AI.",
    );
  },
  confirm: async () => {
    throw new Error("Connect your local backend to approve agent actions.");
  },
};
