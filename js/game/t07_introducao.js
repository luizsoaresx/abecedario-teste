/* t07_introducao.js — T07 Introdução da fase: o Bip explica e um dedo-guia mostra como se joga. */
window.TS = window.TS || {};
(function () {
  const { W, COR, TINTA, txt, botao, botaoRedondo, painel, mascote, svgEsc } = TS.UI;

  class Intro extends TS.Cena {
    constructor() { super('Intro'); }

    /* init() roda antes de montar() e recebe os dados enviados por this.ir('Intro', dados):
       { faseId } para uma fase do mapa, { atividadeId } para uma atividade da professora
       ou { atividade, previa: true } quando o professor está pré-visualizando. */
    init(d) {
      this.dados = d;
      this.previa = !!d.previa;
      this.atv = d.atividade || (d.atividadeId ? TS.DB.atividades.get(d.atividadeId) : null);
      this.fase = this.atv ? TS.ATV.comoFase(this.atv) : TS.C.fase(d.faseId);
    }

    montar() {
      const f = this.fase;
      if (!f) return this.scene.start('Tarefas'); // a atividade foi apagada pela professora
      const m = TS.C.MUNDOS[f.mundo - 1];
      TS.UI.fundo(this, m.bg);
      // Mapa (canto de cima): fase -> Mapa; atividade -> lista de atividades; pré-visualização -> tela de edição do professor
      this.ancorar(botaoRedondo(this, 76, 76, 88, { cor: COR.branco, icone: f.custom ? 'svg_g_voltar' : 'svg_g_mapa', iconeTam: 40, onClick: () => this.voltar() }), -1, -1);
      // Título: [1-3] A última palavra  (fase)  ou  [★] Nome da atividade (atividade da professora)
      const cor = Phaser.Display.Color.HexStringToColor(m.cor).color;
      const tit = TS.UI.pilula(this, 640, 76, f.nome, { numero: f.custom ? '★' : `${f.mundo}-${f.fase}`, corNumero: cor, tam: 32, min: 440 });
      if (tit.larg > 760) tit.setScale(760 / tit.larg);
      this.ancorar(tit, 0, -1);
      this.bibo = mascote(this, 232, 640, 0.66, 'feliz');

      // Quadro branco onde acontece a demonstração, com a regra escrita embaixo
      painel(this, 820, 342, 760, 380, COR.branco, 40);
      this.demo = this.add.container(820, 300);
      this.montarDemo();
      const regra = txt(this, 820, 478, f.intro, 23, '#3A3D66', { fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false, wrap: 680 });
      if (regra.height > 70) regra.setScale(70 / regra.height);

      botao(this, 662, 616, 286, 96, { cor: COR.azul, icone: 'svg_alto', iconeTam: 44, texto: 'Ouvir', tam: 36, onClick: () => this.explicar() });
      const c = botao(this, 977, 616, 286, 96, { cor: COR.amarelo, icone: 'svg_g_jogar', iconeTam: 36, texto: 'Começar', tam: 36, onClick: () => this.ir('Atividade', this.dados) });
      this.tweens.add({ targets: c, scale: 1.03, yoyo: true, repeat: -1, duration: 650 });
      this.time.delayedCall(400, () => this.explicar());
    }

    voltar() {
      if (this.previa) return TS.App.sairDaPrevia(true);
      this.ir(this.atv ? 'Tarefas' : 'Mapa');
    }

    // Fala a regra da fase e roda a demonstração
    explicar() {
      this.bibo.falar('Olha como eu faço! ' + this.fase.intro);
      this.animarDemo();
    }

    // Desenha uma miniatura da atividade, conforme o modelo da fase (tpl)
    montarDemo() {
      const d = this.demo;
      const tpl = this.fase.tpl;
      const s = this;
      d.removeAll(true);
      const carta = (x, y, k, t = 130, o) => { const c = TS.UI.carta(s, x, y, t, t, k, o); d.add(c); return c; };
      const quadradoOuvir = (x, y, t = 130) => { const b = TS.UI.botao(s, x, y, t, t, { cor: COR.azul, icone: 'svg_alto', iconeTam: t * 0.5, raio: 28 }); b.disableInteractive(); d.add(b); return b; };
      this.dedo = this.add.image(0, 0, 'dedo').setDepth(50).setVisible(false);
      this.anelDemo = this.add.graphics().setDepth(49).setVisible(false);

      if (tpl.startsWith('contagem')) {
        // Ouvir (ou a figura), o tambor do espaço e as fichas de planeta que acendem a cada batida
        if (tpl === 'contagem_silabas') carta(-230, -10, 'svg_bola', 150); else quadradoOuvir(-230, -10, 140);
        const tam = this.add.image(60, -24, 'svg_tambor').setScale(svgEsc(0.82));
        d.add(tam);
        this.alvoDemo = tam;
        const pil = this.add.graphics(); pil.fillStyle(COR.lilasClaro, 1); pil.fillRoundedRect(-30, 92, 180, 56, 28); d.add(pil);
        this.bolinhas = [0, 1].map((i) => { const b = this.add.image(10 + i * 50, 120, 'svg_g_ficha_vazia').setDisplaySize(40, 40); d.add(b); return b; });
        this.bolinhas.push(this.add.image(110, 120, 'svg_g_ficha_vazia').setDisplaySize(40, 40)); d.add(this.bolinhas[2]);
        const ok = TS.UI.botaoRedondo(s, 270, -40, 96, { cor: COR.verde, icone: 'svg_g_certo', iconeTam: 46 }); ok.disableInteractive(); d.add(ok);
      } else if (tpl === 'escolha') {
        // Ouvir -> três figuras (a do meio é a certa)
        quadradoOuvir(-268, 0, 120);
        d.add(this.add.image(-168, 0, 'svg_g_seta').setDisplaySize(50, 36));
        this.cartasDemo = ['fig_pato', 'fig_sapo', 'fig_vaca'].map((k, i) => carta(-40 + i * 150, 0, k, 132));
        this.alvoDemo = this.cartasDemo[1];
      } else if (tpl === 'vf') {
        // Duas figuras com legenda e os botões Sim e Não
        this.cartasDemo = [carta(-110, -40, 'svg_gato', 150, { legenda: 'GATO' }), carta(110, -40, 'fig_pato', 150, { legenda: 'PATO' })];
        const up = TS.UI.botao(s, -100, 108, 170, 72, { cor: COR.verde, icone: 'svg_joinha', iconeTam: 34, texto: 'Sim', tam: 26 });
        const dn = TS.UI.botao(s, 100, 108, 170, 72, { cor: COR.laranja, icone: 'svg_joinha', iconeTam: 34, texto: 'Não', tam: 26 });
        dn.list[1].list[0].setFlipY(true); up.disableInteractive(); dn.disableInteractive();
        d.add([up, dn]);
        this.alvoDemo = up;
      } else if (tpl.startsWith('montar') || tpl === 'caixas') {
        // Uma figura, um espaço vazio e uma peça que vai ser arrastada até ele (mesmo tamanho: encaixa certinho)
        carta(-240, -20, tpl === 'caixas' ? 'fig_pao' : 'svg_gato', 170);
        const letra = tpl === 'montar_letra';
        const fixa = TS.UI.botao(s, 40, -70, 110, 96, { cor: 0xffffff, corEsc: COR.lilasDegrau, texto: letra ? 'a' : 'GA', tam: 44, raio: 20, sombra: false }); fixa.disableInteractive(); d.add(fixa);
        const slot = this.add.graphics();
        TS.UI.vaga(slot, 160, -70, 110, 96);
        d.add(slot);
        const peca = TS.UI.botao(s, 100, 80, 110, 96, { cor: COR.amarelo, texto: letra ? 'g' : 'TO', tam: 44, raio: 20, sombra: false });
        if (letra) { fixa.setTexto('a'); }
        peca.disableInteractive();
        d.add(peca);
        this.pecaDemo = peca;
        this.alvoPos = { x: 160, y: -70 };
      } else if (tpl === 'ligar') {
        // Duas cartas para ligar com uma linha (e uma terceira de enfeite)
        this.cartasDemo = [carta(-220, -50, 'fig_torta', 120, { legenda: 'TORTA' }), carta(220, 70, 'fig_porta', 120, { legenda: 'PORTA' }), carta(220, -80, 'fig_uva', 100)];
        this.linha = this.add.graphics();
        d.add(this.linha);
      } else if (tpl === 'falar') {
        // A figura e o microfone: a criança toca, fala e o Bip escuta
        carta(-200, -10, 'fig_carro', 190, { legenda: 'CARRO' });
        const mic = TS.UI.botaoRedondo(s, 120, -30, 150, { cor: COR.rosa, icone: 'svg_microfone', iconeTam: 70 }); mic.disableInteractive(); d.add(mic);
        this.alvoDemo = mic;
        this.ouviDemo = this.add.container(120, 110).setVisible(false);
        const fala = txt(s, 0, 0, 'Ouvi: "carro" ✓', 26, '#2E9A3E', { peso: 700 });
        const fg = this.add.graphics(); fg.fillStyle(0xeaf7ec, 1); fg.fillRoundedRect(-fala.width / 2 - 22, -26, fala.width + 44, 52, 26);
        this.ouviDemo.add([fg, fala]); d.add(this.ouviDemo);
      }
    }

    // Anima o dedo-guia fazendo a atividade
    animarDemo() {
      const tpl = this.fase.tpl;
      const d = this.demo;
      const dedo = this.dedo;
      this.tweens.killTweensOf(dedo);
      const P = (o) => ({ x: d.x + o.x, y: d.y + o.y }); // posição na tela de algo que está dentro do quadro
      dedo.setVisible(true).setPosition(d.x + 300, d.y + 200).setAlpha(1);
      // anel amarelo que aparece onde o dedo toca (como no protótipo)
      const anel = (alvo) => {
        const a = this.anelDemo; a.clear(); a.lineStyle(6, COR.amarelo, 1); a.strokeCircle(0, 0, 26); a.strokeCircle(0, 0, 42);
        a.setPosition(P(alvo).x + 50, P(alvo).y + 50).setVisible(true).setScale(0.5).setAlpha(1);
        this.tweens.add({ targets: a, scale: 1.1, alpha: 0, duration: 650 });
      };
      // toque(alvo, depois): o dedo vai até o alvo, "aperta" e depois chama a função "depois"
      const toque = (alvo, cb) => this.tweens.add({
        targets: dedo, x: P(alvo).x + 30, y: P(alvo).y + 36, duration: 600, ease: 'Sine.inOut',
        onComplete: () => { anel(alvo); this.tweens.add({ targets: dedo, scale: 0.8, yoyo: true, duration: 120, onComplete: cb }); },
      });

      if (tpl.startsWith('contagem')) {
        this.bolinhas.forEach((b) => b.setTexture('svg_g_ficha_vazia'));
        let n = 0;
        const bate = () => toque(this.alvoDemo, () => {
          TS.Som.tocar('tambor', 0.4);
          this.tweens.add({ targets: this.alvoDemo, scaleY: svgEsc(0.74), yoyo: true, duration: 90 });
          this.bolinhas[n].setTexture('svg_g_ficha_planeta');
          n++;
          if (n < 2) this.time.delayedCall(250, bate);
        });
        bate();
      } else if (tpl === 'escolha' || tpl === 'vf') {
        if (this.cartasDemo) this.cartasDemo.forEach((c) => { c.desenhar(null); c.selo(false); });
        toque(this.alvoDemo, () => {
          TS.Som.tocar('acerto', 0.4);
          if (this.alvoDemo.desenhar) { this.alvoDemo.desenhar('certo'); this.alvoDemo.selo(true); }
          TS.UI.brilho(this, P(this.alvoDemo).x, P(this.alvoDemo).y);
        });
      } else if (tpl.startsWith('montar') || tpl === 'caixas') {
        const pc = this.pecaDemo;
        pc.setPosition(100, 80);
        toque(pc, () => {
          this.tweens.add({ targets: [pc], x: this.alvoPos.x, y: this.alvoPos.y, duration: 700, ease: 'Sine.inOut' });
          this.tweens.add({ targets: dedo, x: P(this.alvoPos).x + 30, y: P(this.alvoPos).y + 36, duration: 700, ease: 'Sine.inOut', onComplete: () => TS.Som.tocar('acerto', 0.4) });
        });
      } else if (tpl === 'ligar') {
        this.linha.clear();
        this.cartasDemo.forEach((c) => c.desenhar(null));
        toque(this.cartasDemo[0], () => {
          this.cartasDemo[0].desenhar('sel');
          toque(this.cartasDemo[1], () => {
            TS.Som.tocar('acerto', 0.4);
            this.linha.lineStyle(10, COR.verde, 1).lineBetween(-160, -50, 160, 70);
            this.cartasDemo[0].desenhar('certo');
            this.cartasDemo[1].desenhar('certo');
          });
        });
      } else if (tpl === 'falar') {
        this.ouviDemo.setVisible(false);
        toque(this.alvoDemo, () => {
          const ondas = this.add.circle(P(this.alvoDemo).x, P(this.alvoDemo).y, 80).setStrokeStyle(8, COR.rosa, 0.8).setDepth(40);
          this.tweens.add({ targets: ondas, scale: 1.5, alpha: 0, duration: 900, repeat: 1, onComplete: () => ondas.destroy() });
          this.time.delayedCall(1300, () => { if (!this.ouviDemo.active) return; TS.Som.tocar('acerto', 0.4); this.ouviDemo.setVisible(true); });
        });
      }
    }
  }

  TS.CENAS.push(Intro);
})();
