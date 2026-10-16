/* t08_modelo6_ligar.js — Modelo 6 — Ligar os pares: arrastar uma linha de uma figura até o par dela (ou tocar numa e
   depois na outra) (fases 3-4, 4-3, 5-3). */
window.TS = window.TS || {};
(function () {
  const { COR, carta } = TS.UI;
  const { esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras
  const XE = 310, XD = 970, YS = [272, 404, 536];   // colunas e linhas das cartas

  // Acrescenta o método tLigar à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tLigar = function (it) {
    const A = this.area;
    this.instrucao(it.fala.replace(/\.$/, ''), 640, 178);
    const linhas = this.add.graphics(); A.add(linhas);
    const temp = this.add.graphics(); A.add(temp);
    const selos = this.add.container(0, 0);
    const direitaLetra = it.criterio === 'letra';
    const esq = it.pares.map(([a], i) => ({ k: a, par: i, lado: 0 }));
    const dir = TS.C.shuffle(it.pares.map(([, b], i) => ({ k: b, par: i, lado: 1 })));
    const cartas = [];
    [esq, dir].forEach((col, lado) => col.forEach((d, i) => {
      const x = lado ? XD : XE; const y = YS[i];
      const letra = direitaLetra && lado === 1;
      const c = carta(this, x, y, 122, 124, letra ? null : Wd[d.k].img, { letra: letra ? d.k : undefined, legenda: letra ? undefined : Wd[d.k].t });
      Object.assign(c, d); A.add(c); cartas.push(c);
      // Bolinha lilás de onde sai a linha
      const dot = this.add.container(x + (lado ? -86 : 86), y);
      dot.add([this.add.circle(0, 0, 20, COR.lilasClaro), this.add.circle(0, 0, 16, 0xffffff), this.add.circle(0, 0, 12, COR.roxo)]);
      A.add(dot); c.dot = dot;
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { if (this.bloqueado || c.ligada) return; if (sel && sel.lado !== c.lado) return; selecionar(c); arrastando = true; });
      c.on('pointerup', () => { if (this.bloqueado || c.ligada) return; if (sel && sel !== c && sel.lado !== c.lado) tentar(sel, c); });
    }));
    A.add(selos);
    let sel = null; let arrastando = false;
    const selecionar = (c) => {
      if (sel) sel.desenhar(null);
      sel = c; c.desenhar('sel'); TS.Som.tocar('toque', 0.4);
      TS.Voz.falar(direitaLetra && c.lado === 1 ? 'letra ' + c.k : Wd[c.k].f);
    };
    // Enquanto arrasta: uma linha pontilhada lilás, como no protótipo
    const pontilhado = (g, x1, y1, x2, y2) => {
      const d = Math.hypot(x2 - x1, y2 - y1); const n = Math.floor(d / 24);
      g.fillStyle(0xa48ff0, 1);
      for (let i = 1; i <= n; i++) g.fillCircle(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, 6);
    };
    this.input.on('pointermove', (p) => {
      temp.clear();
      if (!sel || !arrastando || !p.isDown || this.bloqueado) return;
      const l = this.local(p); // posição do dedo dentro da área
      pontilhado(temp, sel.dot.x, sel.dot.y, l.x, l.y);
    });
    this.input.on('pointerup', (p) => {
      temp.clear();
      if (!sel || !arrastando) return; arrastando = false;
      const l = this.local(p);
      const alvo = cartas.find((c) => c !== sel && !c.ligada && c.lado !== sel.lado && Math.abs(l.x - c.x) < 110 && Math.abs(l.y - c.y) < 70);
      if (alvo) tentar(sel, alvo);
    });
    const ligar = (a, b, cor) => {
      a.ligada = b.ligada = true;
      linhas.lineStyle(10, cor, 1).lineBetween(a.dot.x, a.dot.y, b.dot.x, b.dot.y);
      // selo com ✓ no meio da linha
      const mx = (a.dot.x + b.dot.x) / 2, my = (a.dot.y + b.dot.y) / 2;
      const s = this.add.container(mx, my); s.add([this.add.circle(0, 0, 25, 0xffffff), this.add.circle(0, 0, 21, cor), this.add.image(0, 0, 'svg_g_certo').setDisplaySize(26, 26)]);
      selos.add(s); s.setScale(0); this.tweens.add({ targets: s, scale: 1, duration: 250, ease: 'Back.out' });
      a.desenhar('certo'); b.desenhar('certo');
      [a, b].forEach((c) => c.dot.list[2].setFillStyle(COR.verde));
      sel = null;
      if (cartas.every((c) => c.ligada)) this.time.delayedCall(300, () => this.fimRodada(1300));
    };
    const tentar = async (a, b) => {
      if (this.bloqueado) return;
      const e0 = a.lado === 0 ? a : b; const d0 = a.lado === 0 ? b : a;
      const rot = it.subRotulos[e0.par];
      if (e0.par === d0.par) {
        this.registrar('p' + e0.par, true, rot);
        TS.Som.tocar('acerto', 0.45); const pb = this.mundo((e0.dot.x + d0.dot.x) / 2, (e0.dot.y + d0.dot.y) / 2); TS.UI.brilho(this, pb.x, pb.y);
        ligar(e0, d0, COR.verde);
        const fim = cartas.every((c) => c.ligada);
        this.bibo.falar(fim ? 'Muito bem! Ligou tudo!' : `${Wd[e0.k].f}... ${direitaLetra ? 'letra ' + d0.k : Wd[d0.k].f}. Isso!`, { expr: 'comemorando' });
        return;
      }
      this.registrar('p' + e0.par, false, rot);
      a.desenhar(null); b.desenhar('errado'); this.time.delayedCall(500, () => !b.ligada && b.desenhar(null));
      sel = null;
      const e = this.errou('p' + e0.par, b);
      if (e >= 2) {
        this.bloqueado = true; await esperar(this, 1300); this.bloqueado = false;
        const par = cartas.find((c) => c.lado === 1 && c.par === e0.par);
        ligar(e0, par, COR.amarelo);
        this.bibo.falar(`${Wd[e0.k].f} combina com ${direitaLetra ? 'a letra ' + par.k : Wd[par.k].f}.`, { expr: 'incentivando' });
      }
    };
    this.falaAtual = () => this.falar(it.fala);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
