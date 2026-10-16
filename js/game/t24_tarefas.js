/* t24_tarefas.js — T24 Atividades da professora (tela do aluno): mostra as atividades que a professora criou
   para a turma do aluno. Cada cartão tem a figura da atividade, o nome, as estrelas já ganhas (ou "Nova!")
   e um alto-falante que lê o nome. Tocar no cartão abre a Introdução da atividade. */
window.TS = window.TS || {};
(function () {
  const { W, COR, TINTA, txt, botao, botaoRedondo, painel, mascote } = TS.UI;
  const POR_PAGINA = 6;                       // 3 colunas x 2 linhas
  const CORES = [COR.azul, COR.rosa, COR.verde, COR.roxo, COR.laranja, COR.amarelo];

  class Tarefas extends TS.Cena {
    constructor() { super('Tarefas'); }

    init(d) { this.pagina = (d && d.pagina) || 0; }

    montar() {
      const a = this.aluno;
      if (!a) return this.scene.start('Acesso');
      TS.UI.fundo(this, 'bg_mundo4');
      this.lista = TS.DB.atividades.daTurma(a.turmaId);

      // Cantos: voltar e ouvir; título com contorno rosa
      this.botaoVoltar(() => this.ir('BoasVindas'));
      this.ancorar(botaoRedondo(this, 184, 76, 88, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.explicar() }), -1, -1);
      TS.UI.titulo(this, 640, 78, 'Atividades da professora', '#D63F86', 54);

      if (!this.lista.length) return this.montarVazio();

      // Até 3 atividades: uma fileira e o balão do Bip embaixo (como no protótipo). Mais: duas fileiras por página.
      this.umaFileira = this.lista.length <= 3;
      this.porPagina = this.umaFileira ? 3 : POR_PAGINA;
      this.bibo = this.umaFileira ? mascote(this, 185, 690, 0.5, 'feliz') : mascote(this, 1205, 700, 0.3, 'feliz');
      this.bibo.setDepth(5);
      this.ancorar(this.bibo, this.umaFileira ? -1 : 1, 1);
      if (this.umaFileira) {
        const novas = this.lista.filter((at) => !TS.DB.progressoAtividade(a.id, at.id)).length;
        const t = novas ? `A professora mandou ${novas > 1 ? novas + ' atividades novas' : 'uma atividade nova'}! Toque num cartão para começar.` : 'Toque num cartão para jogar de novo.';
        TS.UI.balao(this, 620, 548, t, 560, 'esqMeio', { tam: 28 });
      }
      this.cartoes = this.add.container(0, 0);
      this.desenharPagina();
      this.time.delayedCall(350, () => this.explicar());
    }

    // Uma página de cartões
    desenharPagina() {
      const a = this.aluno;
      this.cartoes.removeAll(true);
      const pp = this.porPagina;
      const paginas = Math.ceil(this.lista.length / pp);
      const itens = this.lista.slice(this.pagina * pp, (this.pagina + 1) * pp);
      itens.forEach((at, i) => {
        const x = 320 + (i % 3) * 330; const y = this.umaFileira ? 285 : 262 + Math.floor(i / 3) * 268;
        this.cartoes.add(this.cartao(at, x, y, CORES[(this.pagina * pp + i) % CORES.length], TS.DB.progressoAtividade(a.id, at.id)));
      });
      // Setas quando há mais de uma página
      if (paginas > 1) {
        if (this.pagina > 0) this.cartoes.add(botaoRedondo(this, 78, 396, 88, { cor: COR.amarelo, icone: 'svg_g_voltar', iconeTam: 36, onClick: () => { this.pagina--; this.desenharPagina(); } }));
        if (this.pagina < paginas - 1) this.cartoes.add(botaoRedondo(this, 1202, 396, 88, { cor: COR.amarelo, icone: 'svg_g_avancar', iconeTam: 36, onClick: () => { this.pagina++; this.desenharPagina(); } }));
        this.cartoes.add(txt(this, 650, 690, `${this.pagina + 1} de ${paginas}`, 26, '#ffffff', { peso: 700, stroke: '#1E1656', strokeW: 6 }));
      }
    }

    // Um cartão de atividade: faixa colorida com a figura em cima; nome, estrelas (ou "Nova!") e alto-falante embaixo
    cartao(at, x, y, cor, prog) {
      const c = this.add.container(x, y);
      const w = 290, h = 250;
      const g = this.add.graphics();
      g.fillStyle(0x0e0a30, 0.25); g.fillRoundedRect(-w / 2, -h / 2 + 12, w, h, 30);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
      g.fillStyle(cor, 1); g.fillRoundedRect(-w / 2, -h / 2, w, 128, { tl: 30, tr: 30, bl: 0, br: 0 });
      c.add(g);
      const img = this.add.image(0, -h / 2 + 64, TS.ATV.figuraDe(at));
      img.setScale(100 / Math.max(img.width, img.height));
      c.add(img);
      // Nome (até 2 linhas, alinhado à esquerda)
      const nome = txt(this, -w / 2 + 18, 30, at.titulo, 24, TINTA, { peso: 600, wrap: w - 40, ox: 0, align: 'left', lineSpacing: -4 });
      if (nome.height > 60) nome.setScale(60 / nome.height);
      nome.y = 10 + nome.displayHeight / 2;
      c.add(nome);
      // Estrelas já ganhas, ou o selo amarelo "Nova!"
      if (prog) c.add(TS.UI.estrelas(this, -w / 2 + 62, 98, prog.estrelas, 30, 34, 'grande'));
      else {
        const selo = this.add.container(-w / 2 + 62, 98);
        const sg = this.add.graphics(); sg.fillStyle(COR.amareloEsc, 1); sg.fillRoundedRect(-44, -17 + 4, 88, 34, 17); sg.fillStyle(COR.amarelo, 1); sg.fillRoundedRect(-44, -17, 88, 34, 17);
        selo.add([sg, txt(this, 0, -1, 'Nova!', 20, TINTA, { peso: 700 })]);
        c.add(selo);
        this.tweens.add({ targets: selo, scale: 1.08, yoyo: true, repeat: -1, duration: 600 });
      }
      // Alto-falante (bolinha azul): lê o nome da atividade
      const alto = this.add.container(w / 2 - 44, 92);
      alto.add([this.add.circle(0, 4, 26, COR.azulEsc), this.add.circle(0, 0, 26, COR.azul), this.add.image(0, 0, 'svg_alto').setDisplaySize(28, 28)]);
      alto.setSize(56, 56).setInteractive({ useHandCursor: true });
      alto.on('pointerup', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); TS.Voz.falar(at.titulo); });
      c.add(alto);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.04, duration: 100 }));
      c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 100 }));
      c.on('pointerup', () => { TS.Som.tocar('clique'); this.ir('Intro', { atividadeId: at.id }); });
      return c;
    }

    // Nenhuma atividade ainda
    montarVazio() {
      painel(this, W / 2 + 110, 390, 720, 360, COR.branco, 40);
      this.bibo = mascote(this, 260, 660, 0.72, 'pensando');
      txt(this, W / 2 + 110, 310, 'Ainda não tem atividade nova', 38, TINTA, { peso: 700, wrap: 640 });
      txt(this, W / 2 + 110, 380, 'Quando a professora mandar, ela aparece aqui!', 26, '#4A4F78', { peso: 600, wrap: 620 });
      botao(this, W / 2 + 110, 478, 330, 96, { cor: COR.azul, icone: 'svg_g_mapa', iconeTam: 36, texto: 'Ir para o mapa', tam: 30, onClick: () => this.ir('Mapa') });
      this.time.delayedCall(350, () => this.explicar());
    }

    explicar() {
      if (!this.lista.length) return this.bibo.falar('Ainda não tem atividade da professora. Quando ela mandar, aparece aqui! Que tal jogar no mapa?', { expr: 'pensando' });
      const novas = this.lista.filter((at) => !TS.DB.progressoAtividade(this.aluno.id, at.id)).length;
      this.bibo.falar(`Estas são as atividades que a sua professora preparou!${novas ? ` Tem ${novas > 1 ? novas + ' novas' : 'uma nova'}.` : ''} Toque em uma para jogar.`);
    }
  }

  TS.CENAS.push(Tarefas);
})();
