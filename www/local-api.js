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
  const POR_PROVA = 40, DURACAO = 2 * 60 * 60, MAX_REPETIDAS = 8;

  let db;
  try { db = JSON.parse(localStorage.getItem(CHAVE)); } catch { db = null; }
  if (!db || !Array.isArray(db.provas)) db = { seq: 0, provas: [] };
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* armazenamento cheio/bloqueado */ } };

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

  // 1ª prova: 40 questões oficiais, priorizando as menos usadas
  function provaOficial() {
    const u = usos();
    const ids = D.questoes.filter((q) => q.origem === "oficial")
      .map((q) => ({ id: q.id, k: (u.get(q.id) || 0) + Math.random() * 0.5 }))
      .sort((a, b) => a.k - b.k).slice(0, POR_PROVA).map((x) => x.id);
    return criarProva(embaralhar(ids), "Prova com questões oficiais do SAEP.");
  }

  // Próximas: até 8 que você errou (e não acertou depois) + as que você menos viu, com mais chance nos temas em que erra mais
  function proximaProva() {
    if (db.provas.some((p) => p.status === "pronta" || p.status === "andamento")) return;
    const ultimo = new Map(); // qid -> { certo: data, errado: data }
    for (const h of historico()) {
      const x = ultimo.get(h.qid) ?? {}; x[h.acertou ? "certo" : "errado"] = h.em; ultimo.set(h.qid, x);
    }
    const repetidas = [...ultimo].filter(([, x]) => x.errado && (!x.certo || x.errado > x.certo))
      .map(([qid, x]) => ({ qid, k: x.errado + Math.random() })).sort((a, b) => (a.k < b.k ? 1 : -1))
      .slice(0, MAX_REPETIDAS).map((x) => x.qid);

    const u = usos(), temas = desempenhoPorTema(), ja = new Set(repetidas);
    const erro = (tema) => (temas[tema] ? 1 - temas[tema].acertos / temas[tema].total : 0.3);
    const resto = D.questoes.filter((q) => !ja.has(q.id))
      .map((q) => ({ id: q.id, usos: u.get(q.id) || 0, k: Math.random() * (1 + 2 * erro(q.tema)) }))
      .sort((a, b) => a.usos - b.usos || b.k - a.k)
      .slice(0, POR_PROVA - repetidas.length);
    const ineditas = resto.filter((x) => x.usos === 0).length;
    criarProva(embaralhar([...repetidas, ...resto.map((x) => x.id)]),
      `${ineditas} questões que você ainda não viu + ${repetidas.length} que você errou antes.`);
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

  const campos = (q) => ({ questaoId: q.id, tema: q.tema, enunciado: q.enunciado, altA: q.a, altB: q.b, altC: q.c, altD: q.d, imagem: q.imagem ?? null });

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
