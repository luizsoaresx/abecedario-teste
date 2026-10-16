"""
gerar_vozes.py — grava as falas do Bip com uma VOZ NEURAL FEMININA gratuita e liga as gravações ao jogo.

POR QUE: a voz do navegador muda de aparelho para aparelho, às vezes é robótica, e engasga nas sílabas soltas.
Com as falas gravadas em MP3, todo aluno ouve a MESMA voz humana, as sílabas saem certinhas e sem atraso.
O jogo monta as frases com os pedaços gravados ("Monte a palavra" + "gato"). Só o que não tem gravação
(nome do aluno, frase digitada pela professora) usa a voz do navegador.

VOZ: pt-BR-ThalitaMultilingualNeural (Microsoft, a mais nova e natural). Se ela não estiver disponível,
usa pt-BR-FranciscaNeural. As duas são vozes femininas do português do Brasil.

COMO USAR (no seu computador, com internet; leva uns 3 a 6 minutos):
  Windows: instale o Python 3 (python.org — marque "Add Python to PATH") e dê dois cliques em
           ferramentas/gerar_vozes_windows.bat
  Mac/Linux: no terminal, dentro da pasta do jogo:   sh ferramentas/gerar_vozes_mac_linux.sh
  Ou à mão:  pip install edge-tts    e depois    python ferramentas/gerar_vozes.py
  Pronto: os arquivos ficam em audio/falas/ e js/data/falas.js é reescrito. Abra o jogo de novo.
  Rodar de novo só grava o que ainda não existe (é rápido).

Para acrescentar falas, edite ferramentas/falas.txt (uma por linha) ou rode  node ferramentas/listar_falas.js
Observação: o edge-tts usa o serviço de leitura em voz alta do Microsoft Edge. É gratuito e não precisa de conta,
mas não é um produto oficial da Microsoft; para uso comercial, confira os termos de uso.
"""
import asyncio, hashlib, json, os, re, sys

try:
    import edge_tts
except ImportError:
    sys.exit('Falta instalar o edge-tts. Rode:  pip install edge-tts')

VOZES = ['pt-BR-ThalitaMultilingualNeural', 'pt-BR-FranciscaNeural']   # a primeira que existir
NOMES = {'pt-BR-ThalitaMultilingualNeural': 'Thalita (neural)', 'pt-BR-FranciscaNeural': 'Francisca (neural)'}
VELOCIDADE = '-6%'          # um pouquinho mais devagar, para crianças
AO_MESMO_TEMPO = 6          # quantas gravações em paralelo
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'audio', 'falas')


def chave(t):
    """Igual à função chave() do jogo (js/core/services.js): minúsculas, sem pontuação, sem espaços repetidos."""
    t = t.lower()
    t = re.sub(r'\.\.\.|…', ' ', t)
    t = re.sub(r'[.,!?;:"“”()]', ' ', t)
    return ' '.join(t.split())


def ler_falas():
    falas = {}
    with open(os.path.join(RAIZ, 'ferramentas', 'falas.txt'), encoding='utf-8') as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith('#'):
                continue
            if '|' in linha:
                k, texto = linha.split('|', 1)
                k = chave(k)
            else:
                k, texto = chave(linha), linha
            if k and k not in falas:
                falas[k] = texto.strip()
    return falas


async def escolher_voz():
    try:
        nomes = {v['ShortName'] for v in await edge_tts.list_voices()}
        for v in VOZES:
            if v in nomes:
                return v
    except Exception as e:
        print('  (não consegui listar as vozes:', e, ')')
    return VOZES[-1]


async def main():
    os.makedirs(PASTA, exist_ok=True)
    falas = ler_falas()
    voz = await escolher_voz()
    print(f'Voz: {voz}   |   {len(falas)} falas para conferir\n')
    sem = asyncio.Semaphore(AO_MESMO_TEMPO)
    mapa, erros, novas = {}, [], 0

    async def gravar(k, texto):
        nonlocal novas
        nome = hashlib.sha1(k.encode('utf-8')).hexdigest()[:12] + '.mp3'
        destino = os.path.join(PASTA, nome)
        if not (os.path.exists(destino) and os.path.getsize(destino) > 500):
            async with sem:
                for tentativa in range(3):
                    try:
                        await edge_tts.Communicate(texto, voz, rate=VELOCIDADE).save(destino)
                        novas += 1
                        break
                    except Exception as e:
                        if tentativa == 2:
                            erros.append((texto, str(e)))
                            if os.path.exists(destino):
                                os.remove(destino)
                            return
                        await asyncio.sleep(1.5)
        mapa[k] = nome
        if len(mapa) % 50 == 0:
            print(f'  {len(mapa)}/{len(falas)} prontas...')

    await asyncio.gather(*(gravar(k, t) for k, t in falas.items()))
    with open(os.path.join(RAIZ, 'js', 'data', 'falas.js'), 'w', encoding='utf-8') as f:
        f.write('/* falas.js — gerado por ferramentas/gerar_vozes.py: falas gravadas do Bip (%s).\n' % voz)
        f.write('   chave da fala -> arquivo em audio/falas/. Não precisa editar: rode o gerador de novo. */\n')
        f.write('window.TS = window.TS || {};\n')
        f.write('TS.FALAS = ' + json.dumps({'nome': NOMES.get(voz, voz), 'voz': voz, 'base': 'audio/falas/', 'mapa': dict(sorted(mapa.items()))},
                                         ensure_ascii=False, indent=1) + ';\n')
    print(f'\nPronto! {len(mapa)} falas no jogo ({novas} gravadas agora).')
    if erros:
        print(f'{len(erros)} falas não foram gravadas (sem internet?). Rode de novo para tentar:')
        for t, e in erros[:10]:
            print('  -', t, '->', e[:80])

asyncio.run(main())
