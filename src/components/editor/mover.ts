import type { Editor } from "@tiptap/core";
import { Fragment, type Node as NoDoc } from "@tiptap/pm/model";

/*
 * O que a alça de bloco move: blocos do documento e das colunas, e itens de lista (comuns e de
 * tarefas) sozinhos. Um item que sai da lista vira o conteúdo dele (um parágrafo).
 */

export type Unidade = { pos: number; no: NoDoc; item: boolean };

/** Um lugar onde a unidade arrastada pode cair. */
export type Vaga = { pos: number; nivel: number; recipiente: number; topo: number; esquerda: number; direita: number; conteudo: Fragment };

export const ehItem = (no: NoDoc) => no.type.name === "listItem" || no.type.name === "taskItem";
export const ehLista = (no: NoDoc) => ["bulletList", "orderedList", "taskList"].includes(no.type.name);

export function unidades(doc: NoDoc): Unidade[] {
  const lista: Unidade[] = [];
  doc.descendants((no, pos, pai) => {
    if (ehItem(no)) lista.push({ pos, no, item: true });
    else if (pai && (pai.type.name === "doc" || pai.type.name === "coluna") && no.type.name !== "coluna") lista.push({ pos, no, item: false });
    // As linhas de dentro de uma tabela não são arrastadas.
    return no.type.name !== "table";
  });
  return lista;
}

export const elementoDe = (e: Editor, pos: number) => {
  const dom = e.view.nodeDOM(pos);
  return dom instanceof HTMLElement ? dom : null;
};

/** O que o item vira em cada lista (ou fora delas). Null: não cabe. */
function conteudoPara(e: Editor, u: Unidade, recipiente: NoDoc): Fragment | null {
  if (!u.item) return ehLista(recipiente) ? null : Fragment.from(u.no);
  if (!ehLista(recipiente)) return u.no.content;
  const { taskItem, listItem } = e.state.schema.nodes;
  const tipo = recipiente.type.name === "taskList" ? taskItem : listItem;
  if (u.no.type === tipo) return Fragment.from(u.no);
  return Fragment.from(tipo.create(tipo === taskItem ? { checked: false } : null, u.no.content));
}

/** Todas as vagas na tela para a unidade arrastada. */
export function vagas(e: Editor, u: Unidade): Vaga[] {
  const { doc } = e.state;
  const fim = u.pos + u.no.nodeSize;
  const pai = doc.resolve(u.pos).parent;
  const saida: Vaga[] = [];

  const visitar = (recipiente: NoDoc, inicio: number, nivel: number, posRecipiente: number) => {
    const conteudo = conteudoPara(e, u, recipiente);
    const filhos: { pos: number; no: NoDoc }[] = [];
    recipiente.forEach((no, desloc) => filhos.push({ pos: inicio + desloc, no }));
    const telas = filhos.map((f) => elementoDe(e, f.pos)?.getBoundingClientRect());
    const caixa = posRecipiente < 0 ? e.view.dom.getBoundingClientRect() : elementoDe(e, posRecipiente)?.getBoundingClientRect();
    if (conteudo && caixa) {
      for (let i = 0; i <= filhos.length; i++) {
        const pos = i < filhos.length ? filhos[i].pos : inicio + recipiente.content.size;
        // Dentro dela mesma, ou no lugar onde já está.
        if (pos > u.pos && pos < fim) continue;
        if (recipiente === pai && (pos === u.pos || pos === fim)) continue;
        if (!recipiente.canReplace(i, i, conteudo)) continue;
        const r = i < telas.length ? telas[i] : telas.at(-1);
        if (!r) continue;
        saida.push({
          pos,
          nivel,
          recipiente: posRecipiente,
          topo: i < telas.length ? r.top - 2 : r.bottom + 2,
          esquerda: ehLista(recipiente) ? r.left : caixa.left,
          direita: caixa.right,
          conteudo,
        });
      }
    }
    for (const f of filhos) {
      if (f.pos === u.pos || f.no.type.name === "table") continue;
      if (f.no.isTextblock || f.no.isAtom) continue;
      // Colunas e listas aninhadas: um nível a mais só para listas.
      visitar(f.no, f.pos + 1, ehLista(f.no) ? nivel + 1 : nivel, f.pos);
    }
  };
  visitar(doc, 0, 0, -1);
  // Itens, citações e alternantes não recebem blocos arrastados: só documento, colunas e listas.
  return saida.filter((v) => {
    const r = v.recipiente < 0 ? doc : doc.nodeAt(v.recipiente)!;
    return r.type.name === "doc" || r.type.name === "coluna" || ehLista(r);
  });
}

