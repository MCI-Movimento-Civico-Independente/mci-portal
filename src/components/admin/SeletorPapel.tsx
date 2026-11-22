"use client";

import { useOptimistic, useState, useTransition } from "react";
import { alterarPapelAction } from "@/app/org/admin/acoes";

const PAPEIS = [
  { valor: "membro", rotulo: "Membro" },
  { valor: "organizacao", rotulo: "Organização" },
  { valor: "admin", rotulo: "Admin" },
];

export function SeletorPapel({ contaId, papel, nome }: { contaId: string; papel: string; nome: string }) {
  const [valor, setOtimista] = useOptimistic(papel);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <select
        aria-label={`Papel de ${nome}`}
        value={valor}
        disabled={pendente}
        onChange={(e) => {
          const novo = e.target.value;
          setErro(null);
          iniciar(async () => {
            setOtimista(novo);
            const r = await alterarPapelAction(contaId, novo);
            if (r.erro) setErro(r.erro);
          });
        }}
        className="min-h-11 w-40 border border-linha bg-creme-claro px-2 text-sm font-bold hover:border-preto disabled:opacity-60"
      >
        {PAPEIS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.rotulo}
          </option>
        ))}
      </select>
      {erro && (
        <p role="alert" className="mt-1 text-xs font-bold text-laranja-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
