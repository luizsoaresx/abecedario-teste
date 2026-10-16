/* t08_modelo5_caixas.js — Modelo 5 — Separar nas caixas: arrastar cada figura para a caixa verde (combina com a
   figura-modelo) ou laranja (não combina) (fases 3-3, 4-4). */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, carta, txt } = TS.UI;
  const { esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras

  // Acrescenta o método tCaixas à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tCaixas = function (it) {
    const A = this.area;
    const rima = it.criterio === 'rima';
    this.instrucao('Arraste cada figura para a caixa certa', 528, 228, { ox: 1, align: 'right', wrap: 330 });
    const mc = carta(this, 640, 226, 140, 150, Wd[it.modelo].img, { fundo: 0xfff6d6, borda: 0xf4d27a, legenda: Wd[it.modelo].t }); A.add(mc);
    this.alto(A, 700, 166, Wd[it.modelo].f, 50);

    // As duas caixas: verde (sim) e laranja (não), com o joinha, o modelo pequenino e o que ela quer dizer
    const caixas = [true, false].map((sim) => {
      const x = sim ? 340 : 940; const y = 548;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(sim ? 0xc9e8cf : 0xf6d2b8, 1); g.fillRoundedRect(-235, -75 + 8, 470, 150, 28);
      g.fillStyle(sim ? COR.verde : COR.laranja, 1); g.fillRoundedRect(-235, -75, 470, 150, 28);
      g.fillStyle(sim ? 0xeaf7ec : 0xfff1e6, 1); g.fillRoundedRect(-229, -69, 458, 138, 23);
      c.add(g);
      c.add(this.add.circle(-172, 0, 38, sim ? COR.verde : COR.laranja));
      c.add(this.add.image(-172, 0, 'svg_joinha').setDisplaySize(44, 44).setFlipY(!sim));
      const mini = this.add.image(-112, 0, Wd[it.modelo].img); mini.setScale(38 / Math.max(mini.width, mini.height)); c.add(mini);
      c.add(txt(this, -86, 0, sim ? (rima ? `rima com ${Wd[it.modelo].f}` : `começa como ${Wd[it.modelo].f}`) : (rima ? 'não rima' : 'começa diferente'),
        19, TINTA, { fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false, ox: 0, wrap: 120, align: 'left' }));
      c.sim = sim; c.qtd = 0; c.setSize(470, 150).setInteractive(); A.add(c);
      c.on('pointerup', () => { if (sel) tentar(sel, c); });
      return c;
    });
    // Onde cada figura guardada fica dentro da caixa (até 4: duas fileiras de duas)
    const lugar = (cx, i) => ({ x: cx.x + 92 + (i % 2) * 88, y: cx.y + (i < 2 ? -34 : 36) });

    let sel = null;
    const figs = it.figuras.map((f, i) => {
      // Figuras centralizadas (2 a 4), com o nome embaixo e alto-falante
      const c = carta(this, 640 + (i - (it.figuras.length - 1) / 2) * 172, 384, 136, 136, Wd[f.w].img, { legenda: Wd[f.w].t });
      c.dado = f; c.chave = 'f' + i; c.rot = it.subRotulos[i];
      A.add(c);
      this.alto(c, 54, -56, Wd[f.w].f, 46);
      this.arrastavel(c, (o, p) => {
        const l = this.local(p); // posição do dedo dentro da área
        const cx = caixas.find((b) => Math.abs(l.x - b.x) < 250 && Math.abs(l.y - b.y) < 95);
        if (!cx) return false; tentar(o, cx); return true;
      }, (o) => { if (sel) sel.desenhar(null); sel = o; o.desenhar('sel'); TS.Voz.falar(Wd[o.dado.w].f); });
      return c;
    });
    const guardar = (o, cx) => {
      o.disableInteractive(); o.desenhar(null); if (sel === o) sel = null;
      const p = lugar(cx, cx.qtd); cx.qtd++;
      this.tweens.add({ targets: o, x: p.x, y: p.y, scale: 0.5, duration: 300, ease: 'Back.out' });
      o.guardada = true;
      if (figs.every((f) => f.guardada)) this.time.delayedCall(350, () => this.fimRodada(1200));
    };
    const tentar = async (o, cx) => {
      if (this.bloqueado || o.guardada) return;
      if (o.dado.ok === cx.sim) {
        this.registrar(o.chave, true, o.rot);
        TS.Som.tocar('acerto', 0.45); const pb = this.mundo(cx.x, cx.y); TS.UI.brilho(this, pb.x, pb.y);
        guardar(o, cx);
        const ult = figs.every((f) => f.guardada);
        this.bibo.falar(ult ? 'Muito bem! Tudo guardado!' : `${Wd[o.dado.w].f}${cx.sim ? '. Isso!' : '. Isso mesmo!'}`, { expr: 'comemorando' });
        return;
      }
      this.registrar(o.chave, false, o.rot);
      o.desenhar('errado'); this.voltar(o);
      this.time.delayedCall(600, () => { if (o.active && !o.guardada) o.desenhar(null); });
      const e = this.errou(o.chave, null);
      if (e >= 2) {
        this.bloqueado = true; await esperar(this, 1300); this.bloqueado = false;
        guardar(o, caixas.find((b) => b.sim === o.dado.ok));
      }
    };
    this.falaAtual = () => this.falar(it.fala);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
