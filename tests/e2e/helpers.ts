import { type Browser, type BrowserContext, expect, type Page } from "@playwright/test";

export interface RoomSetup {
  hostCtx: BrowserContext;
  host: Page;
  guestCtx: BrowserContext;
  guest: Page;
  roomUrl: string;
}

export async function createRoomAsHost(
  browser: Browser,
  opts: { nickname?: string; scaleLabel?: string } = {},
): Promise<{ ctx: BrowserContext; page: Page; url: string }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel(/nickname/i).fill(opts.nickname ?? "Host");
  if (opts.scaleLabel) {
    await page.getByLabel(new RegExp(opts.scaleLabel, "i")).check();
  }
  await page.getByRole("button", { name: /create room/i }).click();
  await page.waitForURL(/\/room\/[a-z0-9]+/);
  return { ctx, page, url: page.url() };
}

export async function joinAsGuest(
  browser: Browser,
  url: string,
  nickname: string,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url);
  await page.getByRole("textbox", { name: /nickname/i }).fill(nickname);
  await page.getByRole("button", { name: /^join$/i }).click();
  await expect(page.getByRole("heading", { name: /room /i })).toBeVisible();
  return { ctx, page };
}

export async function setupRoomWithTwoUsers(
  browser: Browser,
  opts: { hostName?: string; guestName?: string; scaleLabel?: string } = {},
): Promise<RoomSetup> {
  const {
    ctx: hostCtx,
    page: host,
    url,
  } = await createRoomAsHost(browser, {
    nickname: opts.hostName ?? "Host",
    scaleLabel: opts.scaleLabel,
  });
  const { ctx: guestCtx, page: guest } = await joinAsGuest(browser, url, opts.guestName ?? "Alice");
  // host sees the guest joining
  await expect(host.getByText(opts.guestName ?? "Alice")).toBeVisible();
  return { hostCtx, host, guestCtx, guest, roomUrl: url };
}
