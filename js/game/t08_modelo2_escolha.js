/* t08_modelo2_escolha.js — Modelo 2 — Escolha: tocar na figura (ou letra) certa entre três
   (fases 1-3, 2-4, 3-2, 4-2, 5-1, 5-2). A pergunta fica no alto do quadro, com o botão azul de ouvir. */
window.TS = window.TS || {};
(function () {
  const { carta } = TS.UI;
  const { ELOGIOS, esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras

  // Texto curto que aparece escrito no alto (a fala do Bip pode ser mais comprida)
  const pergunta = (it) => {
    const f = it.fala.replace(/\.\.\./g, '').replace(/\s+/g, ' ').trim();
    const i = f.search(/(Qual|Com que|Que)\b[^?]*\?$/);       // "A menina viu o sapo. Qual foi a última palavra?" -> "Qual foi a última palavra?"
    return i > 0 ? f.slice(i) : f;
  };

  // Acrescenta o método tEscolha à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tEscolha = function (it) {
    const A = this.area;
    const temModelo = !!it.modelo;
    this.pergunta(it.texto || pergunta(it), it.fala, 214);
    const n = it.opcoes.length;
    let xs, y, tam;
    if (temModelo) {
      // Figura-modelo à esquerda (fundo amarelinho, com alto-falante) e as respostas à direita
      const mc = carta(this, 226, 430, 236, 252, Wd[it.modelo].img, { fundo: 0xfff6d6, borda: 0xf4d27a, legenda: it.modeloGrande ? undefined : Wd[it.modelo].t });
      A.add(mc);
      this.alto(A, 326, 312, Wd[it.modelo].f);
      tam = 212; y = 430; xs = it.opcoes.map((_, i) => 560 + i * 246);
    } else { tam = 256; y = 440; xs = it.opcoes.map((_, i) => 640 + (i - (n - 1) / 2) * 300); }
    const certo = it.opcoes.find((o) => o.id === it.certo);
    const cartas = it.opcoes.map((o, i) => {
      const c = carta(this, xs[i], y, tam, tam + 14, o.img, { letra: o.letra });
      c.op = o; c.setInteractive({ useHandCursor: true }); A.add(c);
      c.on('pointerup', () => escolher(c));
      if (o.letra) c.fala = 'letra ' + o.letra;
      c.setScale(0); this.tweens.add({ targets: c, scale: 1, delay: 150 + i * 90, duration: 280, ease: 'Back.out' });
      return c;
    });
    const escolher = async (c) => {
      if (this.bloqueado || c.apagada) return;
      if (c.op.id === it.certo) {
        this.registrar('r', true); this.bloqueado = true;
        c.desenhar('certo'); c.selo(true); cartas.filter((x) => x !== c).forEach((x) => x.setAlpha(0.45));
        this.acertou(c.x, c.y, false);
        this.tweens.add({ targets: c, scale: 1.08, yoyo: true, duration: 200 });
        await this.falar(`${Phaser.Utils.Array.GetRandom(ELOGIOS)} ${c.op.letra ? 'Letra ' + c.op.letra : c.op.fala}!`, { expr: 'comemorando' });
        return this.fimRodada(250);
      }
      this.registrar('r', false);
      c.apagada = true; c.desenhar('errado');
      this.time.delayedCall(700, () => { if (c.active) { c.desenhar('apagado'); if (c.img) c.img.setAlpha(0.4); if (c.letraTxt) c.letraTxt.setAlpha(0.35); } });
      const e = this.errou('r', c);
      if (e >= 2) {
        this.bloqueado = true;
        const cc = cartas.find((x) => x.op.id === it.certo);
        await esperar(this, 1300);
        cc.desenhar('certo'); cc.selo(true); this.tweens.add({ targets: cc, scale: 1.1, yoyo: true, repeat: 2, duration: 250 });
        await this.falar(`É esta aqui: ${certo.letra ? 'a letra ' + certo.letra : certo.fala}.`, { expr: 'incentivando' });
        this.fimRodada(400);
      }
    };
    this.falaAtual = () => this.falar(it.fala);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
