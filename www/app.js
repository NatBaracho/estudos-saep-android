// =========================================================
// Estudos SAEP — interface (JavaScript puro, sem bibliotecas)
// =========================================================
const $ = (sel) => document.querySelector(sel);
const LETRAS = ["A", "B", "C", "D"];
const estado = { status: null, questoes: [], atual: 0, timer: null, fimEm: null, ultimoResultado: null, poll: null };

async function api(url, opcoes = {}) {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opcoes });
  if (!r.ok && r.status !== 204) throw new Error(`Erro ${r.status} em ${url}`);
  return r.status === 204 ? null : r.json();
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const hms = (seg) => { seg = Math.max(0, seg | 0); return `${Math.floor(seg / 3600)}:${String(Math.floor(seg / 60) % 60).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`; };
// Imagens das questões: figura do enunciado e alternativas que são imagens ([img:caminho])
const figuraHTML = (src) => src ? `<figure class="figura"><img src="${esc(src)}" alt="Imagem da questão" data-zoom>
  <figcaption>🔍 Clique na imagem para ampliar</figcaption></figure>` : "";
const altHTML = (a) => { const m = /^\[img:(.+)\]$/.exec(a ?? ""); return m ? `<span class="img-alt-caixa"><img class="img-alt" src="${esc(m[1])}" alt="Alternativa em imagem"><i class="zoom-alt" data-src="${esc(m[1])}" title="Ampliar">🔍</i></span>` : esc(a); };
const pct = (a, t) => (t ? Math.round((100 * a) / t) : 0);
const classeBarra = (p) => (p < 50 ? "ruim" : p < 75 ? "media" : "boa"); // verde só a partir da média 7,5

// Markdown simples: blocos de código, `código`, **negrito**, listas e parágrafos
function md(texto) {
  const blocos = [];
  let t = String(texto ?? "").replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _l, c) => { blocos.push(c); return `\u0000${blocos.length - 1}\u0000`; });
  t = esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const html = t.split(/\n{2,}/).map((p) => {
    if (/^\u0000\d+\u0000$/.test(p.trim())) return p.trim();
    // Linhas que começam com "- " viram itens de lista; as outras, texto normal
    let html = "", lista = [], texto = [];
    const fecharTexto = () => { if (texto.length) html += `<p>${texto.join("<br>")}</p>`; texto = []; };
    const fecharLista = () => { if (lista.length) html += `<ul>${lista.map((l) => `<li>${l}</li>`).join("")}</ul>`; lista = []; };
    for (const l of p.split("\n")) {
      if (/^\s*[-*]\s+/.test(l)) { fecharTexto(); lista.push(l.replace(/^\s*[-*]\s+/, "")); }
      else if (l.trim()) { fecharLista(); texto.push(l); }
    }
    fecharTexto(); fecharLista();
    return html;
  }).join("");
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre><code>${esc(blocos[i])}</code></pre>`);
}

// ---------------- Abas ----------------
function abrirAba(nome) {
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === nome));
  for (const a of ["prova", "estudo", "evolucao"]) $(`#aba-${a}`).hidden = a !== nome;
  if (nome === "evolucao") mostrarEvolucao();
  if (nome === "estudo" && !estado.estudando) mostrarTemas();
}
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

