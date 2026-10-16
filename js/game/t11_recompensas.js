/* t11_recompensas.js — T11 Recompensas: álbum de figurinhas e cores do Bip liberadas por estrelas. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, painel, mascote } = TS.UI;

  class Recompensas extends TS.Cena {
    constructor() { super('Recompensas'); }

    // De onde o aluno veio (Mapa ou Boas-vindas): o botão de voltar leva para lá
    init(d) { this.voltarPara = (d && d.de) || 'Mapa'; }

    montar() {
      const a = this.aluno;
      if (!a) return this.scene.start('Acesso');
      const p = TS.DB.progresso(a.id);
      const est = TS.DB.estrelasTotal(a.id);

      TS.UI.fundo(this, 'bg_mundo3');
      this.botaoVoltar(() => this.ir(this.voltarPara));

      // ----- Álbum: 25 figurinhas (uma por fase), em 5 linhas de 5 -----
      painel(this, 472, 410, 665, 570, COR.branco, 40);
      txt(this, 176, 172, 'Meu álbum', 36, TINTA, { peso: 700, ox: 0 });
      const ganhas = TS.C.FIGURINHAS.filter((k) => p.figurinhas.includes(k)).length;
      const cont = txt(this, 712, 172, `${ganhas} de ${TS.C.FIGURINHAS.length}`, 24, '#5638C4', { peso: 700 });
      const cg = this.add.graphics(); cg.fillStyle(0xf1edff, 1); cg.fillRoundedRect(712 - cont.width / 2 - 18, 152, cont.width + 36, 42, 21); cont.setDepth(1);
      TS.C.FIGURINHAS.forEach((k, i) => {
        const x = 228 + (i % 5) * 122;
        const y = 258 + Math.floor(i / 5) * 94;
        const tem = p.figurinhas.includes(k); // o aluno já ganhou esta?
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(tem ? COR.amareloEsc : COR.lilasDegrau, 1); g.fillCircle(0, 6, 42);
        g.fillStyle(tem ? COR.amarelo : COR.lilasBorda, 1); g.fillCircle(0, 0, 42);
        g.fillStyle(tem ? 0xe4f2ff : 0xf3f1fb, 1); g.fillCircle(0, 0, 34);
        c.add(g);
        if (tem) {
          const im = this.add.image(0, 0, TS.C.W[k].img); im.setScale(54 / Math.max(im.width, im.height)); c.add(im);
          c.setSize(84, 84).setInteractive({ useHandCursor: true });
          c.on('pointerup', () => { TS.Voz.falar(TS.C.W[k].f); this.tweens.add({ targets: c, angle: 8, yoyo: true, duration: 120 }); });
        } else c.add(txt(this, 0, -1, '?', 34, '#A99BD6', { peso: 700 }));
      });

      // ----- Cor do Bip: cada cor custa um número de estrelas -----
      painel(this, 1040, 410, 400, 570, COR.branco, 40);
      txt(this, 872, 170, 'Cor do Bip', 36, TINTA, { peso: 700, ox: 0 });
      this.add.circle(1040, 352, 150, COR.noite);
      this.bibo = mascote(this, 1040, 462, 0.5, 'feliz');
      const precos = { rosa: 0, verde: 6, amarelo: 15, azul: 25, bege: 40 };
      const nomes = { rosa: 'rosa', verde: 'verde', amarelo: 'amarelo', azul: 'azul', bege: 'bege' };
      Object.keys(TS.GALACTICO.CORES).forEach((cor, i) => {
        const x = 1040 + (i - 2) * 76; // 5 bolinhas centralizadas no quadro
        const y = 590;
        const livre = est >= precos[cor];
        const base = Phaser.Display.Color.HexStringToColor(TS.GALACTICO.CORES[cor].corpo);
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        if (p.cor === cor) { g.fillStyle(COR.tinta, 1); g.fillCircle(0, 2, 36); g.fillStyle(0xffffff, 1); g.fillCircle(0, 2, 31); }
        g.fillStyle(base.clone().darken(22).color, 1); g.fillCircle(0, 6, 27);
        g.fillStyle(base.color, 1); g.fillCircle(0, 0, 27);
        c.add(g);
        if (!livre) {
          c.setAlpha(0.45);
          c.add(this.add.image(0, 0, 'svg_g_cadeado').setDisplaySize(26, 26));
          txt(this, x, y + 44, `${precos[cor]}★`, 18, '#7C7FA6', { peso: 700 });
        }
        c.setSize(64, 64).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => {
          if (!livre) return TS.Voz.falar(`Junte ${precos[cor]} estrelas para liberar essa cor!`);
          p.cor = cor;          // guarda a cor nova
          TS.DB.salvarProgresso(this.aluno.id); // vai para o banco de dados
          TS.Som.tocar('pop');
          this.scene.restart({ de: this.voltarPara }); // reabre a tela: o Bip já aparece com a cor nova
        });
      });
      txt(this, 1040, 652, `Bip ${nomes[p.cor] || 'rosa'}`, 24, '#4A4F78', { peso: 700 });
      this.ancorar(this.pilulaEstrelas(1180, 76, est), 1, -1);

      this.time.delayedCall(400, () => this.explicar());
    }

    explicar() { this.bibo.falar('Aqui ficam suas figurinhas! Cada fase nova que você termina te dá uma. Você também pode mudar a minha cor!'); }
  }

  TS.CENAS.push(Recompensas);
})();
