import { expect, test } from "@playwright/test";
import { createRoomAsHost } from "./helpers";

test.describe("AC1, AC2, AC8, AC11", () => {
  test("AC1: cria sala e redireciona para /room/<id>", async ({ browser }) => {
    const { page, url, ctx } = await createRoomAsHost(browser, { nickname: "Maria" });
    expect(url).toMatch(/\/room\/[a-z0-9]{6,}/);
    await expect(page.getByRole("heading", { name: /sala /i })).toBeVisible();
    await expect(page.getByText(/você é o facilitador/i)).toBeVisible();
    await ctx.close();
  });

  test("AC2: guest entra com apelido e aparece na lista", async ({ browser }) => {
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
    await guest.getByRole("textbox", { name: /apelido/i }).fill("Joao");
    await guest.getByRole("button", { name: /entrar/i }).click();
    await expect(guest.getByRole("heading", { name: /sala /i })).toBeVisible();

    // host vê o guest entrando (AC12)
    await expect(host.getByText("Joao")).toBeVisible();
    await expect(guest.getByText("Maria")).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC8: apelido vazio é rejeitado no NicknameDialog", async ({ browser }) => {
    const { url, ctx: hostCtx } = await createRoomAsHost(browser, { nickname: "Maria" });

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(url);
    await guest.getByRole("button", { name: /entrar/i }).click();
    await expect(guest.getByText(/apelido é obrigatório/i)).toBeVisible();
    // ainda no dialog
    await expect(guest.getByRole("heading", { name: /entrar na sala/i })).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC8: apelido duplicado é rejeitado pelo servidor", async ({ browser }) => {
    const { url, ctx: hostCtx } = await createRoomAsHost(browser, { nickname: "Maria" });

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(url);
    await guest.getByRole("textbox", { name: /apelido/i }).fill("Maria");
    await guest.getByRole("button", { name: /entrar/i }).click();
    await expect(guest.getByText(/já está em uso/i)).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC11: sala inexistente mostra erro após tentar entrar — CTA Criar nova sala", async ({
    page,
  }) => {
    await page.goto("/room/ghostzz123");
    // sem cookie, RoomClient mostra NicknameDialog primeiro
    await page.getByRole("textbox", { name: /apelido/i }).fill("Tester");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByRole("heading", { name: /sala não encontrada/i })).toBeVisible();
    const cta = page.getByRole("link", { name: /criar nova sala/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/");
  });
});