// ---------------- Tela inicial / estado da prova ----------------
async function atualizar() {
  clearTimeout(estado.poll);
  estado.status = await api("/api/status");
  if (!estado.saudou) { estado.saudou = true; Prof.reagir("inicio", estado.status); }
  // Sem API: avisa quando as questões inéditas estão acabando
  const poucas = !estado.status.professorDisponivel && estado.status.ineditas < 40;
  $("#aviso-chave").hidden = !poucas;
  $("#aviso-chave").innerHTML = `Restam só <strong>${estado.status.ineditas}</strong> questões que você ainda não viu.
    Peça mais no app do Claude: diga <code>vamos professor, gera mais questões</code> A próxima prova já usa as questões novas.`;
  const p = estado.status.prova;
  if (p?.status === "andamento") return abrirProva(p);
  pararRelogio();
  const el = $("#aba-prova");

  if (!p) {
    const primeira = estado.status.provasFeitas === 0;
    el.innerHTML = `<div class="card centro boas-vindas">
      <div class="heroi">${Prof.svg()}</div>
      <h1>${primeira ? "Vamos começar? 🚀" : "Pronto para mais uma? 💪"}</h1>
      <p class="muted">${primeira
        ? "Sua primeira prova tem <strong>40 questões oficiais do SAEP</strong>, com 4 alternativas cada. Você terá <strong>2 horas</strong>."
        : "O professor monta uma prova nova com 40 questões, repetindo as que você errou."}</p>
      <div class="acoes"><button class="btn primario grande" id="nova">🎲 Gerar prova</button></div>
      <div class="passos"><span>1️⃣ Gere a prova</span><span>2️⃣ Clique em Iniciar</span><span>3️⃣ Responda em até 2h</span><span>4️⃣ Aprenda com a correção</span></div></div>`;
    $("#nova").onclick = () => novaProva(false);
  } else if (p.status === "gerando") {
    el.innerHTML = `<div class="card centro"><div class="spinner"></div>
      <h2>O professor está preparando sua prova…</h2>
      <p class="muted">Ele está criando questões novas no estilo do SAEP, com foco nos temas em que você tem mais dificuldade. Isso leva de 1 a 3 minutos.</p></div>`;
    estado.poll = setTimeout(atualizar, 4000);
  } else if (p.status === "erro") {
    el.innerHTML = `<div class="card centro"><h2>Não deu para gerar a prova 😕</h2>
      <p class="muted">${esc(p.observacao)}</p>
      <div class="acoes"><button class="btn primario" id="tentar">Tentar de novo</button>
      <button class="btn" id="oficial">Fazer com questões oficiais</button></div></div>`;
    $("#tentar").onclick = () => novaProva(false);
    $("#oficial").onclick = () => novaProva(true);
  } else if (p.status === "pronta") {
    el.innerHTML = `<div class="card centro boas-vindas"><div class="heroi pequeno">${Prof.svg()}</div><h1>Prova pronta ✅</h1>
      <p><strong>${p.total} questões</strong> · <strong>2 horas</strong></p>
      <p class="muted">${esc(p.observacao ?? "")}</p>
      <p class="muted">O cronômetro começa quando você clicar em Iniciar. Se fechar a página, a prova continua de onde parou.</p>
      <div class="acoes"><button class="btn primario grande" id="iniciar">▶ Iniciar prova</button></div></div>`;
    $("#iniciar").onclick = async () => { await abrirProva(await api(`/api/provas/${p.id}/iniciar`, { method: "POST" })); Prof.reagir("provaIniciada"); };
  }
}

async function novaProva(oficial) {
  $("#aba-prova").innerHTML = `<div class="card centro"><div class="spinner"></div><p>Preparando…</p></div>`;
  await api(`/api/provas/nova${oficial ? "?oficial=true" : ""}`, { method: "POST" });
  atualizar();
}

// ---------------- Prova ----------------
async function abrirProva(p) {
  estado.prova = p;
  estado.questoes = await api(`/api/provas/${p.id}/questoes`);
  estado.atual = Math.max(0, estado.questoes.findIndex((q) => !q.resposta));
  iniciarRelogio(p.segundosRestantes);
  desenharProva();
}

function iniciarRelogio(segundos) {
  pararRelogio();
  estado.fimEm = Date.now() + segundos * 1000;
  $("#relogio").hidden = false;
  const tick = () => {
    const resta = Math.round((estado.fimEm - Date.now()) / 1000);
    $("#relogio span").textContent = hms(resta);
    $("#relogio").classList.toggle("pouco", resta <= 600);
    for (const m of [30, 10]) if (resta === m * 60) Prof.reagir("tempo", { minutos: m });
    if (resta <= 0) { pararRelogio(); finalizar(true); }
  };
  tick();
  estado.timer = setInterval(tick, 1000);
}
function pararRelogio() { clearInterval(estado.timer); $("#relogio").hidden = true; Ambiente.sair(); }

