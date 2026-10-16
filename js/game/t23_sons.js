/* t23_sons.js — T23 Sons do jogo (tela extra): liga e desliga a voz do Bip e os efeitos sonoros,
   escolhe a velocidade e a voz (as vozes em português que o navegador tem). */
window.TS = window.TS || {};
(function () {
  const { COR, TINTA, txt, botao, botaoRedondo, painel, mascote } = TS.UI;
  const CHAVE = 'trilhaDosSons.ajustes.v1';

  // Lê as preferências salvas assim que o arquivo carrega, antes de qualquer tela.
  let salvo = {};
  try { salvo = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { /* sem preferências */ }
  if (salvo.voz === false) TS.Voz.setAtivo(false);
  if (salvo.som === false) TS.Som.setAtivo(false);
  const guardar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify({ voz: TS.Voz.ativo(), som: TS.Som.ativo() })); } catch (e) { /* segue */ }
  };

  class Sons extends TS.Cena {
    constructor() { super('Sons'); }
    init(dados) { this.de = (dados && dados.de) || 'BoasVindas'; } // para onde o botão Voltar leva
    montar() {
      TS.UI.fundo(this, 'bg_mundo4');
      this.botaoVoltar(() => this.ir(this.de));
      this.ancorar(botaoRedondo(this, 184, 76, 88, { cor: COR.azul, icone: 'svg_alto', onClick: () => this.explicar() }), -1, -1);
      TS.UI.titulo(this, 640, 78, 'Sons do jogo', '#E8731A', 58);
      // Quadro de x 400 a 1200 e y 150 a 620, com 4 linhas separadas por um fio lilás
      painel(this, 800, 385, 800, 470, COR.branco, 40);
      [287, 386, 485].forEach((y) => { const g = this.add.graphics(); g.fillStyle(0xeeebf8, 1); g.fillRect(440, y, 720, 3); });
      this.bibo = mascote(this, 190, 680, 0.58, 'falando');
      this.chave(238, 'Voz do Bip', () => TS.Voz.ativo(), (v) => TS.Voz.setAtivo(v));
      this.chave(337, 'Efeitos sonoros', () => TS.Som.ativo(), (v) => TS.Som.setAtivo(v));
      this.linhaVelocidade(436);
      this.linhaVoz(546);
      // Dica embaixo do quadro (muda conforme a voz que está sendo usada)
      const d = TS.Voz.descricao();
      txt(this, 800, 668, d.dica, 22, '#ffffff', { peso: 700, stroke: '#1E1656', strokeW: 6, wrap: 900 });
      this.time.delayedCall(300, () => this.explicar());
    }
    explicar() { this.bibo.falar('Aqui você liga e desliga os sons, e escolhe a velocidade e a voz do Bip.'); }
    testar() { this.bibo.falar('Oi! Eu sou o Bip. Vamos brincar com os sons das palavras?'); }

    /* Uma linha: rótulo à esquerda e dois botões no mesmo lugar (só um aparece). */
    chave(y, rotulo, ler, escrever) {
      txt(this, 440, y, rotulo, 34, TINTA, { ox: 0, peso: 600 });
      const trocar = (v) => { escrever(v); guardar(); mostrar(); if (v) TS.Som.tocar('pop'); };
      const ligado = botao(this, 1035, y, 250, 74, { cor: COR.verde, icone: 'svg_g_nota_musical', tintIcone: 0xffffff, iconeTam: 30, texto: 'Ligado', tam: 28, onClick: () => trocar(false) });
      const desligado = botao(this, 1035, y, 250, 74, { cor: COR.tecla, texto: 'Desligado', tam: 28, onClick: () => trocar(true) });
      ligado.list[1].list[0].setTintFill(0xffffff); // nota musical branca no botão verde
      const mostrar = () => { const v = ler(); ligado.setVisible(v); desligado.setVisible(!v); };
      mostrar();
    }

    /* Velocidade da voz: três botões (o escolhido fica verde). Ao tocar, o Bip fala para conferir. */
    linhaVelocidade(y) {
      txt(this, 440, y, 'Velocidade', 34, TINTA, { ox: 0, peso: 600 });
      const nomes = ['Devagar', 'Normal', 'Rápida'];
      // Cada velocidade tem dois botões no mesmo lugar: verde (escolhida) e lilás claro (não escolhida). Só um aparece.
      const bts = TS.Voz.VELOCIDADES.map((v, i) => {
        const escolher = () => { TS.Voz.setVelocidade(v); pintar(); this.testar(); };
        const x = 807 + i * 144;
        return { v, sim: botao(this, x, y, 130, 70, { cor: COR.verde, texto: nomes[i], tam: 24, onClick: escolher }),
          nao: botao(this, x, y, 130, 70, { cor: COR.tecla, texto: nomes[i], tam: 24, onClick: escolher }) };
      });
      const pintar = () => bts.forEach(({ v, sim, nao }) => { const sel = TS.Voz.velocidade() === v; sim.setVisible(sel); nao.setVisible(!sel); });
      pintar();
    }

    /* Qual voz está sendo usada (a gravada ou a do navegador), com botões para trocar de voz e para ouvir. */
    linhaVoz(y) {
      txt(this, 440, y - 18, 'Voz', 34, TINTA, { ox: 0, peso: 600 });
      const nome = txt(this, 440, y + 22, TS.Voz.descricao().nome, 19, '#4A4F78', { ox: 0, fonte: 'Nunito, Arial, sans-serif', peso: 800, bold: false, wrap: 330 });
      const n = TS.Voz.quantasVozes();
      botao(this, 905, y, 170, 74, { cor: COR.roxo, icone: 'svg_g_avancar', iconeTam: 28, texto: 'Trocar', tam: 26, onClick: () => {
        if (TS.Voz.quantasVozes() < 2) { this.bibo.falar('Este navegador só tem esta voz em português.'); return; }
        TS.Voz.proximaVoz(); nome.setText(TS.Voz.descricao().nome);
        this.testar();
      } }).setAlpha(n > 1 ? 1 : 0.6).list[1].list[0].setTintFill(0xffffff);
      botao(this, 1080, y, 160, 74, { cor: COR.azul, icone: 'svg_alto', iconeTam: 34, texto: 'Ouvir', tam: 26, onClick: () => this.testar() });
    }
  }

  TS.CENAS.push(Sons);
})();
