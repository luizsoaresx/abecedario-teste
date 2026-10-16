/* app.js — liga o jogo: cria o Phaser do tamanho da tela, acompanha as mudanças de tamanho
   e troca entre o jogo, a área do professor e a pré-visualização. Sempre o último arquivo. */
window.TS = window.TS || {};
TS.App = (function () {
  let game = null;
  const elJogo = () => document.getElementById('jogo');
  const elPalco = () => document.getElementById('palco');
  const elGestao = () => document.getElementById('gestao');

  /* ---------- Tamanho do canvas ----------
     O canvas tem o tamanho real da tela, em pixels do aparelho (celulares e telas retina têm 2 ou 3 pixels por ponto).
     Assim nada fica borrado. Limitamos a 2 pixels por ponto e a 2560 px no lado maior, para não pesar no celular. */
  const DPR_MAX = 2, LADO_MAX = 2560;
  function tamanhoCanvas() {
    const r = elPalco().getBoundingClientRect();
    const w = Math.max(240, r.width || window.innerWidth), h = Math.max(160, r.height || window.innerHeight);
    let d = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    if (Math.max(w, h) * d > LADO_MAX) d = LADO_MAX / Math.max(w, h);
    return { w: Math.round(w * d), h: Math.round(h * d) };
  }

  // Cria o jogo do Phaser
  function iniciarJogo() {
    const t = tamanhoCanvas();
    game = new Phaser.Game({
      type: Phaser.AUTO,          // usa WebGL se der, senão Canvas
      parent: 'palco',            // desenha dentro de <div id="palco">
      width: t.w, height: t.h,    // o canvas começa do tamanho da tela
      backgroundColor: '#1E1656',
      // FIT: o canvas é mostrado ocupando a caixa inteira (como o tamanho já é o da caixa, não sobra borda)
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 3 },                                            // aceita vários dedos
      render: { antialias: true, roundPixels: false },
      scene: TS.CENAS,            // a lista de telas (a primeira, Boot, abre sozinha)
    });
    TS.game = game; // para podermos olhar o jogo no Console do navegador

    // Quando a janela muda de tamanho (ou o celular gira), o canvas acompanha.
    // Esperamos 120 ms para não recalcular dezenas de vezes enquanto a pessoa arrasta a janela.
    let espera = null;
    const ajustar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        if (!game || elJogo().hidden) return;
        const n = tamanhoCanvas();
        game.scale.getParentBounds(); // o Phaser relê o tamanho da caixa #palco (ele só confere sozinho de vez em quando)
        if (n.w !== game.scale.width || n.h !== game.scale.height) game.scale.setGameSize(n.w, n.h); // cada cena reorganiza a tela (base.js)
        else game.scale.refresh();
      }, 120);
    };
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(elPalco());
    window.addEventListener('resize', ajustar);
    window.addEventListener('orientationchange', ajustar);
    TS.App.ajustar = ajustar;
  }

  /* ---------- Celular: tela cheia e "deitado" ----------
     Chamado ao tocar em Jogar. O navegador só deixa entrar em tela cheia depois de um toque. */
  const ehToque = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function telaCheia() {
    if (!ehToque() || document.fullscreenElement) return;
    const el = document.documentElement;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!pedir) return; // iPhone não tem tela cheia para páginas: segue normal
    try {
      const p = pedir.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (e) { /* sem tela cheia */ }
  }

  /* ---------- Jogo x área do professor ----------
     A área do professor (gestão) é uma página HTML que fica POR CIMA do jogo: o jogo continua na página,
     só que escondido e parado. Para ele não "escutar" cliques nem falar enquanto está escondido:
       1) desligamos os toques/cliques do Phaser (game.input.enabled = false);
       2) fechamos todas as telas do jogo (pararCenas) — assim nenhuma fala agendada toca;
       3) paramos o relógio do jogo (game.loop.sleep) — economiza bateria.
     Antes, o Phaser ainda recebia o "soltar o mouse" de qualquer clique na página (ele escuta a janela inteira),
     e a tela inicial escondida falava "Oi! Se você é aluno..." a cada clique na gestão. */
  let modo = 'jogo';   // 'jogo' ou 'gestao': o que está na tela agora
  let vigia = null;

  // Fecha NA HORA todas as telas do jogo que estão abertas (ou pausadas/dormindo).
  // (this.scene.stop() dentro de uma tela só fecha no próximo quadro; game.scene.stop() fecha agora.)
  function pararCenas() {
    if (!game) return;
    game.scene.getScenes(false).forEach((s) => {
      if (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping()) game.scene.stop(s.sys.settings.key);
    });
  }

  // Esconde o jogo e mostra a caixa da gestão
  function esconderJogo() {
    modo = 'gestao';
    elJogo().hidden = true; elGestao().hidden = false;
    document.body.classList.add('na-gestao'); // o aviso "gire o celular" não aparece na gestão
    if (!game) return;
    game.input.enabled = false;
    // Esperamos o clique atual terminar (este código pode ter sido chamado por um botão do próprio jogo)
    setTimeout(() => { if (modo !== 'gestao') return; pararCenas(); game.loop.sleep(); }, 0);
  }

  // Mostra o jogo e abre a tela pedida
  function mostrarJogo(cena, dados) {
    modo = 'jogo';
    elGestao().hidden = true; elJogo().hidden = false;
    document.body.classList.remove('na-gestao');
    TS.Voz.parar();
    if (!game) return;
    pararCenas();                 // fecha o que tinha ficado aberto (ex.: a tela Acesso de antes)
    game.input.enabled = true;
    game.loop.wake();
    game.scene.start(cena, dados); // abre NA HORA (nada fica esperando na fila para fechar depois)
    ajustarAgora();
    /* Vigia: se depois de 0,8 s nenhuma tela estiver aberta, abre de novo.
       Era esse o caso da tela azul vazia ao sair da conta: a tela Acesso abria e logo depois
       uma ordem de "fechar" que estava na fila do Phaser a fechava. Agora isso não acontece,
       e o vigia garante que nunca mais seja preciso apertar F5. */
    clearTimeout(vigia);
    vigia = setTimeout(() => {
      if (modo === 'jogo' && game.scene.getScenes(true).length === 0) game.scene.start(cena, dados);
    }, 800);
  }

  // Abre a área do professor (login ou painel)
  function abrirGestao() {
    if (!TS.Admin) { alert('A área do professor ainda não foi criada.'); return; }
    TS.Voz.parar();
    sairDaPrevia(false);
    esconderJogo();
    TS.Admin.abrir();
  }

  // Fecha a área do professor e volta para o jogo (por padrão, na tela de acesso)
  function abrirJogo(cena = 'Acesso', dados) {
    elGestao().innerHTML = '';
    mostrarJogo(cena, dados);
  }
  function ajustarAgora() { if (TS.App.ajustar) TS.App.ajustar(); }

  /* ---------- Pré-visualização (professor vê a atividade como o aluno) ----------
     Esconde a gestão, mostra o jogo com uma barra no topo e não salva nada. */
  let previa = null;
  function abrirPrevia(atividade, aoVoltar) {
    previa = { atividade, aoVoltar };
    document.body.classList.add('em-previa');
    const barra = document.getElementById('barraPrevia');
    barra.hidden = false;
    barra.querySelector('[data-titulo-previa]').textContent = atividade.titulo || 'Atividade sem título';
    trocarAparelho(barra.dataset.aparelho || 'pc');
    mostrarJogo('Intro', { atividade, previa: true });
  }
  // Mostra o jogo do tamanho de um computador ou de um celular deitado
  function trocarAparelho(qual) {
    const barra = document.getElementById('barraPrevia');
    barra.dataset.aparelho = qual;
    barra.querySelectorAll('[data-aparelho]').forEach((b) => b.classList.toggle('ativo', b.dataset.aparelho === qual));
    document.body.classList.toggle('previa-celular', qual === 'celular');
    ajustarAgora();
  }
  // Sai da pré-visualização. voltar=true devolve o professor para a tela de edição.
  function sairDaPrevia(voltar = true) {
    if (!previa) return;
    const p = previa; previa = null;
    document.getElementById('barraPrevia').hidden = true;
    document.body.classList.remove('em-previa', 'previa-celular');
    TS.Voz.parar();
    if (!voltar) return;
    esconderJogo();
    if (p.aoVoltar) p.aoVoltar();
  }
  const emPrevia = () => !!previa;

  // Liga os botões da barra de pré-visualização e do aviso de girar o celular
  function ligarBotoesDaPagina() {
    const barra = document.getElementById('barraPrevia');
    barra.querySelectorAll('[data-aparelho]').forEach((b) => b.addEventListener('click', () => trocarAparelho(b.dataset.aparelho)));
    barra.querySelector('[data-sair-previa]').addEventListener('click', () => sairDaPrevia(true));
    document.querySelector('[data-retrato-ok]').addEventListener('click', () => { document.body.classList.add('retrato-ok'); ajustarAgora(); });
  }

  /* Começo de tudo: liga o banco de dados (e, se alguém já estava conectado neste aparelho, baixa os dados dele),
     espera a fonte (no máximo 1,8 s) e cria o jogo. */
  async function iniciar() {
    ligarBotoesDaPagina();
    const fonte = Promise.race([Promise.all([document.fonts.load('600 40px Fredoka'), document.fonts.load('400 20px Fredoka')]), new Promise((r) => setTimeout(r, 1800))]).catch(() => {});
    try { await TS.DB.iniciar(); } catch (e) { console.error('Banco de dados:', e); }
    await fonte;
    iniciarJogo();
    const c = document.getElementById('carregando'); if (c) c.remove();
    vigiarPartida();
  }

  /* Rede de segurança contra a "tela vazia": se em 10 segundos nenhuma tela do jogo abriu
     (erro de JavaScript, arquivo faltando...), mostra um aviso com botão para recarregar, em vez de uma tela lisa. */
  function vigiarPartida() {
    setTimeout(() => {
      if (modo !== 'jogo' || !game || game.scene.getScenes(true).length) return;
      const av = document.createElement('div');
      av.className = 'aviso-falha';
      av.innerHTML = '<div><b>O jogo não conseguiu abrir.</b><p>Recarregue a página. Se continuar, confira se todos os arquivos da pasta js/ estão no lugar.</p><button type="button">Recarregar</button></div>';
      av.querySelector('button').onclick = () => location.reload();
      document.body.appendChild(av);
    }, 10000);
  }

  // Para testar o aviso de "sem internet": digite TS.App.simularOffline(true) no Console
  function simularOffline(v) { TS.offlineSimulado = v; window.dispatchEvent(new Event(v ? 'offline' : 'online')); }

  return { iniciar, abrirGestao, abrirJogo, abrirPrevia, sairDaPrevia, emPrevia, telaCheia, simularOffline };
})();

// Quando a página terminar de carregar, começa
window.addEventListener('load', () => TS.App.iniciar());
