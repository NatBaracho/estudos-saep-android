// =========================================================
// API local do app de celular
// O app usa a mesma tela do sistema do PC (app.js), que chama fetch("/api/...").
// Aqui essas chamadas são atendidas no próprio aparelho: as questões vêm de dados.js
// e as provas ficam guardadas no armazenamento do celular (localStorage). Funciona sem internet.
// As regras são as mesmas do servidor do PC (SistemaSAEP/Services/ProvaService.cs).
// =========================================================
(() => {
  const D = window.DADOS;
  const Q = new Map(D.questoes.map((q) => [q.id, q]));
  const CHAVE = "saep-dados-v1";
  const POR_PROVA = 40, DURACAO = 2 * 60 * 60;

  let db;
  try { db = JSON.parse(localStorage.getItem(CHAVE)); } catch { db = null; }
  if (!db || !Array.isArray(db.provas)) db = { seq: 0, provas: [], regra: 2 };
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* armazenamento cheio/bloqueado */ } };
  // Regra nova de montagem (reforço a cada 3 provas, todos os assuntos, níveis alternados):
  // a prova que já estava pronta (e não começou) é montada de novo
  if (db.regra !== 2) { db.provas = db.provas.filter((p) => p.status !== "pronta"); db.regra = 2; salvar(); }

  const agora = () => new Date().toISOString();
  const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const finalizadas = () => db.provas.filter((p) => p.status === "finalizada").sort((a, b) => a.finalizadaEm.localeCompare(b.finalizadaEm));
  const prova = (id) => db.provas.find((p) => p.id === +id);

  // Respostas já corrigidas: { qid, acertou, em }
  const historico = () => finalizadas().flatMap((p) => p.itens.map((i) => ({ qid: i.qid, acertou: i.acertou, em: p.finalizadaEm })));
  const usos = () => { const m = new Map(); for (const p of db.provas) for (const i of p.itens) m.set(i.qid, (m.get(i.qid) || 0) + 1); return m; };
  const desempenhoPorTema = () => {
    const t = {};
    for (const h of historico()) {
      const tema = Q.get(h.qid)?.tema; if (!tema) continue;
      t[tema] ??= { total: 0, acertos: 0 };
      t[tema].total++; if (h.acertou) t[tema].acertos++;
    }
    return t;
  };

  // ---------- Montagem das provas ----------
  function criarProva(ids, observacao) {
    const p = { id: ++db.seq, status: "pronta", observacao, iniciadaEm: null, finalizadaEm: null, acertos: null, total: null,
      itens: ids.map((qid, i) => ({ ordem: i + 1, qid, resposta: null, acertou: null })) };
    db.provas.push(p); salvar(); return p;
  }

  // ---------- Montagem da prova (mesma regra do PC: SistemaSAEP/Services/MontadorProva.cs) ----------
  // 1. Só entram as questões que você menos viu (inéditas antes de todas): cobre o banco inteiro sem repetir.
  // 2. Todos os assuntos entram, na proporção do tamanho de cada um (tema pequeno aparece pouco, para durar mais).
  // 3. Os 4 níveis entram na proporção do que falta ver e se alternam na ordem (fácil, moderado, difícil, muito difícil...).
  // As de reforço (repetidas) entram já escolhidas. Itens: { id, tema, nivel (1 a 4), usos }.
  const CICLO_REFORCO = 3, QUESTOES_REFORCO = 4; // a cada 3 provas feitas, a próxima traz 4 delas para reforçar

  function cotas(quantidades, n) {
    const soma = quantidades.reduce((a, b) => a + b, 0);
    if (!soma) return quantidades.map(() => 0);
    const exato = quantidades.map((q) => (n * q) / soma);
    const c = exato.map(Math.floor);
    const faltam = n - c.reduce((a, b) => a + b, 0);
    [...c.keys()].sort((a, b) => (exato[b] - c[b]) - (exato[a] - c[a])).slice(0, faltam).forEach((i) => c[i]++);
    return c;
  }

  function alternarNiveis(questoes) {
    const grupos = {};
    for (const q of questoes) (grupos[q.nivel] ??= []).push(q);
    return Object.values(grupos)
      .flatMap((g) => embaralhar(g).map((q, k) => ({ q, pos: k / g.length })))
      .sort((a, b) => a.pos - b.pos || a.q.nivel - b.q.nivel)
      .map((x) => x.q.id);
  }

  function montarProva(banco, repetidas, total) {
    const escolhidas = [...repetidas], porTema = {}, porNivel = [0, 0, 0, 0, 0];
    const contar = (c) => { porTema[c.tema] = (porTema[c.tema] || 0) + 1; porNivel[c.nivel]++; };
    repetidas.forEach(contar);
    const ja = new Set(repetidas.map((r) => r.id));
    const faltam = Math.max(0, total - escolhidas.length);
    const livres = embaralhar(banco.filter((c) => !ja.has(c.id))).sort((a, b) => a.usos - b.usos);
    if (!faltam || !livres.length) return alternarNiveis(escolhidas);

    const corte = livres[Math.min(faltam, livres.length) - 1].usos;
    const grupo = livres.filter((c) => c.usos <= corte).map((c) => ({ c, sorteio: Math.random() }));
    const cota = cotas([1, 2, 3, 4].map((n) => grupo.filter((g) => g.c.nivel === n).length), faltam);
    const tamTema = {};
    for (const g of grupo) tamTema[g.c.tema] = (tamTema[g.c.tema] || 0) + 1;
    const pegasNivel = [0, 0, 0, 0, 0];
    const excesso = (c) => (pegasNivel[c.nivel] < cota[c.nivel - 1] ? 0 : 1);
    const peso = (c) => ((porTema[c.tema] || 0) + 1) / tamTema[c.tema];
    const melhor = (lista, ...chaves) => lista.reduce((m, g) => {
      if (!m) return g;
      for (const k of chaves) { const d = k(g) - k(m); if (d) return d < 0 ? g : m; }
      return m;
    }, null);
    const pegar = (g) => { escolhidas.push(g.c); contar(g.c); pegasNivel[g.c.nivel]++; grupo.splice(grupo.indexOf(g), 1); };

    // 1) Uma questão de cada tema que ainda não apareceu na prova
    for (const tema of embaralhar(Object.keys(tamTema))) {
      if (escolhidas.length >= total || porTema[tema]) continue;
      pegar(melhor(grupo.filter((g) => g.c.tema === tema), (g) => g.c.usos, (g) => excesso(g.c), (g) => g.sorteio));
    }
    // 2) Completa respeitando as cotas de nível e a proporção dos temas
    while (escolhidas.length < total && grupo.length)
      pegar(melhor(grupo, (g) => g.c.usos, (g) => excesso(g.c), (g) => peso(g.c), (g) => g.sorteio));
    return alternarNiveis(escolhidas);
  }

  function descreverProva(ineditas, reforco, revisao, temas) {
    const partes = [];
    if (ineditas > 0) partes.push(`${ineditas} questões que você ainda não viu`);
    if (reforco > 0) partes.push(`${reforco} das últimas ${CICLO_REFORCO} provas para reforçar`);
    if (revisao > 0) partes.push(ineditas > 0 ? `${revisao} de revisão (as inéditas acabaram)`
      : `${revisao} de revisão: você já viu todas as questões, então voltam as que você viu menos vezes`);
    return `${partes.join(" + ")}. ${temas} assuntos, com níveis alternados.`;
  }

  const candidatas = (filtro = () => true) => {
    const u = usos();
    return D.questoes.filter(filtro).map((q) => ({ id: q.id, tema: q.tema, nivel: Math.min(4, Math.max(1, q.nivel || 2)), usos: u.get(q.id) || 0 }));
  };
  const temasDe = (ids) => new Set(ids.map((id) => Q.get(id)?.tema)).size;

  // 1ª prova (ou "só oficiais"): 40 questões oficiais, com todos os assuntos e níveis alternados
  function provaOficial() {
    const ids = montarProva(candidatas((q) => q.origem === "oficial"), [], POR_PROVA);
    return criarProva(ids, `Prova com questões oficiais do SAEP: ${temasDe(ids)} assuntos, com níveis alternados.`);
  }

  // Reforço: depois de cada 3 provas feitas, a próxima traz 4 questões dessas 3 provas (primeiro as erradas)
  function reforco(banco) {
    const feitas = finalizadas();
    if (!feitas.length || feitas.length % CICLO_REFORCO) return [];
    const itens = new Map();
    for (const p of feitas.slice(-CICLO_REFORCO)) for (const i of p.itens) itens.set(i.qid, Math.min(itens.get(i.qid) ?? 1, i.acertou ? 1 : 0));
    const ids = embaralhar([...itens]).sort((a, b) => a[1] - b[1]).slice(0, QUESTOES_REFORCO).map(([qid]) => qid);
    return banco.filter((c) => ids.includes(c.id));
  }

  function proximaProva() {
    if (db.provas.some((p) => p.status === "pronta" || p.status === "andamento")) return;
    const banco = candidatas(), repetidas = reforco(banco);
    const ids = montarProva(banco, repetidas, POR_PROVA);
    const usos = new Map(banco.map((c) => [c.id, c.usos]));
    const ineditas = ids.filter((id) => usos.get(id) === 0).length;
    criarProva(ids, descreverProva(ineditas, repetidas.length, ids.length - ineditas - repetidas.length, temasDe(ids)));
  }

  function finalizar(p) {
    if (p.status !== "andamento") return;
    for (const i of p.itens) i.acertou = i.resposta === Q.get(i.qid)?.correta;
    p.status = "finalizada"; p.finalizadaEm = agora();
    p.acertos = p.itens.filter((i) => i.acertou).length; p.total = p.itens.length;
    salvar();
    proximaProva(); // a próxima já fica pronta
  }

  function provaAtual() {
    const p = db.provas.find((x) => x.status === "andamento") ?? db.provas.filter((x) => x.status === "pronta").at(-1);
    if (!p) return null;
    let restantes = DURACAO;
    if (p.status === "andamento") {
      restantes = Math.max(0, DURACAO - Math.floor((Date.now() - Date.parse(p.iniciadaEm)) / 1000));
      if (restantes === 0) { finalizar(p); return provaAtual(); }
    }
    return { id: p.id, status: p.status, observacao: p.observacao, iniciadaEm: p.iniciadaEm, segundosRestantes: restantes,
      respondidas: p.itens.filter((i) => i.resposta).length, total: p.itens.length };
  }

  const campos = (q) => ({ questaoId: q.id, tema: q.tema, nivel: q.nivel ?? 2, enunciado: q.enunciado, altA: q.a, altB: q.b, altC: q.c, altD: q.d, imagem: q.imagem ?? null });

  // ---------- Rotas (as mesmas do servidor do PC) ----------
  const rotas = [
    ["GET", /^\/api\/status$/, () => ({
      professorDisponivel: false,
      provasFeitas: finalizadas().length,
      ineditas: (() => { const u = usos(); return D.questoes.filter((q) => !u.has(q.id)).length; })(),
      prova: provaAtual(),
    })],
    ["POST", /^\/api\/provas\/nova$/, (_m, qs) => {
      const atual = provaAtual();
      if (atual) return atual;
      if (finalizadas().length === 0 || qs.get("oficial") === "true") provaOficial(); else proximaProva();
      return provaAtual();
    }],
    ["POST", /^\/api\/provas\/(\d+)\/iniciar$/, ([, id]) => {
      const p = prova(id);
      if (p?.status === "pronta") { p.status = "andamento"; p.iniciadaEm = agora(); salvar(); }
      return provaAtual();
    }],
    ["GET", /^\/api\/provas\/(\d+)\/questoes$/, ([, id]) => {
      const p = prova(id);
      if (p?.status !== "andamento") return [];
      return p.itens.map((i) => ({ ordem: i.ordem, ...campos(Q.get(i.qid)), resposta: i.resposta }));
    }],
    ["PUT", /^\/api\/provas\/(\d+)\/respostas\/(\d+)$/, ([, id, ordem], _qs, corpo) => {
      const p = prova(id);
      const dentroDoTempo = p?.status === "andamento" && (Date.now() - Date.parse(p.iniciadaEm)) / 1000 <= DURACAO + 30;
      const r = corpo?.resposta ? String(corpo.resposta).toUpperCase() : null;
      if (dentroDoTempo && (r === null || "ABCD".includes(r))) { p.itens[+ordem - 1].resposta = r; salvar(); }
      return null;
    }],
    ["POST", /^\/api\/provas\/(\d+)\/finalizar$/, ([, id]) => { const p = prova(id); if (p) finalizar(p); return { id: +id }; }],
    ["GET", /^\/api\/provas\/(\d+)\/resultado$/, ([, id]) => {
      const p = prova(id);
      if (p?.status !== "finalizada") return [404];
      const itens = p.itens.map((i) => { const q = Q.get(i.qid);
        return { ordem: i.ordem, ...campos(q), origem: q.origem, correta: q.correta, resposta: i.resposta, acertou: !!i.acertou, explicacao: q.explicacao ?? null }; });
      const grupos = {};
      for (const i of itens) { grupos[i.tema] ??= { tema: i.tema, total: 0, acertos: 0 }; grupos[i.tema].total++; if (i.acertou) grupos[i.tema].acertos++; }
      const porTema = Object.values(grupos).sort((a, b) => a.acertos / a.total - b.acertos / b.total);
      const tempoSegundos = Math.round((Date.parse(p.finalizadaEm) - Date.parse(p.iniciadaEm)) / 1000);
      return { id: p.id, acertos: p.acertos, total: p.total, tempoSegundos, porTema, itens };
    }],
    ["POST", /^\/api\/questoes\/([^/]+)\/explicacao$/, ([, id]) => {
      const q = Q.get(decodeURIComponent(id));
      return q?.explicacao ? { texto: q.explicacao }
        : { texto: null, erro: "Explicação ainda não escrita. Use o botão abaixo para perguntar ao professor." };
    }],
    ["GET", /^\/api\/dica$/, () => {
      const temas = desempenhoPorTema();
      const erro = (t) => (temas[t] ? 1 - temas[t].acertos / temas[t].total : 0.3);
      const com = D.questoes.filter((q) => q.explicacao?.includes("Dica para a prova:"));
      if (!com.length) return [404];
      const q = com.map((q) => ({ q, k: Math.random() * (1 + 3 * erro(q.tema)) })).sort((a, b) => b.k - a.k)[0].q;
      const m = /Dica para a prova:\*\*\s*(.+)/.exec(q.explicacao);
      return { tema: q.tema, dica: m ? m[1].trim() : "" };
    }],
    ["GET", /^\/api\/relatorio$/, () => {
      const provas = finalizadas().map((p) => ({ Id: p.id, FinalizadaEm: p.finalizadaEm, Acertos: p.acertos, Total: p.total,
        TempoSegundos: Math.round((Date.parse(p.finalizadaEm) - Date.parse(p.iniciadaEm)) / 1000) }));
      const temas = Object.entries(desempenhoPorTema()).map(([Tema, t]) => ({ Tema, Total: t.total, Acertos: t.acertos }))
        .sort((a, b) => a.Acertos / a.Total - b.Acertos / b.Total);
      const banco = { Oficiais: D.questoes.filter((q) => q.origem === "oficial").length, Ia: D.questoes.filter((q) => q.origem !== "oficial").length };
      return { provas, temas, banco };
    }],
    ["GET", /^\/api\/estudo\/temas$/, () => {
      const t = desempenhoPorTema(), lista = {};
      for (const q of D.questoes) lista[q.tema] = (lista[q.tema] || 0) + 1;
      return Object.entries(lista).map(([tema, questoes]) => ({ tema, questoes, respondidas: t[tema]?.total ?? 0, acertos: t[tema]?.acertos ?? 0, temAula: !!D.aulas[tema] }));
    }],
    ["GET", /^\/api\/estudo\/aula$/, (_m, qs) => { const tema = qs.get("tema"); return D.aulas[tema] ? { tema, texto: D.aulas[tema] } : [404]; }],
    ["GET", /^\/api\/estudo\/treino$/, (_m, qs) => {
      const tema = qs.get("tema"), n = Math.min(30, Math.max(1, +(qs.get("n") || 10)));
      const vistas = new Map(); // qid -> errou alguma vez?
      for (const h of historico()) vistas.set(h.qid, (vistas.get(h.qid) || false) || !h.acertou);
      return D.questoes.filter((q) => q.tema === tema)
        .map((q) => ({ q, k: (vistas.get(q.id) === true ? 0 : vistas.has(q.id) ? 1 : 2) + Math.random() }))
        .sort((a, b) => a.k - b.k).slice(0, n)
        .map(({ q }) => ({ ...campos(q), correta: q.correta, explicacao: q.explicacao ?? null, origem: q.origem }));
    }],
    ["GET", /^\/api\/chat$/, () => []],
    ["DELETE", /^\/api\/chat$/, () => null],
  ];

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (entrada, opcoes = {}) => {
    const url = new URL(typeof entrada === "string" ? entrada : entrada.url, location.href);
    if (!url.pathname.startsWith("/api/")) return fetchOriginal(entrada, opcoes);
    const metodo = (opcoes.method || "GET").toUpperCase();
    for (const [m, re, f] of rotas) {
      const achou = m === metodo && re.exec(url.pathname);
      if (!achou) continue;
      let corpo = null;
      try { corpo = opcoes.body ? JSON.parse(opcoes.body) : null; } catch { /* corpo inválido */ }
      const r = f(achou, url.searchParams, corpo);
      if (Array.isArray(r) && r.length === 1 && typeof r[0] === "number") return new Response(null, { status: r[0] });
      if (r === null) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("Sem professor online no celular. Use o app do Claude.", { status: 503 });
  };
})();
