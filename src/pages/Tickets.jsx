import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  List,
  Columns3,
  SlidersHorizontal,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import { api } from "../lib/api";
import useResource from "../lib/useResource";
import {
  statuses,
  categories,
  priorities,
  title,
  initials,
  date,
} from "../lib/format";
import {
  Button,
  Badge,
  Avatar,
  TicketTable,
  Pagination,
  Empty,
  ErrorBox,
  Skeleton,
} from "../components/UI";
export default function Tickets({ workspace: w }) {
  const [params] = useSearchParams(),
    [query, setQuery] = useState(params.get("q") || ""),
    [search, setSearch] = useState(query),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [board, setBoard] = useState(false);
  useEffect(() => {
    setQuery(params.get("q") || "");
    setPage(1);
  }, [params]);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);
  const limit = board ? 100 : 15;
  const { data, loading, error } = useResource(
    () =>
      api.tickets({
        query: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        sort,
        page,
        limit,
      }),
    [search, status, priority, category, sort, page, limit, w.version],
  );
  function filter(set, value) {
    set(value);
    setPage(1);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE CONVERSATIONS THAT MATTER</span>
          <h1>
            Ticket inbox<span className="heading-dot">.</span>
          </h1>
          <p>A thoughtful response starts with an organized queue.</p>
        </div>
        <Button onClick={() => w.openTicket(null)}>
          <Plus size={17} />
          Create ticket
        </Button>
      </div>
      <div className="ticket-tabs">
        <button
          className={!status ? "active" : ""}
          onClick={() => filter(setStatus, "")}
        >
          All tickets<span>{w.stats.total}</span>
        </button>
        {Object.entries(statuses).map(([k, v]) => (
          <button
            key={k}
            className={status === k ? "active" : ""}
            onClick={() => filter(setStatus, k)}
          >
            {v}
            <span>{w.stats.statuses[k] || 0}</span>
          </button>
        ))}
      </div>
      <section className="panel ticket-panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search tickets"
              placeholder="Search tickets, customers, or an email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => filter(setPriority, e.target.value)}
          >
            <option value="">All priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {title(p)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => filter(setCategory, e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {title(c)}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort tickets"
            value={sort}
            onChange={(e) => filter(setSort, e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority first</option>
          </select>
          <div className="view-toggle">
            <button
              aria-label="List view"
              className={!board ? "active" : ""}
              onClick={() => {
                setBoard(false);
                setPage(1);
              }}
            >
              <List size={18} />
            </button>
            <button
              aria-label="Board view"
              className={board ? "active" : ""}
              onClick={() => {
                setBoard(true);
                setPage(1);
              }}
            >
              <Columns3 size={18} />
            </button>
          </div>
        </div>
        <ErrorBox message={error} />
        {loading ? (
          <Skeleton />
        ) : !data?.items.length ? (
          <Empty
            title="Nothing in this view"
            text="Try a different search or create a new ticket."
          />
        ) : board ? (
          <div className="kanban">
            {Object.entries(statuses).map(([key, label]) => (
              <div className="kanban-column" key={key}>
                <h3>
                  <span className={`status-dot ${key}`} />
                  {label}
                  <small>
                    {data.items.filter((t) => t.status === key).length}
                  </small>
                </h3>
                {data.items
                  .filter((t) => t.status === key)
                  .map((t) => (
                    <button
                      className="kanban-card"
                      key={t.id}
                      onClick={() => w.openTicket(t)}
                    >
                      <div>
                        <span>{t.number}</span>
                        <Badge type={t.priority} />
                      </div>
                      <strong>{t.title}</strong>
                      <p>{t.description.slice(0, 105)}</p>
                      <footer>
                        <span className="person">
                          <Avatar name={t.customer_name} small />
                          {t.customer_name.split(" ")[0]}
                        </span>
                        <span>{date(t.due_date)}</span>
                      </footer>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <TicketTable items={data.items} onOpen={w.openTicket} />
        )}
        <Pagination
          page={page}
          total={data?.total || 0}
          limit={limit}
          onChange={setPage}
        />
      </section>
    </>
  );
}
