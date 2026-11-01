import { uuid } from "../lib/id";
import { useState, useCallback } from "react";
import {
  Sparkles,
  Trash2,
  MessageSquare,
  FileText,
  Save,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import useResource from "../lib/useResource";
import { categories, priorities, statuses, title, time } from "../lib/format";
import { Modal, Button, Badge, ErrorBox, Skeleton } from "./UI";
export default function TicketDialog({ ticket, onClose, onSaved, notify }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useResource(
    () => (ticket ? api.ticket(ticket.id) : Promise.resolve(null)),
    [ticket?.id, version],
  );
  if (ticket && loading && !data)
    return (
      <Modal title="Opening ticket" onClose={onClose}>
        <Skeleton />
      </Modal>
    );
  if (error)
    return (
      <Modal title="Ticket unavailable" onClose={onClose}>
        <ErrorBox message={error} />
      </Modal>
    );
  return (
    <Modal
      wide
      title={ticket ? data?.number || "Ticket" : "Create a new ticket"}
      subtitle={
        ticket
          ? "A little context makes a big difference."
          : "Start a conversation. We’ll help you keep it moving."
      }
      onClose={onClose}
    >
      <TicketForm
        key={data?.revision || "new"}
        ticket={data}
        onClose={onClose}
        notify={notify}
        onSaved={onSaved}
        onRefresh={() => setVersion((x) => x + 1)}
        onAgent={() => {
          navigate(`/agent?ticket=${ticket.id}`);
          onClose();
        }}
      />
    </Modal>
  );
}
function TicketForm({ ticket, onClose, onSaved, notify, onRefresh, onAgent }) {
  const [form, setForm] = useState(
    ticket
      ? Object.fromEntries(
          [
            "title",
            "description",
            "customer_name",
            "customer_email",
            "priority",
            "status",
            "category",
            "assignee",
            "due_date",
            "resolution",
          ].map((k) => [k, ticket[k] ?? ""]),
        )
      : {
          title: "",
          description: "",
          customer_name: "",
          customer_email: "",
          priority: "medium",
          status: "open",
          category: "general",
          assignee: "Unassigned",
          due_date: "",
          resolution: "",
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [kind, setKind] = useState("draft"),
    [deleting, setDeleting] = useState(false),
    [messageId, setMessageId] = useState(() => uuid());
  const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let body = { ...form, due_date: form.due_date || null };
      if (ticket) {
        delete body.customer_name;
        delete body.customer_email;
        await api.update(ticket.id, body);
      } else await api.create(body);
      await onSaved();
      notify(ticket ? "Ticket updated." : "Ticket created. You’re on it.");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function add(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.message(ticket.id, {
        body: message.trim(),
        kind,
        request_id: messageId,
      });
      setMessage("");
      setMessageId(uuid());
      notify(kind === "draft" ? "Reply draft saved." : "Internal note added.");
      await onSaved();
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api.remove(ticket.id);
      await onSaved();
      notify("Ticket deleted.");
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="ticket-dialog">
      <ErrorBox message={error} />
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="full">
            Subject
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What does the customer need help with?"
            />
          </label>
          <label>
            Customer name
            <input
              required
              maxLength={100}
              disabled={!!ticket}
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder="Alex Taylor"
            />
          </label>
          <label>
            Customer email
            <input
              type="email"
              required
              maxLength={254}
              disabled={!!ticket}
              value={form.customer_email}
              onChange={(e) => set("customer_email", e.target.value)}
              placeholder="alex@example.com"
            />
          </label>
          <label className="full">
            Customer’s message
            <textarea
              required
              rows={4}
              maxLength={10000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Include the details that will help your team investigate…"
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {title(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((p) => (
                <option key={p} value={p}>
                  {title(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assigned to
            <input
              required
              maxLength={100}
              value={form.assignee}
              onChange={(e) => set("assignee", e.target.value)}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </label>
          {ticket && (
            <label className="full">
              Resolution notes
              <textarea
                rows={2}
                maxLength={5000}
                value={form.resolution}
                onChange={(e) => set("resolution", e.target.value)}
                placeholder="What fixed the issue?"
              />
            </label>
          )}
        </div>
        <div className="form-actions">
          {ticket && (
            <button
              type="button"
              className="text-button danger"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={15} />
              Delete ticket
            </button>
          )}
          <span className="spacer" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit">
            <Save size={15} />
            {ticket ? "Save changes" : "Create ticket"}
          </Button>
        </div>
      </form>
      {ticket && (
        <section className="conversation">
          <div className="section-heading">
            <h3>
              <MessageSquare size={17} />
              Conversation & notes
            </h3>
            <Button variant="secondary small" onClick={onAgent}>
              <Sparkles size={15} />
              Ask Orbit
            </Button>
          </div>
          {ticket.messages?.length ? (
            ticket.messages.map((m) => (
              <div className={`message-record ${m.kind}`} key={m.id}>
                <div>
                  <strong>
                    {m.kind === "draft" ? "Reply draft" : "Internal note"}
                  </strong>
                  <small>{time(m.created_at)}</small>
                </div>
                <p>{m.body}</p>
              </div>
            ))
          ) : (
            <p className="muted">
              No replies or notes yet. Add a thoughtful next step.
            </p>
          )}
          <form onSubmit={add}>
            <div className="composer-tabs">
              <button
                type="button"
                className={kind === "draft" ? "active" : ""}
                onClick={() => setKind("draft")}
              >
                Reply draft
              </button>
              <button
                type="button"
                className={kind === "internal_note" ? "active" : ""}
                onClick={() => setKind("internal_note")}
              >
                Internal note
              </button>
            </div>
            <textarea
              aria-label={kind === "draft" ? "Reply draft" : "Internal note"}
              rows={4}
              required
              maxLength={8000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                kind === "draft"
                  ? "Write a reply for review…"
                  : "Leave a note for your team…"
              }
            />
            <div className="composer-footer">
              <small>Drafts are saved here for review.</small>
              <Button busy={busy} disabled={!message.trim()} type="submit">
                {kind === "draft" ? "Save draft" : "Add note"}
              </Button>
            </div>
          </form>
        </section>
      )}
      {deleting && (
        <div className="delete-inline" role="alert">
          <strong>Delete this ticket permanently?</strong>
          <p>Its conversation and saved drafts will also be removed.</p>
          <div>
            <Button
              variant="secondary"
              onClick={() => setDeleting(false)}
              disabled={busy}
            >
              Keep ticket
            </Button>
            <Button variant="danger" busy={busy} onClick={remove}>
              Delete ticket
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
