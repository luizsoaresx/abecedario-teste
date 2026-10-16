/* t21_professores.js — T21 Gestão de professores. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T21 Gestão de professores ----------
  PAGINAS.professores = (c) => {
    c.innerHTML = `<div class="card"><div class="toolbar"><label class="busca">${I('busca')}<input placeholder="Buscar professor" data-busca></label><span class="sp"></span><button class="btn btn-primary" data-novo>${I('mais')} Cadastrar professor</button></div><div data-tab></div></div>`;
    const busca = $('[data-busca]', c);
    const tb = tabela($('[data-tab]', c), {
      ordem: { k: 'nome' },
      linhas: () => TS.DB.users.all().filter((p) => p.perfil === 'professor' || (p.perfil === 'admin' && p.id !== state.user.id)).filter((p) => U.semAcento(p.nome + p.login).includes(U.semAcento(busca.value))).map((p) => ({ ...p, turmas: TS.DB.turmas.doProfessor(p.id).map((t) => t.nome) })),
      cols: [{ k: 'nome', rot: 'Nome', render: (p) => `<div class="nome-cel">${avatar(p.nome)}<div>${esc(p.nome)}<small>${esc(p.email || '')}</small></div></div>` },
        { k: 'login', rot: 'Login', render: (p) => `<code>${esc(p.login)}</code>${p.perfil === 'admin' ? ' <span class="chip">Administrador</span>' : ''}` },
        { k: 'turmas', rot: 'Turmas atribuídas', valor: (p) => p.turmas.length, render: (p) => (p.turmas.length ? p.turmas.map((t) => `<span class="chip">${esc(t)}</span>`).join(' ') : '<span style="color:var(--ink-3)">Nenhuma</span>') },
        { k: 'ativo', rot: 'Status', valor: (p) => (p.ativo ? 0 : 1), render: (p) => (p.ativo ? `<span class="st ok">${I('check')}Ativo</span>` : `<span class="st novo">${I('ban')}Desativado</span>`) },
        { k: 'a', rot: '', ord: false, render: (p) => `<div class="acoes"><button class="btn-icon" title="Editar" data-ed="${p.id}">${I('editar')}</button><button class="btn-icon" title="${p.ativo ? 'Desativar' : 'Reativar'}" data-at="${p.id}">${I(p.ativo ? 'ban' : 'check')}</button><button class="btn-icon perigo" title="Remover" data-rm="${p.id}">${I('lixo')}</button></div>` }],
      vazio: vazio('Nenhum professor encontrado', 'Cadastre professores para atribuir às turmas.'),
      aposRender: (el) => {
        $$('[data-ed]', el).forEach((b) => (b.onclick = () => formProf(TS.DB.users.get(b.dataset.ed), tb.render)));
        $$('[data-at]', el).forEach((b) => (b.onclick = () => { const p = TS.DB.users.get(b.dataset.at);
          if (p.ativo) confirmar({ titulo: 'Desativar professor', texto: `<b>${esc(p.nome)}</b> não conseguirá mais entrar. As turmas e os dados continuam salvos.`, botao: 'Desativar', perigo: false, onOk: async () => { try { await TS.DB.users.update(p.id, { ativo: false }); toast('Professor desativado.'); tb.render(); } catch (e) { toast(e.message, 'erro'); } } });
          else TS.DB.users.update(p.id, { ativo: true }).then(() => { toast('Professor reativado.'); tb.render(); }, (e) => toast(e.message, 'erro')); }));
        $$('[data-rm]', el).forEach((b) => (b.onclick = () => { const p = TS.DB.users.get(b.dataset.rm); const n = TS.DB.turmas.doProfessor(p.id).length;
          confirmar({ titulo: 'Remover professor', texto: `Remover <b>${esc(p.nome)}</b>?${n ? ` As ${n} turma(s) dele(a) ficarão sem professor responsável.` : ''}`, onOk: async () => { try { await TS.DB.users.remove(p.id); toast('Professor removido.'); tb.render(); } catch (e) { toast(e.message, 'erro'); } } }); }));
      },
    });
    busca.oninput = tb.render; $('[data-novo]', c).onclick = () => formProf(null, tb.render);
    return { titulo: 'Gestão de professores<small>Cadastre, edite e desative professores</small>' };
  };
  function formProf(p, depois) {
    const ed = !!p; const ts = TS.DB.turmas.all();
    modal({ titulo: ed ? 'Editar professor' : 'Cadastrar professor', largo: true,
      corpo: `<form class="form-grid" novalidate>
        <div class="field full" data-f="nome"><label>Nome completo *</label><input name="nome" value="${esc(p?.nome || '')}"><span class="msg"></span></div>
        <div class="field" data-f="login"><label>Login *</label><input name="login" value="${esc(p?.login || '')}" placeholder="prof.nome"><span class="msg"></span></div>
        <div class="field" data-f="email"><label>E-mail *</label><input name="email" type="email" value="${esc(p?.email || '')}" placeholder="nome@escola.com"><span class="msg"></span></div>
        <div class="field" data-f="senha"><label>${ed ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial *'}</label><input name="senha" type="text" placeholder="mínimo 6 caracteres" autocomplete="off"><span class="hint">A pessoa pode trocar depois, em Meu perfil.</span><span class="msg"></span></div>
        <div class="field" data-f="perfil"><label>Tipo de conta</label><select name="perfil" ${ed ? 'disabled' : ''}><option value="professor" ${p?.perfil !== 'admin' ? 'selected' : ''}>Professor</option><option value="admin" ${p?.perfil === 'admin' ? 'selected' : ''}>Administrador</option></select>${ed ? '<span class="hint">O tipo da conta não muda depois de criada.</span>' : ''}</div>
        <div class="field full"><label>Turmas atribuídas</label><div style="display:flex;flex-direction:column;gap:6px;padding-top:4px">${ts.map((t) => `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="t" value="${t.id}" ${p && t.professorId === p.id ? 'checked' : ''}> ${esc(t.nome)}${t.professorId && (!p || t.professorId !== p.id) ? ` <small style="color:var(--ink-3)">(hoje: ${esc((TS.DB.users.get(t.professorId) || {}).nome || '')})</small>` : ''}</label>`).join('') || '<span class="hint">Nenhuma turma criada.</span>'}</div></div>
      </form>`,
      rodape: `<button class="btn btn-ghost" data-fechar>Cancelar</button><button class="btn btn-primary" data-salvar>${ed ? 'Salvar' : 'Cadastrar'}</button>`,
      aoMontar: (m) => m.$('[data-salvar]').onclick = async () => {
        const f = m.$('form'); const v = { nome: f.nome.value.trim(), login: f.login.value.trim().toLowerCase(), email: f.email.value.trim().toLowerCase(), senha: f.senha.value.trim() };
        const erros = {};
        if (!v.nome) erros.nome = 'Campo obrigatório.';
        if (!v.login) erros.login = 'Campo obrigatório.'; else if (!/^[a-z0-9._]{2,40}$/.test(v.login)) erros.login = 'Use letras minúsculas, números, ponto ou _.';
        else { const ex = TS.DB.users.byLogin(v.login); if (ex && ex.id !== p?.id) erros.login = 'Este login já existe.'; }
        if (!v.email) erros.email = 'Campo obrigatório.'; else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) erros.email = 'E-mail inválido.';
        if (!ed && !v.senha) erros.senha = 'Campo obrigatório.'; else if (v.senha && v.senha.length < 6) erros.senha = 'Mínimo de 6 caracteres.';
        const marcar = (es) => {
          $$('.field', m.el).forEach((x) => { x.classList.remove('erro'); const ms = x.querySelector('.msg'); if (ms) ms.textContent = ''; });
          Object.entries(es).forEach(([k, msg]) => { const x = m.$(`[data-f=${k}]`); if (!x) return toast(msg, 'erro'); x.classList.add('erro'); x.querySelector('.msg').textContent = msg; });
        };
        marcar(erros);
        if (Object.keys(erros).length) return;
        if (!v.senha) delete v.senha;
        const bt = m.$('[data-salvar]'); const txtBt = bt.textContent; bt.disabled = true; bt.innerHTML = '<span class="spinner"></span> Salvando…';
        try {
          const u = ed ? await TS.DB.users.update(p.id, v) : await TS.DB.users.create({ ...v, perfil: f.perfil.value });
          const marcadas = $$('input[name=t]', m.el).filter((x) => x.checked).map((x) => x.value);
          for (const t of ts) {
            if (marcadas.includes(t.id) && t.professorId !== u.id) await TS.DB.turmas.update(t.id, { professorId: u.id });
            else if (!marcadas.includes(t.id) && t.professorId === u.id) await TS.DB.turmas.update(t.id, { professorId: null });
          }
          m.fechar(); toast(ed ? 'Professor atualizado.' : 'Professor cadastrado.'); depois();
        } catch (e) {
          bt.disabled = false; bt.textContent = txtBt;
          marcar({ [{ login_existe: 'login', login: 'login', email_existe: 'email', email: 'email', senha_curta: 'senha', nome: 'nome' }[e.codigo] || '_']: e.message });
        }
      } });
  }
})();
