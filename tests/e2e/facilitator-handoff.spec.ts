import { expect, test } from "@playwright/test";
import { setupRoomWithTwoUsers } from "./helpers";

test.describe("AC10 — host handoff", () => {
  test("host fecha aba, após grace period o mais antigo conectado é promovido", async ({
    browser,
  }) => {
    const { host, guest, hostCtx, guestCtx } = await setupRoomWithTwoUsers(browser, {
      hostName: "Host",
      guestName: "Alice",
    });

    // Guest ainda NÃO é host
    await expect(guest.getByText(/você é o facilitador/i)).not.toBeVisible();

    // Host fecha tudo
    await hostCtx.close();
    void host; // referência mantida apenas para typecheck

    // Em ~2s (HOST_GRACE_MS) + ~300ms (TICK_INTERVAL_MS), Alice vira facilitadora
    await expect(guest.getByText(/você é o facilitador/i)).toBeVisible({
      timeout: 5_000,
    });

    // E os controles do facilitador aparecem
    await expect(guest.getByRole("button", { name: /iniciar rodada/i })).toBeVisible();

    await guestCtx.close();
  });
});
