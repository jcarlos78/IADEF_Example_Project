import { expect, test } from "@playwright/test";
import { setupRoomWithTwoUsers } from "./helpers";

test.describe("AC3, AC4, AC5, AC6", () => {
  test("AC3 + AC4: hidden vote, reveal reaches both in < 1s", async ({ browser }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      hostName: "H",
      guestName: "Alice",
    });

    await host.getByRole("textbox", { name: /round title/i }).fill("US-42");
    await host.getByRole("button", { name: /start round/i }).click();
    await expect(guest.getByText(/voting on us-42/i)).toBeVisible();

    // Host votes 5
    await host.getByRole("button", { name: "5", exact: true }).click();
    await expect(host.getByRole("button", { name: "5", exact: true, pressed: true })).toBeVisible();
    // Guest sees the "voted" badge in the participant list (without the value)
    const guestParticipantList = guest.getByLabel(/room participants/i);
    await expect(guestParticipantList).toContainText(/H.*voted/i);
    // Result is NOT visible before reveal
    await expect(guest.getByRole("heading", { name: /^result$/i })).not.toBeVisible();

    // Guest votes 13
    await guest.getByRole("button", { name: "13", exact: true }).click();
    await expect(
      guest.getByRole("button", { name: "13", exact: true, pressed: true }),
    ).toBeVisible();

    // AC4: reveal < 1s
    const t0 = Date.now();
    await host.getByRole("button", { name: /^reveal$/i }).click();
    await expect(guest.getByRole("heading", { name: /^result$/i })).toBeVisible({
      timeout: 1_000,
    });
    const dtMs = Date.now() - t0;
    expect(dtMs).toBeLessThan(1_000);

    // AC5: statistics
    const stats = guest.getByLabel(/statistics/i);
    await expect(stats).toContainText("9"); // average
    await expect(stats).toContainText("5"); // min
    await expect(stats).toContainText("13"); // max

    // Votes per participant
    const votes = guest.getByLabel(/votes per participant/i);
    await expect(votes).toContainText("H");
    await expect(votes).toContainText("Alice");

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC6: a new round clears state for everyone", async ({ browser }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser);

    await host.getByRole("button", { name: /start round/i }).click();
    await host.getByRole("button", { name: "3", exact: true }).click();
    await guest.getByRole("button", { name: "5", exact: true }).click();
    await host.getByRole("button", { name: /^reveal$/i }).click();
    await expect(guest.getByRole("heading", { name: /^result$/i })).toBeVisible();

    // New round
    await host.getByRole("button", { name: /new round/i }).click();
    await expect(host.getByRole("button", { name: /start round/i })).toBeVisible();
    // Result disappears on both clients
    await expect(guest.getByRole("heading", { name: /^result$/i })).not.toBeVisible();
    await expect(guest.getByText(/waiting for the round to start/i)).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC12: a guest disconnects and the list marks them as offline in real time", async ({
    browser,
  }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      guestName: "Bob",
    });

    await expect(host.getByText("Bob")).toBeVisible();
    void guest;
    await guestCtx.close();
    // disconnect triggers markDisconnected — Bob shows up as (offline) in real time
    const bobItem = host.locator("li", { hasText: "Bob" });
    await expect(bobItem).toContainText(/offline/i, { timeout: 3_000 });

    await hostCtx.close();
  });
});
