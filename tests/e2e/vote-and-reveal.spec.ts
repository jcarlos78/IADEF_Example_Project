import { expect, test } from "@playwright/test";
import { setupRoomWithTwoUsers } from "./helpers";

test.describe("AC3, AC4, AC5, AC6", () => {
  test("AC3 + AC4: voto oculto, revelar entrega a ambos em < 1s", async ({ browser }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      hostName: "H",
      guestName: "Alice",
    });

    await host.getByRole("textbox", { name: /título da rodada/i }).fill("US-42");
    await host.getByRole("button", { name: /iniciar rodada/i }).click();
    await expect(guest.getByText(/votando em us-42/i)).toBeVisible();

    // Host vota 5
    await host.getByRole("button", { name: "5", exact: true }).click();
    await expect(host.getByRole("button", { name: "5", exact: true, pressed: true })).toBeVisible();
    // Guest vê marca "votou" na lista de participantes (sem ver o valor)
    const guestParticipantList = guest.getByLabel(/participantes da sala/i);
    await expect(guestParticipantList).toContainText(/H.*votou/i);
    // Resultado NÃO está visível antes do reveal
    await expect(guest.getByRole("heading", { name: /resultado/i })).not.toBeVisible();

    // Guest vota 13
    await guest.getByRole("button", { name: "13", exact: true }).click();
    await expect(
      guest.getByRole("button", { name: "13", exact: true, pressed: true }),
    ).toBeVisible();

    // AC4: revelar < 1s
    const t0 = Date.now();
    await host.getByRole("button", { name: /^revelar$/i }).click();
    await expect(guest.getByRole("heading", { name: /resultado/i })).toBeVisible({
      timeout: 1_000,
    });
    const dtMs = Date.now() - t0;
    expect(dtMs).toBeLessThan(1_000);

    // AC5: estatísticas
    const stats = guest.getByLabel(/estatísticas/i);
    await expect(stats).toContainText("9"); // average
    await expect(stats).toContainText("5"); // min
    await expect(stats).toContainText("13"); // max

    // Votos por participante
    const votes = guest.getByLabel(/votos por participante/i);
    await expect(votes).toContainText("H");
    await expect(votes).toContainText("Alice");

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC6: nova rodada limpa estado para todos", async ({ browser }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser);

    await host.getByRole("button", { name: /iniciar rodada/i }).click();
    await host.getByRole("button", { name: "3", exact: true }).click();
    await guest.getByRole("button", { name: "5", exact: true }).click();
    await host.getByRole("button", { name: /^revelar$/i }).click();
    await expect(guest.getByRole("heading", { name: /resultado/i })).toBeVisible();

    // Nova rodada
    await host.getByRole("button", { name: /nova rodada/i }).click();
    await expect(host.getByRole("button", { name: /iniciar rodada/i })).toBeVisible();
    // Resultado some dos dois clientes
    await expect(guest.getByRole("heading", { name: /resultado/i })).not.toBeVisible();
    await expect(guest.getByText(/aguardando início/i)).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("AC12: guest desconecta e lista marca como offline em tempo real", async ({ browser }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      guestName: "Bob",
    });

    await expect(host.getByText("Bob")).toBeVisible();
    void guest;
    await guestCtx.close();
    // disconnect leva ao markDisconnected — Bob aparece como (offline) em tempo real
    const bobItem = host.locator("li", { hasText: "Bob" });
    await expect(bobItem).toContainText(/offline/i, { timeout: 3_000 });

    await hostCtx.close();
  });
});
