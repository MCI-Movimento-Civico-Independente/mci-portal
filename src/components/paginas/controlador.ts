import type { Documento, No } from "@/lib/editor/documento";
import { textoPagina } from "@/lib/paginas/documento";
import { tituloDoServidor } from "./titulos";

/*
 * Salvamento das páginas. Há um controlador por página, fora do React: o que a pessoa
 * digitou continua guardado (e é salvo) mesmo depois de trocar de aba.
 */

export type EstadoPagina = {
  fase: "carregando" | "pronta" | "erro";
  doc: Documento | null;
  /** Muda quando o documento é trocado por fora (carregou ou recarregou do servidor). */
  revisao: number;
  salvando: boolean;
  /** Há mudanças ainda não gravadas. */
  pendente: boolean;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
  conflito: { por: string } | null;
  aviso: string | null;
  /** Texto que não foi salvo, guardado ao recarregar depois de um conflito. */
  copia: string | null;
};

const ESPERA = 1000;
const NOVA_TENTATIVA = 5000;

/** Compara documentos ignorando os parágrafos vazios que o editor põe no fim. */
export function chaveDoDocumento(doc: Documento | null): string {
  if (!doc) return "";
  const blocos: No[] = [...doc.content];
  while (blocos.length && blocos.at(-1)!.type === "paragraph" && !blocos.at(-1)!.content?.length) blocos.pop();
  return JSON.stringify(blocos);
}

export class ControladorPagina {
  private estado: EstadoPagina = {
    fase: "carregando",
    doc: null,
    revisao: 0,
    salvando: false,
    pendente: false,
    atualizadoPor: null,
    atualizadoEm: null,
    conflito: null,
    aviso: null,
    copia: null,
  };
  private versao = 0;
  private salvo = "";
  private timer: number | undefined;
  private envio: Promise<void> | null = null;
  private ouvintes = new Set<() => void>();

  constructor(private abaId: string) {}

  assinar = (f: () => void) => {
    this.ouvintes.add(f);
    return () => void this.ouvintes.delete(f);
  };
  ler = () => this.estado;

  private mudar(parte: Partial<EstadoPagina>) {
    this.estado = { ...this.estado, ...parte };
    this.ouvintes.forEach((f) => f());
  }

