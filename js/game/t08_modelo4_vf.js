/* t08_modelo4_vf.js — Modelo 4 — Sim ou não: as duas palavras rimam (ou começam igual)? (fases 3-1, 4-1) */
window.TS = window.TS || {};
(function () {
  const { COR, botao, carta, txt } = TS.UI;
  const { ELOGIOS, esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras
  const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Acrescenta o método tVF à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tVF = function (it) {
    const A = this.area;
    const rima = /rimam\?/.test(it.fala);
    this.pergunta(`${maiuscula(Wd[it.a].f)} e ${Wd[it.b].f} ${rima ? 'rimam' : 'começam igual'}?`, it.fala, 208);
    const c1 = carta(this, 450, 380, 236, 214, Wd[it.a].img, { legenda: Wd[it.a].t });
    const c2 = carta(this, 830, 380, 236, 214, Wd[it.b].img, { legenda: Wd[it.b].t });
    A.add([c1, c2]);
    this.alto(A, 556, 288, Wd[it.a].f); this.alto(A, 936, 288, Wd[it.b].f);
    A.add(this.add.circle(640, 376, 40, COR.lilasClaro));
    A.add(txt(this, 640, 374, '?', 50, '#7A5AF0', { peso: 700 }));
    const sim = botao(this, 515, 560, 190, 104, { cor: COR.verde, icone: 'svg_joinha', iconeTam: 50, texto: 'Sim', tam: 34, onClick: () => responder(true, sim) });
    const nao = botao(this, 765, 560, 190, 104, { cor: COR.laranja, icone: 'svg_joinha', iconeTam: 50, texto: 'Não', tam: 34, onClick: () => responder(false, nao) });
    nao.list[1].list[0].setFlipY(true);
    A.add([sim, nao]);
    const responder = async (v, b) => {
      if (this.bloqueado) return;
      const certo = v === it.resposta;
      // (frases montadas com pedaços gravados: "gato" + "rima com" + "pato")
      const expl = rima
        ? (it.resposta ? `${Wd[it.a].f} rima com ${Wd[it.b].f}!` : `${Wd[it.a].f} não rima com ${Wd[it.b].f}.`)
        : (it.resposta ? `${Wd[it.a].f} começa com o mesmo som de ${Wd[it.b].f}!` : `${Wd[it.a].f} não começa como ${Wd[it.b].f}.`);
      if (certo) {
        this.registrar('r', true); this.bloqueado = true;
        if (it.resposta) { c1.desenhar('certo'); c2.desenhar('certo'); }
        this.acertou(b.x, b.y, false);
        await this.falar(`${Phaser.Utils.Array.GetRandom(ELOGIOS)} ${expl}`, { expr: 'comemorando' });
        return this.fimRodada(250);
      }
      this.registrar('r', false); this.bloqueado = true;
      this.errou('r', b);
      await esperar(this, 1500);
      const cb = it.resposta ? sim : nao;
      this.tweens.add({ targets: cb, scale: 1.15, yoyo: true, repeat: 2, duration: 220 });
      await this.falar(expl, { expr: 'incentivando' });
      this.fimRodada(400);
    };
    this.falaAtual = () => this.falar(it.fala);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
