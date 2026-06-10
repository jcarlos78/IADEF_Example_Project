// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NicknameDialog } from "./NicknameDialog";

describe("NicknameDialog — AC2, AC8", () => {
  it("renderiza título e descrição padrão", () => {
    render(<NicknameDialog onSubmit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /entre na sala/i })).toBeInTheDocument();
    expect(screen.getByText(/apelido para participar/i)).toBeInTheDocument();
  });

  it("não chama onSubmit quando apelido está vazio", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/apelido/i);
  });

  it("chama onSubmit com apelido trimado", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/apelido/i), "  Alice  ");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    expect(onSubmit).toHaveBeenCalledWith("Alice");
  });

  it("submete via Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/apelido/i), "Bob{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Bob");
  });

  it("exibe errorMessage externa (ex.: apelido duplicado vindo do servidor)", () => {
    render(
      <NicknameDialog
        onSubmit={vi.fn()}
        errorMessage='Apelido "Alice" já está em uso nesta sala.'
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/já está em uso/i);
  });

  it("erro local tem prioridade sobre errorMessage externa", async () => {
    const user = userEvent.setup();
    render(<NicknameDialog onSubmit={vi.fn()} errorMessage="Erro do servidor" />);
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/apelido é obrigatório/i);
  });

  it("desabilita botão e input enquanto isSubmitting", () => {
    render(<NicknameDialog onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /entrando/i })).toBeDisabled();
    expect(screen.getByLabelText(/apelido/i)).toBeDisabled();
  });

  it("aceita título e descrição customizados", () => {
    render(
      <NicknameDialog
        onSubmit={vi.fn()}
        title="Sala da equipe X"
        description="Use o seu nome de Slack."
      />,
    );
    expect(screen.getByRole("heading", { name: /sala da equipe x/i })).toBeInTheDocument();
    expect(screen.getByText(/slack/i)).toBeInTheDocument();
  });
});