function desenharProva() {
  const q = estado.questoes[estado.atual];
  const total = estado.questoes.length;
  const respondidas = estado.questoes.filter((x) => x.resposta).length;
  const alts = [q.altA, q.altB, q.altC, q.altD];
  $("#aba-prova").innerHTML = `<div class="prova">
    <div class="card questao">
      <div class="meta"><span>Questão ${q.ordem} de ${total}</span><span class="tag">${esc(q.tema)}</span></div>
      <div class="enunciado">${esc(q.enunciado)}</div>${figuraHTML(q.imagem)}
      ${alts.map((a, i) => `<button class="alternativa ${q.resposta === LETRAS[i] ? "marcada" : ""}" data-l="${LETRAS[i]}">
        <span class="letra">${LETRAS[i]}</span><span>${altHTML(a)}</span></button>`).join("")}
      <div class="navegacao">
        <button class="btn" id="ant" ${estado.atual === 0 ? "disabled" : ""}>← Anterior</button>
        <button class="btn" id="prox" ${estado.atual === total - 1 ? "disabled" : ""}>Próxima →</button>
      </div>
    </div>
    <aside class="card painel">
      <div class="ferramentas" aria-label="Conforto da prova"></div>
      <strong>${respondidas} de ${total} respondidas</strong>
      <div class="progresso"><span style="width:${pct(respondidas, total)}%"></span></div>
      <div class="grade">${estado.questoes.map((x, i) =>
        `<button data-i="${i}" class="${x.resposta ? "respondida" : ""} ${i === estado.atual ? "atual" : ""}">${x.ordem}</button>`).join("")}</div>
      <button class="btn primario" id="finalizar" style="width:100%">Finalizar prova</button>
      <p class="dica">Atalhos: teclas A, B, C, D para marcar · setas ← → para navegar</p>
    </aside></div>`;

  document.querySelectorAll(".alternativa").forEach((b) => (b.onclick = () => marcar(b.dataset.l)));
  document.querySelectorAll(".grade button").forEach((b) => (b.onclick = () => { estado.atual = +b.dataset.i; desenharProva(); }));
  $("#ant").onclick = () => { estado.atual--; desenharProva(); };
  $("#prox").onclick = () => { estado.atual++; desenharProva(); };
  $("#finalizar").onclick = () => finalizar(false);
  Ambiente.montar($(".ferramentas"));
  // Se ficar 3 minutos parado na mesma questão, o professor dá uma dica de estratégia
  clearTimeout(estado.parado);
  estado.parado = setTimeout(() => { if ($(".questao")) Prof.reagir("parado"); }, 3 * 60 * 1000);
}

async function marcar(letra) {
  const q = estado.questoes[estado.atual];
  q.resposta = q.resposta === letra ? null : letra;   // clicar de novo desmarca
  desenharProva();
  if (q.resposta) Prof.reagir("marcou", { respondidas: estado.questoes.filter((x) => x.resposta).length, total: estado.questoes.length });
  await api(`/api/provas/${estado.prova.id}/respostas/${q.ordem}`, { method: "PUT", body: JSON.stringify({ resposta: q.resposta }) });
}

document.addEventListener("keydown", (e) => {
  if ($("#aba-prova").hidden || !$(".questao") || e.target.matches("textarea, input")) return;
  const k = e.key.toUpperCase();
  if (LETRAS.includes(k)) marcar(k);
  else if (e.key === "ArrowRight" && estado.atual < estado.questoes.length - 1) { estado.atual++; desenharProva(); }
  else if (e.key === "ArrowLeft" && estado.atual > 0) { estado.atual--; desenharProva(); }
});

async function finalizar(tempoEsgotado) {
  const faltam = estado.questoes.filter((x) => !x.resposta).length;
  if (!tempoEsgotado && !confirm(faltam ? `Ainda faltam ${faltam} questões sem resposta. Finalizar mesmo assim?` : "Finalizar a prova?")) return;
  pararRelogio();
  clearTimeout(estado.parado);
  await api(`/api/provas/${estado.prova.id}/finalizar`, { method: "POST" });
  if (tempoEsgotado) Prof.falar("⏰ O tempo de 2 horas acabou! Finalizei a prova para você. Vamos ver como foi?");
  mostrarResultado(estado.prova.id, true);
}

// ---------------- Resultado + correção ----------------
// Nota de 0 a 10; a média para passar no SAEP é 7,5
const MEDIA = 7.5;
const nota = (a, t) => (t ? Math.round((100 * a) / t) / 10 : 0);
const notaTxt = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function seloNota(r) {
  const n = nota(r.acertos, r.total);
  const passou = n >= MEDIA;
  const precisa = Math.ceil((MEDIA * r.total) / 10 - 1e-9); // acertos mínimos para chegar a 7,5
  const faltam = precisa - r.acertos;
  return `<div class="selo-nota ${passou ? "passou" : "nao"}">
    <div class="muted">Sua nota</div>
    <div class="nota">${notaTxt(n)}</div>
    <div class="situacao">${passou ? "✅ Aprovado" : "❌ Abaixo da média"}</div>
    <div class="muted" style="font-size:.85rem">Média: ${notaTxt(MEDIA)} · ${r.acertos} de ${r.total} acertos
      ${passou ? "" : `<br>Faltaram <b>${faltam}</b> acerto${faltam === 1 ? "" : "s"} (precisa de ${precisa})`}</div>
  </div>`;
}

