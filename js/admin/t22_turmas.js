/* t22_turmas.js — T22 Gestão de turmas. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T22 Gestão de turmas ----------
  PAGINAS.turmas = (c) => {
    c.innerHTML = `<div class="card"><div class="toolbar"><label class="busca">${I('busca')}<input placeholder="Buscar turma" data-busca></label><span class="sp"></span><button class="btn btn-primary" data-novo>${I('mais')} Criar turma</button></div><div data-tab></div></div>`;
    const busca = $('[data-busca]', c);
    const tb = tabela($('[data-tab]', c), {
      ordem: { k: 'nome' },
      linhas: () => TS.DB.turmas.all().filter((t) => U.semAcento(t.nome).includes(U.semAcento(busca.value))).map((t) => ({ ...t, prof: (TS.DB.users.get(t.professorId) || {}).nome || '', n: TS.DB.users.alunosDaTurma(t.id).length })),
      cols: [{ k: 'nome', rot: 'Turma', render: (t) => `<b>${esc(t.nome)}</b>` }, { k: 'ano', rot: 'Ano letivo' },
        { k: 'prof', rot: 'Professor responsável', render: (t) => (t.prof ? `<div class="nome-cel">${avatar(t.prof, 30)}${esc(t.prof)}</div>` : `<span class="st atencao">${I('exclama')}Sem professor</span>`) },
        { k: 'n', rot: 'Alunos', num: true },
        { k: 'a', rot: '', ord: false, render: (t) => `<div class="acoes"><button class="btn-icon" title="Editar" data-ed="${t.id}">${I('editar')}</button><button class="btn-icon perigo" title="Remover" data-rm="${t.id}">${I('lixo')}</button></div>` }],
      vazio: vazio('Nenhuma turma cadastrada', 'Crie turmas e atribua um professor responsável.'),
      aposRender: (el) => {
        $$('[data-ed]', el).forEach((b) => (b.onclick = () => formTurma(TS.DB.turmas.get(b.dataset.ed), tb.render)));
        $$('[data-rm]', el).forEach((b) => (b.onclick = () => { const t = TS.DB.turmas.get(b.dataset.rm); const n = TS.DB.users.alunosDaTurma(t.id).length;
          confirmar({ titulo: 'Remover turma', texto: `Remover a turma <b>${esc(t.nome)}</b>?${n ? ` Os ${n} aluno(s) dela ficarão sem turma (o histórico deles é mantido).` : ''}`, onOk: async () => { try { await TS.DB.turmas.remove(t.id); toast('Turma removida.'); tb.render(); } catch (e) { toast(e.message, 'erro'); } } }); }));
      },
    });
    busca.oninput = tb.render; $('[data-novo]', c).onclick = () => formTurma(null, tb.render);
    return { titulo: 'Gestão de turmas<small>Crie turmas e atribua professores</small>' };
  };
  function formTurma(t, depois) {
    const profs = TS.DB.users.all('professor').filter((p) => p.ativo || (t && p.id === t.professorId));
    modal({ titulo: t ? 'Editar turma' : 'Criar turma',
      corpo: `<form novalidate><div class="field" data-f="nome"><label>Nome da turma *</label><input name="nome" value="${esc(t?.nome || '')}" placeholder="ex.: 1º ano A"><span class="msg"></span></div>
        <div class="field"><label>Ano letivo</label><input name="ano" type="number" value="${t?.ano || new Date().getFullYear()}"></div>
        <div class="field"><label>Professor responsável</label><select name="prof"><option value="">Sem professor por enquanto</option>${profs.map((p) => `<option value="${p.id}" ${t?.professorId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div></form>`,
      rodape: `<button class="btn btn-ghost" data-fechar>Cancelar</button><button class="btn btn-primary" data-salvar>${t ? 'Salvar' : 'Criar turma'}</button>`,
      aoMontar: (m) => m.$('[data-salvar]').onclick = async () => {
        const f = m.$('form'); const v = { nome: f.nome.value.trim(), ano: +f.ano.value, professorId: f.prof.value || null };
        const fx = m.$('[data-f=nome]'); fx.classList.remove('erro'); fx.querySelector('.msg').textContent = '';
        const dup = TS.DB.turmas.all().find((x) => x.nome.toLowerCase() === v.nome.toLowerCase() && x.id !== t?.id);
        if (!v.nome || dup) { fx.classList.add('erro'); fx.querySelector('.msg').textContent = v.nome ? 'Já existe uma turma com esse nome.' : 'Campo obrigatório.'; return; }
        const bt = m.$('[data-salvar]'); const txtBt = bt.textContent; bt.disabled = true; bt.innerHTML = '<span class="spinner"></span> Salvando…';
        try {
          if (t) await TS.DB.turmas.update(t.id, v); else await TS.DB.turmas.create(v);
          m.fechar(); toast(t ? 'Turma atualizada.' : 'Turma criada.'); depois();
        } catch (e) { bt.disabled = false; bt.textContent = txtBt; toast(e.message, 'erro'); }
      } });
  }
})();
