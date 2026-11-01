import { useState } from "react";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  Clock3,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import useResource from "../lib/useResource";
import { toolLabel, time } from "../lib/format";
import {
  Button,
  Badge,
  Pagination,
  Empty,
  ErrorBox,
  Skeleton,
} from "../components/UI";
export default function Activity({ workspace: w }) {
  const [page, setPage] = useState(1),
    [version, setVersion] = useState(0);
  const { data, loading, error } = useResource(
    () => api.activity({ page, limit: 20 }),
    [page, version, w.version],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A CLEAR VIEW OF EVERY ACTION</span>
          <h1>
            Agent activity<span className="heading-dot">.</span>
          </h1>
          <p>Tool calls, observed results and approvals. All in one place.</p>
        </div>
        <Button variant="secondary" onClick={() => setVersion((n) => n + 1)}>
          <RefreshCw size={16} />
          Refresh activity
        </Button>
      </div>
      <section className="panel">
        <ErrorBox message={error} />
        {loading ? (
          <Skeleton />
        ) : data?.items.length ? (
          <div className="activity-list">
            {data.items.map((a) => (
              <details key={a.id} className="activity-item">
                <summary>
                  <span className={`activity-icon ${a.status}`}>
                    {a.status === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : a.status === "error" ? (
                      <AlertCircle size={18} />
                    ) : (
                      <Clock3 size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{toolLabel(a.tool_name)}</strong>
                    <small>
                      {a.result?.summary ||
                        a.result?.error?.message ||
                        "Inspect the recorded arguments and result."}
                    </small>
                  </span>
                  <Badge type={a.status}>{a.status.replaceAll("_", " ")}</Badge>
                  <time>{time(a.timestamp)}</time>
                </summary>
                <pre>
                  {JSON.stringify(
                    { arguments: a.arguments, result: a.result },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
          </div>
        ) : (
          <Empty
            title="A clear timeline starts with an action"
            text="Ask Orbit to read or update a ticket. Its tool calls will appear here."
          />
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