// Melhor e pior tema da prova (desempate: o tema com mais questões pesa mais)
function destaquesTemas(porTema) {
  let temas = porTema.filter((t) => t.total > 0).map((t) => ({ ...t, x: pct(t.acertos, t.total) }));
  if (!temas.length) return "";
  // Tema com 1 questão só não diz muito: usa os temas com 2 ou mais, se houver
  if (temas.some((t) => t.total >= 2)) temas = temas.filter((t) => t.total >= 2);
  const pior = [...temas].sort((a, b) => a.x - b.x || b.total - a.total)[0];
  const melhor = [...temas].sort((a, b) => b.x - a.x || b.total - a.total)[0];
  const temMelhor = melhor.x > 0 && melhor.tema !== pior.tema;
  const caixa = (classe, icone, titulo, t, texto) => `<div class="destaque ${classe}">
      <div class="muted">${icone} ${titulo}</div>
      <div class="destaque-tema">${esc(t.tema)}</div>
      <div class="muted">${t.acertos} de ${t.total} acertos (${t.x}%)</div>
      <p>${texto}</p>
      <button class="btn ${classe === "pior" ? "primario" : ""}" data-estudar="${esc(t.tema)}">📚 Estudar ${esc(t.tema)}</button>
    </div>`;
  return `<div class="card"><h2>Seus destaques</h2><div class="destaques">
    ${temMelhor ? caixa("melhor", "🏆", "Onde você foi melhor", melhor, "Mandou bem! Se quiser, treine para fixar ainda mais.") : ""}
    ${caixa("pior", "🎯", "Onde precisa reforçar", pior, "O professor te dá uma aula rápida desse tema e depois um treino só com ele.")}
  </div></div>`;
}

// Liga os botões/links "Estudar" de uma área da tela
function ligarLinksEstudo(raiz) {
  raiz.querySelectorAll("[data-estudar], .link-tema").forEach((b) => (b.onclick = (e) => {
    e.preventDefault();
    estudarTema(b.dataset.estudar ?? b.dataset.tema);
  }));
}

async function mostrarResultado(id, acabouDeFazer) {
  abrirAba("prova");
  const r = await api(`/api/provas/${id}/resultado`);
  estado.ultimoResultado = r;
  const p = pct(r.acertos, r.total);
  const erradas = r.itens.filter((i) => !i.acertou);

  $("#aba-prova").innerHTML = `
    ${acabouDeFazer ? `<div class="card continuar centro" style="max-width:none;margin:0 0 16px">
      <h2>Ciclo concluído! 🎉 Quer continuar?</h2>
      <p class="muted">${estado.status?.professorDisponivel
        ? "Enquanto você revisa a correção, o professor já está preparando a próxima prova (40 questões, com as que você errou)."
        : "A próxima prova já está pronta (40 questões, com as que você errou)."}</p>
      <div class="acoes"><button class="btn primario" id="continuar">Continuar: próxima prova</button>
      <button class="btn" id="parar">⏹ Parar por hoje</button></div></div>` : ""}
    <div class="card"><div class="placar">
      <div>${seloNota(r)}<div class="muted centro" style="margin-top:6px">${p}% de acerto · tempo ${hms(r.tempoSegundos)}</div></div>
      <div style="flex:1;min-width:260px" class="barras"><h3>Por tema</h3>
      ${r.porTema.map((t) => { const x = pct(t.acertos, t.total); return `<div class="linha"><span><a href="#" class="link-tema" data-tema="${esc(t.tema)}" title="Estudar este tema">${esc(t.tema)}</a></span>
        <div class="barra ${classeBarra(x)}"><span style="width:${x}%"></span></div><span>${t.acertos}/${t.total}</span></div>`; }).join("")}
      </div></div></div>
    ${destaquesTemas(r.porTema)}
    <h2>Correção com o professor</h2>
    <div class="filtros"><button class="btn on" data-f="erradas">Só as erradas (${erradas.length})</button><button class="btn" data-f="todas">Todas (${r.itens.length})</button></div>
    <div id="revisoes"></div>`;

  if (acabouDeFazer) {
    $("#continuar").onclick = () => atualizar();
    $("#parar").onclick = () => { abrirAba("evolucao"); Prof.falar("Bom descanso! 😴 Sua próxima prova fica guardada para quando você voltar. Até logo! 👋", { acenar: true }); };
    Prof.reagir("resultado", r);
  }
  ligarLinksEstudo($("#aba-prova"));
  document.querySelectorAll(".filtros .btn").forEach((b) => (b.onclick = () => {
    document.querySelectorAll(".filtros .btn").forEach((x) => x.classList.toggle("on", x === b));
    desenharRevisoes(b.dataset.f === "todas" ? r.itens : erradas);
  }));
  desenharRevisoes(erradas);
}

