/* t01_abertura.js — T01 Abertura: logo "Abecedário Galáctico", o Bip no disco voador, barra de carregamento e botão Jogar. */
window.TS = window.TS || {};
(function () {
  const { W, COR, botao, painel, mascote } = TS.UI;

  class Splash extends TS.Cena {
    constructor() { super('Splash'); } // nome da tela: 'Splash'

    montar() {
      // Fundo da abertura (céu com planetas, lua e foguete)
      TS.UI.fundo(this, 'bg_abertura');

      // Logo (imagem de 1040x400 mostrada com 520x200), flutuando devagar
      const logo = this.add.image(W / 2, 118, 'logo_galactico').setScale(0.5);
      this.tweens.add({ targets: logo, y: 108, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });

      // Brilho suave atrás do Bip e a sombra oval do disco no chão
      const brilho = this.add.circle(W / 2, 420, 170, 0xffffff, 0.10);
      this.add.circle(W / 2, 420, 120, 0xffffff, 0.08);
      this.tweens.add({ targets: brilho, scale: 1.12, alpha: 0.05, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.inOut' });
      const sombra = this.add.ellipse(W / 2, 548, 230, 34, 0x0e0a30, 0.35);

      // O Bip começa fora da tela (y = 900) e "voa" para o lugar
      this.bibo = mascote(this, W / 2, 530, 0.62, 'feliz');
      this.bibo.y = 900;
      this.tweens.add({ targets: this.bibo, y: 530, duration: 800, ease: 'Back.out',
        onComplete: () => this.tweens.add({ targets: this.bibo, y: 518, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.inOut' }) });
      this.tweens.add({ targets: sombra, scaleX: 0.9, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.inOut' });

      // Barra de carregamento: um fundo branco e uma barra amarela que cresce
      this.fundoBarra = painel(this, W / 2, 630, 420, 34, 0xffffff, 17, false);
      const barra = this.add.graphics();
      const prog = { v: 0 }; // v vai de 0 (vazia) até 1 (cheia)
      this.tweens.add({
        targets: prog, v: 1, duration: 1200, ease: 'Sine.inOut',
        onUpdate: () => { barra.clear(); barra.fillStyle(COR.amarelo, 1); barra.fillRoundedRect(W / 2 - 205, 620, 410 * prog.v, 20, 10); },
        onComplete: () => this.pronto(barra), // quando encher, chama pronto()
      });
    }

    // Troca a barra pelo botão Jogar (amarelo, como no protótipo)
    pronto(barra) {
      barra.destroy();
      this.fundoBarra.destroy();
      const b = botao(this, W / 2, 628, 300, 92, { cor: COR.amarelo, icone: 'svg_g_jogar', iconeTam: 38, texto: 'Jogar', tam: 44, onClick: () => this.comecar() });
      this.tweens.add({ targets: b, scale: 1.05, yoyo: true, repeat: -1, duration: 650 }); // botão pulsando
    }

    // O que acontece ao tocar em Jogar
    comecar() {
      TS.Voz.destravar();  // destrava a voz do navegador (precisa de um toque)
      TS.App.telaCheia();  // no celular: tela cheia e deitado
      const u = TS.DB.sessao.get();
      if (u && u.perfil === 'aluno') this.ir('BoasVindas'); // aluno já conectado neste aparelho
      else if (u) TS.App.abrirGestao();                     // professor já conectado
      else this.ir('Acesso');                               // ninguém conectado
    }
  }

  TS.CENAS.push(Splash); // registra a tela na lista do jogo
})();
