import { expect, test } from "@playwright/test";
import { setupRoomWithTwoUsers } from "./helpers";

test.describe("AC10 — host handoff", () => {
  test("host closes the tab; after the grace period the oldest connected is promoted", async ({
    browser,
  }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      hostName: "Host",
      guestName: "Alice",
    });

    // Guest is NOT host yet
    await expect(guest.getByText(/you are the facilitator/i)).not.toBeVisible();

    // Host closes everything
    await hostCtx.close();
    void host; // reference kept for typecheck only

    // Within ~2s (HOST_GRACE_MS) + ~300ms (TICK_INTERVAL_MS), Alice becomes facilitator
    await expect(guest.getByText(/you are the facilitator/i)).toBeVisible({
      timeout: 5_000,
    });

    // And the facilitator controls appear
    await expect(guest.getByRole("button", { name: /start round/i })).toBeVisible();

    await guestCtx.close();
  });
});
