/* t05_boas_vindas.js — T05 Boas-vindas: o Bip cumprimenta o aluno e mostra Continuar, Atividades da professora,
   Mapa e Figurinhas. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, painel, mascote, balao } = TS.UI;

  class BoasVindas extends TS.Cena {
    constructor() { super('BoasVindas'); }

    montar() {
      // Sem aluno logado, esta tela não abre: volta para a escolha de acesso
      const a = this.aluno;
      if (!a) return this.scene.start('Acesso');
      const p = TS.DB.progresso(a.id);

      TS.UI.fundo(this, 'bg_mundo2');
      const primeiro = a.nome.split(' ')[0]; // "João Pedro Alves" -> "João"
      this.bibo = mascote(this, 300, 640, 0.8, 'feliz');
      balao(this, 780, 224, 'Que bom te ver de novo!', 520, 'esqMeio', { titulo: `Oi, ${primeiro}!`, tam: 28, tamTitulo: 44 });
      const nave = this.add.image(480, 168, 'nave_verde').setAngle(-8); nave.setScale(90 / nave.width);
      this.tweens.add({ targets: nave, y: 158, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.inOut' });

      // Para onde o Continuar leva: a última fase jogada (se não terminou) ou a primeira fase aberta
      const ult = TS.C.fase(p.ultimaFase);
      const destino = ult && !(p.fases[ult.id] || {}).concluida ? ult : TS.DB.faseAtual(a.id);

      // Botões (coluna de x 560 a 1080, como no protótipo)
      const halo = this.add.graphics(); halo.fillStyle(0xffffff, 0.12); halo.fillRoundedRect(552, 314, 536, 128, 64);
      const cont = botao(this, 820, 374, 520, 112, { cor: COR.amarelo, icone: 'svg_g_jogar', iconeTam: 40, texto: 'Continuar', tam: 46, onClick: () => this.ir('Intro', { faseId: destino.id }) });
      this.tweens.add({ targets: cont, scale: 1.03, yoyo: true, repeat: -1, duration: 700 });

      // Atividades que a professora criou para a turma (com um selo mostrando quantas são novas)
      const ativs = TS.DB.atividades.daTurma(a.turmaId);
      const novas = ativs.filter((at) => !TS.DB.progressoAtividade(a.id, at.id)).length;
      const bt = botao(this, 820, 496, 520, 90, { cor: COR.rosa, icone: 'svg_g_estrela_botao', iconeTam: 30, texto: 'Atividades da professora', tam: 29, onClick: () => this.ir('Tarefas') });
      if (novas > 0) {
        const selo = this.add.container(238, -32);
        selo.add([this.add.circle(0, 0, 30, 0xffffff), this.add.circle(0, 0, 25, COR.amarelo), txt(this, 0, -1, String(novas), 28, TINTA, { peso: 700 })]);
        bt.add(selo);
        this.tweens.add({ targets: selo, scale: 1.15, yoyo: true, repeat: -1, duration: 520 });
      }
      botao(this, 684, 606, 248, 86, { cor: COR.azul, icone: 'svg_g_mapa', iconeTam: 32, texto: 'Mapa', tam: 30, onClick: () => this.ir('Mapa') });
      botao(this, 955, 606, 248, 86, { cor: COR.roxo, icone: 'svg_g_trofeu', iconeTam: 32, texto: 'Figurinhas', tam: 30, onClick: () => this.ir('Recompensas', { de: 'BoasVindas' }) });

      // Cantos: ouvir e sons (esquerda), estrelas e sair (direita). Sair pergunta antes (T12).
      this.ancorar(botaoRedondo(this, 82, 82, 92, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.saudar(primeiro, novas) }), -1, -1);
      this.ancorar(botaoRedondo(this, 190, 82, 88, { cor: COR.branco, icone: 'svg_g_nota_musical', iconeTam: 40, onClick: () => this.ir('Sons') }), -1, -1);
      this.ancorar(botaoRedondo(this, 1198, 82, 88, { cor: COR.laranja, icone: 'svg_g_sair', iconeTam: 42, onClick: () => this.confirmarSair() }), 1, -1); // T12
      this.ancorar(this.pilulaEstrelas(1058, 82, TS.DB.estrelasTotal(a.id)), 1, -1);

      this.time.delayedCall(350, () => this.saudar(primeiro, novas));
    }

    saudar(n, novas) {
      const extra = novas > 0 ? ` A professora mandou ${novas > 1 ? novas + ' atividades novas' : 'uma atividade nova'}!` : '';
      this.bibo.falar(`Oi, ${n}! Que bom te ver!${extra} Vamos continuar a nossa trilha?`);
    }
  }

  TS.CENAS.push(BoasVindas);
})();