/**
 * A vaga mais próxima do ponteiro. Quando várias coincidem na mesma altura (fim de uma lista e
 * linha seguinte), arrastar para a esquerda sai um nível e para a direita entra. Na ponta de
 * OUTRA lista, o item só entra nela se a pessoa arrastar para a direita.
 */
export function escolherVaga(
  lista: Vaga[],
  x: number,
  y: number,
  origem: { recipiente: number; nivel: number; desvio: number },
): Vaga | null {
  const alvo = origem.nivel + origem.desvio;
  const peso = (v: Vaga) =>
    Math.abs(v.nivel - alvo) + (origem.desvio <= 0 && v.nivel > 0 && v.recipiente !== origem.recipiente ? 1.5 : 0);
  // Em colunas lado a lado, vale a coluna sob o ponteiro.
  const largas = lista.filter((v) => x >= v.esquerda - 120 && x <= v.direita + 40);
  const candidatas = (largas.length ? largas : lista).map((v) => ({
    v,
    d: Math.abs(v.topo - y) + (x < v.esquerda - 60 || x > v.direita ? 200 : 0),
  }));
  if (!candidatas.length) return null;
  const menor = Math.min(...candidatas.map((c) => c.d));
  return candidatas
    .filter((c) => c.d <= menor + 6)
    .sort((a, b) => peso(a.v) - peso(b.v) || a.d - b.d)[0].v;
}

/** Trecho a apagar quando a unidade sai: uma lista que ficaria vazia vai junto. */
function trechoDe(e: Editor, u: Unidade) {
  const $pos = e.state.doc.resolve(u.pos);
  let de = u.pos;
  let ate = u.pos + u.no.nodeSize;
  let profundidade = $pos.depth;
  while (profundidade > 0 && ehLista($pos.node(profundidade)) && $pos.node(profundidade).childCount === 1) {
    de = $pos.before(profundidade);
    ate = $pos.after(profundidade);
    profundidade--;
  }
  // Documento, coluna ou citação não podem ficar sem nada: sobra uma linha vazia.
  const sobraVazio = $pos.node(profundidade).childCount === 1;
  return { de, ate, sobraVazio };
}

export function mover(e: Editor, u: Unidade, vaga: Pick<Vaga, "pos" | "conteudo">) {
  const { de, ate, sobraVazio } = trechoDe(e, u);
  const tr = e.state.tr;
  if (sobraVazio) tr.replaceWith(de, ate, e.state.schema.nodes.paragraph.create());
  else tr.delete(de, ate);
  tr.insert(tr.mapping.map(vaga.pos, vaga.pos <= de ? -1 : 1), vaga.conteudo);
  e.view.dispatch(tr.scrollIntoView());
}

export function excluir(e: Editor, u: Unidade) {
  const { de, ate, sobraVazio } = trechoDe(e, u);
  const tr = e.state.tr;
  if (sobraVazio) tr.replaceWith(de, ate, e.state.schema.nodes.paragraph.create());
  else tr.delete(de, ate);
  e.view.dispatch(tr);
}

export const duplicar = (e: Editor, u: Unidade) => e.view.dispatch(e.state.tr.insert(u.pos + u.no.nodeSize, u.no));

/** Troca de lugar com o vizinho de cima (-1) ou de baixo (1). Devolve null se não houver. */
export function vizinho(e: Editor, u: Unidade, passo: -1 | 1): Pick<Vaga, "pos" | "conteudo"> | null {
  const $pos = e.state.doc.resolve(u.pos);
  const i = $pos.index() + passo;
  if (i < 0 || i >= $pos.parent.childCount) return null;
  const outro = $pos.parent.child(i);
  const pos = passo < 0 ? u.pos - outro.nodeSize : u.pos + u.no.nodeSize + outro.nodeSize;
  return { pos, conteudo: Fragment.from(u.no) };
}
