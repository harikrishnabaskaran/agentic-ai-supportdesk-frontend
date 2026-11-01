import { useEffect, useRef } from "react";
import {
  X,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { initials, statuses, title, date } from "../lib/format";
export function Button({
  children,
  variant = "",
  busy = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`button ${variant}`}
      disabled={busy || disabled}
      {...props}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Badge({ type = "", children }) {
  return <span className={`badge ${type}`}>{children || title(type)}</span>;
}
export function Avatar({ name, color = 0, small = false }) {
  return (
    <span className={`avatar avatar-${color % 5} ${small ? "small" : ""}`}>
      {initials(name)}
    </span>
  );
}
export function Empty({
  title: heading = "A clear inbox. A fresh start.",
  text = "Create your first ticket to get the conversation started.",
  action,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{heading}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function ErrorBox({ message }) {
  return message ? (
    <div className="error-box" role="alert">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Skeleton() {
  return (
    <div className="skeleton-grid" aria-label="Loading workspace">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function Modal({
  title: heading,
  subtitle,
  children,
  onClose,
  wide = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current.querySelectorAll(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!els.length) {
          e.preventDefault();
          return;
        }
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header className="modal-head">
          <div>
            <h2>{heading}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Pagination({ page, total, limit, onChange }) {
  const count = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
          : "0 results"}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          Page {page} of {count}
        </span>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page >= count}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function TicketTable({ items, onOpen, compact = false }) {
  return (
    <div className="table-wrap">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Priority</th>
            {!compact && <th>Category</th>}
            <th>{compact ? "Created" : "Due date"}</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((t, i) => (
            <tr key={t.id}>
              <td>
                <button className="ticket-title" onClick={() => onOpen(t)}>
                  <span>{t.number}</span>
                  <strong>{t.title}</strong>
                </button>
              </td>
              <td>
                <div className="person">
                  <Avatar name={t.customer_name} color={i} small />
                  <span>{t.customer_name}</span>
                </div>
              </td>
              <td>
                <Badge type={t.status}>{statuses[t.status]}</Badge>
              </td>
              <td>
                <Badge type={t.priority} />
              </td>
              {!compact && (
                <td>
                  <span className="muted">{title(t.category)}</span>
                </td>
              )}
              <td className="date-cell">
                {date(compact ? t.created_at : t.due_date)}
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Open ${t.number}`}
                  onClick={() => onOpen(t)}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
