import { expect, test } from "@playwright/test";
import { createRoomAsHost, setupRoomWithTwoUsers } from "./helpers";

test.describe("AC7 — escala", () => {
  test("escolher escala T-shirt na home cria sala com cartas XS..XXL", async ({ browser }) => {
    const { page, ctx } = await createRoomAsHost(browser, {
      nickname: "H",
      scaleLabel: "T-shirt",
    });
    await expect(page.getByRole("button", { name: "XS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "XXL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "13" })).not.toBeVisible();
    await ctx.close();
  });

  test("facilitador troca escala entre rodadas; troca não é permitida durante rodada", async ({
    browser,
  }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser);

    // Default Fibonacci visível
    await expect(host.getByRole("button", { name: "13" })).toBeVisible();

    // Troca para T-shirt (sem rodada — permitido)
    await host.getByLabel(/^escala$/i).selectOption("tshirt");
    await expect(host.getByRole("button", { name: "XS" })).toBeVisible();
    await expect(host.getByRole("button", { name: "13" })).not.toBeVisible();
    // Guest também vê o novo set
    await expect(guest.getByRole("button", { name: "XS" })).toBeVisible();

    // Inicia rodada → seletor de escala fica disabled
    await host.getByRole("button", { name: /iniciar rodada/i }).click();
    await expect(host.getByLabel(/^escala$/i)).toBeDisabled();

    // Após reveal, seletor reabilita
    await host.getByRole("button", { name: "M" }).click();
    await host.getByRole("button", { name: /^revelar$/i }).click();
    await expect(host.getByLabel(/^escala$/i)).not.toBeDisabled();

    await hostCtx.close();
    await guestCtx.close();
  });
});
