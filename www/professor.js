// =========================================================
// Professor animado — janela flutuante no canto inferior direito
// Ele pisca, respira, acena, fala e reage ao que acontece na prova.
// Uso pelo app.js: Prof.falar(texto), Prof.reagir(evento, dados), Prof.perguntar(texto)
// =========================================================

// Desenho do professor (SVG). Cada elemento animado tem uma classe.
let profContador = 0;
// Professor explorador em estilo cartoon (personagem original): chapéu, jaqueta de couro, bolsa e livro.
function professorSVG() {
  const id = "prof-recorte-" + (++profContador); // id único para o recorte de cada desenho
  return `
<svg class="prof-svg" viewBox="0 0 120 120" role="img" aria-label="Professor explorador">
  <defs><clipPath id="${id}"><circle cx="60" cy="62" r="56"/><rect x="0" y="0" width="120" height="62"/></clipPath></defs>
  <circle cx="60" cy="62" r="56" class="prof-fundo"/>
  <!-- estrelinhas de "aventura" no fundo -->
  <g class="prof-brilho" fill="#f5a95b">
    <path d="M17 40 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z"/>
    <path d="M100 22 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 Z"/>
  </g>
  <g clip-path="url(#${id})"><g class="prof-corpo">
    <!-- camisa clara -->
    <path d="M30 120 C31 98 44 88 60 88 C76 88 89 98 90 120 Z" fill="#efe3c8"/>
    <!-- jaqueta de couro (dois lados) -->
    <path d="M28 120 C29 98 40 89 52 88 L58 120 Z" fill="#8a5530"/>
    <path d="M92 120 C91 98 80 89 68 88 L62 120 Z" fill="#8a5530"/>
    <path d="M52 88 L47 100 L55 103 Z M68 88 L73 100 L65 103 Z" fill="#6e4122"/>
    <!-- alça da bolsa atravessada -->
    <path d="M40 92 L82 120" stroke="#4a2e1a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="58" cy="104" r="2" fill="#c9a24a"/>
    <!-- braço com o livro -->
    <path d="M32 104 C30 112 34 118 40 118" stroke="#8a5530" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="34" y="106" width="16" height="13" rx="2" fill="#a3362f" transform="rotate(-10 42 112)"/>
    <rect x="35" y="107" width="3" height="11" rx="1" fill="#f5e6c4" transform="rotate(-10 42 112)"/>
    <circle cx="43" cy="117" r="4" fill="#f2c39b"/>
    <!-- braço que aponta, segurando o giz -->
    <g class="prof-braco">
      <path d="M86 98 C95 92 99 82 100 72" stroke="#8a5530" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="100" cy="68" r="6.5" fill="#f2c39b"/>
      <path d="M100 63 L102 54" stroke="#f2c39b" stroke-width="4" stroke-linecap="round"/>
      <rect x="95" y="57" width="4" height="10" rx="1.5" fill="#ffffff" transform="rotate(-20 97 62)"/>
    </g>
    <!-- pescoço e cabeça grande (estilo infantil) -->
    <rect x="54" y="78" width="12" height="11" rx="4" fill="#e8b48a"/>
    <g class="prof-cabeca">
      <circle cx="33" cy="58" r="5" fill="#f2c39b"/>
      <circle cx="87" cy="58" r="5" fill="#f2c39b"/>
      <ellipse cx="60" cy="56" rx="27" ry="26" fill="#f2c39b"/>
      <!-- cabelo grisalho aparecendo nas laterais -->
      <path d="M34 50 C33 42 36 37 40 36 L40 50 Z M86 50 C87 42 84 37 80 36 L80 50 Z" fill="#5d5a57"/>
      <path d="M35 47 C35 43 37 41 39 40" stroke="#9a948d" stroke-width="1.5" fill="none"/>
      <!-- barba por fazer (bem suave) -->
      <path d="M38 64 C40 78 50 82 60 82 C70 82 80 78 82 64 C76 74 68 77 60 77 C52 77 44 74 38 64 Z" fill="#b98d6c" opacity=".35"/>
      <!-- sobrancelhas grossas (uma levantada: ar de aventura) -->
      <path class="prof-sobrancelha" d="M42 44 Q48 39 54 43 M66 42 Q72 37 78 41" stroke="#4a3a30" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <!-- olhos grandes e brilhantes (piscam) -->
      <g class="prof-olhos">
        <ellipse cx="49" cy="54" rx="6" ry="7" fill="#ffffff"/>
        <ellipse cx="71" cy="54" rx="6" ry="7" fill="#ffffff"/>
        <circle cx="50" cy="55" r="4.2" fill="#5a3a22"/>
        <circle cx="72" cy="55" r="4.2" fill="#5a3a22"/>
        <circle cx="50" cy="55" r="2" fill="#1c1410"/>
        <circle cx="72" cy="55" r="2" fill="#1c1410"/>
        <circle cx="51.6" cy="53" r="1.4" fill="#ffffff"/>
        <circle cx="73.6" cy="53" r="1.4" fill="#ffffff"/>
      </g>
      <!-- nariz e bochechas -->
      <path d="M60 58 Q63 63 59.5 64.5" stroke="#d99a72" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="41" cy="65" r="4.5" fill="#f4a3a3" opacity=".6"/>
      <circle cx="79" cy="65" r="4.5" fill="#f4a3a3" opacity=".6"/>
      <!-- sorriso (mexe quando ele fala) -->
      <g class="prof-boca">
        <path d="M52 69 Q60 77 68 69 Q60 72 52 69 Z" fill="#8f2d22"/>
        <path d="M56 72.5 Q60 75 64 72.5 Q60 74 56 72.5 Z" fill="#e5767a"/>
      </g>
    </g>
    <!-- chapéu fedora -->
    <g class="prof-chapeu">
      <ellipse cx="60" cy="36" rx="39" ry="8" fill="#6b4226"/>
      <path d="M38 36 C37 26 40 16 50 14 C55 13 57 17 60 17 C63 17 65 13 70 14 C80 16 83 26 82 36 Z" fill="#7d4f2e"/>
      <path d="M38.5 31 C52 34 68 34 81.5 31 L82 36 C68 39 52 39 38 36 Z" fill="#3b2414"/>
      <path d="M46 20 C50 18 53 19 56 20" stroke="#9a6a44" stroke-width="2" stroke-linecap="round" fill="none"/>
      <ellipse cx="60" cy="35.5" rx="39" ry="8" fill="none" stroke="#4e2f1a" stroke-width="1.5"/>
    </g>
  </g></g>
</svg>`;
}

