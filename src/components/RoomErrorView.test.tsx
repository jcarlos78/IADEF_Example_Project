// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomErrorView } from "./RoomErrorView";

describe("RoomErrorView — AC11", () => {
  it("renders the title, description and default Create new room CTA", () => {
    render(<RoomErrorView title="Room not found" description="It may have expired." />);
    expect(screen.getByRole("heading", { name: /room not found/i })).toBeInTheDocument();
    expect(screen.getByText(/it may have expired/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /create a new room/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("accepts a custom CTA", () => {
    render(
      <RoomErrorView
        title="Room closed"
        description="The TTL elapsed."
        ctaLabel="Back to home"
        ctaHref="/start"
      />,
    );
    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toHaveAttribute("href", "/start");
  });

  it("is announced as an alert (accessibility)", () => {
    render(<RoomErrorView title="X" description="Y" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
