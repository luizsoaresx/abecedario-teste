/* t08_modelo1_contagem.js — Modelo 1 — Contagem com o tambor do espaço: bater uma vez para cada palavra ou sílaba
   (fases 1-1, 1-2, 1-4, 2-1). Cada batida acende uma "ficha de planeta" embaixo do tambor. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, carta, svgEsc } = TS.UI;
  const { esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras
  const TX = 685, TY = 382;        // tambor
  const FY = 556;                  // fichas (embaixo do tambor)

  // Acrescenta o método tContagem à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tContagem = function (it) {
    const A = this.area;
    const silabas = it.modo === 'silabas';
    const unidades = silabas ? Wd[it.palavra].s : it.fala.replace(/[.!?,]/g, '').split(' ').filter(Boolean);
    this.instrucao(silabas ? 'Toque no tambor para cada pedacinho' : 'Toque no tambor para cada palavra', 640, 206);
    if (silabas) {
      A.add(carta(this, 250, 392, 250, 280, Wd[it.palavra].img, { legenda: Wd[it.palavra].t }));
      this.alto(A, 352, 268, Wd[it.palavra].f);
    } else {
      A.add(botao(this, 250, 368, 210, 210, { cor: COR.azul, icone: 'svg_alto', iconeTam: 120, raio: 40, onClick: () => this.ouvir() }));
      A.add(txt(this, 250, 506, 'Ouvir a frase', 28, TINTA, { peso: 700 }));
    }
    const tambor = this.add.image(TX, TY, 'svg_tambor').setScale(svgEsc(1.12));
    tambor.setInteractive({ useHandCursor: true }); A.add(tambor);
    A.add(this.add.ellipse(TX, TY + 128, 220, 26, 0x000000, 0.10)); // sombra do tambor

    // Fichas: uma pílula lilás com um planetinha para cada batida e um espaço tracejado para a próxima
    let n = 0;
    const fichas = this.add.container(TX, FY); A.add(fichas);
    const rotulos = this.add.container(TX, FY + 50); A.add(rotulos);
    const redesenhar = (anima) => {
      fichas.removeAll(true);
      const tot = Math.min(8, n + (n < 8 ? 1 : 0));
      const larg = Math.max(160, tot * 54 + 40);
      const g = this.add.graphics(); g.fillStyle(COR.lilasClaro, 1); g.fillRoundedRect(-larg / 2, -32, larg, 64, 32); fichas.add(g);
      for (let i = 0; i < tot; i++) {
        const f = this.add.image((i - (tot - 1) / 2) * 54, 0, i < n ? 'svg_g_ficha_planeta' : 'svg_g_ficha_vazia').setDisplaySize(46, 46);
        fichas.add(f);
        if (anima && i === n - 1) { f.setScale(0); this.tweens.add({ targets: f, scaleX: 46 / f.width, scaleY: 46 / f.height, duration: 220, ease: 'Back.out' }); }
      }
      fichas.n = tot;
    };
    redesenhar(false);
    tambor.on('pointerdown', () => {
      if (this.bloqueado || n >= 8) return;
      n++; TS.Som.tocar('tambor', 0.55);
      this.tweens.add({ targets: tambor, scaleY: svgEsc(1.0), scaleX: svgEsc(1.2), yoyo: true, duration: 80 });
      redesenhar(true);
    });
    const pronto = botaoRedondo(this, 1086, 330, 128, { cor: COR.verde, icone: 'svg_g_certo', iconeTam: 64, onClick: () => verificar() });
    const menos = botaoRedondo(this, 1086, 478, 96, { cor: COR.laranja, icone: 'svg_g_menos', iconeTam: 48, onClick: () => { if (!this.bloqueado && n > 0) { n--; redesenhar(false); } } });
    A.add([pronto, menos]);
    // Fala as sílabas (ou palavras) e acende cada ficha quando a parte dela começa
    const falarUnidades = async () => {
      rotulos.removeAll(true);
      const partes = unidades.map((u) => (silabas ? TS.C.falaSilaba(u) : u.toLowerCase()));
      const tot = n;
      await TS.Voz.falarSequencia(partes, (i) => {
        const f = fichas.list[i + 1];
        if (f && f.active) this.tweens.add({ targets: f, y: -10, yoyo: true, duration: 160 });
        const x = (i - (tot - 1) / 2) * 54;
        const t = txt(this, x, 0, unidades[i], silabas ? 22 : 18, TINTA, { peso: 700 });
        if (t.width > 52 && tot > 1) t.setScale(52 / t.width);
        rotulos.add(t);
      }, { rate: 0.9, sepFala: silabas ? '. ' : ', ' }); // sílabas: uma por vez, com ponto; palavras: com vírgula
      await esperar(this, 150);
    };
    const verificar = async () => {
      if (this.bloqueado) return;
      if (n === it.n) {
        this.registrar('r', true); this.bloqueado = true;
        redesenhar(false); fichas.list.slice(1).forEach((f, i) => { if (i >= n) f.setVisible(false); });
        this.acertou(TX, FY, false);
        await falarUnidades();
        await this.falar(`Isso! ${it.n} ${silabas ? (it.n > 1 ? 'pedacinhos' : 'pedacinho') : 'palavras'}!`, { expr: 'comemorando' });
        return this.fimRodada(300);
      }
      this.registrar('r', false);
      const e = this.errou('r', pronto);
      if (e >= 2) {
        this.bloqueado = true; await esperar(this, 1500);
        n = it.n; redesenhar(false); fichas.list.slice(1).forEach((f, i) => { if (i >= n) f.setVisible(false); });
        await falarUnidades();
        await this.falar(`São ${it.n}. Vamos para a próxima!`, { expr: 'incentivando' });
        return this.fimRodada(200);
      }
      n = 0; redesenhar(false);
      await esperar(this, 1600); this.ouvir();
    };
    this.falaAtual = () => (silabas ? this.falar(Wd[it.palavra].f + '. Quantos pedacinhos tem?') : this.falar(it.fala, { rate: 0.9 }));
    this.time.delayedCall(200, this.falaAtual);
  };
})();
