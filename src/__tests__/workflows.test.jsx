import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TicketDialog from "../components/TicketDialog";
import Knowledge from "../pages/Knowledge";
import Agent from "../pages/Agent";
import { uuid } from "../lib/id";
const { api, demo } = vi.hoisted(() => ({
  api: {
    ticket: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    message: vi.fn(),
    articles: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    removeArticle: vi.fn(),
    conversations: vi.fn(),
    newConversation: vi.fn(),
    conversation: vi.fn(),
    chat: vi.fn(),
    confirm: vi.fn(),
    activity: vi.fn(),
  },
  demo: { value: false },
}));
vi.mock("../lib/api", () => ({
  api,
  get isDemo() {
    return demo.value;
  },
}));
const ticket = {
  id: "0".repeat(24),
  number: "SD-1001",
  title: "Reset email failed",
  description: "No reset email arrives.",
  customer_name: "Test Customer",
  customer_email: "test@example.test",
  status: "open",
  priority: "medium",
  category: "account",
  assignee: "Unassigned",
  due_date: null,
  resolution: "",
  messages: [],
  revision: 1,
};
const wrap = (element) => render(<MemoryRouter>{element}</MemoryRouter>);
const workspace = () => ({
  reload: vi.fn().mockResolvedValue(),
  notify: vi.fn(),
  version: 0,
  health: { model: { connected: true } },
});
beforeEach(() => {
  vi.clearAllMocks();
  demo.value = false;
  api.ticket.mockResolvedValue(structuredClone(ticket));
  api.conversations.mockResolvedValue({ items: [] });
  api.newConversation.mockResolvedValue({ id: "a".repeat(24) });
  api.activity.mockResolvedValue({ items: [] });
  api.conversation.mockResolvedValue({ messages: [], pending_actions: [] });
  api.create.mockResolvedValue(ticket);
  api.update.mockResolvedValue(ticket);
  api.message.mockResolvedValue({});
  api.remove.mockResolvedValue({ deleted: true });
});

it("creates a validated ticket payload and retains explicit customer details", async () => {
  const user = userEvent.setup(),
    saved = vi.fn().mockResolvedValue(),
    close = vi.fn();
  wrap(
    <TicketDialog
      ticket={null}
      onClose={close}
      onSaved={saved}
      notify={vi.fn()}
    />,
  );
  await user.type(screen.getByLabelText("Subject"), "Missing invoice");
  await user.type(screen.getByLabelText("Customer name"), "Alex Example");
  await user.type(screen.getByLabelText("Customer email"), "alex@example.test");
  await user.type(
    screen.getByLabelText("Customer’s message"),
    "Please send the invoice reference.",
  );
  await user.click(
    screen.getByRole("button", { name: "Create ticket", exact: true }),
  );
  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing invoice",
        customer_email: "alex@example.test",
        due_date: null,
        status: "open",
      }),
    ),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
});

it("shows a save error without closing the ticket", async () => {
  api.update.mockRejectedValue(new Error("Database unavailable"));
  const close = vi.fn();
  wrap(
    <TicketDialog
      ticket={ticket}
      onClose={close}
      onSaved={vi.fn()}
      notify={vi.fn()}
    />,
  );
  await screen.findByDisplayValue(ticket.title);
  fireEvent.submit(
    screen.getByRole("button", { name: "Save changes" }).closest("form"),
  );
  await screen.findByText("Database unavailable");
  expect(close).not.toHaveBeenCalled();
});

it("saves drafts with a UUID request ID", async () => {
  const user = userEvent.setup();
  wrap(
    <TicketDialog
      ticket={ticket}
      onClose={vi.fn()}
      onSaved={vi.fn().mockResolvedValue()}
      notify={vi.fn()}
    />,
  );
  await user.type(
    await screen.findByLabelText("Reply draft", { exact: true }),
    "Please confirm the request time.",
  );
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(api.message).toHaveBeenCalledWith(
      ticket.id,
      expect.objectContaining({
        body: "Please confirm the request time.",
        kind: "draft",
        request_id: expect.stringMatching(/^[a-f0-9-]{36}$/),
      }),
    ),
  );
});

it("requires a second explicit click before manual deletion", async () => {
  const user = userEvent.setup();
  wrap(
    <TicketDialog
      ticket={ticket}
      onClose={vi.fn()}
      onSaved={vi.fn().mockResolvedValue()}
      notify={vi.fn()}
    />,
  );
  await user.click(
    await screen.findByRole("button", { name: "Delete ticket", exact: true }),
  );
  expect(api.remove).not.toHaveBeenCalled();
  await screen.findByText("Delete this ticket permanently?");
  await user.click(
    screen.getAllByRole("button", { name: "Delete ticket", exact: true })[1],
  );
  await waitFor(() => expect(api.remove).toHaveBeenCalledWith(ticket.id));
});

it("creates knowledge articles as manually managed content", async () => {
  const user = userEvent.setup();
  api.articles.mockResolvedValue({ items: [], total: 0 });
  api.createArticle.mockResolvedValue({ id: "1" });
  wrap(<Knowledge workspace={workspace()} />);
  await user.click(
    screen.getByRole("button", { name: "Write an article", exact: true }),
  );
  await user.type(screen.getByLabelText("Title"), "Reset guide");
  await user.type(
    screen.getByLabelText("Article", { exact: true }),
    "Check the customer email address.",
  );
  await user.click(screen.getByRole("button", { name: "Save article" }));
  await waitFor(() =>
    expect(api.createArticle).toHaveBeenCalledWith({
      title: "Reset guide",
      content: "Check the customer email address.",
      category: "general",
      published: true,
    }),
  );
});

it("shows exact approval changes and posts only stored action IDs", async () => {
  const user = userEvent.setup(),
    cid = "a".repeat(24),
    action = {
      action_id: "b".repeat(36),
      tool_name: "update_ticket",
      arguments: { ticket_id: ticket.id, updated_fields: { priority: "high" } },
      ticket_snapshot: ticket,
      expires_at: new Date(Date.now() + 60000).toISOString(),
    };
  api.chat.mockResolvedValue({
    conversation_id: cid,
    status: "awaiting_confirmation",
    results: [],
  });
  api.conversation.mockResolvedValue({
    messages: [
      { role: "assistant", content: "Please review the priority change." },
    ],
    pending_actions: [action],
  });
  api.confirm.mockResolvedValue({
    conversation_id: cid,
    status: "error",
    reply: "Model timed out after saving.",
    results: [{ title: ticket.title, verified: true, ok: true }],
  });
  const w = workspace();
  wrap(<Agent workspace={w} />);
  await user.type(
    screen.getByLabelText("Message Orbit"),
    "Raise this ticket priority.",
  );
  await user.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Your approval is needed");
  expect(screen.getByText("medium")).toBeTruthy();
  expect(screen.getByText("high")).toBeTruthy();
  expect(api.confirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Approve changes" }));
  await waitFor(() =>
    expect(api.confirm).toHaveBeenCalledWith(
      cid,
      expect.objectContaining({
        approved: true,
        action_ids: [action.action_id],
      }),
    ),
  );
  expect(api.confirm.mock.calls[0][1].updated_fields).toBeUndefined();
  await screen.findByText("Reset email failed: Change verified");
});

it("disables agent execution in the browser preview", () => {
  demo.value = true;
  wrap(<Agent workspace={workspace()} />);
  expect(screen.getByLabelText("Message Orbit").disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Send message" }).disabled).toBe(
    true,
  );
  expect(api.chat).not.toHaveBeenCalled();
});

it("generates valid request UUIDs", () => {
  const value = uuid();
  expect(value).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});
