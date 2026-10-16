/* ui.js — kit visual do jogo: textos, botões, cartas, balões, janelas, efeitos e o "palco" responsivo. */
window.TS = window.TS || {};

TS.UI = (function () {
  // Tamanho do "palco": todas as telas são desenhadas pensando em 1280 x 720.
  // Em telas maiores, mais largas ou mais altas, o palco é ampliado e centralizado (veja medidas()).
  const W = 1280, H = 720;
  // Os desenhos SVG (Bip, gato, tambor, ícones) são carregados numa resolução maior em telas grandes
  // (1x no celular, até 2x em monitores e telas retina), para ficarem nítidos.
  // texEsc guarda essa resolução; svgEsc(n) converte a escala "pensada no tamanho original" para a textura carregada.
  let texEsc = 1;
  function escalaTexturas(v) { if (v) texEsc = v; return texEsc; }
  const svgEsc = (n) => n / texEsc;
  const FONT = 'Fredoka, "Baloo 2", Nunito, "Arial Rounded MT Bold", Arial, sans-serif';
  const COR = {
    azul: 0x1e88d0, azulEsc: 0x145f94, verde: 0x2e9a3e, verdeEsc: 0x1f6e2a, amarelo: 0xffc93c, amareloEsc: 0xc98f12,
    laranja: 0xe8731a, laranjaEsc: 0xb2530c, rosa: 0xd63f86, rosaEsc: 0xa02a63, roxo: 0x7a5af0, roxoEsc: 0x5638c4,
    branco: 0xffffff, tinta: 0x23264a, cinza: 0xb8bfcc, cinzaEsc: 0x8a93a3, creme: 0xfff8ec,
    // Tema Abecedário Galáctico: lilás claro das bordas, degraus e fundos de apoio, e a "noite" do céu
    lilasBorda: 0xe3def5, lilasDegrau: 0xd9d2f7, lilasClaro: 0xf4f1ff, lilasTexto: 0x7c7fa6, noite: 0x1e1656,
    tecla: 0xeeecf8, teclaEsc: 0xd5d0ec,
  };
  // Cor mais escura de cada cor (usada no "degrau" dos botões)
  const ESCURO = { [COR.azul]: COR.azulEsc, [COR.verde]: COR.verdeEsc, [COR.amarelo]: COR.amareloEsc, [COR.laranja]: COR.laranjaEsc,
    [COR.rosa]: COR.rosaEsc, [COR.roxo]: COR.roxoEsc, [COR.branco]: COR.lilasDegrau, [COR.cinza]: COR.cinzaEsc, [COR.tecla]: COR.teclaEsc };
  const TINTA = '#23264A';

  /* ---------- Responsividade ----------
     O canvas do Phaser tem o tamanho real da tela (em pixels do aparelho).
     medidas() calcula quanto o palco de 1280x720 precisa ser ampliado (z) para caber,
     e quanto sobra dos lados (ox) ou em cima e embaixo (oy), em unidades do palco. */
  function medidas(scene) {
    const gw = scene.scale.width, gh = scene.scale.height;
    const z = Math.min(gw / W, gh / H);
    const vw = gw / z, vh = gh / z; // largura e altura visíveis, em unidades do palco
    return { z, vw, vh, ox: (vw - W) / 2, oy: (vh - H) / 2 };
  }

  // Texto na fonte arredondada do jogo
  function txt(scene, x, y, s, size = 32, color = '#2B2D42', opts = {}) {
    const t = scene.add.text(x, y, s, {
      fontFamily: opts.fonte || FONT, fontSize: size + 'px', color, fontStyle: opts.bold === false ? (opts.peso === 800 ? '800' : 'normal') : String(opts.peso || 600),
      align: opts.align || 'center', stroke: opts.stroke || undefined, strokeThickness: opts.strokeW || 0,
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined, lineSpacing: opts.lineSpacing || 0,
    }).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
    t.setResolution(2); // desenha o texto com o dobro de pixels: fica nítido quando o palco é ampliado
    if (opts.shadow) t.setShadow(0, 3, 'rgba(0,0,0,.25)', 0, true, true);
    return t;
  }

  /* Quadro arredondado (os quadros brancos do jogo). sombra=true desenha o "degrau" lilás embaixo, como no protótipo;
     sombra pode ser um número (altura do degrau em px). */
  function painel(scene, x, y, w, h, cor = COR.branco, raio = 28, sombra = true, borda) {
    const g = scene.add.graphics();
    if (sombra) {
      const d = typeof sombra === 'number' ? sombra : 10;
      g.fillStyle(0x0e0a30, 0.18); g.fillRoundedRect(x - w / 2, y - h / 2 + d + 6, w, h, raio);   // sombra suave no céu
      g.fillStyle(cor === COR.branco ? COR.lilasDegrau : Phaser.Display.Color.ValueToColor(cor).darken(14).color, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2 + d, w, h, raio);                                      // degrau
    }
    g.fillStyle(cor, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, raio);
    if (borda) { g.lineStyle(borda.w || 4, borda.cor, 1); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, raio); }
    return g;
  }

  /* Botão grande com "degrau" 3D, ícone e/ou texto. Alvo de toque de pelo menos 80 px. */
  function botao(scene, x, y, w, h, o = {}) {
    const cor = o.cor ?? COR.verde; const esc = o.corEsc ?? ESCURO[cor] ?? 0x000000;
    const r = o.raio ?? Math.min(h / 2, 30);
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    // desenhar(apertado): solto tem o degrau embaixo; apertado desce 3 px
    const deg = o.degrau ?? Math.max(5, Math.min(9, Math.round(h * 0.085))); // altura do degrau 3D (7 a 9 px nos botões grandes)
    const claro = [COR.branco, COR.amarelo, COR.tecla, COR.lilasClaro].includes(cor) || o.claro; // fundo claro: texto e ícone na cor tinta
    const desenhar = (p) => {
      g.clear();
      if (o.sombra !== false) { g.fillStyle(0x0e0a30, 0.16); g.fillRoundedRect(-w / 2, -h / 2 + deg + 4, w, h, r); }
      g.fillStyle(esc, 1); g.fillRoundedRect(-w / 2, -h / 2 + (p ? 2 : deg), w, h, r);
      g.fillStyle(cor, 1); g.fillRoundedRect(-w / 2, -h / 2 + (p ? deg - 2 : 0), w, h, r);
      if (!claro) { g.fillStyle(0xffffff, 0.16); g.fillRoundedRect(-w / 2 + r * 0.5, -h / 2 + (p ? deg + 2 : 4), w - r, h * 0.26, Math.min(r * 0.6, h * 0.13)); }
    };
    c.claro = claro;
    desenhar(false);
    c.add(g);
    const conteudo = scene.add.container(0, 0); c.add(conteudo);
    let ix = 0;
    if (o.icone && o.texto) ix = -w / 2 + h * 0.55;
    if (o.icone) {
      const img = scene.add.image(ix, 0, o.icone);
      const s = (o.iconeTam ?? h * 0.55) / Math.max(img.width, img.height); img.setScale(s);
      const tint = o.tintIcone ?? (claro ? COR.tinta : null); // botão claro (branco ou amarelo): ícone na cor tinta
      if (tint) img.setTint(tint);
      conteudo.add(img);
    }
    if (o.texto) {
      const corTexto = o.corTexto || (claro ? TINTA : null); // botão claro: texto na cor tinta
      const t = txt(scene, 0, -2, o.texto, o.tam ?? Math.round(h * 0.36), corTexto || '#ffffff', { ox: 0.5, peso: 700 });
      conteudo.add(t); c.label = t;
      // Ícone + texto: os dois juntos ficam centralizados no botão
      const posicionar = () => {
        if (!o.icone) return;
        const img = conteudo.list[0]; const gapI = h * 0.16;
        const iw = img.displayWidth; const tot = iw + gapI + t.width;
        img.x = -tot / 2 + iw / 2; t.x = img.x + iw / 2 + gapI + t.width / 2;
      };
      posicionar();
      c.setTexto = (s2) => { t.setText(s2); posicionar(); };
    }
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    let ativo = true;
    c.on('pointerdown', () => { if (!ativo) return; desenhar(true); conteudo.y = deg - 2; });
    c.on('pointerout', () => { desenhar(false); conteudo.y = 0; });
    c.on('pointerup', () => {
      if (!ativo) return; desenhar(false); conteudo.y = 0;
      TS.Som.tocar('clique', 0.5);
      o.onClick && o.onClick();
    });
    c.on('pointerover', () => ativo && scene.tweens.add({ targets: c, scale: 1.04, duration: 100 }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 100 }));
    c.setAtivo = (v) => { ativo = v; c.setAlpha(v ? 1 : 0.5); };
    return c;
  }

  function botaoRedondo(scene, x, y, d, o = {}) {
    return botao(scene, x, y, d, d, { ...o, raio: d / 2, iconeTam: o.iconeTam ?? d * 0.5 });
  }

  /* Carta de figura (ou letra), no estilo do protótipo: branca, borda lilás grossa e "degrau" lilás embaixo.
     Estados (c.desenhar): 'certo' (borda verde, fundo verde-claro), 'errado' (laranja: "tente de novo"),
     'sel' (escolhida: borda lilás forte), 'apagado' (já usada) ou null (normal).
     o.legenda: nome embaixo da figura (ex.: "GATO"); o.fundo: cor de fundo (ex.: amarelo claro na figura-modelo). */
  function carta(scene, x, y, w, h, imgKey, o = {}) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const r = o.raio ?? Math.min(26, w * 0.16);
    const deg = o.degrau ?? Math.max(5, Math.round(h * 0.045));
    c.desenhar = (estado) => {
      const borda = { certo: COR.verde, errado: COR.laranja, sel: COR.roxo, apagado: COR.lilasBorda }[estado] || o.borda || COR.lilasBorda;
      const fundoC = { certo: 0xeaf7ec, errado: 0xfff1e6, sel: COR.lilasClaro, apagado: 0xf6f4fd }[estado] ?? (o.fundo ?? 0xffffff);
      const degC = { certo: 0xc9e8cf, errado: 0xf6d2b8 }[estado] || COR.lilasDegrau;
      const lw = estado && estado !== 'apagado' ? 6 : 4;
      g.clear();
      g.fillStyle(degC, 1); g.fillRoundedRect(-w / 2, -h / 2 + deg, w, h, r);
      g.fillStyle(borda, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.fillStyle(fundoC, 1); g.fillRoundedRect(-w / 2 + lw, -h / 2 + lw, w - lw * 2, h - lw * 2, Math.max(4, r - lw));
      c.estado = estado;
    };
    c.desenhar(null);
    c.add(g);
    const leg = o.legenda ? Math.max(26, Math.round(h * 0.17)) : 0;  // espaço da legenda
    if (imgKey) {
      const img = scene.add.image(0, -leg / 2, imgKey);
      const s = Math.min((w * 0.72) / img.width, ((h - leg) * 0.72) / img.height); img.setScale(s);
      c.add(img); c.img = img;
    }
    if (o.letra) {
      const t = txt(scene, 0, -leg / 2, o.letra, Math.round((h - leg) * 0.55), TINTA, { peso: 700 }); c.add(t); c.letraTxt = t;
    }
    if (o.legenda) {
      const t = txt(scene, 0, h / 2 - leg * 0.72, o.legenda, Math.min(Math.round(leg * 0.62), 26), TINTA, { peso: 700 });
      if (t.width > w - 14) t.setScale((w - 14) / t.width);
      c.add(t); c.legendaTxt = t;
    }
    // Selo de "certo" (bolinha verde com ✓) no canto de cima, como no protótipo
    c.selo = (mostrar = true) => {
      if (c.seloObj) { c.seloObj.destroy(); c.seloObj = null; }
      if (!mostrar) return;
      const s2 = scene.add.container(w / 2 - 8, -h / 2 + 8);
      s2.add(scene.add.circle(0, 0, 30, 0xffffff));
      s2.add(scene.add.circle(0, 0, 25, COR.verde));
      s2.add(scene.add.image(0, 0, 'svg_g_certo').setDisplaySize(30, 30));
      c.add(s2); c.seloObj = s2;
      s2.setScale(0); scene.tweens.add({ targets: s2, scale: 1, duration: 260, ease: 'Back.out' });
    };
    c.setSize(w, h);
    return c;
  }

  /* Vaga vazia (onde a peça vai encaixar): fundo lilás bem claro e borda tracejada lilás, como no protótipo.
     Desenha num Graphics já existente (g), centralizada em (cx, cy). */
  function vaga(g, cx, cy, w, h, r = 20, o = {}) {
    g.fillStyle(o.fundo ?? 0xf6f4fd, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
    // Pontos ao longo da borda arredondada; desenhamos só os trechos "ligados" (traço, espaço, traço...)
    const x0 = cx - w / 2 + 2, y0 = cy - h / 2 + 2, ww = w - 4, hh = h - 4, rr = Math.min(r, ww / 2, hh / 2);
    const pts = [];
    const arco = (ax, ay, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([ax + Math.cos(a) * rr, ay + Math.sin(a) * rr]); } };
    arco(x0 + ww - rr, y0 + rr, -Math.PI / 2); arco(x0 + ww - rr, y0 + hh - rr, 0); arco(x0 + rr, y0 + hh - rr, Math.PI / 2); arco(x0 + rr, y0 + rr, Math.PI);
    pts.push(pts[0]);
    const traco = o.traco ?? 13, espaco = o.espaco ?? 9;
    g.lineStyle(o.esp ?? 4, o.cor ?? 0xc9bef0, 1);
    let ligado = true, resta = traco;
    for (let i = 1; i < pts.length; i++) {
      let [ax, ay] = pts[i - 1]; const [bx, by] = pts[i];
      let seg = Math.hypot(bx - ax, by - ay);
      while (seg > 0) {
        const passo = Math.min(seg, resta); const f = passo / seg;
        const nx = ax + (bx - ax) * f, ny = ay + (by - ay) * f;
        if (ligado) g.lineBetween(ax, ay, nx, ny);
        ax = nx; ay = ny; seg -= passo; resta -= passo;
        if (resta <= 0) { ligado = !ligado; resta = ligado ? traco : espaco; }
      }
    }
    return g;
  }

  /* Pílula branca com texto (nome da fase, nome do mundo, estrelas...). o.numero: bolinha colorida antes do texto. */
  function pilula(scene, x, y, texto, o = {}) {
    const c = scene.add.container(x, y);
    const tam = o.tam ?? 30; const h = o.h ?? 76;
    const t = txt(scene, 0, -2, texto, tam, o.cor || TINTA, { peso: 700 });
    let extra = 0, num = null;
    if (o.numero != null) {
      num = scene.add.container(0, 0);
      const nt = txt(scene, 0, -1, String(o.numero), tam * 0.78, '#ffffff', { peso: 700 });
      const nw = Math.max(h * 0.62, nt.width + 26);
      const ng = scene.add.graphics(); ng.fillStyle(o.corNumero ?? COR.rosa, 1); ng.fillRoundedRect(-nw / 2, -h * 0.31, nw, h * 0.62, h * 0.31);
      num.add([ng, nt]); num.larg = nw; extra = nw + 14;
    }
    const w = o.w ?? Math.max(o.min ?? 0, t.width + extra + 64);
    c.add(painel(scene, 0, 0, w, h, COR.branco, h / 2, 7));
    if (num) { num.x = -(t.width + extra) / 2 + num.larg / 2; t.x = num.x + num.larg / 2 + 14 + t.width / 2; c.add(num); }
    c.add(t); c.txt = t; c.larg = w;
    c.setText = (s2) => { t.setText(s2); if (num) { num.x = -(t.width + extra) / 2 + num.larg / 2; t.x = num.x + num.larg / 2 + 14 + t.width / 2; } };
    return c;
  }

  /* Título grande com contorno colorido (ex.: "Sons do jogo" com contorno laranja). */
  function titulo(scene, x, y, texto, corContorno = '#E8731A', tam = 56) {
    const t = txt(scene, x, y, texto, tam, '#ffffff', { peso: 700, stroke: corContorno, strokeW: 12 });
    t.setShadow(0, 5, 'rgba(14,10,48,.45)', 0, true, true);
    return t;
  }

  /* Fundo (cenário) que cobre toda a área visível, mesmo em telas mais largas ou mais altas. */
  function cobrir(scene, img) {
    const m = medidas(scene);
    img.setPosition(W / 2, H + m.oy); // encostado embaixo, no meio
    img.setScale(Math.max(m.vw / img.width, m.vh / img.height));
  }
  function fundo(scene, key) {
    const img = scene.add.image(W / 2, H, key).setOrigin(0.5, 1);
    cobrir(scene, img);
    (scene.fundos = scene.fundos || []).push(img); // a Cena recalcula quando a tela muda de tamanho
    return img;
  }

  /* Mascote Bip: respira o tempo todo e mexe a boca enquanto fala. */
  function mascote(scene, x, y, escala = 0.5, expr = 'feliz') {
    const cor = scene.corMascote || 'rosa';
    const e = escala / TS.GALACTICO.RES_BIP; // a imagem do Bip tem 1,5x o tamanho de desenho
    const img = scene.add.image(x, y, `bibo_${cor}_${expr}`).setScale(e).setOrigin(TS.GALACTICO.ORIGEM_BIP, 1);
    img.expr = expr;
    img.idle = scene.tweens.add({ targets: img, scaleY: e * 1.03, scaleX: e * 0.985, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    img.setExpr = (ex) => { img.expr = ex; img.setTexture(`bibo_${cor}_${ex}`); };
    // Enquanto fala, o Bip mostra o balão de "falando" (reticências) e balança de leve; depois volta ao estado pedido
    img.falar = (texto, opts = {}) => {
      const base = opts.expr || 'feliz';
      img.setExpr('falando');
      const bal = scene.tweens.add({ targets: img, angle: { from: -2, to: 2 }, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.inOut' });
      return TS.Voz.falar(texto, opts).then(() => { bal.remove(); if (img.scene) { img.setAngle(0); img.setTexture(`bibo_${cor}_${base}`); img.expr = base; } });
    };
    img.pular = () => scene.tweens.add({ targets: img, y: img.y - 30, yoyo: true, duration: 180, ease: 'Quad.out' });
    return img;
  }

  /* Balão de fala do Bip: branco com degrau lilás, texto na cor tinta. lado: de que lado fica o "rabinho"
     ('esq' = embaixo à esquerda, 'dir' = embaixo à direita, 'esqMeio' = no meio do lado esquerdo).
     o.titulo: primeira linha grande e colorida (ex.: "Oi, Enzo!"). */
  function balao(scene, x, y, texto, w = 420, lado = 'esq', o = {}) {
    const c = scene.add.container(x, y);
    const tam = o.tam ?? 26;
    const tit = o.titulo ? txt(scene, -w / 2 + 34, 0, o.titulo, o.tamTitulo ?? 40, o.corTitulo || '#2E9A3E', { peso: 700, ox: 0 }) : null;
    const t = txt(scene, o.titulo ? -w / 2 + 34 : 0, 0, texto, tam, TINTA, { wrap: w - 64, peso: 600, ox: o.titulo ? 0 : 0.5, align: o.titulo ? 'left' : 'center' });
    const hTit = tit ? tit.height : 0;
    const h = Math.max(90, t.height + hTit + 44);
    if (tit) { tit.y = -h / 2 + 22 + hTit / 2; t.y = tit.y + hTit / 2 + t.height / 2 - 2; }
    const g = scene.add.graphics();
    const desenhar = (hh) => {
      g.clear();
      g.fillStyle(COR.lilasDegrau, 1); g.fillRoundedRect(-w / 2, -hh / 2 + 8, w, hh, 26);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -hh / 2, w, hh, 26);
      if (lado === 'esqMeio') g.fillTriangle(-w / 2 + 2, -18, -w / 2 + 2, 18, -w / 2 - 34, 4);
      else {
        const px = lado === 'esq' ? -w / 2 + 70 : w / 2 - 70; const dir = lado === 'esq' ? 1 : -1;
        g.fillTriangle(px, hh / 2 - 2, px + dir * 38, hh / 2 - 2, px + dir * 4, hh / 2 + 34);
      }
    };
    desenhar(h);
    c.add([g, t]); if (tit) c.add(tit); c.txt = t;
    c.setText = (s2) => { t.setText(s2); if (!tit) desenhar(Math.max(90, t.height + 44)); };
    c.setScale(0.2); c.setAlpha(0);
    scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    return c;
  }

  // Confete colorido (comemoração)
  function confete(scene, x, y, n = 28) {
    const cores = [COR.amarelo, COR.rosa, COR.azul, COR.verde, COR.roxo, COR.laranja];
    for (let i = 0; i < n; i++) {
      const p = scene.add.rectangle(x, y, 12, 18, Phaser.Utils.Array.GetRandom(cores)).setDepth(1000);
      const ang = Phaser.Math.FloatBetween(-Math.PI, 0); const v = Phaser.Math.Between(180, 420);
      scene.tweens.add({ targets: p, x: x + Math.cos(ang) * v, y: y + Math.sin(ang) * v + 240, angle: Phaser.Math.Between(-360, 360),
        alpha: 0, duration: Phaser.Math.Between(900, 1400), ease: 'Cubic.out', onComplete: () => p.destroy() });
    }
  }
  // Estrelinhas que se espalham (acerto)
  function brilho(scene, x, y) {
    for (let i = 0; i < 8; i++) {
      const s = scene.add.image(x, y, 'estrela_cheia').setScale(0.25).setDepth(1000);
      const a = (i / 8) * Math.PI * 2;
      scene.tweens.add({ targets: s, x: x + Math.cos(a) * 120, y: y + Math.sin(a) * 120, scale: 0.05, alpha: 0, duration: 650, ease: 'Cubic.out', onComplete: () => s.destroy() });
    }
  }

  /* Janela modal: fundo escuro que cobre tudo (e bloqueia os toques) e uma caixa no meio da parte visível. */
  function modal(scene, w, h, construir) {
    const c = scene.add.container(0, 0).setDepth(2000);
    const fundoEsc = scene.add.rectangle(W / 2, H / 2, W * 4, H * 4, COR.noite, 0.62).setInteractive();
    c.add(fundoEsc);
    const caixa = scene.add.container(W / 2, H / 2);
    caixa.add(painel(scene, 0, 0, w, h, COR.branco, 40));
    c.add(caixa);
    // centralizar(): põe a janela no meio do que a câmera está mostrando (no Mapa a câmera anda)
    c.centralizar = () => {
      const cam = scene.cameras.main; const m = medidas(scene);
      c.setPosition(cam.scrollX + m.vw / 2 - W / 2, cam.scrollY + m.vh / 2 - H / 2);
    };
    c.centralizar();
    (scene.modais = scene.modais || []).push(c);
    caixa.setScale(0.6); caixa.setAlpha(0);
    scene.tweens.add({ targets: caixa, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    c.fechar = () => scene.tweens.add({ targets: caixa, scale: 0.7, alpha: 0, duration: 160, onComplete: () => c.destroy() });
    c.once('destroy', () => { scene.modais = (scene.modais || []).filter((x) => x !== c); });
    construir(caixa, c);
    return c;
  }

  /* Três estrelas. estilo 'fase' (embaixo das fases do mapa: dourada com borda branca) ou 'grande' (resultado). */
  function estrelas(scene, x, y, n, tam = 40, esp = 44, estilo = 'fase') {
    const c = scene.add.container(x, y);
    for (let i = 0; i < 3; i++) {
      const k = estilo === 'fase' ? (i < n ? 'svg_g_estrela_fase_cheia' : 'svg_g_estrela_fase_vazia') : (i < n ? 'svg_g_estrela' : 'svg_g_estrela_rodada_vazia');
      const s = scene.add.image((i - 1) * esp, estilo === 'fase' ? 0 : (i === 1 ? -tam * 0.22 : 0), k);
      s.setDisplaySize(tam * (estilo !== 'fase' && i === 1 ? 1.25 : 1), tam * (estilo !== 'fase' && i === 1 ? 1.25 : 1)); c.add(s);
    }
    return c;
  }

  /* Texturas desenhadas uma vez no carregamento: estrelas, dedo-guia, ponto. */
  function gerarTexturas(scene) {
    const star = (key, fill, stroke) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const pts = []; const R = 60, r = 28, cx = 64, cy = 66;
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r : R; pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)); }
      g.fillStyle(stroke, 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(cx + (p.x - cx) * 1.1, cy + (p.y - cy) * 1.1 + 2)), true);
      g.fillStyle(fill, 1); g.fillPoints(pts, true);
      g.fillStyle(0xffffff, 0.35); g.fillCircle(cx - 12, cy - 14, 8);
      g.generateTexture(key, 128, 134); g.destroy();
    };
    star('estrela_cheia', 0xffc93c, 0xe0a21c);
    star('estrela_vazia', 0xece9f7, 0xcfcae6);
    const d = scene.make.graphics({ add: false });
    d.fillStyle(0x000000, 0.2); d.fillCircle(36, 40, 28);
    d.fillStyle(0xffffff, 1); d.fillCircle(32, 32, 28);
    d.lineStyle(6, 0x2b2d42, 1); d.strokeCircle(32, 32, 26);
    d.fillStyle(0xffc93c, 1); d.fillCircle(32, 32, 10);
    d.generateTexture('dedo', 72, 72); d.destroy();
    const b = scene.make.graphics({ add: false });
    b.fillStyle(0xffffff, 1); b.fillCircle(8, 8, 8); b.generateTexture('ponto', 16, 16); b.destroy();
  }

  /* Aviso de "sem internet": uma faixa no alto da tela que NÃO trava o jogo.
     No modo banco de dados, as partidas ficam guardadas no aparelho e vão para o banco quando a internet voltar. */
  function overlayOffline(scene) {
    if (scene.offline) return;
    const m = medidas(scene);
    const c = scene.add.container(W / 2, 140 - m.oy).setDepth(3000).setScrollFactor(0);
    const t = txt(scene, 24, -2, 'Sem internet: seu progresso fica guardado.', 24, TINTA, { peso: 700 });
    const w = t.width + 110;
    c.add(painel(scene, 0, 0, w, 64, COR.branco, 32, 6));
    c.add(scene.add.image(-w / 2 + 44, 0, `bibo_${scene.corMascote || 'rosa'}_preocupado`).setOrigin(TS.GALACTICO.ORIGEM_BIP, 0.62).setScale(0.12 / TS.GALACTICO.RES_BIP));
    t.x = -w / 2 + 80 + t.width / 2; c.add(t);
    if (scene.cameraLivre) c.x = scene.cameras.main.scrollX + m.vw / 2; // no Mapa, a faixa fica fixa na tela
    c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, y: c.y + 6, duration: 300 });
    scene.offline = c;
    TS.Voz.falar('Ops, a internet sumiu! Pode continuar brincando: seu progresso fica guardado.');
  }
  function removerOffline(scene) {
    if (!scene.offline) return;
    const c = scene.offline; scene.offline = null;
    scene.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
  }

  // Troca de tela: escurece, e quando terminar abre a próxima
  function transicao(scene, destino, dados) {
    TS.Voz.parar();
    scene.cameras.main.fadeOut(220, 30, 22, 86); // escurece para a cor da noite
    scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(destino, dados));
  }
  function entrar(scene) { scene.cameras.main.fadeIn(260, 30, 22, 86); }

  return { W, H, escalaTexturas, svgEsc, FONT, COR, TINTA, medidas, txt, painel, botao, botaoRedondo, carta, pilula, titulo, vaga, cobrir, fundo, mascote, balao, confete, brilho, modal, estrelas,
    gerarTexturas, overlayOffline, removerOffline, transicao, entrar };
})();
