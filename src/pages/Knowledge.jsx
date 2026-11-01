// FILE: frontend/src/pages/Knowledge.jsx
// Replace the ENTIRE file.
// The buttons are siblings. Dialogs render outside the buttons.
// A single dialog state prevents both dialogs opening together.

import { useState, useEffect, useCallback } from "react";

import {
  BookOpen,
  Plus,
  Search,
  ArrowUpRight,
  FileText,
  UploadCloud,
  Trash2,
  Save,
} from "lucide-react";

import { api } from "../lib/api";
import useResource from "../lib/useResource";
import { categories, title, date } from "../lib/format";
import DocumentUpload from "../components/DocumentUpload";

import {
  Modal,
  Button,
  Badge,
  Pagination,
  Empty,
  ErrorBox,
  Skeleton,
} from "../components/UI";

export default function Knowledge({ workspace: w }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // null | { type: "article", article: null | article }
  //      | { type: "upload" }
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchArticles = useCallback(
    () =>
      api.articles({
        query: search || undefined,
        category: category || undefined,
        page,
        limit: 12,
      }),
    [search, category, page],
  );

  const { data, loading, error } = useResource(
    fetchArticles,
    [search, category, page, w.version],
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const openNewArticle = useCallback(() => {
    setDialog({
      type: "article",
      article: null,
    });
  }, []);

  const openUpload = useCallback(() => {
    setDialog({
      type: "upload",
    });
  }, []);

  return (
    <>
      <div className="page-heading knowledge-page-heading">
        <div>
          <span className="eyebrow">
            GOOD ANSWERS DESERVE A HOME
          </span>

          <h1>
            Knowledge base
            <span className="heading-dot">.</span>
          </h1>

          <p>
            Keep your articles, documents and support guides together.
          </p>
        </div>

        {/* Two independent buttons, without an outer Button. */}
        <div className="knowledge-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={openNewArticle}
          >
            <Plus size={17} />
            Write an article
          </Button>

          <Button
            type="button"
            onClick={openUpload}
          >
            <UploadCloud size={17} />
            Upload document
          </Button>
        </div>
      </div>

      <section className="knowledge-banner">
        <span>
          <BookOpen size={29} />
        </span>

        <div>
          <h2>Make your next answer a little easier.</h2>
          <p>
            Upload a guide, then ask Orbit questions with cited answers.
          </p>
        </div>

        <strong>
          {data?.total || 0}
          <small>articles in this view</small>
        </strong>
      </section>

      <div className="standalone-filter">
        <label className="search-field">
          <Search size={17} />

          <input
            aria-label="Search knowledge base"
            placeholder="Find an answer, guide, or topic…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <select
          aria-label="Filter article category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>

          {categories.map((item) => (
            <option key={item} value={item}>
              {title(item)}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <Skeleton />
      ) : data?.items?.length ? (
        <div className="article-grid">
          {data.items.map((article, index) => (
            <button
              type="button"
              className="article-card"
              key={article.id}
              onClick={() =>
                setDialog({
                  type: "article",
                  article,
                })
              }
            >
              <span className={`article-icon tone-${index % 3}`}>
                <FileText size={23} />
              </span>

              <div>
                <Badge
                  type={article.published ? "published" : "draft"}
                >
                  {article.published ? "Published" : "Draft"}
                </Badge>

                <span className="article-category">
                  {title(article.category)}
                </span>
              </div>

              <h3>{article.title}</h3>

              <p>
                {article.content
                  .slice(0, 155)
                  .replaceAll("\n", " ")}
              </p>

              <footer>
                <span>
                  Updated {date(article.updated_at)}
                </span>

                <ArrowUpRight size={17} />
              </footer>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title="Your team's knowledge starts here"
          text="Write an article or upload a useful document."
          action={
            <Button
              type="button"
              onClick={openNewArticle}
            >
              Write an article
            </Button>
          }
        />
      )}

      <Pagination
        page={page}
        total={data?.total || 0}
        limit={12}
        onChange={setPage}
      />

      {/* Dialogs belong here, outside buttons and cards. */}
      {dialog?.type === "article" && (
        <ArticleEditor
          article={dialog.article}
          onClose={closeDialog}
          onSaved={w.reload}
          notify={w.notify}
        />
      )}

      {dialog?.type === "upload" && (
        <DocumentUpload
          onClose={closeDialog}
          onSaved={w.reload}
          notify={w.notify}
        />
      )}
    </>
  );
}

function ArticleEditor({
  article,
  onClose,
  onSaved,
  notify,
}) {
  const [form, setForm] = useState(
    article
      ? {
          title: article.title,
          content: article.content,
          category: article.category,
          published: article.published,
        }
      : {
          title: "",
          content: "",
          category: "general",
          published: true,
        },
  );

  const [editing, setEditing] = useState(!article);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (article) {
        await api.updateArticle(article.id, {
          ...form,
          revision: article.revision,
        });
      } else {
        await api.createArticle(form);
      }

      await onSaved();
      notify("Knowledge article saved.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await api.removeArticle(article.id);
      await onSaved();

      notify("Article deleted.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      wide
      title={
        article
          ? "Knowledge article"
          : "A new answer, shared"
      }
      subtitle={
        article
          ? `Updated ${date(article.updated_at)}`
          : "Useful knowledge makes a thoughtful team."
      }
      onClose={onClose}
    >
      <div className="modal-body">
        <ErrorBox message={error} />

        {editing ? (
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Title
                <input
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {title(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Visibility
                <select
                  value={String(form.published)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      published:
                        event.target.value === "true",
                    })
                  }
                >
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>
              </label>

              <label className="full">
                Article
                <textarea
                  required
                  rows={14}
                  maxLength={1000000}
                  value={form.content}
                  placeholder="Write clear, practical steps…"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      content: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button type="submit" busy={busy}>
                <Save size={15} />
                Save article
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="article-reading">
              <Badge type={article.category} />
              <h1>{article.title}</h1>
              <p>{article.content}</p>
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                Edit article
              </Button>

              <button
                type="button"
                className="text-button danger"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={15} />
                Delete article
              </button>
            </div>
          </>
        )}

        {deleting && (
          <div className="delete-inline">
            <strong>
              Permanently delete this article?
            </strong>

            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setDeleting(false)}
              >
                Keep article
              </Button>

              <Button
                type="button"
                variant="danger"
                busy={busy}
                onClick={remove}
              >
                Delete article
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}