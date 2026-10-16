/* t06_mapa.js — T06 Mapa da trilha: as 25 fases (5 em cada mundo do espaço), numa trilha que a criança arrasta para os lados.
   A câmera deste mapa é "livre" (anda para os lados); os botões ficam fixos nos cantos da tela. */
window.TS = window.TS || {};
(function () {
  const { H, COR, TINTA, txt, botaoRedondo, painel, mascote } = TS.UI;
  const POR_MUNDO = 5;
  const XS = [170, 405, 640, 875, 1110];   // posição de cada fase dentro do seu mundo (1280 de largura)
  const cor = (hex) => Phaser.Display.Color.HexStringToColor(hex).color;

  class Mapa extends TS.Cena {
    // cameraLivre: o Mapa mexe na própria câmera (ela anda para os lados), então a Cena base não centraliza
    constructor() { super('Mapa'); this.cameraLivre = true; }

    montar() {
      const a = this.aluno;
      if (!a) return this.scene.start('Acesso');

      // O mundo do mapa tem 5 telas de largura (uma por mundo)
      const LARG = 1280 * TS.C.MUNDOS.length;
      this.LARG = LARG;
      this.bgs = TS.C.MUNDOS.map((m, i) => this.add.image(i * 1280 + 640, H, m.bg).setOrigin(0.5, 1));

      // Posição de cada fase: 5 por mundo, subindo e descendo para a trilha ondular
      const pos = TS.C.FASES.map((f, i) => ({ x: (f.mundo - 1) * 1280 + XS[(f.fase - 1) % POR_MUNDO], y: 486 + Math.sin(i * 1.15 + 0.4) * 78 }));
      this.pos = pos;

      // A trilha: uma faixa clara e translúcida, com bolinhas amarelas por cima (como no protótipo)
      const pontos = [{ x: -60, y: pos[0].y - 40 }, ...pos, { x: LARG + 60, y: pos[pos.length - 1].y - 40 }];
      const curva = new Phaser.Curves.Spline(pontos.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
      const faixa = this.add.graphics();
      faixa.lineStyle(46, 0xffffff, 0.16); curva.draw(faixa, 600);
      faixa.lineStyle(26, 0xffffff, 0.10); curva.draw(faixa, 600);
      const bolinhas = this.add.graphics();
      curva.getSpacedPoints(Math.round(curva.getLength() / 34)).forEach((p) => bolinhas.fillStyle(0xffe08a, 1).fillCircle(p.x, p.y, 5));

      // Os 25 círculos de fase
      const atual = TS.DB.faseAtual(a.id);
      TS.C.FASES.forEach((f, i) => {
        const est = TS.DB.estadoFase(a.id, f.id); // 'concluida', 'andamento', 'dificuldade' ou 'bloqueada'
        const p = pos[i];
        const c = this.add.container(p.x, p.y);
        const bloqueada = est.cod === 'bloqueada';
        const g = this.add.graphics();
        g.fillStyle(COR.lilasDegrau, 1); g.fillCircle(0, 7, 58);   // degrau
        g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 58);          // anel branco
        g.fillStyle(bloqueada ? 0xa99bd6 : cor(TS.C.MUNDOS[f.mundo - 1].cor), 1); g.fillCircle(0, 0, 47);
        c.add(g);
        if (bloqueada) c.add(this.add.image(0, -2, 'svg_g_cadeado').setDisplaySize(44, 44));
        else c.add(txt(this, 0, -2, `${f.fase}`, 48, '#ffffff', { peso: 700 }));
        // Fase de falar no microfone: um selinho azul com o microfone
        if (f.tpl === 'falar') {
          const s = this.add.container(42, -42);
          s.add([this.add.circle(0, 0, 22, 0xffffff), this.add.circle(0, 0, 18, COR.azul), this.add.image(0, 0, 'svg_microfone').setDisplaySize(24, 24)]);
          c.add(s);
        }
        if (est.cod === 'concluida') c.add(TS.UI.estrelas(this, 0, 80, est.estrelas, 34, 38, 'fase'));
        c.setSize(124, 124).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => this.tocarNo(f, est, c));

        // A fase atual: anel amarelo com órbita de planeta, brilho e o Bip em cima
        if (f.id === atual.id && !bloqueada) {
          const brilho = this.add.circle(p.x, p.y, 84, 0xffffff, 0.14).setDepth(-1);
          this.tweens.add({ targets: brilho, scale: 1.15, alpha: 0.05, yoyo: true, repeat: -1, duration: 900 });
          const anel = this.add.graphics();
          anel.lineStyle(9, COR.amarelo, 1); anel.strokeCircle(0, 0, 64);
          anel.lineStyle(7, COR.amarelo, 0.95); anel.strokeEllipse(0, 0, 210, 74);
          anel.setPosition(p.x, p.y).setAngle(-12);
          c.setDepth(2); anel.setDepth(1);
          this.tweens.add({ targets: c, scale: 1.08, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
          this.bibo = mascote(this, p.x - 2, p.y - 66, 0.36, 'feliz').setDepth(3);
          this.tweens.add({ targets: this.bibo, y: p.y - 76, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.inOut' });
        }
      });

      // ----- Câmera: começa mostrando a fase atual e anda com o dedo -----
      const cam = this.cameras.main;
      this.aoRedimensionar(); // acerta fundos e altura da câmera para o tamanho desta tela
      cam.scrollX = this.limitar(pos[atual.idx].x - this.m.vw / 2);
      // As contas do dedo são feitas em "unidades do palco": dividimos os pixels pelo zoom (this.m.z)
      let arr = null; // guarda onde o dedo começou
      this.input.on('pointerdown', (p) => { if (!this.modais.length) arr = { x: p.x, sx: cam.scrollX, mov: 0 }; });
      this.input.on('pointermove', (p) => {
        if (arr && p.isDown) {
          const d = (p.x - arr.x) / this.m.z;
          cam.scrollX = this.limitar(arr.sx - d);
          arr.mov = Math.abs(d);
        }
      });
      this.input.on('pointerup', () => setTimeout(() => (arr = null), 0));
      this.arrasto = () => arr && arr.mov > 12; // andou mais de 12 unidades = foi arrasto, não toque
      this.input.on('wheel', (p, o, dx, dy) => { if (!this.modais.length) cam.scrollX = this.limitar(cam.scrollX + (dx + dy) / this.m.z); });

      // ----- Botões fixos na tela (não andam com a câmera) e presos nos cantos -----
      const fixo = (o, ax, ay) => this.ancorar(o.setScrollFactor(0).setDepth(100), ax, ay);
      fixo(botaoRedondo(this, 76, 76, 88, { cor: COR.branco, icone: 'svg_g_inicio', iconeTam: 42, onClick: () => this.ir('BoasVindas') }), -1, -1);
      fixo(botaoRedondo(this, 184, 76, 88, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.falarMapa() }), -1, -1);
      fixo(this.pilulaEstrelas(995, 74, TS.DB.estrelasTotal(a.id)), 1, -1);
      fixo(botaoRedondo(this, 1114, 76, 88, { cor: COR.rosa, icone: 'svg_g_trofeu', iconeTam: 40, onClick: () => this.ir('Recompensas', { de: 'Mapa' }) }), 1, -1);
      fixo(botaoRedondo(this, 1216, 76, 88, { cor: COR.laranja, icone: 'svg_g_sair', iconeTam: 40, onClick: () => this.confirmarSair() }), 1, -1);
      fixo(botaoRedondo(this, 78, 648, 92, { cor: COR.amarelo, icone: 'svg_g_voltar', iconeTam: 38, onClick: () => this.andar(-1) }), -1, 1);
      fixo(botaoRedondo(this, 1202, 648, 92, { cor: COR.amarelo, icone: 'svg_g_avancar', iconeTam: 38, onClick: () => this.andar(1) }), 1, 1);
      // Nome do mundo que está na tela (muda quando a criança arrasta o mapa)
      this.placa = null;
      this.mundoNaTela = -1;
      this.atualizarPlaca();

      this.time.delayedCall(400, () => this.falarMapa());
    }

    update() { if (this.bgs) this.atualizarPlaca(); }
    // Troca o nome na placa quando outro mundo passa a ocupar o meio da tela
    atualizarPlaca() {
      const cam = this.cameras.main;
      const i = Phaser.Math.Clamp(Math.floor((cam.scrollX + this.m.vw / 2) / 1280), 0, TS.C.MUNDOS.length - 1);
      if (i === this.mundoNaTela) return;
      this.mundoNaTela = i;
      const m = TS.C.MUNDOS[i];
      if (this.placa) this.placa.destroy();   // a placa é refeita com o nome e a cor do mundo
      this.placa = TS.UI.pilula(this, 640, 74, m.nome, { numero: m.id, corNumero: cor(m.cor), cor: m.cor, w: 520, tam: 32 }).setScrollFactor(0).setDepth(100);
      this.ancorar(this.placa, 0, -1);
    }

    // A câmera não pode passar do começo nem do fim do mapa
    limitar(x) { return Phaser.Math.Clamp(x, 0, Math.max(0, this.LARG - this.m.vw)); }
    // Setas amarelas: vai para o mundo anterior ou o próximo
    andar(dir) {
      const cam = this.cameras.main;
      const atual = Math.round((cam.scrollX + this.m.vw / 2 - 640) / 1280);
      const alvo = Phaser.Math.Clamp(atual + dir, 0, TS.C.MUNDOS.length - 1);
      this.tweens.add({ targets: cam, scrollX: this.limitar(alvo * 1280 + 640 - this.m.vw / 2), duration: 450, ease: 'Cubic.out' });
    }

    // Chamado pela Cena base quando a tela muda de tamanho (e uma vez no começo)
    aoRedimensionar() {
      if (!this.bgs || !this.bgs[0].active) return;
      const m = this.m; const cam = this.cameras.main;
      // Cada cenário cobre a largura do seu mundo (1280) e toda a altura visível
      this.bgs.forEach((bg) => { bg.setScale(Math.max(1280 / bg.width, m.vh / bg.height) + 0.002); bg.y = H + m.oy; });
      cam.scrollY = -m.oy;               // centraliza na vertical
      cam.scrollX = this.limitar(cam.scrollX);
    }

    falarMapa() {
      const frase = 'Toque na fase que está brilhando para jogar!';
      if (this.bibo) this.bibo.falar(frase); else TS.Voz.falar(frase);
    }

    // Tocou numa fase
    tocarNo(f, est, c) {
      if (this.arrasto()) return; // estava arrastando o mapa: ignora
      if (est.cod === 'bloqueada') {
        TS.Som.tocar('erro', 0.3);
        this.tweens.add({ targets: c, angle: 8, yoyo: true, repeat: 3, duration: 60 }); // balança
        return TS.Voz.falar('Essa fase ainda está trancada. Termine a fase anterior para abrir!');
      }
      TS.Som.tocar('toque');
      this.ir('Intro', { faseId: f.id });
    }
  }

  TS.CENAS.push(Mapa);
})();
