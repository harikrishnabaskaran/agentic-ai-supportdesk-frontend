// NEW FILE: frontend/src/components/DocumentUpload.jsx

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import { api, isDemo } from "../lib/api";
import { categories, title } from "../lib/format";
import { Button, ErrorBox, Modal } from "./UI";

export default function DocumentUpload({
  onClose,
  onSaved,
  notify,
}) {
  const input = useRef(null);

  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  function choose(selected) {
    if (busy || isDemo) return;

    setError("");

    if (!selected) return;

    if (!/\.(pdf|docx|txt|md)$/i.test(selected.name)) {
      setError("Choose a PDF, DOCX, TXT or Markdown file.");
      return;
    }

if (
  !selected.size ||
  selected.size > 50 * 1024 * 1024
) {
  setError(
    "Choose a non-empty document no larger than 50 MB.",
  );
  return;
}

    setFile(selected);
    setName(
      selected.name.replace(/\.[^.]+$/, "").slice(0, 160),
    );
    setResult(null);
  }

  async function submit(event) {
    event.preventDefault();

    if ((!file && !result) || busy) return;

    setBusy(true);
    setError("");

    try {
      let value;

      if (result) {
        value = await api.indexDocument(result.article.id);
      } else {
        const data = new FormData();

        data.append("file", file);
        data.append("title", name.trim());
        data.append("category", category);

        // Axios supplies the multipart boundary automatically.
        value = await api.uploadDocument(data);
      }

      setResult(value);
      await onSaved();

      if (value.indexing.status === "ready") {
        notify(
          "Document indexed. Ask Orbit a question about it.",
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const ready = result?.indexing.status === "ready";

  return (
    <Modal
      title="Give Orbit a new source"
      subtitle="Upload a document, then ask questions in your AI workspace."
      onClose={close}
    >
      <form
        className="modal-body document-upload"
        onSubmit={submit}
      >
        <ErrorBox message={error} />

        {isDemo && (
          <ErrorBox
            message="Document indexing requires the local backend and Ollama. Start the app in normal mode."
          />
        )}

        {!result ? (
          <>
            <input
              ref={input}
              className="sr-only"
              type="file"
              aria-label="Choose document"
              accept=".pdf,.docx,.txt,.md"
              disabled={busy || isDemo}
              onChange={(e) => choose(e.target.files?.[0])}
            />

            <button
              type="button"
              className={`document-dropzone ${
                dragging ? "dragging" : ""
              }`}
              disabled={busy || isDemo}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="document-upload-icon">
                {file ? (
                  <FileText size={26} />
                ) : (
                  <UploadCloud size={28} />
                )}
              </span>

              <strong>
                {file
                  ? file.name
                  : "Drop a document here, or browse"}
              </strong>

              <span>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB · Click to change`
                  : "PDF, Word (.docx), TXT or Markdown · Up to 50 MB"}
              </span>
            </button>

            <div className="form-grid">
              <label className="full">
                Document title
                <input
                  value={name}
                  maxLength={160}
                  required
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="For example, TV troubleshooting guide"
                />
              </label>

              <label className="full">
                Category
                <select
                  value={category}
                  disabled={busy}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                >
                  {categories.map((c) => (
                    <option value={c} key={c}>
                      {title(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="document-help">
                Uploads become published Knowledge Base articles.
  Supports up to 500 PDF pages and 1,000,000 extracted
  characters. Scanned PDFs need OCR first.
            </p>
          </>
        ) : ready ? (
          <div className="document-result" role="status">
            <CheckCircle2 size={34} />

            <h3>Your document is ready for questions.</h3>

            <p>{result.article.title}</p>

            <span>
              {result.indexing.chunks} chunks indexed in Qdrant
            </span>

            <Link
              to="/agent"
              className="button"
              onClick={onClose}
            >
              Open AI workspace
              <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="document-retry" role="status">
            <h3>
              Document saved. Indexing needs another try.
            </h3>

            <p>{result.indexing.message}</p>

            <small>
              Start Ollama and check the embedding model,
              then retry. Your document is already saved.
            </small>
          </div>
        )}

        {busy && (
          <div className="document-progress" role="status">
            <RefreshCw size={16} className="spin" />

            <div>
              <strong>Processing your document…</strong>
              <p>
                Extracting text, creating chunks and indexing
                embeddings. Please keep this dialog open.
              </p>
            </div>
          </div>
        )}

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            disabled={busy}
          >
            {ready ? "Done" : "Close"}
          </Button>

          {!ready && (
            <Button
              type="submit"
              busy={busy}
              disabled={isDemo || (!file && !result)}
            >
              {result ? "Retry indexing" : "Upload & index"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}