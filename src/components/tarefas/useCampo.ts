"use client";

import { useOptimistic, useState, useTransition } from "react";
import { atualizarCampoAction } from "@/app/org/tarefas/acoes";
import { comConfirmacao } from "@/components/org/confirmacao";
import { anunciarXp } from "@/components/org/avisos-xp";
import type { ChaveCampo } from "@/lib/tarefas-campos";

/**
 * Edição inline de um campo: mostra o novo valor na hora (otimista) e volta ao
 * valor anterior sozinho se o servidor recusar. `erro` guarda a mensagem.
 */
export function useCampo(id: string, chave: ChaveCampo, valorServidor: string) {
  const [valor, setOtimista] = useOptimistic(valorServidor);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar(novo: string) {
    if (novo === valorServidor) return;
    setErro(null);
    iniciar(async () => {
      setOtimista(novo);
      // Com dependência aberta, o servidor pede confirmação; desistir volta ao valor anterior.
      const r = await comConfirmacao((forcar) => atualizarCampoAction(id, chave, novo, forcar));
      if (!r) return;
      if (r.erro) setErro(r.erro);
      anunciarXp(r.xp);
    });
  }
  return { valor, salvar, pendente, erro };
}
