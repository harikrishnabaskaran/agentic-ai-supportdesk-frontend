export const statuses = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
};
export const categories = [
  "general",
  "account",
  "billing",
  "technical",
  "shipping",
  "product",
];
export const priorities = ["low", "medium", "high", "urgent"];
export const title = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const date = (value) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "No deadline";
export const time = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
export const toolLabel = (name) =>
  ({
    create_ticket: "Create ticket",
    get_tickets: "Read tickets",
    get_ticket_by_id: "Read ticket details",
    search_tickets: "Search tickets",
    update_ticket: "Update ticket",
    delete_ticket: "Delete ticket",
    save_reply_draft: "Save reply draft",
    get_ticket_statistics: "Read support statistics",
    agent: "Agent update",
  })[name] || title(name);
