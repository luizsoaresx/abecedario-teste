/* t03_login_aluno.js — T03 Login do aluno: teclado na tela, teclado do computador e senha por figuras. */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, painel, mascote, balao } = TS.UI;
  const PX = 857;                 // centro do quadro branco (x)
  const CAMPO_W = 700, CAMPO_H = 72;

  class LoginAluno extends TS.Cena {
    constructor() { super('LoginAluno'); }

    montar() {
      TS.UI.fundo(this, 'bg_abertura');
      // Tudo o que muda na tela fica guardado em "estado"
      this.estado = { campo: 'login', login: '', senha: '', figs: [], modoFig: false };

      // Bip, balão de fala, botão de voltar e alto-falante
      this.bibo = mascote(this, 200, 668, 0.55, 'feliz');
      this.balao = balao(this, 220, 206, 'Digite seu nome de usuário e sua senha.', 360, 'esq', { tam: 24 });
      this.botaoVoltar(() => this.ir('Acesso'));
      botaoRedondo(this, 362, 340, 84, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.instruir() });

      // Quadro branco à direita com os dois campos (login e senha)
      painel(this, PX, 359, 775, 662, COR.branco, 36);
      this.campos = {};
      [['login', 'svg_g_usuario', 96], ['senha', 'svg_g_senha', 186]].forEach(([k, ic, y]) => {
        const c = this.add.container(PX, y);
        const g = this.add.graphics(); c.add(g); c.g = g;
        c.add(this.add.image(-CAMPO_W / 2 + 40, 0, ic).setDisplaySize(30, 30));
        const t = txt(this, -CAMPO_W / 2 + 78, 0, '', 34, TINTA, { ox: 0, peso: 600 }); c.add(t); c.t = t;
        c.setSize(CAMPO_W, CAMPO_H).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => { this.estado.campo = k; this.atualizar(); }); // tocar no campo = escolher o campo
        this.campos[k] = c;
      });

      // Teclado de letras e grade de figuras (só um aparece por vez)
      this.teclado = this.add.container(0, 0);
      this.gradeFig = this.add.container(0, 0).setVisible(false);
      this.montarTeclado();
      this.montarFiguras();
      this.btFig = botao(this, 722, 620, 250, 80, { cor: COR.rosa, icone: 'svg_g_figuras', iconeTam: 30, texto: 'Figuras', tam: 30, onClick: () => this.alternarModo() });
      this.btEntrar = botao(this, 993, 620, 250, 80, { cor: COR.verde, icone: 'ico_right', iconeTam: 34, texto: 'Entrar', tam: 30, onClick: () => this.entrarNoJogo() });

      // Teclado do computador: escutamos direto na janela do navegador
      const tec = (e) => {
        if (!this.scene.isActive()) return;
        if (e.key === 'Backspace') this.tecla('⌫');
        else if (e.key === 'Enter') this.entrarNoJogo();
        else if (e.key === 'Tab') { e.preventDefault(); this.estado.campo = this.estado.campo === 'login' ? 'senha' : 'login'; this.atualizar(); }
        else if (/^[a-z0-9._]$/i.test(e.key)) this.tecla(e.key.toUpperCase());
        else return;
        e.preventDefault();
      };
      window.addEventListener('keydown', tec);
      this.events.once('shutdown', () => window.removeEventListener('keydown', tec)); // para de escutar ao sair

      this.atualizar();
      this.time.delayedCall(300, () => this.instruir());
    }

    // O Bip explica o que fazer (muda conforme o modo)
    instruir() {
      const t = this.estado.modoFig ? 'Toque nas suas três figuras secretas, na ordem certa.' : 'Digite seu nome de usuário e sua senha.';
      this.balao.setText(t);
      this.bibo.falar(this.estado.modoFig ? t : `${t} Se precisar, peça ajuda para a professora.`);
    }

    // Monta o teclado: 4 linhas de teclas claras com degrau lilás; a tecla de apagar é amarela
    montarTeclado() {
      const linhas = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL.', 'ZXCVBNM⌫'];
      linhas.forEach((l, li) => {
        l.split('').forEach((ch, ci) => {
          const apagar = ch === '⌫';
          const x0 = 538 + (li === 3 ? 71 : 0) + ci * 71;
          const b = botao(this, apagar ? x0 + 34 : x0, 272 + li * 67, apagar ? 134 : 62, 56, {
            cor: apagar ? COR.amarelo : COR.tecla, texto: apagar ? undefined : ch, icone: apagar ? 'svg_g_voltar' : undefined, iconeTam: 26,
            tam: 26, raio: 14, degrau: 5, sombra: false, onClick: () => this.tecla(ch),
          });
          this.teclado.add(b);
        });
      });
    }

    // Monta a grade com 9 figuras para a senha por figuras
    montarFiguras() {
      this.FIGS = ['pato', 'bola', 'maca', 'gato', 'sapo', 'uva', 'carro', 'flor', 'peixe'];
      this.FIGS.forEach((k, i) => {
        const x = PX - 60 + ((i % 5) - 2) * 116 + (i >= 5 ? 58 : 0);
        const y = 300 + Math.floor(i / 5) * 118;
        const c = TS.UI.carta(this, x, y, 104, 104, TS.C.W[k].img);
        c.setInteractive({ useHandCursor: true });
        c.on('pointerup', () => {
          if (this.estado.figs.length < 3) { TS.Som.tocar('toque'); this.estado.figs.push(k); this.atualizar(); }
        });
        this.gradeFig.add(c);
      });
      // Botão amarelo: apaga a última figura tocada
      const apagar = botaoRedondo(this, 1150, 418, 88, { cor: COR.amarelo, icone: 'svg_g_voltar', onClick: () => { this.estado.figs.pop(); this.atualizar(); } });
      this.gradeFig.add(apagar);
    }

    // Troca entre teclado e figuras
    alternarModo() {
      this.estado.modoFig = !this.estado.modoFig;
      this.estado.campo = this.estado.modoFig ? 'senha' : this.estado.campo;
      this.teclado.setVisible(!this.estado.modoFig);
      this.gradeFig.setVisible(this.estado.modoFig);
      this.btFig.setTexto(this.estado.modoFig ? 'Teclado' : 'Figuras');
      this.atualizar();
      this.instruir();
    }

    // Uma tecla foi apertada
    tecla(ch) {
      const e = this.estado;
      if (e.modoFig && e.campo === 'senha') return;
      TS.Som.tocar('toque', 0.4);
      if (ch === '⌫') e[e.campo] = e[e.campo].slice(0, -1); // apaga a última letra
      else if (e[e.campo].length < 24) e[e.campo] += ch;     // acrescenta a letra
      this.atualizar();
    }

    // Redesenha os campos e as miniaturas sempre que o estado muda
    atualizar() {
      const e = this.estado;
      Object.entries(this.campos).forEach(([k, c]) => {
        const foco = e.campo === k;
        c.g.clear();
        c.g.fillStyle(foco ? COR.roxo : COR.lilasBorda, 1); c.g.fillRoundedRect(-CAMPO_W / 2, -CAMPO_H / 2, CAMPO_W, CAMPO_H, 20);
        c.g.fillStyle(foco ? 0xf2f0fd : 0xf1eff8, 1); c.g.fillRoundedRect(-CAMPO_W / 2 + 4, -CAMPO_H / 2 + 4, CAMPO_W - 8, CAMPO_H - 8, 17);
        let s = k === 'login' ? e.login.toLowerCase() : '●'.repeat(e.senha.length); // senha aparece como bolinhas
        if (k === 'senha' && e.modoFig) s = '';
        c.t.setText(s + (foco && !(k === 'senha' && e.modoFig) ? '|' : ''));
      });
      // Miniaturas das figuras já tocadas (dentro do campo da senha)
      (this.miniFigs || []).forEach((m) => m.destroy());
      this.miniFigs = [];
      if (e.modoFig) e.figs.forEach((k, i) => {
        const im = this.add.image(PX - CAMPO_W / 2 + 112 + i * 70, 186, TS.C.W[k].img);
        im.setScale(56 / Math.max(im.width, im.height));
        this.miniFigs.push(im);
      });
    }

    // Botão Entrar: confere o login no banco de dados (pode demorar um pouquinho: mostramos "Entrando...")
    async entrarNoJogo() {
      const e = this.estado;
      if (this.entrando) return;
      if (!e.login) return this.erro('Primeiro, digite o seu nome de usuário.');
      if (e.modoFig ? e.figs.length < 3 : !e.senha) return this.erro(e.modoFig ? 'Toque nas suas três figuras.' : 'Agora digite a sua senha.');
      this.entrando = true;
      this.btEntrar.setTexto('Entrando...'); this.btEntrar.setAlpha(0.75);
      const r = e.modoFig ? await TS.DB.entrarFiguras(e.login, e.figs) : await TS.DB.entrar(e.login, e.senha, { perfil: 'aluno' });
      this.entrando = false;
      if (!this.sys.isActive()) return;   // a criança saiu da tela enquanto esperava
      this.btEntrar.setTexto('Entrar'); this.btEntrar.setAlpha(1);
      if (r.erro) {
        const MSG = {
          gestao: 'Esta entrada é para alunos. Professores usam o botão Sou professor.',
          rede: 'Estou sem internet agora. Peça ajuda para a professora.',
          bloqueado: 'Muitas tentativas! Espere um pouquinho e tente de novo.',
          inativo: 'Seu acesso está desligado. Chame sua professora!',
          instalacao: 'O jogo ainda não está ligado ao banco de dados. Chame a professora.',
          chave: 'O jogo ainda não está ligado ao banco de dados. Chame a professora.',
        };
        return this.erro(MSG[r.erro]);
      }
      TS.Som.tocar('acerto');
      this.bibo.setExpr('comemorando');
      this.time.delayedCall(500, () => this.ir('BoasVindas'));
    }

    // Deu errado: os campos tremem, o Bip avisa e a senha é apagada
    erro(msg) {
      TS.Som.tocar('erro', 0.4);
      this.tweens.add({ targets: [this.campos.login, this.campos.senha], x: '+=14', yoyo: true, repeat: 3, duration: 60 });
      const t = msg || 'Hmm, não deu certo. Chame sua professora!';
      this.balao.setText(t);
      this.bibo.falar(t, { expr: 'preocupado' });
      this.estado.senha = '';
      this.estado.figs = [];
      this.atualizar();
    }
  }

  TS.CENAS.push(LoginAluno);
})();
