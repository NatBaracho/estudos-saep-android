# 📱 Estudos SAEP — App Android

App de celular para estudar para a **prova SAEP SENAI** (Técnico em Desenvolvimento de Sistemas).
Funciona **sem internet**: todas as questões, explicações e aulas já vêm dentro do app.

> 🔗 **Repositório principal (sistema do PC):** [NatBaracho/estudos-saep](https://github.com/NatBaracho/estudos-saep)
> Este app é gerado a partir dele: as questões, as aulas e a tela são as mesmas.

> 🌐 **Versão web (no navegador):** [NatBaracho/estudos-saep-web](https://github.com/NatBaracho/estudos-saep-web) ·
> https://estudos-saep.estudos-saep-android.workers.dev

## O que tem no app

- 📝 **Provas de 40 questões** com cronômetro de 2 horas, iguais às do PC.
- 🎯 **Nota de 0 a 10**, com média **7,5** para aprovação.
- 🔁 **Repetição do que você errou:** cada prova nova traz até 8 questões que você errou antes.
- 🏆 **Seus destaques:** o tema em que você foi melhor e o que precisa reforçar.
- 📚 **Estudar por tema:** aula do professor + treino de 10 questões com correção na hora.
- 📈 **Evolução:** nota média, melhor nota e acerto por tema.
- 🧑‍🏫 **Professor animado** com dicas e incentivo.

## Como instalar no celular

📲 **Guia completo, com o que fazer em cada aviso, o caminho por marca de celular e solução de problemas: [INSTALAR_NO_CELULAR.md](INSTALAR_NO_CELULAR.md)**

Resumo:

1. No celular, abra a página [**Releases**](https://github.com/NatBaracho/estudos-saep-android/releases/latest) deste repositório.
   O repositório é privado, então entre na sua conta do GitHub antes.
2. Toque em **EstudosSAEP.apk** para baixar.
3. Abra o arquivo baixado. Se o Android pedir, permita **"Instalar apps desconhecidos"** para o navegador ou para o app de arquivos.
4. Pronto: o ícone do professor aparece na tela inicial.

**Para atualizar:** baixe o APK novo e instale **por cima**. Seu progresso continua salvo.

> ⚠️ O progresso fica guardado **no celular**. Desinstalar o app ou limpar os dados dele apaga as provas feitas.
> O progresso do celular e o do PC são separados.

## Como funciona (para quem programa)

```
estudos-saep (PC)                               estudos-saep-android (este)
SistemaSAEP/wwwroot  ── tela ─────────────────▶ www/  (cópia da tela)
SistemaSAEP/Data     ── questões e aulas ─────▶ www/dados.js
tools/exportar_app.py  (faz a cópia)            fonte/local-api.js  (faz o papel do servidor)
                                                fonte/mobile.css    (ajustes para celular)
```

- A tela do PC chama `fetch("/api/...")`. No app, o `fonte/local-api.js` intercepta essas chamadas e responde com as mesmas regras do servidor (`ProvaService.cs`), guardando as provas no `localStorage` do aparelho.
- O app Android é feito com [Capacitor](https://capacitorjs.com) 8.
- A pasta `android/` não fica no repositório: o **GitHub Actions** cria o projeto, gera os ícones (pasta `assets/`, com o desenho do professor), compila, **assina** o APK e publica em Releases a cada push na `main`.

### Atualizar o app com questões novas

Na pasta `ProvaSAEP` (repositório principal, que tem este app como submódulo em `AppAndroid/`):

```bash
python SistemaSAEP/tools/exportar_app.py
cd AppAndroid
git add -A
git commit -m "Atualiza questões"
git push
```

Em uns 5 minutos o APK novo aparece em Releases.

### Assinatura do APK

O APK é assinado com uma chave guardada nos *secrets* do repositório (`KEYSTORE_BASE64` e `KEYSTORE_SENHA`).
Uma cópia fica no PC, em `AppAndroid/.assinatura/`, fora do git. **Não apague:** sem ela, a próxima versão não instala por cima e você teria que desinstalar o app, perdendo o progresso.

### Testar no PC

```bash
python -m http.server 5099 --directory www
```

Depois abra http://localhost:5099 no navegador (use o modo celular do DevTools).
