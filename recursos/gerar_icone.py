"""
Gera os ícones do app (pasta assets/) a partir do desenho do professor (www/professor.js),
usando o Edge do Windows para transformar o SVG em PNG. Só precisa rodar de novo se o desenho mudar.
Uso (na pasta AppAndroid):  python recursos/gerar_icone.py
"""
import re
import subprocess
import tempfile
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
AZUL = "#1d5fd1"

js = (APP / "www" / "professor.js").read_text(encoding="utf-8")
svg = re.search(r"return `\s*(<svg.*?</svg>)`;", js, re.S).group(1)
svg = svg.replace("${id}", "recorte").replace('class="prof-fundo"', 'fill="#eaf1ff"')


def foto(nome, corpo, fundo):
    html = f"""<!doctype html><html><body style="margin:0;width:1024px;height:1024px;background:{fundo};
      display:grid;place-items:center;overflow:hidden">{corpo}</body></html>"""
    with tempfile.TemporaryDirectory() as tmp:
        pagina = Path(tmp) / "icone.html"
        pagina.write_text(html, encoding="utf-8")
        saida = APP / "assets" / nome
        saida.parent.mkdir(exist_ok=True)
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1024,1024",
                        "--default-background-color=00000000", f"--user-data-dir={tmp}/perfil",
                        f"--screenshot={saida}", pagina.as_uri()], check=True, capture_output=True, timeout=60)
        print("gerado", saida)


desenho = lambda tamanho: svg.replace('<svg class="prof-svg"', f'<svg width="{tamanho}" height="{tamanho}"')
foto("icon-only.png", desenho(900), AZUL)                # ícone comum: fundo azul + professor
foto("icon-foreground.png", desenho(620), "transparent") # ícone adaptável do Android: frente (com margem de segurança)
foto("icon-background.png", "", AZUL)                    # ícone adaptável: fundo
foto("splash.png", desenho(700), AZUL)                   # tela de abertura
foto("splash-dark.png", desenho(700), "#0f141c")
