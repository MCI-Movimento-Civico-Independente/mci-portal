import { NextResponse, type NextRequest } from "next/server";
import {
  acharContaPorIdentidade,
  criarContaComIdentidade,
  criarSessao,
} from "@/lib/auth/contas";
import { destinoPosLogin } from "@/lib/auth/destino";
import { validarTelegram } from "@/lib/auth/telegram";

function nomeDoTelegram(d: { id: number; first_name?: string; last_name?: string; username?: string }) {
  const completo = [d.first_name, d.last_name].filter(Boolean).join(" ").trim();
  return completo || d.username || `Membro ${d.id}`;
}

/** Recebe os dados do Telegram Login Widget, valida o hash e abre a sessão. */
export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN não configurado.");
    return NextResponse.json({ erro: "configuracao" }, { status: 500 });
  }

  const corpo = await request.json().catch(() => null);
  const validacao = validarTelegram(corpo?.user, botToken);
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.motivo }, { status: 401 });
  }
  const { dados } = validacao;

  try {
    const externoId = String(dados.id);
    const conta =
      (await acharContaPorIdentidade("telegram", externoId)) ??
      (await criarContaComIdentidade(nomeDoTelegram(dados), "telegram", externoId));

    await criarSessao(conta, `tg${externoId}@telegram.mci`);

    return NextResponse.json({ ok: true, redirect: destinoPosLogin(conta.papel, corpo?.next) });
  } catch (erro) {
    console.error("Falha no login pelo Telegram:", erro);
    return NextResponse.json({ erro: "falha" }, { status: 500 });
  }
}
