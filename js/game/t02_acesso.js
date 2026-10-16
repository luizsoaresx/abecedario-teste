/* t02_acesso.js — T02 Escolha de acesso: cartão grande amarelo "Sou aluno" e cartão branco "Sou professor". */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botaoRedondo, painel } = TS.UI;

  class Acesso extends TS.Cena {
    constructor() { super('Acesso'); }

    montar() {
      TS.UI.fundo(this, 'bg_abertura');
      const fala = 'Oi! Se você é aluno, toque no quadro amarelo!';

      // ----- Cartão do aluno (grande, amarelo) -----
      const card = this.add.container(570, 350);
      const g = this.add.graphics();
      g.fillStyle(0xd9d2f7, 0.28); g.fillRoundedRect(-316, -256, 632, 512, 58);  // halo lilás em volta
      g.fillStyle(COR.amareloEsc, 1); g.fillRoundedRect(-300, -240 + 12, 600, 480, 46); // degrau
      g.fillStyle(COR.amarelo, 1); g.fillRoundedRect(-300, -240, 600, 480, 46);    // cartão
      g.fillStyle(0xffffff, 0.22); g.fillCircle(-190, -150, 60); g.fillCircle(210, 110, 56); // bolhas claras
      g.lineStyle(10, 0xffffff, 0.35); g.strokeEllipse(0, -36, 500, 150);           // órbita
      card.add(g);
      const foguete = this.add.image(-210, -20, 'foguete').setAngle(-18); foguete.setScale(150 / foguete.height); card.add(foguete);
      const nave = this.add.image(205, -10, 'nave_verde').setAngle(-10); nave.setScale(118 / nave.width); card.add(nave);
      const met = this.add.image(195, -165, 'meteoro_2'); met.setScale(54 / met.width); card.add(met);
      [[-235, 90, 0.9], [190, -190, 0.7], [250, 40, 0.6]].forEach(([x, y, s]) => card.add(this.add.image(x, y, 'svg_g_estrela_botao').setDisplaySize(26 * s, 26 * s).setAlpha(0.85)));
      this.tweens.add({ targets: foguete, y: -34, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.inOut' });
      this.tweens.add({ targets: nave, angle: 8, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.inOut' });
      const b = this.add.image(0, 80, 'bibo_rosa_feliz').setOrigin(TS.GALACTICO.ORIGEM_BIP, 1).setScale(0.6 / TS.GALACTICO.RES_BIP);
      card.add(b);
      this.tweens.add({ targets: b, y: 70, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
      card.add(txt(this, 0, 145, 'Sou aluno', 66, TINTA, { peso: 700 }));
      card.add(txt(this, 0, 198, 'toque aqui para entrar', 20, '#8A6510', { fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false }));
      // Um Container só recebe toque depois de ter tamanho
      card.setSize(600, 480).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => { TS.Som.tocar('clique'); this.ir('LoginAluno'); });
      this.tweens.add({ targets: card, scale: 1.025, yoyo: true, repeat: -1, duration: 950, ease: 'Sine.inOut' });

      // ----- Cartão do professor (branco, no canto de baixo à direita) -----
      const p = this.add.container(1085, 616);
      p.add(painel(this, 0, 0, 310, 112, COR.branco, 28, 8));
      p.add(this.add.image(-98, 0, 'svg_g_professor').setDisplaySize(46, 52));
      p.add(txt(this, 26, -2, 'Sou professor', 28, TINTA, { peso: 700 }));
      p.setSize(310, 112).setInteractive({ useHandCursor: true });
      p.on('pointerup', () => { TS.Som.tocar('clique'); TS.App.abrirGestao(); });
      this.ancorar(p, 1, 1); // fica sempre no canto de baixo, à direita

      // ----- Alto-falante (repete a instrução) -----
      this.ancorar(botaoRedondo(this, 84, 82, 96, { cor: COR.azul, icone: 'svg_alto', onClick: () => TS.Voz.falar(fala) }), -1, -1);
      TS.Som.tocar('pop');
      this.time.delayedCall(350, () => TS.Voz.falar(fala));
    }
  }

  TS.CENAS.push(Acesso);
})();