function desenharRevisoes(itens) {
  const el = $("#revisoes");
  if (!itens.length) { el.innerHTML = `<div class="card centro"><h2>Gabaritou! 🏆</h2></div>`; return; }
  el.innerHTML = itens.map((i) => {
    const alts = [i.altA, i.altB, i.altC, i.altD];
    return `<div class="card revisao ${i.acertou ? "acerto" : ""}" data-q="${i.questaoId}">
      <div class="meta muted" style="display:flex;justify-content:space-between"><span>Questão ${i.ordem} · ${i.acertou ? "✅ acertou" : i.resposta ? `❌ você marcou ${i.resposta}` : "⚪ em branco"}</span>
      <span class="tag">${esc(i.tema)}${i.origem === "oficial" ? " · oficial" : ""}</span></div>
      <div class="enunciado">${esc(i.enunciado)}</div>${figuraHTML(i.imagem)}
      ${alts.map((a, n) => { const L = LETRAS[n]; const c = L === i.correta ? "certa" : L === i.resposta ? "errada" : "";
        return `<div class="alternativa ${c}" style="cursor:default"><span class="letra">${L}</span><span>${altHTML(a)}</span></div>`; }).join("")}
      ${i.acertou && !i.explicacao ? "" : `<div class="explicacao">${i.explicacao ? md(i.explicacao) : `<span class="muted">O professor está escrevendo a explicação…</span>`}</div>`}
      <div class="acoes" style="justify-content:flex-start"><button class="btn link perguntar">💬 Não entendi, pergunte ao professor</button></div>
    </div>`;
  }).join("");

  el.querySelectorAll(".perguntar").forEach((b) => (b.onclick = () => {
    const i = itens.find((x) => x.questaoId == b.closest(".revisao").dataset.q);
    const alts = [i.altA, i.altB, i.altC, i.altD].map((a, n) => `${LETRAS[n]}) ${a}`).join("\n");
    const pergunta = `Professor, não entendi esta questão:\n\n${i.enunciado}\n${alts}\n\nGabarito: ${i.correta}. Eu marquei: ${i.resposta ?? "nada"}.\nMinha dúvida: `;
    Prof.perguntar(pergunta); // abre a janela do professor com a questão pronta
  }));
  carregarExplicacoes(itens.filter((i) => !i.acertou && !i.explicacao));
}

// Busca as explicações que faltam, duas por vez
async function carregarExplicacoes(fila) {
  const trabalhar = async () => {
    while (fila.length) {
      const i = fila.shift();
      const caixa = document.querySelector(`.revisao[data-q="${i.questaoId}"] .explicacao`);
      try {
        const r = await api(`/api/questoes/${i.questaoId}/explicacao`, { method: "POST", body: JSON.stringify({ resposta: i.resposta }) });
        if (r.texto) i.explicacao = r.texto;
        if (caixa) caixa.innerHTML = r.texto ? md(r.texto) : `<span class="muted">${esc(r.erro)}</span>`;
      } catch { if (caixa) caixa.innerHTML = `<span class="muted">Não foi possível carregar a explicação.</span>`; }
    }
  };
  await Promise.all([trabalhar(), trabalhar()]);
}

// ---------------- Estudar um tema: aula do professor + treino ----------------
const emProva = () => estado.status?.prova?.status === "andamento";

