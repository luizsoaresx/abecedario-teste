/* t04_login.js — T04 Login do professor e do administrador (e o primeiro acesso, quando o banco ainda está vazio). */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, esc, root, $, $$, toast, modal } = K;

  // Lado esquerdo: o céu da abertura do jogo, o logo e o Bip
  const arte = () => `<div class="login-art" style="background-image: url(${TS.GALACTICO.img.bg_abertura})">
      <img class="logo" src="${TS.Art.uri(TS.GALACTICO.svg.logo)}" alt="Abecedário Galáctico">
      <img class="bibo" src="${TS.GALACTICO.img.bip_disco_rosa}" alt="Bip, o mascote">
      <p>Acompanhe a evolução da consciência fonológica da sua turma e descubra rapidamente quem precisa de ajuda.</p>
    </div>`;

  // Aviso sobre onde os dados ficam guardados
  const avisoBanco = () => (TS.DB.nuvem ? '' : `<div class="alerta info" style="margin:0 0 16px">${I('info')}<div><b>Modo local (teste).</b> Os dados ficam só neste navegador.
    Para gravar tudo no banco de dados, preencha <code>js/config.js</code> (passo a passo no LEIA-ME).</div></div>`);

  // Mostra erro embaixo de um campo (ou no alerta geral, se campo = null)
  function mostrarErro(campo, msg) {
    if (campo && $(`[data-f=${campo}]`)) { $(`[data-f=${campo}]`).classList.add('erro'); $(`[data-f=${campo}] .msg`).textContent = msg; }
    else $('[data-alerta]').innerHTML = `<div class="alerta erro">${I('exclama')}<div>${esc(msg)}</div></div>`;
  }
  function limparErros() { $$('.field').forEach((f) => { f.classList.remove('erro'); const m = $('.msg', f); if (m) m.textContent = ''; }); $('[data-alerta]').innerHTML = ''; }
  function ocupado(bt, sim, texto) { bt.disabled = sim; bt.innerHTML = sim ? `<span class="spinner"></span> ${texto}` : texto; }

  // ---------- T04 Login ----------
  K.telaLogin = async function () {
    root().innerHTML = `<div class="login-wrap">${arte()}<div class="login-box"><div class="login-card"><div class="sk" style="height:320px"></div></div></div></div>`;
    // No banco novo (sem administrador), o primeiro acesso cria a conta do administrador
    if (TS.DB.nuvem) {
      try { const s = await TS.DB.situacao(); if (!s.temAdmin) return telaPrimeiroAcesso(); }
      catch (e) { return telaLoginForm(e.message); }
    }
    telaLoginForm();
  };

  function telaLoginForm(erroBanco) {
    root().innerHTML = `<div class="login-wrap">${arte()}
      <div class="login-box"><form class="login-card" novalidate>
        <button type="button" class="btn-voltar" data-voltar style="margin-bottom:24px">${I('voltar')}<span>Voltar para o jogo</span></button>
        <h2>Entrar</h2><p class="sub">Área do professor e do administrador</p>
        ${avisoBanco()}
        <div data-alerta>${erroBanco ? `<div class="alerta erro">${I('sinal')}<div>${esc(erroBanco)}</div></div>` : ''}</div>
        <div class="field" data-f="login"><label for="lg">Login ou e-mail</label><input id="lg" name="login" autocomplete="username" placeholder="ex.: prof.ana"><span class="msg"></span></div>
        <div class="field" data-f="senha"><label for="sn">Senha</label><input id="sn" name="senha" type="password" autocomplete="current-password" placeholder="Sua senha"><span class="msg"></span></div>
        <div class="linha-acoes"><label style="display:flex;gap:8px;align-items:center;color:var(--ink-2)"><input type="checkbox" name="manter" checked> Manter conectado</label><button type="button" class="link" data-esqueci>Esqueci minha senha</button></div>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
        ${TS.DB.nuvem ? '' : `<div class="demo-box"><b>Contas de demonstração (modo local)</b><br>Professor: <code>prof.ana</code> / <code>123456</code><br>Administrador: <code>admin</code> / <code>admin123</code><br>Aluno (no jogo): <code>joao</code> / <code>1234</code> ou figuras pato, gato, uva</div>`}
      </form></div></div>`;
    const form = $('form');
    $('[data-voltar]').onclick = () => TS.App.abrirJogo('Acesso');
    $('[data-esqueci]').onclick = () => modal({ titulo: 'Esqueci minha senha', corpo: `<div class="alerta info">${I('chave')}<div>Por segurança, a senha é guardada criptografada e ninguém consegue lê-la.
      Peça ao <b>administrador da escola</b> uma senha nova: ele cria em <b>Professores → Editar</b>. Depois, troque por uma só sua em <b>Meu perfil</b>.</div></div>`,
      rodape: '<button class="btn btn-primary" data-fechar>Entendi</button>' });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = form.login.value.trim(); const senha = form.senha.value;
      limparErros();
      if (!login || !senha) {
        if (!login) mostrarErro('login', 'Informe seu login ou e-mail.');
        if (!senha) mostrarErro('senha', 'Informe sua senha.');
        return;
      }
      const bt = form.querySelector('[type=submit]'); ocupado(bt, true, 'Entrando…');
      const r = await TS.DB.entrar(login, senha, { perfil: 'gestao', manter: form.manter.checked });
      if (!document.body.contains(bt)) return;
      ocupado(bt, false, 'Entrar');
      if (r.erro) {
        const msg = {
          nao_encontrado: ['login', 'Usuário não encontrado. Confira o login ou o e-mail.'], senha: ['senha', 'Senha incorreta. Tente novamente.'],
          inativo: [null, 'Este usuário está desativado. Fale com o administrador.'], aluno: [null, 'Este é um login de aluno. Alunos entram pelo jogo.'],
          bloqueado: [null, 'Muitas tentativas erradas. Espere 5 minutos e tente de novo.'],
        }[r.erro] || [null, r.msg || 'Não foi possível entrar.'];
        return mostrarErro(msg[0], msg[1]);
      }
      K.abrir();
    });
  }

  // ---------- Primeiro acesso: criar a conta do administrador ----------
  function telaPrimeiroAcesso() {
    root().innerHTML = `<div class="login-wrap">${arte()}
      <div class="login-box"><form class="login-card" novalidate>
        <button type="button" class="btn-voltar" data-voltar style="margin-bottom:24px">${I('voltar')}<span>Voltar para o jogo</span></button>
        <h2>Primeiro acesso</h2><p class="sub">O banco de dados está ligado e vazio. Crie a conta do <b>administrador</b> da escola.</p>
        <div class="alerta ok" style="margin:0 0 16px">${I('check')}<div>Banco conectado: <code>${esc(TS.Nuvem.url.replace(/^https?:\/\//, ''))}</code></div></div>
        <div data-alerta></div>
        <div class="field" data-f="nome"><label>Seu nome completo</label><input name="nome" autocomplete="name"><span class="msg"></span></div>
        <div class="field" data-f="email"><label>E-mail</label><input name="email" type="email" autocomplete="email"><span class="msg"></span></div>
        <div class="field" data-f="login"><label>Login</label><input name="login" autocomplete="username" placeholder="ex.: admin"><span class="hint">Letras minúsculas, números, ponto ou _.</span><span class="msg"></span></div>
        <div class="field" data-f="senha"><label>Senha</label><input name="senha" type="password" autocomplete="new-password" placeholder="mínimo 6 caracteres"><span class="msg"></span></div>
        <div class="field" data-f="senha2"><label>Repita a senha</label><input name="senha2" type="password" autocomplete="new-password"><span class="msg"></span></div>
        <button class="btn btn-primary btn-block" type="submit">Criar administrador e entrar</button>
      </form></div></div>`;
    const form = $('form');
    $('[data-voltar]').onclick = () => TS.App.abrirJogo('Acesso');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); limparErros();
      const v = { nome: form.nome.value.trim(), email: form.email.value.trim().toLowerCase(), login: form.login.value.trim().toLowerCase(), senha: form.senha.value };
      const erros = {};
      if (v.nome.length < 2) erros.nome = 'Informe seu nome.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) erros.email = 'E-mail inválido.';
      if (!/^[a-z0-9._]{3,40}$/.test(v.login)) erros.login = 'De 3 a 40 letras minúsculas, números, ponto ou _.';
      if (v.senha.length < 6) erros.senha = 'Mínimo de 6 caracteres.';
      if (form.senha2.value !== v.senha) erros.senha2 = 'As senhas não são iguais.';
      Object.entries(erros).forEach(([k, m]) => mostrarErro(k, m));
      if (Object.keys(erros).length) return;
      const bt = form.querySelector('[type=submit]'); ocupado(bt, true, 'Criando…');
      try {
        await TS.DB.criarPrimeiroAdmin(v);
        toast('Administrador criado! Bem-vindo(a).');
        K.abrir();
      } catch (err) {
        ocupado(bt, false, 'Criar administrador e entrar');
        mostrarErro({ email: 'email', login: 'login', login_existe: 'login', senha_curta: 'senha', nome: 'nome' }[err.codigo] || null, err.message);
      }
    });
  }
})();
