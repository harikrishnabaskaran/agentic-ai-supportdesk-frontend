import { uuid } from "../lib/id";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Plus,
  ArrowUp,
  MessageSquare,
  ShieldCheck,
  Check,
  LoaderCircle,
  Clock3,
  RefreshCw,
  AlertCircle,
  Ticket,
  ChevronDown,
} from "lucide-react";
import { api, isDemo } from "../lib/api";
import { title, toolLabel, time } from "../lib/format";
import { Button, Badge, ErrorBox } from "../components/UI";
const suggestions = [
  [
    "Understand the queue",
    "Read my ticket statistics and summarize what needs attention.",
  ],
  [
    "Organize the inbox",
    "Read up to 10 open tickets. Inspect their descriptions and save a suitable category for each. Leave priorities unchanged.",
  ],
  [
    "Write a thoughtful reply",
    "Find one open account ticket, read it, and save a brief reply draft asking for the missing details.",
  ],
];
function formatAssistantText(value = "") {
  const cleaned = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    // Remove individual and grouped citation brackets.
    .replace(/\[\s*KB:[^\]]*\]/gi, "")
    // Remove any remaining unbracketed IDs.
    .replace(/\bKB:[a-f0-9]{24}:\d+\b/gi, "")
    .replace(/[ \t]+([:;,.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n");

  // Separate the answer from any repeated Sources sections.
  const sections = cleaned.split(
    /^[ \t]*(?:\*\*)?Sources(?:\*\*)?:[ \t]*(?:\*\*)?[ \t]*$/gim,
  );

  const answer = sections.shift().trim();

  // Keep each document name only once.
  const sources = [
    ...new Set(
      sections
        .flatMap((section) => section.split("\n"))
        .map((line) =>
          line
            .replace(/^[ \t]*(?:[-*]|\d+[.)])[ \t]*/, "")
            .replace(/\*\*/g, "")
            .trim(),
        )
        .filter(Boolean),
    ),
  ];

  return (
    answer +
    (sources.length
      ? "\n\nSources:\n" +
        sources.map((source) => `- ${source}`).join("\n")
      : "")
  ).replace(/\n{3,}/g, "\n\n");
}
export default function Agent({ workspace: w }) {
  const [params] = useSearchParams(),
    [cid, setCid] = useState(null),
    [history, setHistory] = useState([]),
    [messages, setMessages] = useState([]),
    [pending, setPending] = useState([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [events, setEvents] = useState([]),
    [results, setResults] = useState([]),
    [failed, setFailed] = useState(null);
  const bottom = useRef(null),
    lock = useRef(false),
    cidRef = useRef(null);
  const contextTicket = params.get("ticket");
  const setConversation = (id) => {
    setCid(id);
    cidRef.current = id;
  };
  async function list() {
    const value = await api.conversations();
    setHistory(value.items);
  }
  async function load(id) {
    const value = await api.conversation(id);
    setMessages(value.messages);
    setPending(value.pending_actions);
    return value;
  }
  useEffect(() => {
    list().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, busy]);
  useEffect(() => {
    if (!busy || !cid) return;
    let active = true;
    const poll = () =>
      api
        .activity({ conversation_id: cid, limit: 8 })
        .then((d) => {
          if (active) setEvents([...d.items].reverse());
        })
        .catch(() => {});
    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [busy, cid]);
  async function select(id) {
    if (busy) return;
    setConversation(id);
    setError("");
    setResults([]);
    setFailed(null);
    setEvents([]);
    try {
      await load(id);
    } catch (e) {
      setError(e.message);
    }
  }
  function fresh() {
    if (busy) return;
    setConversation(null);
    setMessages([]);
    setPending([]);
    setEvents([]);
    setResults([]);
    setError("");
    setFailed(null);
    setInput("");
  }
  async function perform(request) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setFailed(null);
    try {
      const response =
        request.type === "confirm"
          ? await api.confirm(request.cid, request.body)
          : await api.chat(request.body);
      setConversation(response.conversation_id);
      setResults(response.results || []);
      await load(response.conversation_id);
      if (response.status === "error" || response.status === "limit_reached")
        setError(response.reply);
      await list();
      await w.reload();
    } catch (e) {
      setError(e.message);
      setFailed(request);
      if (cidRef.current) await load(cidRef.current).catch(() => {});
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function send(text) {
    text = (text ?? input).trim();
    if (!text || busy || pending.length || isDemo) return;
    let id = cid;
    if (!id) {
      lock.current = true;
      setBusy(true);
      try {
        const conversation = await api.newConversation();
        id = conversation.id;
        setConversation(id);
      } catch (e) {
        setError(e.message);
        return;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    }
    const content = contextTicket
      ? `For ticket ID ${contextTicket}: ${text}`
      : text;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content, timestamp: new Date().toISOString() },
    ]);
    perform({
      type: "chat",
      body: { message: content, conversation_id: id, request_id: uuid() },
    });
  }
  function confirm(approved) {
    perform({
      type: "confirm",
      cid,
      body: {
        action_ids: pending.map((a) => a.action_id),
        approved,
        request_id: uuid(),
      },
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE HELP. A MORE HUMAN RESPONSE.</span>
          <h1>
            Meet Orbit<span className="heading-dot">.</span>
          </h1>
          <p>Your local support agent. Real tools, visible actions.</p>
        </div>
        <Badge type={w.health?.model?.connected ? "connected" : "waiting"}>
          <span className="dot" />
          {w.health?.model?.connected ? "Ollama connected" : "Ollama offline"}
        </Badge>
      </div>
      <div className="agent-layout">
        <aside className="conversation-sidebar">
          <Button variant="secondary" onClick={fresh} disabled={busy}>
            <Plus size={16} />
            New conversation
          </Button>
          <span className="eyebrow">RECENT CONVERSATIONS</span>
          {history.length ? (
            history.map((h) => (
              <button
                key={h.id}
                className={`conversation-link ${cid === h.id ? "active" : ""}`}
                disabled={busy}
                onClick={() => select(h.id)}
              >
                <MessageSquare size={15} />
                <span>{h.title}</span>
              </button>
            ))
          ) : (
            <p className="muted">Your conversations will appear here.</p>
          )}
          <div className="agent-capabilities">
            <ShieldCheck size={19} />
            <strong>You stay in control.</strong>
            <p>
              Review priority changes, resolutions and deletions before they
              happen.
            </p>
            <small>Replies are saved as drafts.</small>
          </div>
        </aside>
        <section className="chat-panel">
          <header>
            <span className="orbit-mini">
              <Sparkles size={19} />
            </span>
            <div>
              <strong>Orbit</strong>
              <small>Supportdesk’s local AI agent</small>
            </div>
            <Badge type="orbit">ONE AGENT</Badge>
          </header>
          <div className="chat-scroll">
            {!messages.length ? (
              <div className="agent-welcome">
                <div className="welcome-orbit">
                  <Sparkles size={35} />
                </div>
                <h2>
                  Let’s make support feel
                  <br />a little more human.
                </h2>
                <p>
                  I can help organize tickets, inspect your queue and save a
                  thoughtful reply draft.
                </p>
                <div className="suggestion-grid">
                  {suggestions.map(([heading, text]) => (
                    <button
                      key={heading}
                      disabled={isDemo || busy}
                      onClick={() => send(text)}
                    >
                      <Sparkles size={16} />
                      <strong>{heading}</strong>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  <span className="message-avatar">
                    {m.role === "user" ? "You" : <Sparkles size={16} />}
                  </span>
                  <div>
                    <strong>{m.role === "user" ? "You" : "Orbit"}</strong>
                    <p>
                    {m.role === "assistant"
                    ? formatAssistantText(m.content)
                    : m.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="agent-working">
                <LoaderCircle size={16} className="spin" />
                <span>Orbit is working with your support tools…</span>
              </div>
            )}
            {events.length > 0 && (
              <details className="live-tools" open={busy}>
                <summary>
                  <Clock3 size={15} />
                  {busy ? "Live activity" : "Recent tool activity"}
                  <span>{events.length} events</span>
                </summary>
                {events.map((e) => (
                  <div key={e.id}>
                    <i className={e.status} />
                    <span>{toolLabel(e.tool_name)}</span>
                    <small>{e.status.replaceAll("_", " ")}</small>
                  </div>
                ))}
              </details>
            )}
            {pending.length > 0 && (
              <div className="approval-box">
                <h3>
                  <ShieldCheck size={19} />
                  Your approval is needed
                </h3>
                <p>Review these exact changes before applying them.</p>
                {pending.map((a) => (
                  <div className="approval-action" key={a.action_id}>
                    <strong>
                      {a.ticket_snapshot?.number} · {a.ticket_snapshot?.title}
                    </strong>
                    <span>{toolLabel(a.tool_name)}</span>
                    {a.tool_name === "delete_ticket" ? (
                      <p className="danger-text">
                        Permanently delete this ticket and its saved messages.
                      </p>
                    ) : (
                      Object.entries(a.arguments.updated_fields || {}).map(
                        ([key, value]) => (
                          <div className="change-line" key={key}>
                            <span>{title(key)}</span>
                            <del>
                              {String(a.ticket_snapshot?.[key] ?? "None")}
                            </del>
                            <span>→</span>
                            <strong>{String(value ?? "None")}</strong>
                          </div>
                        ),
                      )
                    )}
                    <small>Expires {time(a.expires_at)}</small>
                  </div>
                ))}
                <div>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => confirm(false)}
                  >
                    Decline
                  </Button>
                  <Button busy={busy} onClick={() => confirm(true)}>
                    <Check size={15} />
                    Approve changes
                  </Button>
                </div>
              </div>
            )}
            {results.length > 0 && (
              <div className="confirmed-results">
                {results.map((r, i) => (
                  <p key={i}>
                    <Check size={15} />
                    {r.title}:{" "}
                    {r.verified
                      ? "Change verified"
                      : r.declined
                        ? "Declined"
                        : r.ok
                          ? "Completed"
                          : "Failed"}
                  </p>
                ))}
              </div>
            )}
            <ErrorBox message={error} />
            {failed && (
              <Button
                variant="secondary small"
                onClick={() => perform(failed)}
                disabled={busy}
              >
                <RefreshCw size={14} />
                Retry the same request safely
              </Button>
            )}
            <div ref={bottom} />
          </div>
          <footer className="chat-composer">
            {contextTicket && (
              <span className="context-tag">
                <Ticket size={13} />
                Working with ticket {contextTicket}
              </span>
            )}
            {isDemo && (
              <p className="preview-notice">
                Preview mode: connect the local backend and Ollama to run the
                agent.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                aria-label="Message Orbit"
                maxLength={3500}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isDemo || busy || pending.length > 0}
                placeholder={
                  pending.length
                    ? "Review the proposed changes above…"
                    : "Ask Orbit to help with your support queue…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                aria-label="Send message"
                disabled={isDemo || busy || pending.length > 0 || !input.trim()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <ArrowUp size={20} />
                )}
              </button>
            </form>
            <small>
              <ShieldCheck size={12} />
              Drafts for review. Approvals for sensitive changes.
            </small>
          </footer>
        </section>
      </div>
    </>
  );
}
