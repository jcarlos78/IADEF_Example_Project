import { expect, test } from "@playwright/test";
import { createRoomAsHost } from "./helpers";

test.describe("AC1, AC2, AC8, AC11", () => {
  test("AC1: creates a room and redirects to /room/<id>", async ({ browser }) => {
    const { page, url, ctx } = await createRoomAsHost(browser, { nickname: "Maria" });
    expect(url).toMatch(/\/room\/[a-z0-9]{6,}/);
    await expect(page.getByRole("heading", { name: /room /i })).toBeVisible();
    await expect(page.getByText(/you are the facilitator/i)).toBeVisible();
    await ctx.close();
  });

  test("AC2: a guest joins with a nickname and appears in the list", async ({ browser }) => {
    const {
      page: host,
      url,
      ctx: hostCtx,
    } = await createRoomAsHost(browser, {
      nickname: "Maria",
    });

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(url);
    await guest.getByRole("textbox", { name: /nickname/i }).fill("Joao");
    await guest.getByRole("button", { name: /^join$/i }).click();
    await expect(guest.getByRole("heading", { name: /room /i })).toBeVisible();

    // host sees the guest join (AC12)
    await expect(host.getByText("Joao")).toBeVisible();
    await expect(guest.getByText("Maria")).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC8: an empty nickname is rejected in the NicknameDialog", async ({ browser }) => {
    const { url, ctx: hostCtx } = await createRoomAsHost(browser, { nickname: "Maria" });

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(url);
    await guest.getByRole("button", { name: /^join$/i }).click();
    await expect(guest.getByText(/nickname is required/i)).toBeVisible();
    // still on the dialog
    await expect(guest.getByRole("heading", { name: /join the room/i })).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC8: a duplicate nickname is rejected by the server", async ({ browser }) => {
    const { url, ctx: hostCtx } = await createRoomAsHost(browser, { nickname: "Maria" });

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(url);
    await guest.getByRole("textbox", { name: /nickname/i }).fill("Maria");
    await guest.getByRole("button", { name: /^join$/i }).click();
    await expect(guest.getByText(/already in use/i)).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC11: a missing room shows an error after trying to join — Create new room CTA", async ({
    page,
  }) => {
    await page.goto("/room/ghostzz123");
    // without a cookie, RoomClient shows the NicknameDialog first
    await page.getByRole("textbox", { name: /nickname/i }).fill("Tester");
    await page.getByRole("button", { name: /^join$/i }).click();
    await expect(page.getByRole("heading", { name: /room not found/i })).toBeVisible();
    const cta = page.getByRole("link", { name: /create a new room/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/");
  });
});
