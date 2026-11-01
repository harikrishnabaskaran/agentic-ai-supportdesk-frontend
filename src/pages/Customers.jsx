import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, Users, Mail } from "lucide-react";
import { api } from "../lib/api";
import useResource from "../lib/useResource";
import { date } from "../lib/format";
import {
  Avatar,
  Pagination,
  Empty,
  ErrorBox,
  Skeleton,
} from "../components/UI";
export default function Customers({ workspace: w }) {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data, loading, error } = useResource(
    () => api.customers({ query: search, page, limit: 20 }),
    [search, page, w.version],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PEOPLE, NOT JUST TICKET NUMBERS</span>
          <h1>
            Your customers<span className="heading-dot">.</span>
          </h1>
          <p>A little context for every conversation.</p>
        </div>
        <div className="soft-counter">
          <Users size={18} />
          {w.stats.customers} customer records
        </div>
      </div>
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search customers"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="muted">
            Customer records are created when you create a ticket.
          </span>
        </div>
        <ErrorBox message={error} />
        {loading ? (
          <Skeleton />
        ) : !data?.items.length ? (
          <Empty
            title="Get to know your customers"
            text="Create a ticket with a customer’s name and email to start."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Total tickets</th>
                  <th>Active tickets</th>
                  <th>First seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <div className="person">
                        <Avatar name={c.name} color={i} />
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td className="muted">{c.email}</td>
                    <td>{c.tickets}</td>
                    <td>
                      <span className="badge open">
                        {c.open_tickets} active
                      </span>
                    </td>
                    <td className="muted">{date(c.created_at)}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`View tickets for ${c.name}`}
                        onClick={() =>
                          navigate(`/tickets?q=${encodeURIComponent(c.email)}`)
                        }
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={data?.total || 0}
          limit={20}
          onChange={setPage}
        />
      </section>
    </>
  );
}
