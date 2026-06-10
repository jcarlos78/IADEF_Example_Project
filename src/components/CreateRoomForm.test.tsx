// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateRoomForm } from "./CreateRoomForm";

describe("CreateRoomForm — AC1", () => {
  it("renders the 3 scales with their labels", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Fibonacci")).toBeInTheDocument();
    expect(screen.getByLabelText("Modified Fibonacci")).toBeInTheDocument();
    expect(screen.getByLabelText("T-shirt")).toBeInTheDocument();
  });

  it("Fibonacci is selected by default", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText<HTMLInputElement>("Fibonacci").checked).toBe(true);
  });

  it("does not call onSubmit when nickname is empty (shows alert)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /create room/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/nickname/i);
  });

  it("sends { scaleId, hostNickname } on submit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nickname/i), "Host");
    await user.click(screen.getByLabelText("T-shirt"));
    await user.click(screen.getByRole("button", { name: /create room/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      scaleId: "tshirt",
      hostNickname: "Host",
    });
  });

  it("trims the nickname before calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nickname/i), "  Maria  ");
    await user.click(screen.getByRole("button", { name: /create room/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      scaleId: "fibonacci",
      hostNickname: "Maria",
    });
  });

  it("disables the button while submitting", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
  });

  it("shows external errorMessage when there is no local error", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} errorMessage="Network failure" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
  });

  it("local error takes precedence over external errorMessage", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={vi.fn()} errorMessage="Network failure" />);
    await user.click(screen.getByRole("button", { name: /create room/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/nickname/i);
  });
});
