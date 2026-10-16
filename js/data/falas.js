/* falas.js — lista das falas GRAVADAS do Bip (voz neural) e o nome de cada arquivo em audio/falas/.
   Vazio por enquanto: o jogo usa a voz do navegador. Para gravar com a voz neural (gratuita),
   rode ferramentas/gerar_vozes.py (no Windows: dois cliques em ferramentas/gerar_vozes_windows.bat).
   Ele cria os MP3 em audio/falas/ e reescreve este arquivo. */
window.TS = window.TS || {};
TS.FALAS = { nome: '', base: 'audio/falas/', mapa: {} };