async function mostrarTemas() {
  estado.estudando = null;
  const el = $("#aba-estudo");
  if (emProva()) { el.innerHTML = `<div class="card centro"><h2>Prova em andamento ⏱</h2><p class="muted">Termine a prova primeiro. Depois o professor estuda com você os temas em que errou.</p></div>`; return; }
  const temas = await api("/api/estudo/temas");
  // Ordem: os temas com menor acerto primeiro; os que você ainda não fez ficam no fim
  temas.sort((a, b) => (a.respondidas ? pct(a.acertos, a.respondidas) : 999) - (b.respondidas ? pct(b.acertos, b.respondidas) : 999) || b.questoes - a.questoes);
  el.innerHTML = `<div class="card"><h2>📚 Estudar por tema</h2>
    <p class="muted">Escolha um tema: o professor te dá uma <strong>aula rápida</strong> com o que mais cai no SAEP e depois um <strong>treino</strong> só com questões dele, com a correção na hora. O treino não conta como prova.</p></div>
    <div class="grade-temas">${temas.map((t) => {
      const x = t.respondidas ? pct(t.acertos, t.respondidas) : null;
      return `<button class="card tema-card" data-estudar="${esc(t.tema)}">
        <div class="tema-nome">${esc(t.tema)}</div>
        ${x === null ? `<div class="muted">Ainda não caiu nas suas provas</div>` : `<div class="barra ${classeBarra(x)}"><span style="width:${x}%"></span></div>
        <div class="muted">${x}% de acerto nas provas (${t.acertos}/${t.respondidas})</div>`}
        <div class="muted" style="font-size:.8rem">${t.questoes} questões para treinar${t.temAula ? " · 📖 tem aula" : ""}</div>
      </button>`; }).join("")}</div>`;
  ligarLinksEstudo(el);
}

