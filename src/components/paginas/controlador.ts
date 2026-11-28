import type { Documento, No } from "@/lib/editor/documento";
import type { Uso } from "@/lib/paginas/arquivos-tipos";
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
  /** Espaço usado pelos arquivos do projeto. */
  uso: Uso | null;
};

/** Atributos que só existem enquanto um arquivo sobe. */
const PASSAGEIROS = new Set(["uploadId", "estado", "erro", "previa"]);
const semUpload = (no: No) => (no.type === "imagem" || no.type === "arquivo") && !no.attrs?.arquivoId;

/** O que vai para o servidor: imagens e arquivos que ainda não terminaram de subir ficam de fora. */
export function semPendentes(doc: Documento): Documento {
  const limpar = (no: No): No => {
    if (!no.content) return no;
    const filhos = no.content.filter((f) => !semUpload(f)).map(limpar);
    // Uma coluna ou citação não pode ficar sem nada dentro.
    return { ...no, content: filhos.length || !no.content.length ? filhos : [{ type: "paragraph" }] };
  };
  return limpar(doc as unknown as No) as unknown as Documento;
}

const algum = (nos: No[], teste: (n: No) => boolean): boolean => nos.some((n) => teste(n) || algum(n.content ?? [], teste));
export const temEnvio = (doc: Documento | null) => !!doc && algum(doc.content, (n) => n.attrs?.estado === "enviando");

const ESPERA = 1000;
const NOVA_TENTATIVA = 5000;

/** Compara documentos ignorando os parágrafos vazios que o editor põe no fim. */
export function chaveDoDocumento(doc: Documento | null): string {
  if (!doc) return "";
  const blocos: No[] = [...semPendentes(doc).content];
  while (blocos.length && blocos.at(-1)!.type === "paragraph" && !blocos.at(-1)!.content?.length) blocos.pop();
  return JSON.stringify(blocos, (chave, valor) => (valor === null || PASSAGEIROS.has(chave) ? undefined : valor));
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
    uso: null,
  };
  /** O editor aberto, que aplica o resultado dos envios. */
  private aplicador: ((uploadId: string, attrs: Record<string, unknown>) => boolean) | null = null;
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
    return dados as { titulo: string; conteudo: Documento; versao: number; atualizadoPor: string | null; atualizadoEm: string; uso: Uso };
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
      uso: p.uso,
      ...(mudou ? { doc: p.conteudo, revisao: this.estado.revisao + 1 } : {}),
    });
  }

  /** Ao mostrar a página: busca a versão atual, a não ser que haja mudanças guardadas aqui. */
  async abrir() {
    const ocupado = () => this.estado.pendente || this.estado.conflito || this.envio || temEnvio(this.estado.doc);
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

  registrarEditor(f: (uploadId: string, attrs: Record<string, unknown>) => boolean) {
    this.aplicador = f;
    return () => {
      if (this.aplicador === f) this.aplicador = null;
    };
  }

  /** Andamento de um envio: vai para o editor aberto ou, se a pessoa trocou de aba, direto no documento. */
  atualizarNo(uploadId: string, attrs: Record<string, unknown>) {
    if (this.aplicador?.(uploadId, attrs) || !this.estado.doc) return;
    const aplicar = (no: No): No => ({
      ...no,
      ...(no.attrs?.uploadId === uploadId ? { attrs: { ...no.attrs, ...attrs } } : {}),
      ...(no.content ? { content: no.content.map(aplicar) } : {}),
    });
    this.alterar(aplicar(this.estado.doc as unknown as No) as unknown as Documento);
  }

  definirUso(uso: Uso) {
    this.mudar({ uso });
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
    const corpo = JSON.stringify({ versao: this.versao, conteudo: semPendentes(doc) });
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
        this.mudar({ salvando: false, pendente, atualizadoPor: dados.atualizadoPor, atualizadoEm: dados.atualizadoEm, uso: dados.uso ?? this.estado.uso });
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
    return this.estado.pendente || !!this.estado.copia || temEnvio(this.estado.doc);
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
