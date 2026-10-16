/* t28_perfil.js — T28 Meu perfil (professor e administrador): ver os próprios dados e trocar nome, e-mail e senha.
   Para salvar qualquer mudança, a pessoa digita a senha atual (assim ninguém troca a senha de um computador esquecido aberto).
   No modo banco de dados, a troca vai para o Supabase na hora (função atualizar_perfil do banco). */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, U, esc, $, $$, state, avatar, toast, PAGINAS, isAdmin } = K;

  PAGINAS.perfil = (c) => {
    const u = TS.DB.sessao.get() || state.user;
    const est = TS.DB.estado();
    const turmas = isAdmin() ? [] : TS.DB.turmas.doProfessor(u.id).map((t) => t.nome);
    c.innerHTML = `
      <div class="grid g-2-1 perfil-grade">
        <div class="card">
          <div class="perfil-h">${avatar(u.nome, 64)}<div style="flex:1"><h2 data-nome-perfil>${esc(u.nome)}</h2>
            <div class="meta"><span>${I(isAdmin() ? 'escola' : 'user')} ${isAdmin() ? 'Administrador' : 'Professor'}</span><span>${I('user')} Login: <code>${esc(u.login)}</code></span>
            <span>${I('email')} <span data-email-perfil>${esc(u.email || 'sem e-mail')}</span></span></div></div></div>
          <form class="form-perfil" novalidate>
            <h3 style="margin:22px 0 4px">Dados da conta</h3>
            <p class="card-sub" style="margin:0 0 14px">Seu nome aparece no menu e nos relatórios. O e-mail também serve para entrar (no lugar do login).</p>
            <div class="form-grid">
              <div class="field" data-f="nome"><label>Nome completo</label><input name="nome" value="${esc(u.nome)}" autocomplete="name"><span class="msg"></span></div>
              <div class="field" data-f="email"><label>E-mail</label><input name="email" type="email" value="${esc(u.email || '')}" autocomplete="email"><span class="msg"></span></div>
            </div>
            <h3 style="margin:18px 0 4px">Trocar a senha</h3>
            <p class="card-sub" style="margin:0 0 14px">Deixe em branco para continuar com a mesma senha. Mínimo de 6 caracteres.</p>
            <div class="form-grid">
              <div class="field" data-f="nova"><label>Nova senha</label><input name="nova" type="password" autocomplete="new-password"><span class="msg"></span></div>
              <div class="field" data-f="nova2"><label>Repita a nova senha</label><input name="nova2" type="password" autocomplete="new-password"><span class="msg"></span></div>
            </div>
            <div class="confirma-senha">
              <div class="field" data-f="atual" style="margin:0;flex:1;max-width:340px"><label>${I('cadeado')} Sua senha atual (para confirmar)</label><input name="atual" type="password" autocomplete="current-password"><span class="msg"></span></div>
              <button class="btn btn-primary" type="submit">${I('check')} Salvar alterações</button>
            </div>
          </form>
        </div>
        <div class="card">
          <h3>Onde seus dados ficam</h3>
          ${est.modo === 'nuvem'
            ? `<div class="alerta ok" style="margin:10px 0 14px">${I('banco')}<div><b>Banco de dados conectado.</b> Tudo o que você faz fica gravado no Supabase.</div></div>
               <p class="card-sub" style="margin:0">Endereço: <code>${esc(est.url.replace(/^https?:\/\//, ''))}</code></p>
               <p class="card-sub">A sua senha é guardada <b>criptografada</b> (ninguém consegue lê-la, nem o administrador).</p>`
            : `<div class="alerta info" style="margin:10px 0 14px">${I('info')}<div><b>Modo local (teste).</b> Os dados ficam só neste navegador.</div></div>
               <p class="card-sub" style="margin:0">Para gravar no banco de dados de verdade, siga o passo a passo do LEIA-ME (Supabase, gratuito) e preencha <code>js/config.js</code>.</p>`}
          ${turmas.length ? `<h3 style="margin-top:22px">Minhas turmas</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${turmas.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
          <h3 style="margin-top:22px">Conta criada em</h3><p class="card-sub" style="margin:6px 0 0">${esc(U.fmtData(u.criadoEm))}</p>
        </div>
      </div>`;

    const f = $('form', c);
    const marcar = (erros) => {
      $$('.field', f).forEach((x) => { x.classList.remove('erro'); const ms = x.querySelector('.msg'); if (ms) ms.textContent = ''; });
      Object.entries(erros).forEach(([k, msg]) => { const x = $(`[data-f=${k}]`, f); if (!x) return toast(msg, 'erro'); x.classList.add('erro'); x.querySelector('.msg').textContent = msg; });
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = { nome: f.nome.value.trim(), email: f.email.value.trim().toLowerCase(), nova: f.nova.value, nova2: f.nova2.value, atual: f.atual.value };
      const erros = {};
      if (v.nome.length < 2) erros.nome = 'Informe seu nome.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) erros.email = 'E-mail inválido.';
      if (v.nova && v.nova.length < 6) erros.nova = 'Mínimo de 6 caracteres.';
      if (v.nova !== v.nova2) erros.nova2 = 'As senhas não são iguais.';
      if (!v.atual) erros.atual = 'Digite sua senha atual para confirmar.';
      marcar(erros);
      if (Object.keys(erros).length) return;
      const nada = v.nome === u.nome && v.email === (u.email || '') && !v.nova;
      if (nada) return toast('Nada mudou.');
      const bt = $('[type=submit]', f); bt.disabled = true; const txt = bt.innerHTML; bt.innerHTML = '<span class="spinner"></span> Salvando…';
      try {
        const novo = await TS.DB.atualizarPerfil({ senhaAtual: v.atual, nome: v.nome, email: v.email, novaSenha: v.nova || null });
        state.user = novo;
        f.atual.value = ''; f.nova.value = ''; f.nova2.value = '';
        $('[data-nome-perfil]', c).textContent = novo.nome; $('[data-email-perfil]', c).textContent = novo.email || '';
        const cab = document.querySelector('#gestao .usuario b'); if (cab) cab.textContent = novo.nome.split(' ')[0];
        toast(v.nova ? 'Dados e senha atualizados.' : 'Dados atualizados.');
      } catch (err) {
        marcar({ [{ senha_atual: 'atual', email: 'email', email_existe: 'email', senha_curta: 'nova' }[err.codigo] || '_']: err.message });
      } finally { bt.disabled = false; bt.innerHTML = txt; }
    });
    return { titulo: 'Meu perfil<small>Seus dados de acesso</small>' };
  };
})();
