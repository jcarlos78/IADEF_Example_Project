import { expect, test } from "@playwright/test";
import { createRoomAsHost, setupRoomWithTwoUsers } from "./helpers";

test.describe("AC7 — scale", () => {
  test("picking T-shirt scale on the home creates a room with XS..XXL cards", async ({
    browser,
  }) => {
    const { page, ctx } = await createRoomAsHost(browser, {
      nickname: "H",
      scaleLabel: "T-shirt",
    });
    await expect(page.getByRole("button", { name: "XS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "XXL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "13" })).not.toBeVisible();
    await ctx.close();
  });

  test("facilitator switches the scale between rounds; switching is not allowed during a round", async ({
    browser,
  }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser);

    // Default Fibonacci visible
    await expect(host.getByRole("button", { name: "13" })).toBeVisible();

    // Switch to T-shirt (no round in progress — allowed)
    await host.getByLabel(/^scale$/i).selectOption("tshirt");
    await expect(host.getByRole("button", { name: "XS" })).toBeVisible();
    await expect(host.getByRole("button", { name: "13" })).not.toBeVisible();
    // Guest also sees the new set
    await expect(guest.getByRole("button", { name: "XS" })).toBeVisible();

    // Start a round → scale select becomes disabled
    await host.getByRole("button", { name: /start round/i }).click();
    await expect(host.getByLabel(/^scale$/i)).toBeDisabled();

    // After reveal, the select re-enables
    await host.getByRole("button", { name: "M" }).click();
    await host.getByRole("button", { name: /^reveal$/i }).click();
    await expect(host.getByLabel(/^scale$/i)).not.toBeDisabled();

    await hostCtx.close();
    await guestCtx.close();
  });
});