const Prof = (() => {
  const raiz = document.getElementById("prof");
  const avatar = raiz.querySelector(".prof-avatar");
  const balao = raiz.querySelector(".prof-balao");
  const msgs = raiz.querySelector(".prof-msgs");
  const form = raiz.querySelector(".prof-form");
  const campo = raiz.querySelector(".prof-form textarea");
  let timerBalao, timerFala, ultimoIncentivo = 0, temApi = false;

  raiz.querySelectorAll(".prof-desenho").forEach((el) => (el.innerHTML = professorSVG()));

  const aberto = () => raiz.classList.contains("aberto");
  function abrir() {
    raiz.classList.add("aberto");
    raiz.classList.remove("novidade");
    balao.hidden = true;
    try { localStorage.setItem("prof-aberto", "1"); } catch {}
    msgs.scrollTop = msgs.scrollHeight;
  }
  function minimizar() {
    raiz.classList.remove("aberto");
    try { localStorage.setItem("prof-aberto", "0"); } catch {}
  }

  // Animação de boca enquanto fala (tempo proporcional ao texto)
  function animarFala(ms) {
    raiz.classList.add("falando");
    clearTimeout(timerFala);
    timerFala = setTimeout(() => raiz.classList.remove("falando"), Math.min(ms, 6000));
  }

  function adicionar(papel, texto) {
    const d = document.createElement("div");
    d.className = `prof-msg ${papel}`;
    if (papel === "aluno") d.textContent = texto; else d.innerHTML = md(texto);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  /** O professor fala: aparece no balão (se minimizado) e fica no histórico da janela. */
  function falar(texto, { balao: mostrarBalao = true, acenar = false, humor = "" } = {}) {
    adicionar("professor", texto);
    animarFala(texto.length * 45);
    raiz.dataset.humor = humor;
    if (acenar) { raiz.classList.add("acenando"); setTimeout(() => raiz.classList.remove("acenando"), 2600); }
    if (!aberto() && mostrarBalao) {
      balao.innerHTML = md(texto.split("\n")[0]);
      balao.hidden = false;
      raiz.classList.add("novidade");
      clearTimeout(timerBalao);
      timerBalao = setTimeout(() => (balao.hidden = true), 7000);
    }
  }

  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

  /** Reações ao que acontece no sistema. */
  function reagir(evento, d = {}) {
    switch (evento) {
      case "inicio": {
        temApi = !!d.professorDisponivel;
        form.querySelector("textarea").placeholder = temApi
          ? "Pergunte qualquer coisa da teoria…"
          : "Escreva sua dúvida: eu copio para você colar no app do Claude";
        const h = new Date().getHours();
        const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
        const msg = d.prova?.status === "andamento"
          ? `${saud}! 👋 Sua prova continua de onde parou. Foco total, eu tô aqui no cantinho se precisar! 😉`
          : d.provasFeitas === 0
          ? `${saud}! 👋 Eu sou o **Professor**. Vou te acompanhar até o SAEP. Clique em **Gerar prova** para começar!`
          : sortear([`${saud}! Que bom te ver de novo 😄 Bora mais uma rodada?`,
                     `${saud}! Constância vence talento. Vamos estudar? 💪`,
                     `${saud}! Já são ${d.provasFeitas} provas feitas. Tô orgulhoso! 🎓`]);
        falar(msg, { acenar: true });
        break;
      }
      case "provaIniciada":
        falar(sortear(["Boa prova! 🍀 Leia o comando da questão com calma antes de olhar as alternativas.",
                       "Valendo! ⏱ Dica: se travar numa questão, pule e volte depois.",
                       "Respira fundo e vai! Elimine primeiro as alternativas absurdas. 😉"]), { acenar: true });
        break;
      case "marcou": {
        const agora = Date.now();
        if (d.respondidas === d.total) { falar("✅ Todas respondidas! Revise as que ficou em dúvida e clique em **Finalizar prova**."); break; }
        if ([10, 20, 30].includes(d.respondidas) && agora - ultimoIncentivo > 30000) {
          ultimoIncentivo = agora;
          falar(sortear([`${d.respondidas} de ${d.total}! Tá voando! 🚀`, `Já foram ${d.respondidas}! Continue assim 👏`,
                         `${d.respondidas} feitas. Bebe uma água e segue! 💧`]));
        }
        break;
      }
      case "parado":
        falar(sortear(["Travou? 🤔 Procure no enunciado a palavra-chave (ex.: 'tempo real', 'NÃO', 'obrigatório').",
                       "Dica: alternativas com 'sempre', 'nunca' ou 'apenas' costumam estar erradas.",
                       "Pense: qual alternativa responde exatamente ao que o comando pede?"]));
        break;
      case "tempo":
        falar(d.minutos === 30 ? "⏰ Faltam **30 minutos**. Confira as questões em branco!" : "⏰ Faltam **10 minutos**! Marque todas, nem que seja no chute consciente.", { humor: "alerta" });
        break;
      case "resultado": {
        // Nota de 0 a 10; média do SAEP = 7,5
        const n = d.total ? Math.round(100 * d.acertos / d.total) / 10 : 0;
        const t = n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const faltam = Math.ceil(7.5 * d.total / 10 - 1e-9) - d.acertos;
        if (n >= 9) { falar(`🏆 **Nota ${t}!** Arrasou! Desse jeito o SAEP tá no papo!`, { acenar: true, humor: "feliz" }); confete(); }
        else if (n >= 7.5) { falar(`🎉 **Nota ${t}: aprovado!** Passou da média 7,5! Revise os erros para subir ainda mais.`, { acenar: true, humor: "feliz" }); confete(); }
        else if (n >= 6) falar(`👏 **Nota ${t}.** Quase lá! Faltaram só **${faltam}** acertos para a média 7,5. Bora revisar os erros!`, { acenar: true, humor: "feliz" });
        else falar(`💙 **Nota ${t}.** A média é 7,5 e você chega lá! Leia as explicações abaixo com calma, que a próxima vai ser melhor.`, { humor: "apoio" });
        break;
      }
    }
  }

  /** Abre a janela com a dúvida já escrita (botão 'Perguntar ao professor'). */
  function perguntar(texto) {
    abrir();
    campo.value = texto;
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }

  async function dica() {
    try {
      const r = await api("/api/dica");
      falar(`💡 **${r.tema}:** ${r.dica}`, { balao: false });
    } catch { falar("Hmm, não achei uma dica agora. Tente de novo! 😅", { balao: false }); }
  }

  async function enviar(texto) {
    adicionar("aluno", texto);
    if (!temApi) {
      // Modo gratuito: copia a dúvida para colar no app do Claude
      const conteudo = "vamos professor\n\n" + texto;
      try {
        await navigator.clipboard.writeText(conteudo);
        falar("📋 **Copiei sua dúvida!** Abra o app do Claude, cole com **Ctrl+V** e envie. Te respondo por lá! 😉", { balao: false });
      } catch {
        falar("Não consegui copiar sozinho 😅 Selecione o texto da sua dúvida, copie e cole no app do Claude começando com **vamos professor**.", { balao: false });
      }
      return;
    }
    const caixa = adicionar("professor", "…");
    raiz.classList.add("falando");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
      const leitor = r.body.getReader(), dec = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        acumulado += dec.decode(value, { stream: true });
        caixa.innerHTML = md(acumulado);
        msgs.scrollTop = msgs.scrollHeight;
      }
      if (!acumulado) caixa.innerHTML = md("Não recebi resposta. Tente de novo.");
    } catch { caixa.innerHTML = md("⚠️ Não consegui falar com o servidor."); }
    raiz.classList.remove("falando");
  }

  // Chuva de confete para notas altas
  function confete() {
    const cores = ["#1d5fd1", "#f5a95b", "#12805c", "#e5484d", "#9b6bff", "#ffd23f"];
    const camada = document.createElement("div");
    camada.className = "confete";
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = sortear(cores);
      c.style.animationDelay = Math.random() * 0.8 + "s";
      c.style.animationDuration = 2 + Math.random() * 1.5 + "s";
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      camada.appendChild(c);
    }
    document.body.appendChild(camada);
    setTimeout(() => camada.remove(), 4200);
  }

  // Eventos da janela
  avatar.addEventListener("click", abrir);
  balao.addEventListener("click", abrir);
  raiz.querySelector(".prof-minimizar").addEventListener("click", minimizar);
  raiz.querySelector(".prof-dica").addEventListener("click", dica);
  raiz.querySelector(".prof-limpar").addEventListener("click", () => { msgs.innerHTML = ""; falar("Conversa limpa! ✨ Do que vamos falar?", { balao: false }); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = campo.value.trim();
    if (!t) return;
    campo.value = "";
    enviar(t);
  });
  campo.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto()) minimizar(); });
  try { if (localStorage.getItem("prof-aberto") === "1" && innerWidth > 700) abrir(); } catch {}

  return { falar, reagir, perguntar, abrir, minimizar, confete, svg: professorSVG };
})();