async function estudarTema(tema) {
  estado.estudando = tema; // antes de abrir a aba, para ela não redesenhar a lista de temas
  abrirAba("estudo");
  const el = $("#aba-estudo");
  if (emProva()) return mostrarTemas();
  let aula = null;
  try { aula = await api(`/api/estudo/aula?tema=${encodeURIComponent(tema)}`); } catch { /* tema sem aula escrita */ }
  el.innerHTML = `<div class="card aula">
      <div class="aula-topo"><span class="heroi-mini">${Prof.svg()}</span>
        <div><div class="muted">Aula do professor</div><h1>${esc(tema)}</h1></div></div>
      <div class="aula-texto">${aula ? md(aula.texto) : `<p class="muted">Ainda não escrevi a aula deste tema. Use o botão "Pedir uma aula mais completa" abaixo.</p>`}</div>
    </div>
    <div class="card acoes-estudo">
      <button class="btn primario grande" id="treinar">🎯 Treinar 10 questões de ${esc(tema)}</button>
      <button class="btn" id="aula-completa">💬 Pedir uma aula mais completa ao professor</button>
      <button class="btn link" id="outros">← Outros temas</button>
    </div>`;
  // Linha em negrito sozinha no começo do parágrafo = título de seção
  el.querySelectorAll(".aula-texto p > strong:first-child").forEach((s) => {
    const depois = s.nextSibling;
    if (!s.previousSibling && (!depois || depois.nodeName === "BR")) s.classList.add("secao");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("#treinar").onclick = () => treinar(tema);
  $("#aula-completa").onclick = () => Prof.perguntar(`Professor, me dá uma aula sobre "${tema}" para o SAEP: explique os conceitos com exemplos práticos do dia a dia de um técnico em Desenvolvimento de Sistemas, mostre as pegadinhas que mais caem e no fim me faça 3 perguntas para eu responder.`);
  $("#outros").onclick = () => mostrarTemas();
  Prof.falar(`📖 Bora estudar **${tema}**! Leia o resumo com calma. Quando terminar, clique em **Treinar** que eu te passo umas questões. 💪`, { acenar: true, humor: "feliz" });
}

async function treinar(tema) {
  const qs = await api(`/api/estudo/treino?tema=${encodeURIComponent(tema)}&n=10`);
  const t = { tema, qs, i: 0, acertos: 0 };
  const el = $("#aba-estudo");
  const desenhar = () => {
    const q = t.qs[t.i];
    const alts = [q.altA, q.altB, q.altC, q.altD];
    el.innerHTML = `<div class="card treino">
      <div class="meta muted" style="display:flex;justify-content:space-between"><span>🎯 Treino · ${esc(tema)}</span><span>Questão ${t.i + 1} de ${t.qs.length} · ✅ ${t.acertos}</span></div>
      <div class="progresso-treino"><span style="width:${(100 * t.i) / t.qs.length}%"></span></div>
      <div class="enunciado">${esc(q.enunciado)}</div>${figuraHTML(q.imagem)}
      ${alts.map((a, n) => `<button class="alternativa" data-l="${LETRAS[n]}"><span class="letra">${LETRAS[n]}</span><span>${altHTML(a)}</span></button>`).join("")}
      <div id="retorno"></div>
    </div>`;
    el.querySelectorAll(".alternativa").forEach((b) => (b.onclick = () => responder(b.dataset.l)));
  };
  const responder = (L) => {
    const q = t.qs[t.i];
    const certo = L === q.correta;
    if (certo) t.acertos++;
    el.querySelectorAll(".alternativa").forEach((b) => {
      b.disabled = true; b.style.cursor = "default";
      if (b.dataset.l === q.correta) b.classList.add("certa");
      else if (b.dataset.l === L) b.classList.add("errada");
    });
    const ultima = t.i === t.qs.length - 1;
    $("#retorno").innerHTML = `<div class="explicacao">${certo ? "<p><strong>✅ Acertou!</strong></p>" : `<p><strong>❌ A resposta certa é ${q.correta}.</strong></p>`}
      ${q.explicacao ? md(q.explicacao) : ""}</div>
      <div class="acoes" style="justify-content:space-between">
        <button class="btn link" id="duvida">💬 Não entendi</button>
        <button class="btn primario" id="proxima">${ultima ? "Ver resultado do treino" : "Próxima ➜"}</button></div>`;
    $("#duvida").onclick = () => Prof.perguntar(`Professor, não entendi esta questão de ${tema}:\n\n${q.enunciado}\n${[q.altA, q.altB, q.altC, q.altD].map((a, n) => `${LETRAS[n]}) ${a}`).join("\n")}\n\nGabarito: ${q.correta}. Eu marquei: ${L}.\nMinha dúvida: `);
    $("#proxima").onclick = () => { if (ultima) fim(); else { t.i++; desenhar(); window.scrollTo({ top: 0 }); } };
    if (certo) Prof.falar(sortearFrase(["✅ Isso aí!", "🎯 Na mosca!", "👏 Muito bem!", "💪 Tá pegando o jeito!"]), { humor: "feliz" });
    else Prof.falar("Errar no treino é ótimo: é aqui que se aprende! Leia a explicação. 😉", { humor: "apoio" });
  };
  const fim = () => {
    const n = nota(t.acertos, t.qs.length);
    el.innerHTML = `<div class="card centro">
      ${seloNota({ acertos: t.acertos, total: t.qs.length })}
      <h2 style="margin-top:16px">Treino de ${esc(tema)} concluído!</h2>
      <p class="muted">${n >= MEDIA ? "Você está na média nesse tema. Continue assim!" : "Releia a aula e treine de novo: as questões que você errou nas provas aparecem primeiro."}</p>
      <div class="acoes"><button class="btn primario" id="denovo">🔁 Treinar de novo</button>
        <button class="btn" id="aula">📖 Rever a aula</button><button class="btn link" id="outros">← Outros temas</button></div></div>`;
    $("#denovo").onclick = () => treinar(tema);
    $("#aula").onclick = () => estudarTema(tema);
    $("#outros").onclick = () => mostrarTemas();
    if (n >= MEDIA) Prof.falar(`🎉 **Nota ${notaTxt(n)}** em ${tema}! Esse tema está ficando forte!`, { acenar: true, humor: "feliz" });
    else Prof.falar(`💙 **Nota ${notaTxt(n)}** em ${tema}. Bora mais uma rodada? Cada treino deixa você mais perto do 7,5!`, { humor: "apoio" });
  };
  if (!qs.length) { el.innerHTML = `<div class="card centro"><p class="muted">Ainda não há questões desse tema.</p></div>`; return; }
  desenhar();
}
const sortearFrase = (l) => l[Math.floor(Math.random() * l.length)];

// ---------------- Evolução ----------------
async function mostrarEvolucao() {
  const r = await api("/api/relatorio");
  const provas = r.provas;
  const media = provas.length ? Math.round((10 * provas.reduce((s, p) => s + nota(p.Acertos, p.Total), 0)) / provas.length) / 10 : 0;
  const melhor = provas.length ? Math.max(...provas.map((p) => nota(p.Acertos, p.Total))) : 0;
  const aprovadas = provas.filter((p) => nota(p.Acertos, p.Total) >= MEDIA).length;
  const ultima = provas.at(-1);
  $("#aba-evolucao").innerHTML = `
    <div class="cards4">
      <div class="card"><div class="muted">Provas feitas</div><div class="valor">${provas.length}</div>
        <div class="muted" style="font-size:.8rem">${aprovadas} com nota ≥ ${notaTxt(MEDIA)}</div></div>
      <div class="card"><div class="muted">Nota média</div><div class="valor" style="color:var(${media >= MEDIA ? "--certo" : "--errado"})">${notaTxt(media)}</div>
        <div class="muted" style="font-size:.8rem">média para passar: ${notaTxt(MEDIA)}</div></div>
      <div class="card"><div class="muted">Melhor nota</div><div class="valor">${notaTxt(melhor)}</div></div>
      <div class="card"><div class="muted">Questões no banco</div><div class="valor">${(r.banco.Oficiais ?? 0) + (r.banco.Ia ?? 0)}</div>
        <div class="muted" style="font-size:.8rem">${r.banco.Oficiais ?? 0} oficiais · ${r.banco.Ia ?? 0} do professor</div></div>
    </div>
    ${!provas.length ? `<div class="card centro"><p class="muted">Faça sua primeira prova para ver sua evolução aqui.</p></div>` : `
    <div class="card barras"><h2>Nota em cada prova</h2>
      ${provas.map((p, n) => { const x = pct(p.Acertos, p.Total); return `<div class="linha">
        <span>Prova ${n + 1} <span class="muted">· ${new Date(p.FinalizadaEm).toLocaleDateString("pt-BR")}</span></span>
        <div class="barra ${classeBarra(x)} com-media"><span style="width:${x}%"></span></div><span><b>${notaTxt(nota(p.Acertos, p.Total))}</b></span></div>`; }).join("")}
      <p class="muted" style="font-size:.85rem">A linha tracejada marca a média ${notaTxt(MEDIA)}.</p>
      ${ultima && provas.length > 1 ? `<p class="muted">Da primeira para a última prova: nota ${notaTxt(nota(provas[0].Acertos, provas[0].Total))} → ${notaTxt(nota(ultima.Acertos, ultima.Total))}</p>` : ""}
    </div>
    <div class="card barras"><h2>Acerto por tema</h2><p class="muted">Os temas com mais dificuldade aparecem primeiro. O professor coloca mais questões deles nas próximas provas. Clique num tema para estudá-lo.</p>
      ${r.temas.map((t) => { const x = pct(t.Acertos, t.Total); return `<div class="linha"><span><a href="#" class="link-tema" data-tema="${esc(t.Tema)}" title="Estudar este tema">${esc(t.Tema)}</a></span>
        <div class="barra ${classeBarra(x)}"><span style="width:${x}%"></span></div><span>${x}% <span class="muted">(${t.Total})</span></span></div>`; }).join("")}
    </div>
    <div class="card"><h2>Histórico</h2><table><thead><tr><th>Prova</th><th>Data</th><th>Nota</th><th>Acertos</th><th>Tempo</th><th></th></tr></thead><tbody>
      ${provas.slice().reverse().map((p, n) => { const x = nota(p.Acertos, p.Total); return `<tr><td>${provas.length - n}</td><td>${new Date(p.FinalizadaEm).toLocaleString("pt-BR")}</td>
        <td><b style="color:var(${x >= MEDIA ? "--certo" : "--errado"})">${notaTxt(x)}</b> ${x >= MEDIA ? "✅" : "❌"}</td>
        <td>${p.Acertos}/${p.Total} (${pct(p.Acertos, p.Total)}%)</td><td>${hms(p.TempoSegundos)}</td>
        <td><button class="btn link" data-id="${p.Id}">Ver correção</button></td></tr>`; }).join("")}
    </tbody></table></div>`}`;
  ligarLinksEstudo($("#aba-evolucao"));
  document.querySelectorAll("#aba-evolucao [data-id]").forEach((b) => (b.onclick = () => mostrarResultado(+b.dataset.id, false)));
}

atualizar();

// Lupa: clicar numa imagem do enunciado (ou na 🔍 de uma alternativa) abre ela grande; clicar de novo (ou Esc) fecha
function abrirLupa(src) {
  const caixa = document.createElement("div");
  caixa.className = "lupa";
  caixa.innerHTML = `<img src="${esc(src)}" alt="Imagem ampliada"><span>Clique para fechar ✕</span>`;
  caixa.onclick = () => caixa.remove();
  document.body.appendChild(caixa);
}
document.addEventListener("click", (e) => {
  const lupa = e.target.closest(".zoom-alt");
  if (lupa) { e.stopPropagation(); e.preventDefault(); abrirLupa(lupa.dataset.src); return; } // não marca a alternativa
  const img = e.target.closest("img[data-zoom]");
  if (img) abrirLupa(img.getAttribute("src"));
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelector(".lupa")?.remove(); });
