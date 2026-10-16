/* t10_resultado.js — T10 Resultado: "Você conseguiu!", as estrelas uma a uma, a figurinha nova (ou a fase nova aberta)
   e os botões refazer, Mapa e Próxima. Nas atividades da professora (e na pré-visualização) a tela é mais simples. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, painel, mascote } = TS.UI;
  const CX = 860;                  // centro do quadro (de x 500 a 1220)
  const BY = 560;                  // linha dos botões

  class Resultado extends TS.Cena {
    constructor() { super('Resultado'); }

    // Recebe o que a Atividade mandou: fase, estrelas, reg, figurinha, acertos, total, dados
    // e, quando for atividade da professora, custom: true (ou previa: true na pré-visualização)
    init(d) { this.d = d; }

    montar() {
      const { fase, estrelas, reg, figurinha } = this.d;
      const m = TS.C.MUNDOS[fase.mundo - 1];
      TS.UI.fundo(this, m.bg);
      const passou = estrelas > 0;
      painel(this, CX, 360, 720, 576, COR.branco, 48, 12);
      this.bibo = mascote(this, 240, 668, 0.72, passou ? 'comemorando' : 'incentivando');
      txt(this, CX, 140, passou ? 'Você conseguiu!' : 'Quase lá!', 58, passou ? '#2E9A3E' : '#E8731A', { peso: 700 });

      // Três estrelas; as ganhas acendem uma por vez (a do meio é maior)
      for (let i = 0; i < 3; i++) {
        const tam = i === 1 ? 100 : 78;
        const s = this.add.image(CX + (i - 1) * 106, i === 1 ? 238 : 256, 'svg_g_estrela_rodada_vazia').setDisplaySize(tam, tam);
        if (i < estrelas) {
          this.time.delayedCall(500 + i * 450, () => {
            s.setTexture('svg_g_estrela').setDisplaySize(tam * 1.4, tam * 1.4);
            this.tweens.add({ targets: s, displayWidth: tam, displayHeight: tam, duration: 350, ease: 'Back.out' });
            TS.Som.tocar('estrela');
            TS.UI.brilho(this, s.x, s.y);
          });
        }
      }
      if (passou) this.time.delayedCall(500, () => { TS.Som.tocar('vitoria', 0.5); TS.UI.confete(this, CX, 200, 40); });
      else TS.Som.tocar('incentivo', 0.4);
      this.indicadorSalvo();

      // Atividade da professora (ou pré-visualização): tela mais simples, sem fase nova nem figurinha
      if (this.d.custom || this.d.previa) return this.montarAtividade(passou);

      const prox = TS.C.FASES[fase.idx + 1];
      let fala = passou ? `Parabéns! Você ganhou ${estrelas} ${estrelas > 1 ? 'estrelas' : 'estrela'}!` : 'Você está aprendendo muito! Vamos tentar de novo?';

      // Linha do meio: figurinha nova (prioridade) ou a fase nova aberta, numa pílula lilás; senão, os acertos
      if (figurinha) {
        fala += ' Você ganhou uma figurinha nova para o seu álbum!';
        const p = this.pilulaMeio(`${TS.C.W[figurinha].t.charAt(0)}${TS.C.W[figurinha].f.slice(1)} foi para o seu álbum`, 'Nova figurinha!');
        const med = this.medalha(p, -150, 0, TS.C.W[figurinha].img);
        med.setScale(0);
        this.time.delayedCall(2000, () => { this.tweens.add({ targets: med, scale: 1, duration: 420, ease: 'Back.out' }); TS.Som.tocar('pop'); });
        p.setSize(480, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => this.ir('Recompensas', { de: 'Mapa' }));
      } else if (reg.desbloqueou && prox) {
        fala += ' E abriu uma fase nova!';
        const p = this.pilulaMeio(`Agora você pode jogar a fase ${prox.mundo}-${prox.fase}`, 'Fase nova aberta!');
        const cad = this.add.container(-150, 0); p.add(cad);
        const g = this.add.graphics(); g.fillStyle(COR.lilasDegrau, 1); g.fillCircle(0, 6, 54); g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 54);
        g.fillStyle(Phaser.Display.Color.HexStringToColor(TS.C.MUNDOS[prox.mundo - 1].cor).color, 1); g.fillCircle(0, 0, 44);
        const ic = this.add.image(0, -2, 'svg_g_cadeado').setDisplaySize(40, 40);
        cad.add([g, ic]);
        this.time.delayedCall(1900, () => this.tweens.add({ targets: ic, angle: -20, yoyo: true, repeat: 2, duration: 80, onComplete: () => {
          TS.Som.tocar('abrir'); ic.destroy();
          cad.add(txt(this, 0, -2, `${prox.mundo}-${prox.fase}`, 30, '#ffffff', { peso: 700 }));
          this.tweens.add({ targets: cad, scale: 1.25, yoyo: true, duration: 220 });
        } }));
      } else {
        txt(this, CX, 410, `Você acertou ${this.d.acertos} de ${this.d.total}!`, 34, '#4A4F78', { peso: 700 });
      }

      // Botões: refazer (redondo branco), Mapa (lilás) e Próxima (amarelo). Quem não passou: Mapa e Tentar de novo.
      const refazer = () => this.ir('Atividade', { faseId: fase.id });
      if (passou) {
        botaoRedondo(this, 584, BY, 92, { cor: COR.branco, icone: 'svg_g_jogar_de_novo', iconeTam: 44, onClick: refazer });
        botao(this, 780, BY, 246, 92, { cor: COR.roxo, icone: 'svg_g_mapa', iconeTam: 36, texto: 'Mapa', tam: 34, onClick: () => this.ir('Mapa') });
        if (prox) botao(this, 1050, BY, 246, 92, { cor: COR.amarelo, icone: 'svg_g_avancar', iconeTam: 30, texto: 'Próxima', tam: 34, onClick: () => this.ir('Intro', { faseId: prox.id }) });
        else botao(this, 1050, BY, 246, 92, { cor: COR.amarelo, icone: 'svg_g_trofeu', iconeTam: 34, texto: 'Ver álbum', tam: 32, onClick: () => this.ir('Recompensas', { de: 'Mapa' }) });
      } else {
        botao(this, 700, BY, 246, 92, { cor: COR.roxo, icone: 'svg_g_mapa', iconeTam: 36, texto: 'Mapa', tam: 34, onClick: () => this.ir('Mapa') });
        const t = botao(this, 990, BY, 330, 92, { cor: COR.amarelo, icone: 'svg_g_jogar_de_novo', iconeTam: 38, texto: 'Tentar de novo', tam: 32, onClick: refazer });
        this.tweens.add({ targets: t, scale: 1.04, yoyo: true, repeat: -1, duration: 650 });
      }
      this.time.delayedCall(700, () => this.bibo.falar(fala, { expr: passou ? 'comemorando' : 'incentivando' }));
    }

    // Pílula lilás clara no meio do quadro, com um título e uma linha de apoio (o desenho entra à esquerda)
    pilulaMeio(apoio, titulo) {
      const p = this.add.container(CX, 410);
      const g = this.add.graphics(); g.fillStyle(0xf1edff, 1); g.fillRoundedRect(-240, -75, 480, 150, 75); p.add(g);
      p.add(txt(this, -70, -18, titulo, 30, TINTA, { peso: 700, ox: 0 }));
      const t = txt(this, -70, 22, apoio, 19, '#5638C4', { fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false, ox: 0, wrap: 290, align: 'left' });
      p.add(t);
      return p;
    }
    // Medalha da figurinha: círculo azul-claro com anel amarelo, degrau e uma órbita lilás
    medalha(cont, x, y, img) {
      const c = this.add.container(x, y); cont.add(c);
      const orb = this.add.graphics(); orb.lineStyle(6, COR.roxo, 0.8); orb.strokeEllipse(0, 4, 190, 56); orb.setAngle(-10); c.add(orb);
      const g = this.add.graphics();
      g.fillStyle(COR.amareloEsc, 1); g.fillCircle(0, 7, 66); g.fillStyle(COR.amarelo, 1); g.fillCircle(0, 0, 66); g.fillStyle(0xe4f2ff, 1); g.fillCircle(0, 0, 53);
      c.add(g);
      const im = this.add.image(0, 0, img); im.setScale(84 / Math.max(im.width, im.height)); c.add(im);
      return c;
    }

    // Canto de baixo à direita: "salvo" (ou "guardado no aparelho", quando o banco ainda não recebeu)
    indicadorSalvo() {
      if (this.d.previa) return;
      const sv = this.add.container(1180, 690);
      const ic = this.add.image(-70, 0, 'ico_save').setScale(0.3).setTint(0xffffff);
      const st = txt(this, 0, 0, 'salvando…', 20, '#ffffff', { peso: 700 });
      sv.add([ic, st]);
      this.ancorar(sv, 1, 1);
      this.tweens.add({ targets: ic, alpha: 0.3, yoyo: true, repeat: 5, duration: 250 });
      const mostrar = () => {
        if (!st.active) return;
        const e = TS.DB.estado();
        if (e.modo === 'nuvem' && e.pendentes) { st.setText('guardado no aparelho'); ic.setTint(COR.amarelo); this.time.delayedCall(2500, mostrar); }
        else { st.setText(e.modo === 'nuvem' ? 'salvo no banco' : 'salvo'); ic.setTexture('ico_checkmark').setTint(0x7ee08f).setAlpha(1); }
      };
      this.time.delayedCall(1300, mostrar);
    }

    // Final de uma atividade da professora
    montarAtividade(passou) {
      const { estrelas, acertos, total } = this.d;
      txt(this, CX, 410, `Você acertou ${acertos} de ${total}!`, 34, '#4A4F78', { peso: 700 });
      const jogar = () => this.ir('Atividade', this.d.dados);
      if (this.d.previa) {
        // O professor volta para a tela de edição da atividade
        botao(this, 715, BY, 290, 92, { cor: COR.azul, icone: 'ico_left', iconeTam: 34, texto: 'Voltar à edição', tam: 26, onClick: () => TS.App.sairDaPrevia(true) });
        botao(this, 1020, BY, 290, 92, { cor: COR.amarelo, icone: 'svg_g_jogar_de_novo', iconeTam: 34, texto: 'Jogar de novo', tam: 28, onClick: jogar });
        txt(this, CX, 616, 'Pré-visualização: o resultado não foi salvo.', 22, '#7C7FA6', { peso: 700 });
      } else {
        botao(this, 715, BY, 270, 92, { cor: COR.rosa, icone: 'svg_g_estrela_botao', iconeTam: 32, texto: 'Atividades', tam: 30, onClick: () => this.ir('Tarefas') });
        const t = botao(this, 1015, BY, 300, 92, { cor: COR.amarelo, icone: 'svg_g_jogar_de_novo', iconeTam: 34, texto: passou ? 'Jogar de novo' : 'Tentar de novo', tam: 28, onClick: jogar });
        if (!passou) this.tweens.add({ targets: t, scale: 1.04, yoyo: true, repeat: -1, duration: 650 });
      }
      const fala = passou ? `Parabéns! Você ganhou ${estrelas} ${estrelas > 1 ? 'estrelas' : 'estrela'}! Sua professora vai ficar feliz!` : 'Você está aprendendo muito! Vamos tentar de novo?';
      this.time.delayedCall(700, () => this.bibo.falar(fala, { expr: passou ? 'comemorando' : 'incentivando' }));
    }
  }

  TS.CENAS.push(Resultado);
})();
