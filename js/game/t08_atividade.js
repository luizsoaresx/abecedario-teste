/* t08_atividade.js — T08 Atividade: a tela onde a criança joga as rodadas (e a Pausa, T09).
   Serve para as fases do mapa e para as atividades criadas pela professora (inclusive na pré-visualização).
   Os 7 jeitos de jogar (modelos) ficam cada um no seu arquivo: t08_modelo1_contagem.js até t08_modelo7_falar.js. */
window.TS = window.TS || {};
(function () {
  const { W, H, COR, TINTA, txt, botao, botaoRedondo, painel, mascote, svgEsc } = TS.UI;
  const ELOGIOS = ['Muito bem!', 'Isso!', 'Acertou!', 'Legal!', 'Que ouvido bom!', 'Mandou bem!'];
  const INCENTIVOS = ['Vamos tentar de novo?', 'Quase! Tenta outra vez.', 'Escuta de novo. Você consegue!'];
  // Peças coloridas em tons claros (como no protótipo), sempre com o texto na cor tinta: [cor, degrau]
  const CORES_PECA = [[0xffc93c, 0xc98f12], [0xffb3d6, 0xd9709f], [0xa9d8ff, 0x5fa3dc], [0xb6e8bf, 0x5fae6e], [0xd3c6ff, 0x8f78e8]];
  // O quadro branco de todas as rodadas (no palco de 1280 x 720), igual ao protótipo
  const QUADRO = { x0: 70, y0: 140, x1: 1210, y1: 640 };
  // esperar(cena, ms): espera alguns milissegundos (usado com "await")
  const esperar = (s, ms) => new Promise((r) => s.time.delayedCall(ms, r));

  class Atividade extends TS.Cena {
    constructor() { super('Atividade'); }

    /* Recebe o que vai ser jogado:
       - uma fase do mapa: { faseId }
       - uma atividade da professora: { atividadeId }  (ou { atividade, previa: true } na pré-visualização) */
    init(d) {
      this.dados = d;
      this.previa = !!d.previa;
      this.atv = d.atividade || (d.atividadeId ? TS.DB.atividades.get(d.atividadeId) : null);
      this.registros = [];  // cada acerto ou erro fica guardado aqui
      this.rodada = 0;      // número da rodada atual
      this.inicio = new Date().toISOString();
      if (this.atv) {
        // Atividade da professora: as rodadas são as que ela montou, na mesma ordem
        this.fase = TS.ATV.comoFase(this.atv);
        this.itens = TS.ATV.itens(this.atv);
        return;
      }
      if (d.atividadeId) { this.fase = null; return; } // a atividade foi apagada
      // Fase do mapa: sorteia todas as rodadas de uma vez (sem repetir)
      this.fase = TS.C.fase(d.faseId);
      this.itens = [];
      const vistos = new Set();
      for (let i = 0; i < this.fase.rodadas; i++) {
        let it, t = 0;
        do { it = this.fase.gen(); t++; } while (vistos.has(it.rotulo + (it.subRotulos || []).join()) && t < 12);
        vistos.add(it.rotulo + (it.subRotulos || []).join());
        this.itens.push(it);
      }
    }

    // Desenha só o que não muda entre as rodadas
    montar() {
      if (!this.fase) return this.scene.start('Tarefas'); // atividade não existe mais
      const m = TS.C.MUNDOS[this.fase.mundo - 1];
      TS.UI.fundo(this, m.bg);
      // Cantos: pausa (esquerda; a pausa tem "Continuar", "Ouvir" e "Mapa/Sair") e ouvir de novo (direita), como no protótipo
      this.ancorar(botaoRedondo(this, 76, 70, 88, { cor: COR.branco, icone: 'svg_g_pausar', iconeTam: 38, onClick: () => this.pausar() }), -1, -1);
      this.ancorar(botaoRedondo(this, 1204, 70, 88, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.ouvir() }), 1, -1);
      this.progresso = this.add.container(W / 2, 70); // fileira de estrelas no topo
      this.ancorar(this.progresso, 0, -1);
      this.montarProgresso();
      this.area = this.add.container(0, 0); // cada rodada desenha dentro desta "área" (o quadro branco)
      this.bibo = this.ancorar(mascote(this, 1060, 191, 0.32, 'feliz').setDepth(20), 1, -1); // Bip no alto, à direita, com o balão do estado
      this.time.delayedCall(250, () => this.proxima());
    }

    // Fileira de estrelas numa pílula branca: douradas as rodadas feitas, creme a atual, lilás as que faltam
    montarProgresso() {
      const n = this.itens.length;
      this.progresso.removeAll(true);
      const esp = 54; const larg = Math.max(400, n * esp + 70);
      this.progresso.add(painel(this, 0, 0, larg, 76, COR.branco, 38, 7));
      this.pontos = this.itens.map((_, i) => {
        const x = (i - (n - 1) / 2) * esp;
        const k = i < this.rodada ? 'svg_g_estrela' : i === this.rodada ? 'svg_g_estrela_rodada_cheia' : 'svg_g_estrela_rodada_vazia';
        const c = this.add.image(x, -1, k).setDisplaySize(i === this.rodada ? 46 : 40, i === this.rodada ? 46 : 40);
        this.progresso.add(c);
        return c;
      });
      const at = this.pontos[this.rodada];
      if (at) this.tweens.add({ targets: at, scale: at.scale * 1.12, yoyo: true, repeat: -1, duration: 500 });
    }

    // Quadro branco da rodada (fica dentro da área) e a frase de instrução no alto dele
    quadro() {
      const q = QUADRO;
      this.area.add(painel(this, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, q.x1 - q.x0, q.y1 - q.y0, COR.branco, 40, 12));
    }
    instrucao(texto, x = 640, y = 222, o = {}) {
      const t = txt(this, x, y, texto, o.tam ?? 26, '#3A3D66', { fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false, wrap: o.wrap ?? 900, ox: o.ox ?? 0.5, align: o.align });
      this.area.add(t);
      return t;
    }
    // Botão quadrado azul de ouvir (ao lado da pergunta) e a pergunta escrita
    pergunta(texto, falar, y = 220) {
      const t = txt(this, 0, y, texto, 34, TINTA, { peso: 700, ox: 0 });
      if (t.width > 760) t.setScale(760 / t.width);
      const larg = 96 + 22 + t.displayWidth;
      const x0 = 640 - larg / 2;
      const b = botao(this, x0 + 48, y, 96, 84, { cor: COR.azul, icone: 'svg_alto', iconeTam: 44, raio: 22, onClick: () => TS.Voz.falar(falar || texto) });
      t.x = x0 + 96 + 22;
      this.area.add([b, t]);
      return t;
    }

    // ---------- ciclo das rodadas ----------
    proxima() {
      if (this.rodada >= this.itens.length) return this.finalizar(); // acabaram as rodadas
      this.area.removeAll(true); // apaga a rodada anterior
      this.input.removeAllListeners('pointermove');
      this.input.removeAllListeners('pointerup');
      this.tweens.killTweensOf(this.pontos);
      this.montarProgresso();
      this.item = this.itens[this.rodada];
      this.errosSub = {};
      this.registrados = {};
      this.bloqueado = false;
      this.bibo.setExpr('feliz');
      // Chama o modelo certo conforme o "tipo" da rodada
      const modelos = { contagem: this.tContagem, escolha: this.tEscolha, montar: this.tMontar, vf: this.tVF, caixas: this.tCaixas, ligar: this.tLigar, falar: this.tFalar };
      const modelo = modelos[this.item.tipo];
      if (!modelo) {
        // Ajuda para quem está montando o jogo: o arquivo deste modelo ainda não foi criado
        this.area.add(txt(this, W / 2, H / 2, `O modelo "${this.item.tipo}" ainda não foi criado`, 40, '#2B2D42'));
        return;
      }
      this.caixaRodada = { ...QUADRO };  // o quadro branco: todos os modelos desenham dentro dele
      this.quadro();
      modelo.call(this, this.item);
      this.encaixarArea();
      this.area.setAlpha(0);
      this.tweens.add({ targets: this.area, alpha: 1, duration: 250 });
    }

    /* ---------- Encaixe do quadro na tela ----------
       O quadro (1140 x 500) fica logo abaixo dos botões do topo, como no protótipo. Se a tela for estreita ou baixa
       (celular), ele diminui um pouco para caber, sempre com uma folga das bordas. O Bip fica por cima do canto do quadro. */
    encaixarArea() {
      const r = this.caixaRodada; if (!r || !this.area) return;
      const { ox, oy } = this.m;
      const topo = 132 - oy;                         // logo abaixo dos botões do topo (com o degrau)
      const base = 720 + oy - 14;
      const esq = 16 - ox, dir = 1264 + ox;
      const w = r.x1 - r.x0, h = r.y1 - r.y0 + 12;   // +12: o degrau do quadro
      const s = Math.min(1, (dir - esq) / w, (base - topo) / h);
      const cx = 640;
      // Cabe do tamanho normal? Fica na mesma altura do protótipo (topo em 140); senão, centraliza no espaço livre
      let cy = (r.y0 + r.y1) / 2;
      if (cy - (s * h) / 2 < topo || cy + (s * h) / 2 > base) cy = (topo + base) / 2;
      this.area.setScale(s);
      this.area.setPosition(cx - s * (r.x0 + w / 2), cy - s * (r.y0 + (r.y1 - r.y0) / 2));
    }
    aoRedimensionar() { this.encaixarArea(); }
    // Converte entre a posição dentro da área (onde os modelos desenham) e a posição no palco
    local(p) { const a = this.area; return { x: (p.worldX - a.x) / a.scaleX, y: (p.worldY - a.y) / a.scaleY }; }
    mundo(x, y) { const a = this.area; return { x: a.x + x * a.scaleX, y: a.y + y * a.scaleY }; }

    // Fim de uma rodada: acende a estrela e passa para a próxima
    fimRodada(ms = 1300) {
      this.bloqueado = true;
      const p = this.pontos[this.rodada];
      if (p) {
        this.tweens.killTweensOf(p);
        p.setTexture('estrela_cheia').setScale(0.5);
        this.tweens.add({ targets: p, scale: 0.3, duration: 300 });
      }
      this.rodada++;
      this.time.delayedCall(ms, () => this.proxima());
    }

    // Guarda acerto/erro em silêncio (a criança não vê nota). Só a primeira tentativa conta.
    // extra: dados a mais para o painel do professor (ex.: { ouvido: 'caro' } na atividade de falar)
    registrar(chave, ok, rotulo, extra) {
      if (this.registrados[chave]) return;
      this.registrados[chave] = true;
      this.registros.push({ r: rotulo || this.item.rotulo, ok, ...(extra || {}) });
    }

    // Errou: som suave, treme, Bip incentiva. Devolve quantas vezes já errou este item.
    errou(chave, alvo) {
      this.errosSub[chave] = (this.errosSub[chave] || 0) + 1;
      TS.Som.tocar('erro', 0.35);
      if (alvo) this.tweens.add({ targets: alvo, x: alvo.x + 12, yoyo: true, repeat: 3, duration: 55 });
      this.bibo.falar(Phaser.Utils.Array.GetRandom(INCENTIVOS), { expr: 'incentivando' });
      return this.errosSub[chave];
    }

    // Acertou: som, brilho, Bip pula e (se pedir) fala um elogio. x, y: posição dentro da área.
    acertou(x, y, falar = true) {
      TS.Som.tocar('acerto', 0.5);
      const p = this.mundo(x, y);
      TS.UI.brilho(this, p.x, p.y);
      this.bibo.setExpr('comemorando');
      this.bibo.pular();
      if (falar) this.bibo.falar(Phaser.Utils.Array.GetRandom(ELOGIOS), { expr: 'comemorando' });
    }

    ouvir() { if (this.falaAtual) this.falaAtual(); } // repete a instrução da rodada
    falar(t, o) { return this.bibo.falar(t, o); }

    // Acabou: calcula estrelas, grava no banco e vai para o Resultado (T10)
    finalizar() {
      const total = this.registros.length;
      const acertos = this.registros.filter((r) => r.ok).length;
      const acc = total ? acertos / total : 0;
      const estrelas = TS.C.estrelas(acc);
      const a = this.aluno;
      const fim = new Date().toISOString();
      const sessao = {
        alunoId: a ? a.id : null, hab: this.fase.hab, inicio: this.inicio, fim,
        acertos, erros: total - acertos, acc, estrelas,
        duracaoSeg: Math.round((new Date(fim) - new Date(this.inicio)) / 1000), itens: this.registros,
      };
      const comum = { fase: this.fase, estrelas, acertos, total, dados: this.dados };
      // Pré-visualização do professor: nada é salvo
      if (this.previa) return this.ir('Resultado', { ...comum, previa: true, reg: {} });
      // Atividade da professora: salva separado (conta no painel do professor, mas não abre fases)
      if (this.atv) {
        const reg = TS.DB.registrarSessaoAtividade({ ...sessao, atividadeId: this.atv.id });
        return this.ir('Resultado', { ...comum, custom: true, reg });
      }
      const reg = TS.DB.registrarSessao({ ...sessao, faseId: this.fase.id });
      const figurinha = reg.desbloqueou ? TS.C.FIGURINHAS[this.fase.idx] : null;
      this.ir('Resultado', { ...comum, reg, figurinha });
    }

    // Para onde o botão "sair" leva: fase -> Mapa; atividade -> lista de atividades; pré-visualização -> edição
    sair() {
      if (this.previa) return TS.App.sairDaPrevia(true);
      this.ir(this.atv ? 'Tarefas' : 'Mapa');
    }

    // ---------- T09 Pausa ----------
    pausar() {
      TS.Voz.parar();
      if (TS.Escuta) TS.Escuta.parar();
      const m = TS.UI.modal(this, 760, 520, (cx) => {
        cx.add(txt(this, 0, -192, 'Pausa', 60, TINTA, { peso: 700 }));
        cx.add(botao(this, 0, -84, 520, 104, { cor: COR.amarelo, icone: 'svg_g_jogar', iconeTam: 38, texto: 'Continuar', tam: 40, onClick: () => m.fechar() }));
        cx.add(botao(this, -133, 52, 250, 92, { cor: COR.azul, icone: 'svg_alto', iconeTam: 40, texto: 'Ouvir', tam: 32, onClick: () => { m.fechar(); this.time.delayedCall(200, () => this.ouvir()); } }));
        cx.add(botao(this, 133, 52, 250, 92, { cor: COR.roxo, icone: this.atv ? 'svg_g_sair' : 'svg_g_mapa', iconeTam: 36, texto: this.atv ? 'Sair' : 'Mapa', tam: 32, onClick: () => this.sair() }));
        const ok = this.add.image(-190, 176, 'ico_save').setScale(0.4).setTint(COR.verde);
        cx.add(ok);
        cx.add(txt(this, 20, 176, this.previa ? 'Pré-visualização: nada é salvo' : 'Seu progresso está guardado', 26, '#23853A', { peso: 700 }));
      });
      TS.Voz.falar('Pausa! Quando quiser, toque no botão amarelo para continuar.');
    }

    // ---------- peças que os modelos usam ----------
    // Alto-falante pequeno (bolinha azul com borda branca) em cima de uma carta: fala o nome da figura
    alto(c, x, y, fala, tam = 56) {
      const b = this.add.container(x, y);
      b.add(this.add.circle(0, 5, tam / 2 + 3, COR.azulEsc));
      b.add(this.add.circle(0, 0, tam / 2 + 3, 0xffffff));
      b.add(this.add.circle(0, 0, tam / 2 - 2, COR.azul));
      b.add(this.add.image(0, 0, 'svg_alto').setDisplaySize(tam * 0.56, tam * 0.56));
      b.setSize(tam + 8, tam + 8).setInteractive({ useHandCursor: true });
      b.on('pointerup', (p, lx, ly, ev) => {
        if (ev) ev.stopPropagation(); // não deixa o toque "passar" para a carta de baixo
        TS.Voz.falar(fala);
        this.tweens.add({ targets: b, scale: 1.2, yoyo: true, duration: 120 });
      });
      c.add(b);
      return b;
    }

    /* Peça com uma sílaba ou letra, no estilo do protótipo.
       estilo: número (índice da cor clara da lista CORES_PECA) | 'colocada' (branca com borda lilás: a peça já encaixada
       ou a letra que já está na palavra). O texto é sempre na cor tinta e diminui sozinho para não encostar na borda. */
    peca(x, y, texto, estilo = 0, w = 140, h = 112) {
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      const r = Math.min(24, h * 0.22); const deg = Math.max(6, Math.round(h * 0.08));
      c.desenhar = (est) => {
        g.clear();
        if (est === 'colocada') {
          g.fillStyle(COR.lilasDegrau, 1); g.fillRoundedRect(-w / 2, -h / 2 + deg, w, h, r);
          g.fillStyle(COR.lilasBorda, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
          g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, r - 4);
        } else {
          const [cor, esc] = CORES_PECA[(est || 0) % CORES_PECA.length];
          g.fillStyle(esc, 1); g.fillRoundedRect(-w / 2, -h / 2 + deg, w, h, r);
          g.fillStyle(cor, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
          g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, h * 0.22, r * 0.5);
        }
        c.estilo = est;
      };
      c.desenhar(estilo);
      c.add(g);
      const t = txt(this, 0, -2, texto, Math.min(58, h * 0.52, w * 0.6), TINTA, { peso: 700 });
      if (t.width > w - 20) t.setScale((w - 20) / t.width); // sílaba comprida (ex.: CHOR): encolhe para caber
      c.add(t); c.t = t;
      c.setSize(w, h);
      c.texto = texto;
      return c;
    }

    // Deixa um objeto arrastável. Se o dedo quase não andou, conta como toque (onToque).
    // onSoltar(obj, ponteiro) decide se aceita; se não aceitar, o objeto volta ao lugar.
    arrastavel(obj, onSoltar, onToque) {
      obj.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(obj);
      obj.origem = { x: obj.x, y: obj.y };
      let moveu = false;
      obj.on('dragstart', () => {
        moveu = false;
        obj.setDepth(10);
        this.area.bringToTop(obj);
        this.tweens.add({ targets: obj, scale: 1.08, duration: 100 });
      });
      obj.on('drag', (p, dx, dy) => {
        if (this.bloqueado) return;
        if (Math.abs(dx - obj.origem.x) + Math.abs(dy - obj.origem.y) > 10) moveu = true;
        obj.x = dx;
        obj.y = dy;
      });
      obj.on('dragend', (p) => {
        this.tweens.add({ targets: obj, scale: 1, duration: 100 });
        if (this.bloqueado) return this.voltar(obj);
        if (!moveu) { obj.x = obj.origem.x; obj.y = obj.origem.y; return onToque && onToque(obj); }
        if (!onSoltar(obj, p)) this.voltar(obj);
      });
    }
    voltar(obj) { this.tweens.add({ targets: obj, x: obj.origem.x, y: obj.origem.y, duration: 250, ease: 'Back.out' }); }
  }

  // Deixamos a classe e as frases disponíveis para os arquivos dos modelos
  TS.Atividade = Atividade;
  TS.AT = { ELOGIOS, INCENTIVOS, CORES_PECA, esperar };
  TS.CENAS.push(Atividade);
})();
