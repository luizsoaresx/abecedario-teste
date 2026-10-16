/* t08_modelo3_montar.js — Modelo 3 — Montar: arrastar as sílabas (ou a letra que falta) para formar o nome da figura
   (fases 2-2, 2-3, 5-4).

   ENCAIXE PERFEITO: quando a criança solta a peça numa vaga, a peça desliza até a vaga e cresce até ficar EXATAMENTE
   do tamanho dela (mesma largura, altura e cantos); aí vira a peça branca "colocada", como no protótipo.
   No lugar de onde ela saiu fica uma cópia apagada (a criança vê que já usou aquela peça).
   Quando a palavra fica pronta, as peças se juntam (sem espaço entre elas) e o Bip fala as sílabas uma a uma. */
window.TS = window.TS || {};
(function () {
  const { COR, carta } = TS.UI;
  const { ELOGIOS, esperar } = TS.AT;
  const Wd = TS.C.W; // banco de palavras

  // Medidas (dentro do quadro de 70..1210 x 140..640)
  const PX = 814;                 // centro da fileira da palavra e das peças (à direita da figura)
  const PY = 336;                 // fileira da palavra (as vagas)
  const LARG = 680;               // largura máxima das fileiras
  const BY = 524;                 // fileira das peças para arrastar

  // Acrescenta o método tMontar à tela Atividade (t08_atividade.js)
  TS.Atividade.prototype.tMontar = function (it) {
    const A = this.area; const w = Wd[it.palavra];
    const letra = it.modo === 'letra';
    A.add(carta(this, 268, 392, 296, 372, w.img, { fundo: COR.lilasClaro, borda: 0xddd5fb }));
    this.alto(A, 392, 556, w.f, 66);
    this.instrucao(letra ? 'Arraste a letra que falta para escrever o nome' : 'Monte o nome da figura com os pedacinhos', PX, 222);

    // ----- As vagas (e as letras que já estão na palavra) -----
    const tiles = letra ? Array.from(w.f) : it.alvo;            // "bola" -> b o l a  |  sorvete -> SOR VE TE
    const n = tiles.length;
    const gap = letra ? 10 : 18;
    const th = letra ? 120 : 128;
    const tw = Math.floor(Math.min(letra ? 104 : 166, (LARG - gap * (n - 1)) / n));
    const xCasa = (i, g = gap) => PX - (n * tw + (n - 1) * g) / 2 + tw / 2 + i * (tw + g);
    const exibir = (s) => (it.minuscula ? s.toLowerCase() : s.toUpperCase());
    const linha = [];   // o que está em cada casa (letra fixa ou peça encaixada)
    const slots = [];   // vagas
    tiles.forEach((t, i) => {
      const x = xCasa(i);
      if (!letra || i === 0) {
        const g = this.add.graphics();
        TS.UI.vaga(g, x, PY, tw, th, Math.min(24, th * 0.22)); // mesmos cantos da peça
        A.add(g);
        this.tweens.add({ targets: g, alpha: 0.55, yoyo: true, repeat: -1, duration: 750 }); // pisca de leve: "coloque aqui"
        slots.push({ x, y: PY, alvo: letra ? it.alvo[0] : t, cheio: false, i, g });
      } else {
        const p = this.peca(x, PY, exibir(t), 'colocada', tw, th);
        A.add(p); linha[i] = p;
      }
    });
    // Linha que separa a palavra das peças
    const div = this.add.graphics(); div.fillStyle(0xeeebf8, 1); div.fillRoundedRect(PX - 348, 432, 696, 4, 2); A.add(div);

    // ----- As peças para arrastar -----
    const np = it.pecas.length; const gapP = 22;
    const tw2 = Math.floor(Math.min(letra ? 104 : 140, (LARG - gapP * (np - 1)) / np)); const th2 = letra ? 104 : 108;
    const largP = np * tw2 + (np - 1) * gapP;
    const pecas = it.pecas.map((p, i) => {
      const pc = this.peca(PX - largP / 2 + tw2 / 2 + i * (tw2 + gapP), BY, exibir(p), i, tw2, th2);
      pc.valor = p; A.add(pc);
      this.arrastavel(pc, (o, ptr) => {
        const l = this.local(ptr); // posição do dedo dentro da área
        const s = slots.find((s2) => !s2.cheio && Math.abs(l.x - s2.x) < tw / 2 + 34 && Math.abs(l.y - s2.y) < th / 2 + 44);
        if (!s) return false;
        return tentar(o, s);
      }, (o) => { const s = slots.find((s2) => !s2.cheio); if (s && !tentar(o, s)) this.voltar(o); });
      return pc;
    });

    /* Encaixa a peça na vaga: desliza até lá e cresce até o tamanho exato da vaga.
       Depois vira uma peça branca do MESMO tamanho da vaga, no mesmo lugar (sem sobrar nenhuma borda). */
    const encaixar = (pc, s, ms) => new Promise((ok) => {
      s.cheio = true; pc.usada = true; pc.disableInteractive();
      this.tweens.killTweensOf(s.g); s.g.setAlpha(1);
      this.tweens.add({
        targets: pc, x: s.x, y: s.y, scaleX: tw / tw2, scaleY: th / th2, duration: ms, ease: 'Quad.out',
        onComplete: () => {
          const fixa = this.peca(s.x, s.y, pc.texto, 'colocada', tw, th);
          A.add(fixa); linha[s.i] = fixa; s.g.setVisible(false);
          this.tweens.add({ targets: fixa, scale: 1.06, yoyo: true, duration: 110 });
          // A peça volta para a fileira de baixo, apagada (já foi usada)
          pc.setScale(1).setPosition(pc.origem.x, pc.origem.y).setAlpha(0.32);
          ok();
        },
      });
    });
    const tentar = (o, s) => {
      if (o.valor === s.alvo) {
        encaixar(o, s, 170).then(() => {
          TS.Som.tocar('pop', 0.5);
          if (slots.every((x) => x.cheio)) return completou();
          // A sílaba (ou letra) sozinha. "fila": se o Bip ainda estiver falando a anterior, espera em vez de cortar.
          TS.Voz.falar(letra ? 'letra ' + o.valor.toUpperCase() : TS.C.falaSilaba(o.valor), { fila: true });
        });
        return true;
      }
      this.registrar('r', false);
      const e = this.errou('r', null);
      this.time.delayedCall(10, () => this.voltar(o));
      if (e >= 2) {
        this.bloqueado = true;
        this.time.delayedCall(1400, async () => {
          for (const s of slots.filter((x) => !x.cheio)) {
            const pc = pecas.find((p) => p.valor === s.alvo && !p.usada);
            if (pc) await encaixar(pc, s, 380);
          }
          this.time.delayedCall(300, () => completou(true));
        });
      }
      return true;
    };

    // Palavra pronta: as peças se juntam (sem espaço entre elas) e o Bip fala as sílabas e a palavra
    const completou = async (ajuda) => {
      this.bloqueado = true;
      if (!ajuda) { this.registrar('r', true); this.acertou(PX, PY, false); }
      pecas.filter((p) => !p.usada).forEach((p) => this.tweens.add({ targets: p, alpha: 0.2, duration: 300 }));
      await esperar(this, 240);
      linha.forEach((p, i) => p && this.tweens.add({ targets: p, x: xCasa(i, 0), duration: 320, ease: 'Quad.inOut' }));
      await esperar(this, 360);
      await TS.Voz.quandoCalar(1500); // deixa terminar a sílaba da peça anterior
      if (!letra) {
        // Fala as sílabas uma a uma e cada peça pula quando a sílaba dela é falada
        await TS.Voz.falarSequencia(w.s.map(TS.C.falaSilaba), (i) => {
          const p = linha[i]; if (p && p.active) this.tweens.add({ targets: p, y: PY - 14, yoyo: true, duration: 140 });
        }, { rate: 0.9 });
      }
      await this.falar(`${ajuda ? '' : Phaser.Utils.Array.GetRandom(ELOGIOS) + ' '}${w.f}!`, { expr: ajuda ? 'incentivando' : 'comemorando' });
      this.fimRodada(250);
    };
    this.falaAtual = () => this.falar(letra ? `Qual letra falta para escrever ${w.f}?` : `Monte a palavra ${w.f}.`);
    this.time.delayedCall(200, this.falaAtual);
  };
})();
