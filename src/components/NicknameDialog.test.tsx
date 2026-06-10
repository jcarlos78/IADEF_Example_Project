// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NicknameDialog } from "./NicknameDialog";

describe("NicknameDialog — AC2, AC8", () => {
  it("renders the default title and description", () => {
    render(<NicknameDialog onSubmit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /join the room/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a nickname/i)).toBeInTheDocument();
  });

  it("does not call onSubmit when nickname is empty", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /^join$/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/nickname/i);
  });

  it("calls onSubmit with a trimmed nickname", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nickname/i), "  Alice  ");
    await user.click(screen.getByRole("button", { name: /^join$/i }));
    expect(onSubmit).toHaveBeenCalledWith("Alice");
  });

  it("submits via Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nickname/i), "Bob{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Bob");
  });

  it("shows external errorMessage (e.g. duplicate nickname from the server)", () => {
    render(
      <NicknameDialog
        onSubmit={vi.fn()}
        errorMessage='Nickname "Alice" is already in use in this room.'
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/already in use/i);
  });

  it("local error takes precedence over external errorMessage", async () => {
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={vi.fn()} errorMessage="Server error" />);
    await user.click(screen.getByRole("button", { name: /^join$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/nickname is required/i);
  });

  it("disables button and input while isSubmitting", () => {
    render(<NicknameDialog onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /joining/i })).toBeDisabled();
    expect(screen.getByLabelText(/nickname/i)).toBeDisabled();
  });

  it("accepts a custom title and description", () => {
    render(
      <NicknameDialog
        onSubmit={vi.fn()}
        title="Team X room"
        description="Use your Slack handle."
      />,
    );
    expect(screen.getByRole("heading", { name: /team x room/i })).toBeInTheDocument();
    expect(screen.getByText(/slack/i)).toBeInTheDocument();
  });
});
