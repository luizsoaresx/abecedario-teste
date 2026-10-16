/* t08_modelo7_falar.js — Modelo 7 — FALAR no microfone (fases 1-5, 2-5, 3-5, 4-5, 5-5 e a atividade "Falar a palavra").
   A criança toca no microfone, fala, e o jogo reconhece o que ela disse (js/core/escuta.js).
   Modos: repetir (o Bip fala e a criança repete), nomear (fala o nome da figura sozinha), rima, som, silaba e letra.

   Se o navegador não reconhece fala (Firefox), se o microfone foi bloqueado ou se está sem internet,
   entra o MODO ADULTO CONFERE: o jogo grava a voz (quando dá), toca de volta e um adulto toca no joinha. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, carta } = TS.UI;
  const { ELOGIOS, esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras
  const MX = 820, MY = 372;          // microfone
  const VERMELHO = 0xe53950, VERMELHO_ESC = 0xa8213a;
  let modoAdulto = false;            // vale para a partida inteira depois que o microfone falhar

  // Texto escrito no alto do quadro, conforme o modo
  function pergunta(it) {
    const p = it.palavra && Wd[it.palavra];
    switch (it.modo) {
      case 'nomear': return 'Que figura é essa? Fale o nome!';
      case 'rima': return `Fale uma palavra que rima com ${p.t}`;
      case 'som': return `Fale outra palavra que começa como ${p.t}`;
      case 'silaba': return `Fale uma palavra que começa com ${it.silaba}`;
      case 'letra': return `Fale uma palavra que começa com a letra ${it.letra}`;
      default: return `Fale: ${p.t}`;
    }
  }

  // Acrescenta o método tFalar à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tFalar = function (it) {
    const A = this.area;
    const p = it.palavra && Wd[it.palavra];
    this.pergunta(pergunta(it), it.fala, 214);

    // ----- À esquerda: o que a criança vai falar (figura, sílaba ou letra) -----
    if (it.modo === 'silaba' || it.modo === 'letra') {
      const pc = this.peca(300, 400, it.modo === 'silaba' ? it.silaba : it.letra, 'colocada', 250, 220);
      pc.t.setScale(1.5); A.add(pc);
      this.alto(A, 410, 300, it.falaCurta || '', 60);
    } else {
      const c = carta(this, 300, 410, 280, 300, p.img, { legenda: it.modo === 'nomear' ? undefined : p.t, fundo: it.modo === 'repetir' ? 0xffffff : 0xfff6d6, borda: it.modo === 'repetir' ? undefined : 0xf4d27a });
      A.add(c); this.cartaFig = c;
      if (it.modo !== 'nomear') this.alto(A, 420, 274, p.f, 62);
    }

    // ----- O microfone (grande, rosa; fica vermelho enquanto escuta) -----
    const ondas = [0, 1].map(() => this.add.circle(MX, MY, 100).setStrokeStyle(10, VERMELHO, 0.7).setVisible(false));
    A.add(ondas);
    // O botão do microfone é desenhado aqui (e não com botao()) para poder trocar de cor enquanto escuta
    const mic = this.add.container(MX, MY);
    const micG = this.add.graphics(); mic.add(micG);
    mic.add(this.add.image(0, 0, 'svg_microfone').setDisplaySize(96, 96));
    mic.setSize(200, 200).setInteractive({ useHandCursor: true });
    mic.on('pointerdown', () => { if (!ouvindo) mic.setScale(0.96); });
    mic.on('pointerout', () => { if (!ouvindo) mic.setScale(1); });
    mic.on('pointerup', () => { mic.setScale(1); TS.Som.tocar('clique', 0.5); ouvir(); });
    A.add(mic); this.mic = mic; // (this.mic também ajuda nos testes automáticos)
    const legenda = txt(this, MX, MY + 142, 'Toque e fale', 28, TINTA, { peso: 700 }); A.add(legenda);
    const ouvi = this.add.container(MX, 590).setVisible(false); A.add(ouvi);
    const mostrarOuvi = (texto, ok) => {
      ouvi.removeAll(true);
      const t = txt(this, 0, -1, texto, 26, ok ? '#1F6E2A' : '#B2530C', { peso: 700 });
      if (t.width > 520) t.setScale(520 / t.width);
      const w = t.displayWidth + 48;
      const g = this.add.graphics(); g.fillStyle(ok ? 0xeaf7ec : 0xfff1e6, 1); g.fillRoundedRect(-w / 2, -26, w, 52, 26);
      ouvi.add([g, t]); ouvi.setVisible(true).setScale(0.6); this.tweens.add({ targets: ouvi, scale: 1, duration: 220, ease: 'Back.out' });
    };
    // Dica (nos modos em que a criança inventa a palavra): mostra e fala um exemplo
    if (it.exemplos && it.exemplos.length) {
      const dica = botaoRedondo(this, 1112, 560, 84, { cor: COR.amarelo, icone: 'svg_g_estrela_botao', iconeTam: 38, onClick: () => {
        if (this.bloqueado || ouvindo) return;
        const k = Phaser.Utils.Array.GetRandom(it.exemplos);
        const ex = this.add.image(1112, 430, Wd[k].img); ex.setScale(0); A.add(ex);
        this.tweens.add({ targets: ex, scale: 96 / Math.max(ex.width, ex.height), duration: 260, ease: 'Back.out' });
        this.time.delayedCall(2600, () => ex.active && this.tweens.add({ targets: ex, alpha: 0, duration: 300, onComplete: () => ex.destroy() }));
        this.falar(`Uma dica: ${Wd[k].f}! Agora fale você.`, { expr: 'pensando' });
      } });
      A.add(dica); A.add(txt(this, 1112, 618, 'dica', 20, '#7C7FA6', { peso: 700 }));
    }

    let ouvindo = false; let tentativas = 0;
    const estadoMic = (escutando) => {
      ouvindo = escutando;
      ondas.forEach((o, i) => {
        this.tweens.killTweensOf(o); o.setVisible(escutando).setScale(1).setAlpha(0.8);
        if (escutando) this.tweens.add({ targets: o, scale: 1.45, alpha: 0, duration: 1100, delay: i * 550, repeat: -1 });
      });
      if (escutando) this.tweens.add({ targets: mic, scale: 1.06, yoyo: true, repeat: -1, duration: 420 });
      else { this.tweens.killTweensOf(mic); mic.setScale(1); }
      pintar(escutando ? VERMELHO : COR.rosa, escutando ? VERMELHO_ESC : COR.rosaEsc);
      legenda.setText(escutando ? 'Estou ouvindo...' : 'Toque e fale');
    };
    // Repinta o botão do microfone (rosa parado, vermelho escutando)
    const pintar = (cor, esc) => {
      const g = micG; const d = 200; const deg = 9;
      g.clear();
      g.fillStyle(0x0e0a30, 0.16); g.fillRoundedRect(-d / 2, -d / 2 + deg + 4, d, d, d / 2);
      g.fillStyle(esc, 1); g.fillRoundedRect(-d / 2, -d / 2 + deg, d, d, d / 2);
      g.fillStyle(cor, 1); g.fillRoundedRect(-d / 2, -d / 2, d, d, d / 2);
      g.fillStyle(0xffffff, 0.16); g.fillRoundedRect(-d / 4, -d / 2 + 4, d / 2, d * 0.26, d * 0.13);
    };

    // ----- Escutar -----
    const ouvir = async () => {
      if (this.bloqueado || ouvindo) return;
      if (modoAdulto || !TS.Escuta.disponivel()) return adulto();
      TS.Voz.parar();
      await esperar(this, 250);           // deixa a voz do Bip terminar de verdade (para o microfone não ouvir o Bip)
      ouvi.setVisible(false);
      estadoMic(true);
      this.bibo.setExpr('pensando');
      const r = await TS.Escuta.ouvir({ tempo: 7000, aoParcial: (t) => { if (this.sys.isActive()) legenda.setText(`"${t}"`); } });
      if (!this.sys.isActive() || !mic.active) return;
      estadoMic(false);
      if (r.erro) return problema(r.erro);
      const c = TS.Escuta.conferir(r.textos, it.regra);
      tentativas++;
      if (c.ok) return acertou(c.ouvido);
      return errou(c);
    };

    const acertou = async (ouvido) => {
      this.registrar('r', true, null, { ouvido });
      this.bloqueado = true;
      mostrarOuvi(`Ouvi: "${ouvido}" ✓`, true);
      if (this.cartaFig) { this.cartaFig.desenhar('certo'); this.cartaFig.selo(true); }
      this.acertou(MX, MY, false);
      const elogio = Phaser.Utils.Array.GetRandom(ELOGIOS);
      const extra = it.modo === 'rima' ? ` ${ouvido} rima com ${p.f}!` : it.modo === 'som' ? ` ${ouvido} começa como ${p.f}!`
        : it.modo === 'silaba' ? ` ${ouvido} começa com ${it.falaCurta}!` : it.modo === 'letra' ? ` ${ouvido} começa com ${it.letra}!` : ` Você falou ${p.f}!`;
      await this.falar(elogio + extra, { expr: 'comemorando' });
      this.fimRodada(300);
    };
    const errou = async (c) => {
      TS.Som.tocar('erro', 0.35);
      mostrarOuvi(c.ouvido ? `Ouvi: "${c.ouvido}"` : 'Não entendi', false);
      this.tweens.add({ targets: mic, x: MX + 12, yoyo: true, repeat: 3, duration: 55, onComplete: () => mic.setX(MX) });
      if (tentativas < 2) {
        const dica = c.mesma ? `Essa é a mesma palavra! Fale outra.` : it.modo === 'repetir' || it.modo === 'nomear'
          ? `Hmm, eu ouvi ${c.ouvido || 'outra coisa'}. Vamos tentar de novo? Fale bem alto: ${p.f}!` : 'Quase! Tente outra palavra.';
        return this.falar(dica, { expr: 'incentivando' });
      }
      // Duas tentativas: conta como erro, mostra a resposta e segue
      this.registrar('r', false, null, { ouvido: c.ouvido || '' });
      this.bloqueado = true;
      const resp = it.modo === 'repetir' || it.modo === 'nomear' ? `A palavra é ${p.f}.`
        : it.exemplos && it.exemplos.length ? `Por exemplo: ${Wd[it.exemplos[0]].f}.` : '';
      await this.falar(`${resp} Vamos para a próxima!`, { expr: 'incentivando' });
      this.fimRodada(300);
    };
    // Problemas com o microfone
    const problema = async (erro) => {
      this.bibo.setExpr('feliz');
      if (erro === 'sem_fala' || erro === 'cancelado') { mostrarOuvi('Não ouvi nada', false); return this.falar('Não ouvi nada. Toque no microfone e fale bem alto!', { expr: 'incentivando' }); }
      const msg = {
        bloqueado: 'O microfone está bloqueado. Peça para um adulto permitir o microfone no navegador.',
        sem_microfone: 'Não encontrei o microfone. Peça ajuda para um adulto.',
        rede: 'Para eu escutar, precisa de internet.',
        sem_suporte: 'Este navegador não consegue me deixar escutar.',
      }[erro] || 'O microfone não funcionou agora.';
      modoAdulto = true;
      await this.falar(`${msg} Vamos fazer assim: você fala e um adulto confere.`, { expr: 'preocupado' });
      adulto();
    };

    // ----- Modo "adulto confere" -----
    const adulto = async () => {
      if (this.bloqueado || ouvindo) return;
      mic.disableInteractive(); legenda.setText('Fale agora!');
      ouvi.setVisible(false);
      let url = null;
      estadoMic(true);
      legenda.setText('Fale agora!');
      if (TS.Escuta.podeGravar()) { const g = await TS.Escuta.gravar(3500); url = g.url || null; } else await esperar(this, 3000);
      if (!this.sys.isActive()) return;
      estadoMic(false);
      legenda.setText('Um adulto confere:');
      const caixa = this.add.container(MX, 590); A.add(caixa);
      const sim = botao(this, url ? -40 : -100, 0, 170, 76, { cor: COR.verde, icone: 'svg_joinha', iconeTam: 38, texto: 'Certo', tam: 26, onClick: () => decidir(true) });
      const nao = botao(this, url ? 150 : 100, 0, 190, 76, { cor: COR.laranja, icone: 'svg_joinha', iconeTam: 38, texto: 'Ainda não', tam: 24, onClick: () => decidir(false) });
      nao.list[1].list[0].setFlipY(true);
      caixa.add([sim, nao]); this.conferenciaAdulto = { sim, nao };
      if (url) {
        const ouvirGrav = botaoRedondo(this, -190, 0, 76, { cor: COR.azul, icone: 'svg_alto', onClick: () => { try { new Audio(url).play(); } catch (e) { /* segue */ } } });
        caixa.add(ouvirGrav);
        try { new Audio(url).play(); } catch (e) { /* segue */ }
      }
      const decidir = async (ok) => {
        caixa.destroy(); mic.setInteractive({ useHandCursor: true });
        if (ok) return acertou(it.modo === 'repetir' || it.modo === 'nomear' ? p.f : 'conferido pelo adulto');
        tentativas++;
        if (tentativas < 2) { legenda.setText('Toque e fale'); return this.falar(it.modo === 'repetir' || it.modo === 'nomear' ? `Vamos de novo! Fale: ${p.f}.` : 'Vamos tentar de novo!', { expr: 'incentivando' }); }
        this.registrar('r', false, null, { ouvido: '' });
        this.bloqueado = true;
        await this.falar('Tudo bem! Vamos para a próxima.', { expr: 'incentivando' });
        this.fimRodada(300);
      };
    };

    // A instrução: no modo repetir o Bip fala a palavra; no nomear, não diz o nome
    this.falaAtual = () => this.falar(it.fala);
    this.events.once('shutdown', () => TS.Escuta.parar());
    pintar(COR.rosa, COR.rosaEsc);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
