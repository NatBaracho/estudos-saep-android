// =========================================================
// Ambiente agradável durante a prova:
// tamanho da letra, som ambiente (chuva suave), pausa para respirar e modo foco.
// As preferências ficam salvas no navegador.
// =========================================================
const Ambiente = (() => {
  const ler = (k, padrao) => { try { return localStorage.getItem(k) ?? padrao; } catch { return padrao; } };
  const salvar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  let fonte = +ler("amb-fonte", 100);          // % do tamanho da letra das questões
  let foco = ler("amb-foco", "0") === "1";     // modo foco ligado?
  let audio = null;                             // som ambiente tocando

  function aplicar() {
    document.documentElement.style.setProperty("--fonte-prova", fonte / 100);
    document.body.classList.add("em-prova");
    document.body.classList.toggle("modo-foco", foco);
  }

  /** Sai do clima de prova (resultado, tela inicial...). */
  function sair() {
    document.body.classList.remove("em-prova", "modo-foco");
    if (audio) { audio.close(); audio = null; }
    document.querySelector(".respirar")?.remove();
  }

  // Chuva suave: ruído marrom filtrado, gerado na hora (não precisa de arquivo nem internet)
  function alternarSom() {
    if (audio) { audio.close(); audio = null; return false; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < dados.length; i++) {
      const branco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * branco) / 1.02;
      dados[i] = ultimo * 3.2;
    }
    const fonteSom = ctx.createBufferSource();
    fonteSom.buffer = buffer;
    fonteSom.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 1000;
    const volume = ctx.createGain();
    volume.gain.value = 0.0001;
    volume.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 2); // entra devagar
    fonteSom.connect(filtro).connect(volume).connect(ctx.destination);
    fonteSom.start();
    audio = ctx;
    return true;
  }

  // Pausa guiada de 1 minuto (o cronômetro da prova continua correndo)
  function respirar() {
    if (document.querySelector(".respirar")) return;
    const caixa = document.createElement("div");
    caixa.className = "respirar";
    caixa.innerHTML = `
      <div class="respirar-bola"></div>
      <p class="respirar-texto">Inspire…</p>
      <p class="respirar-tempo">60</p>
      <p class="muted">O cronômetro da prova continua. Respire com a bolinha 🌿</p>
      <button class="btn primario">Voltar à prova</button>`;
    document.body.appendChild(caixa);
    let s = 60, fase = 0;
    const texto = caixa.querySelector(".respirar-texto"), tempo = caixa.querySelector(".respirar-tempo");
    const fases = ["Inspire…", "Segure…", "Expire…", "Segure…"]; // respiração em caixa: 4s cada
    const t = setInterval(() => {
      s--; tempo.textContent = s;
      if (s % 4 === 0) { fase = (fase + 1) % 4; texto.textContent = fases[fase]; }
      if (s <= 0) fechar();
    }, 1000);
    function fechar() {
      clearInterval(t); caixa.remove();
      Prof.falar("Prontinho! 😌 Mente mais leve. Bora continuar?", { balao: !foco });
    }
    caixa.querySelector("button").onclick = fechar;
  }

  /** Monta a barra de ferramentas dentro do painel da prova. */
  function montar(el) {
    el.innerHTML = `
      <button data-a="menos" title="Diminuir letra">A−</button>
      <button data-a="mais" title="Aumentar letra">A+</button>
      <button data-a="som" class="${audio ? "on" : ""}" title="Som ambiente (chuva suave)">🎧</button>
      <button data-a="respirar" title="Pausa para respirar (1 min)">🧘</button>
      <button data-a="foco" class="${foco ? "on" : ""}" title="Modo foco: esconde distrações">🎯</button>`;
    el.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      switch (b.dataset.a) {
        case "menos": fonte = Math.max(85, fonte - 10); salvar("amb-fonte", fonte); break;
        case "mais": fonte = Math.min(150, fonte + 10); salvar("amb-fonte", fonte); break;
        case "som": b.classList.toggle("on", alternarSom()); break;
        case "respirar": respirar(); break;
        case "foco":
          foco = !foco; salvar("amb-foco", foco ? "1" : "0"); b.classList.toggle("on", foco);
          if (foco) Prof.minimizar();
          break;
      }
      aplicar();
    };
    aplicar();
  }

  return { montar, sair };
})();
