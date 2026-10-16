/* base.js — a "cena base" que toda tela do jogo usa, e a cena de carregamento (Boot). */
window.TS = window.TS || {};
(function () {
  // Pegamos do kit visual (ui.js) as peças que vamos usar neste arquivo.
  const { W, H, COR, TINTA, txt, botao, botaoRedondo, painel, svgEsc } = TS.UI;

  /* ---------- Cena base ----------
     Toda tela do jogo é uma "Cena" do Phaser. Esta classe faz o que TODAS as telas precisam:
     - ajusta a câmera para o palco de 1280x720 caber em qualquer tela (computador ou celular);
     - reposiciona fundos e botões de canto quando a tela muda de tamanho (ou o celular gira);
     - descobre a cor do Bip do aluno logado;
     - faz a tela aparecer suavemente e mostra o aviso de "sem internet";
     - chama this.montar(), onde cada tela desenha o que é dela. */
  class Cena extends Phaser.Scene {
    // "this.aluno" devolve o aluno que está logado (ou null).
    get aluno() { return TS.DB.sessao.get(); }

    // O Phaser chama create() sozinho quando a tela começa.
    create() {
      // A mesma cena pode abrir várias vezes: zeramos as listas da vez anterior
      this.fundos = [];   // cenários que cobrem a tela (ui.js -> fundo)
      this.ancoras = [];  // objetos presos nos cantos (veja ancorar)
      this.modais = [];   // janelas abertas
      this.offline = null;
      this.ajustarCamera();

      const a = this.aluno;
      const corSalva = a && a.perfil === 'aluno' ? TS.DB.progresso(a.id).cor : 'rosa';
      this.corMascote = TS.GALACTICO.CORES[corSalva] ? corSalva : 'rosa'; // cores antigas (laranja, roxo) viram rosa
      TS.UI.entrar(this); // entrada suave (a tela clareia)

      // Aviso de sem internet: escuta o navegador enquanto a tela estiver aberta.
      const off = () => TS.UI.overlayOffline(this);
      const on = () => TS.UI.removerOffline(this);
      window.addEventListener('offline', off);
      window.addEventListener('online', on);
      // A tela mudou de tamanho (janela, girar o celular, tela cheia): reorganiza
      const redim = () => this.redimensionar();
      this.scale.on('resize', redim);
      // Quando a tela fecha ("shutdown"), paramos de escutar e calamos a voz.
      this.events.once('shutdown', () => {
        window.removeEventListener('offline', off);
        window.removeEventListener('online', on);
        this.scale.off('resize', redim);
        TS.Voz.parar();
      });
      if (navigator.onLine === false || TS.offlineSimulado) this.time.delayedCall(400, off);

      this.montar(); // cada tela escreve a sua função montar()
      this.posicionarAncoras();
    }

    /* ---------- Responsividade ----------
       A câmera mostra o palco de 1280x720 ampliado (zoom) e centralizado.
       Se a tela for mais larga, sobra cenário dos lados; se for mais alta, sobra em cima e embaixo. */
    ajustarCamera() {
      this.m = TS.UI.medidas(this);
      const cam = this.cameras.main;
      cam.setOrigin(0, 0).setZoom(this.m.z);
      // O Mapa controla a própria câmera (ele anda para os lados): nesse caso não mexemos na rolagem
      if (!this.cameraLivre) cam.setScroll(-this.m.ox, -this.m.oy);
    }

    redimensionar() {
      if (!this.sys.isActive()) return;
      this.ajustarCamera();
      this.fundos = this.fundos.filter((f) => f.active);
      this.fundos.forEach((f) => TS.UI.cobrir(this, f));
      this.posicionarAncoras();
      this.modais.forEach((mo) => mo.centralizar());
      if (this.aoRedimensionar) this.aoRedimensionar(this.m); // a tela pode ter ajustes próprios
    }

    /* ancorar(obj, ax, ay): prende um objeto a um canto ou borda da tela.
       ax: -1 = esquerda, 0 = não mexe, 1 = direita.  ay: -1 = em cima, 0 = não mexe, 1 = embaixo.
       Ex.: o botão de som em (80, 80) com ancorar(b, -1, -1) fica sempre no canto de cima à esquerda. */
    ancorar(obj, ax = 0, ay = 0) {
      this.ancoras.push({ obj, bx: obj.x, by: obj.y, ax, ay });
      if (this.m) this.posicionarAncoras();
      return obj;
    }
    posicionarAncoras() {
      const { ox, oy } = this.m;
      this.ancoras = this.ancoras.filter((a) => a.obj.active);
      this.ancoras.forEach((a) => {
        // Objetos "fixos" (scrollFactor 0, como os botões do Mapa) não andam com a câmera: somamos o deslocamento dela
        const f = a.obj.scrollFactorX === 0 ? 1 : 0;
        a.obj.setPosition(a.bx + ox * (a.ax + f), a.by + oy * (a.ay + f));
      });
    }

    // Único jeito de trocar de tela: this.ir('NomeDaTela', dados)
    ir(destino, dados) {
      // Ajuda para quem está montando o jogo: se a tela ainda não existe, avisa em vez de travar
      if (!this.scene.get(destino)) {
        const aviso = txt(this, this.m.vw / 2, 40, `A tela "${destino}" ainda não foi criada`, 28, '#ffffff', { stroke: '#d64545', strokeW: 8 });
        aviso.setDepth(3000).setScrollFactor(0);
        this.time.delayedCall(2500, () => aviso.destroy());
        return;
      }
      TS.UI.transicao(this, destino, dados);
    }

    /* ---------- Botão Voltar ----------
       Seta no canto de cima à esquerda, no mesmo lugar em todas as telas (menos na abertura).
       acao: o que fazer ao tocar (ex.: () => this.ir('Mapa')). */
    botaoVoltar(acao) {
      return this.ancorar(botaoRedondo(this, 76, 76, 88, { cor: COR.branco, icone: 'svg_g_voltar', iconeTam: 40, onClick: acao }), -1, -1);
    }

    // Pílula branca com uma estrela e o total de estrelas do aluno (canto de cima à direita)
    pilulaEstrelas(x, y, n) {
      const c = this.add.container(x, y);
      c.add(painel(this, 0, 0, 144, 80, COR.branco, 40, 7));
      c.add(this.add.image(-34, -1, 'svg_g_estrela').setDisplaySize(44, 44));
      c.add(txt(this, 22, -2, String(n), 38, TINTA, { peso: 700 }));
      return c;
    }

    /* ---------- Pergunta de sim ou não ----------
       Janela com o Bip pensando, um título, um texto e joinha para cima (sim) e para baixo (não).
       Usada no "Quer mesmo sair?" (T12) e no "Parar a atividade?". */
    perguntar(titulo, texto, aoSim) {
      let respondeu = false; // evita dois toques seguidos no "sim"
      const m = TS.UI.modal(this, 780, 420, (cx) => {
        cx.add(this.add.image(-262, 170, `bibo_${this.corMascote}_pensando`).setOrigin(TS.GALACTICO.ORIGEM_BIP, 1).setScale(0.42 / TS.GALACTICO.RES_BIP));
        cx.add(txt(this, -110, -110, titulo, 44, TINTA, { peso: 700, wrap: 460, ox: 0, align: 'left' }));
        cx.add(txt(this, -110, -48, texto, 26, '#4A4F78', { peso: 600, wrap: 460, ox: 0, align: 'left' }));
        cx.add(botao(this, -5, 84, 190, 92, { cor: COR.verde, icone: 'svg_joinha', iconeTam: 44, texto: 'Sim', tam: 32, onClick: () => { if (!respondeu) { respondeu = true; aoSim(); } } }));
        // Não: só fecha a janela. O ícone é o mesmo joinha, virado de cabeça para baixo.
        const nao = botao(this, 215, 84, 190, 92, { cor: COR.laranja, icone: 'svg_joinha', iconeTam: 44, texto: 'Não', tam: 32, onClick: () => m.fechar() });
        nao.list[1].list[0].setFlipY(true);
        cx.add(nao);
      });
      TS.Voz.falar(`${titulo} ${texto}`);
      return m;
    }

    /* ---------- T12 Sair ----------
       Sim: apaga a sessão do aluno e volta para a escolha de acesso. */
    confirmarSair() {
      this.perguntar('Quer mesmo sair?', 'Seu progresso está guardado!', () => { TS.DB.sair(); this.ir('Acesso'); });
    }
  }
  TS.Cena = Cena; // deixamos a Cena disponível para os arquivos das telas

  /* ---------- Boot: carrega todas as imagens uma vez ---------- */
  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); } // 'Boot' é o nome (a "chave") desta cena

    // preload(): o Phaser carrega aqui tudo o que vai ser desenhado depois.
    preload() {
      // Resolução dos desenhos: 1x no celular, até 2x em telas grandes (veja ui.js -> escalaTexturas)
      const z = Math.min(this.scale.width / W, this.scale.height / H);
      const e = TS.UI.escalaTexturas(Phaser.Math.Clamp(Math.ceil(z * 4) / 4, 1, 2));

      // 1) As figuras e ícones (PNG) que estão dentro de assets.js
      const A = TS.ASSETS.img;
      Object.keys(A).forEach((k) => this.load.image(k, A[k]));
      // 2) Tema Abecedário Galáctico (assets_galactico.js): fundos do espaço, o Bip (5 cores x 6 estados), logo e enfeites
      Object.entries(TS.GALACTICO.img).forEach(([k, uri]) => this.load.image(k, uri));
      // 3) Os desenhos em SVG feitos em art.js (gato, rato, bola, joinha, alto-falante...) e o tambor do espaço
      TS.Art.FIGURAS.tambor = TS.GALACTICO.svg.tambor;
      Object.entries(TS.Art.FIGURAS).forEach(([k, svg]) => this.load.svg('svg_' + k, TS.Art.uri(svg), { scale: e }));
      Object.entries(TS.Art.ICONES).forEach(([k, svg]) => this.load.svg('svg_' + k, TS.Art.uri(svg), { scale: e }));
      // 4) O Bip já veio no passo 2 (chaves 'bibo_<cor>_<estado>', ex.: 'bibo_rosa_feliz')

      // Barrinha de carregamento simples (o canvas ainda está vazio nesta hora)
      const cw = this.scale.width, ch = this.scale.height;
      const g = this.add.graphics();
      this.load.on('progress', (v) => {
        g.clear();
        g.fillStyle(0xffffff, 1).fillRoundedRect(cw * 0.3, ch * 0.5 - 12, cw * 0.4, 24, 12);
        g.fillStyle(COR.amarelo, 1).fillRoundedRect(cw * 0.3 + 4, ch * 0.5 - 8, (cw * 0.4 - 8) * v, 16, 8);
      });
      this.load.once('complete', () => g.destroy());
    }

    // create(): roda depois que tudo carregou.
    create() {
      TS.UI.gerarTexturas(this); // desenha as estrelas e o dedo-guia
      if (this.scene.get('Splash')) {
        this.scene.start('Splash'); // vai para a primeira tela (T01)
      } else {
        // Ainda não existe a T01: mostra um recado para sabermos que o motor está funcionando
        txt(this, this.scale.width / 2, this.scale.height / 2, 'O motor está ligado!\nAgora crie a primeira tela (T01).', 44, '#2B2D42');
      }
    }
  }

  // Lista de todas as cenas do jogo. Boot vem primeiro: é a que o Phaser abre sozinho.
  // Cada arquivo de tela acrescenta a sua cena nesta lista com TS.CENAS.push(...).
  TS.CENAS = [Boot];
})();
