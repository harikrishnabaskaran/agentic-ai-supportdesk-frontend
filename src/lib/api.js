import axios from "axios";
import { demoApi } from "./demo";
export const isDemo = import.meta.env.VITE_DEMO_MODE === "true";
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 12000,
});
http.interceptors.response.use(
  (r) => {
    if (!r.data.success)
      throw new Error(r.data.error?.message || "Request failed.");
    return r.data.data;
  },
  (error) => {
    const detail = error.response?.data?.error;
    const message =
      detail?.message ||
      (error.code === "ECONNABORTED"
        ? "The request timed out. Review activity before retrying a change."
        : "Cannot reach the backend. Start FastAPI on port 8000.");
    throw new Error(
      detail?.details?.length
        ? message +
            " " +
            detail.details.map((d) => `${d.field}: ${d.message}`).join(" ")
        : message,
    );
  },
);
const live = {
  tickets: (params) => http.get("/api/tickets", { params }),
  ticket: (id) => http.get(`/api/tickets/${id}`),
  create: (data) => http.post("/api/tickets", data),
  update: (id, data) => http.put(`/api/tickets/${id}`, data),
  remove: (id) => http.delete(`/api/tickets/${id}`),
  message: (id, data) => http.post(`/api/tickets/${id}/messages`, data),
  customers: (params) => http.get("/api/customers", { params }),
  stats: () => http.get("/api/dashboard/stats"),
  health: () => http.get("/api/health"),
  articles: (params) => http.get("/api/knowledge", { params }),
  article: (id) => http.get(`/api/knowledge/${id}`),
  createArticle: (data) => http.post("/api/knowledge", data),
  updateArticle: (id, data) => http.put(`/api/knowledge/${id}`, data),
  removeArticle: (id) => http.delete(`/api/knowledge/${id}`),
  newConversation: () => http.post("/api/agent/conversations"),
  activity: (params) => http.get("/api/agent/activity", { params }),
  conversations: () => http.get("/api/agent/conversations"),
  conversation: (id) => http.get(`/api/agent/conversations/${id}`),
  chat: (data) => http.post("/api/agent/chat", data, { timeout: 1200000 }),
  confirm: (id, data) =>
    http.post(`/api/agent/conversations/${id}/confirm`, data, {
      timeout: 1200000,
    }),
  uploadDocument: (data) =>
  http.post("/api/documents/upload", data, {
    timeout: 3600000,
  }),
  indexDocument: (id) =>
  http.post(`/api/documents/${id}/index`, null, {
    timeout: 3600000,
  }),  
};
export const api = isDemo ? demoApi : live;