  private async buscar() {
    const resposta = await fetch(`/api/paginas/${this.abaId}`, { cache: "no-store" });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro ?? "Não deu para carregar a página.");
    return dados as { titulo: string; conteudo: Documento; versao: number; atualizadoPor: string | null; atualizadoEm: string };
  }

  private aplicar(p: Awaited<ReturnType<ControladorPagina["buscar"]>>) {
    tituloDoServidor(this.abaId, p.titulo);
    const mudou = p.versao !== this.versao || !this.estado.doc;
    this.versao = p.versao;
    if (mudou) this.salvo = chaveDoDocumento(p.conteudo);
    this.mudar({
      fase: "pronta",
      aviso: null,
      atualizadoPor: p.atualizadoPor,
      atualizadoEm: p.atualizadoEm,
      ...(mudou ? { doc: p.conteudo, revisao: this.estado.revisao + 1 } : {}),
    });
  }

  /** Ao mostrar a página: busca a versão atual, a não ser que haja mudanças guardadas aqui. */
  async abrir() {
    const ocupado = () => this.estado.pendente || this.estado.conflito || this.envio;
    if (ocupado()) return void this.salvarAgora();
    try {
      const pagina = await this.buscar();
      if (!ocupado()) this.aplicar(pagina);
    } catch (e) {
      const aviso = e instanceof Error ? e.message : "Não deu para carregar a página.";
      this.mudar(this.estado.doc ? { aviso } : { fase: "erro", aviso });
    }
  }

  alterar(doc: Documento) {
    const pendente = !!this.envio || chaveDoDocumento(doc) !== this.salvo;
    this.mudar({ doc, pendente, aviso: pendente ? this.estado.aviso : null });
    window.clearTimeout(this.timer);
    if (pendente && !this.estado.conflito) this.agendar(ESPERA);
  }

  private agendar(ms: number) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.salvarAgora(), ms);
  }

  async salvarAgora(): Promise<void> {
    window.clearTimeout(this.timer);
    if (this.envio) {
      await this.envio;
      return this.salvarAgora();
    }
    const { pendente, conflito, doc } = this.estado;
    if (!pendente || conflito || !doc) return;
    this.envio = this.enviar(doc).finally(() => {
      this.envio = null;
    });
    return this.envio;
  }

  private async enviar(doc: Documento) {
    const chave = chaveDoDocumento(doc);
    this.mudar({ salvando: true, aviso: null });
    const corpo = JSON.stringify({ versao: this.versao, conteudo: doc });
    try {
      const resposta = await fetch(`/api/paginas/${this.abaId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: corpo,
        // Deixa o envio terminar se a aba do navegador fechar (o navegador só permite até 64 KB).
        keepalive: new Blob([corpo]).size < 60_000,
      });
      const dados = await resposta.json().catch(() => ({}));
      if (resposta.ok) {
        this.versao = dados.versao;
        this.salvo = chave;
        const pendente = chaveDoDocumento(this.estado.doc) !== chave;
        this.mudar({ salvando: false, pendente, atualizadoPor: dados.atualizadoPor, atualizadoEm: dados.atualizadoEm });
        if (pendente) this.agendar(ESPERA);
      } else if (resposta.status === 409) {
        this.mudar({ salvando: false, conflito: { por: dados.por ?? "outra pessoa" } });
      } else {
        this.mudar({ salvando: false, aviso: dados.erro ?? "Não foi salvo." });
        // Falha do servidor: tenta de novo. Recusa (tamanho, formato, login): espera a próxima mudança.
        if (resposta.status >= 500) this.agendar(NOVA_TENTATIVA);
      }
    } catch {
      this.mudar({ salvando: false, aviso: "Sem conexão. Tentando salvar de novo…" });
      this.agendar(NOVA_TENTATIVA);
    }
  }

  /** Depois de um conflito: traz a versão do servidor e guarda o texto da pessoa para copiar. */
  async recarregar() {
    try {
      const pagina = await this.buscar();
      const meu = textoPagina(this.estado.doc);
      window.clearTimeout(this.timer);
      this.versao = -1;
      this.mudar({ conflito: null, pendente: false, copia: [this.estado.copia, meu].filter(Boolean).join("\n\n") || null });
      this.aplicar(pagina);
    } catch (e) {
      this.mudar({ aviso: e instanceof Error ? e.message : "Não deu para recarregar." });
    }
  }

  descartarCopia() {
    this.mudar({ copia: null });
  }

  temMudancas() {
    return this.estado.pendente || !!this.estado.copia;
  }

  /** A aba foi excluída: nada mais a salvar. */
  encerrar() {
    window.clearTimeout(this.timer);
    this.estado = { ...this.estado, pendente: false, copia: null, conflito: null };
  }
}

const controladores = new Map<string, ControladorPagina>();
let vigiando = false;

export function controladorDe(abaId: string): ControladorPagina {
  let c = controladores.get(abaId);
  if (!c) {
    c = new ControladorPagina(abaId);
    controladores.set(abaId, c);
  }
  if (!vigiando && typeof window !== "undefined") {
    vigiando = true;
    // Fechar ou recarregar o navegador com texto não salvo pede confirmação.
    window.addEventListener("beforeunload", (e) => {
      if ([...controladores.values()].some((x) => x.temMudancas())) e.preventDefault();
    });
  }
  return c;
}

/** Grava o que estiver pendente (antes de duplicar a aba, por exemplo). */
export const salvarPendente = (abaId: string) => controladores.get(abaId)?.salvarAgora() ?? Promise.resolve();

export function esquecerPagina(abaId: string) {
  controladores.get(abaId)?.encerrar();
  controladores.delete(abaId);
}
