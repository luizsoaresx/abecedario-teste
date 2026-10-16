/* t20_painel.js — T20 Painel geral do administrador. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T20 Painel geral (administrador) ----------
  PAGINAS.painel = (c) => {
    const profs = TS.DB.users.all('professor'); const ts = TS.DB.turmas.all(); const al = TS.DB.users.all('aluno');
    const sete = new Date(Date.now() - 7 * 864e5), trinta = new Date(Date.now() - 30 * 864e5);
    const ativos = new Set(TS.DB.raw.sessoes.filter((s) => new Date(s.fim) >= sete).map((s) => s.alunoId)).size;
    const linhas = ts.map((t) => {
      const as = TS.DB.users.alunosDaTurma(t.id); const ids = as.map((a) => a.id);
      const ss = TS.DB.sessoesDe(ids, trinta); const ok = ss.reduce((s, x) => s + x.acertos, 0), tot = ss.reduce((s, x) => s + x.acertos + x.erros, 0);
      const st = as.map((a) => TS.DB.statusAluno(a.id).cod);
      return { id: t.id, nome: t.nome, prof: (TS.DB.users.get(t.professorId) || {}).nome || '—', n: as.length,
        ativos: new Set(TS.DB.sessoesDe(ids, sete).map((s) => s.alunoId)).size, fase: as.length ? as.reduce((s, a) => s + TS.DB.faseAtual(a.id).idx, 0) / as.length : 0,
        taxa: tot ? ok / tot : 0, dif: st.filter((x) => x === 'dificuldade').length };
    });
    const cont = (k) => al.filter((a) => TS.DB.statusAluno(a.id).cod === k).length;
    // Quadro do banco de dados: onde os dados ficam e, num banco novo, o botão de dados de exemplo
    const est = TS.DB.estado();
    const banco = est.modo === 'nuvem'
      ? `<div class="card aviso-banco"><div class="card-head" style="margin:0"><div style="display:flex;gap:14px;align-items:center"><div class="kpi"><div class="ic" style="background:#2E9A3E1a;color:#2E9A3E">${I('banco')}</div></div>
          <div><h3 style="margin:0">Banco de dados conectado</h3><p class="card-sub" style="margin:4px 0 0">Supabase: <code>${esc(est.url.replace(/^https?:\/\//, ''))}</code> · tudo é gravado na hora${est.pendentes ? ` · ${est.pendentes} partida(s) chegando` : ''}</p></div></div>
          ${!al.length ? `<button class="btn btn-ghost" data-exemplo>${I('mais')} Criar dados de exemplo</button>` : ''}</div></div>`
      : `<div class="card aviso-banco"><div class="card-head" style="margin:0"><div style="display:flex;gap:14px;align-items:center"><div class="kpi"><div class="ic" style="background:#E8731A1a;color:#E8731A">${I('info')}</div></div>
          <div><h3 style="margin:0">Modo local (teste)</h3><p class="card-sub" style="margin:4px 0 0">Os dados ficam só neste navegador, com contas de demonstração. Para gravar num banco de dados de verdade (gratuito), siga o passo a passo do LEIA-ME.</p></div></div>
          <button class="btn btn-ghost" data-recriar>${I('dado')} Recriar demonstração</button></div></div>`;
    c.innerHTML = `${banco}
      <div class="grid g4">${kpi('user', '#7A5AF0', profs.filter((p) => p.ativo).length, 'Professores ativos', `${profs.length} cadastrados`)}${kpi('escola', '#E8731A', ts.length, 'Turmas', '')}
        ${kpi('users', '#1E88D0', al.length, 'Alunos', '')}${kpi('ativo', '#2E9A3E', ativos, 'Alunos ativos', 'jogaram nos últimos 7 dias')}</div>
      <div class="grid g-2-1">
        <div class="card"><h3>Taxa de acerto por turma</h3><p class="card-sub">Últimos 30 dias · meta de 70%</p>${linhas.length ? G.barras(linhas.map((l) => ({ rot: l.nome, v: l.taxa, cor: '#1E88D0', sub: l.prof.split(' ')[0] })), { pct: true, max: 1, meta: 0.7, w: 640, h: 260 }) : vazio('Nenhuma turma', 'Crie turmas para começar.')}</div>
        <div class="card"><h3>Situação geral dos alunos</h3><p class="card-sub">Toda a plataforma</p>${G.rosca([{ rot: 'Em dia', v: cont('ok'), cor: ST.ok.cor }, { rot: 'Atenção', v: cont('atencao'), cor: ST.atencao.cor }, { rot: 'Com dificuldade', v: cont('dificuldade'), cor: ST.dificuldade.cor }, { rot: 'Ainda não jogou', v: cont('novo'), cor: ST.novo.cor }], { rotCentro: 'alunos' })}</div>
      </div>
      <div class="card"><h3>Comparativo entre turmas</h3><p class="card-sub">Clique numa turma para ver a evolução dela</p><div data-tab></div></div>`;
    tabela($('[data-tab]', c), {
      ordem: { k: 'taxa', dir: -1 }, linhas: () => linhas,
      cols: [{ k: 'nome', rot: 'Turma', render: (l) => `<b>${esc(l.nome)}</b>` }, { k: 'prof', rot: 'Professor(a)' }, { k: 'n', rot: 'Alunos', num: true }, { k: 'ativos', rot: 'Ativos (7d)', num: true },
        { k: 'fase', rot: 'Fase média', num: true, render: (l) => { const f = TS.C.FASES[Math.round(l.fase)]; return l.n ? `${f.mundo}-${f.fase}` : '—'; } },
        { k: 'taxa', rot: '% acerto (30d)', num: true, render: (l) => `<b>${l.taxa ? U.pct(l.taxa) : '—'}</b>` }, { k: 'dif', rot: 'Com dificuldade', num: true, render: (l) => (l.dif ? `<span class="st dificuldade">${I('alerta')}${l.dif}</span>` : '0') }],
      onLinha: (id) => { state.turma = id; K.shell(); ir('evolucao'); },
      vazio: vazio('Nenhuma turma cadastrada', 'Crie a primeira turma em Turmas.'),
    });
    const bEx = $('[data-exemplo]', c);
    if (bEx) bEx.onclick = () => confirmar({ titulo: 'Criar dados de exemplo', perigo: false, botao: 'Criar',
      texto: 'Cria no banco 3 turmas, 3 professores (prof.ana, prof.carlos, prof.bia — senha 123456), 18 alunos (ex.: joao / 1234) com partidas de exemplo e algumas atividades. Bom para conhecer os painéis. Você pode remover tudo depois.',
      onOk: async () => {
        bEx.disabled = true; bEx.innerHTML = '<span class="spinner"></span> Criando…';
        try { const r = await TS.DB.importarExemplo(); toast(`Pronto! ${r.alunos} alunos de exemplo criados.`); K.shell(); ir('painel'); }
        catch (e) { toast(e.message, 'erro'); bEx.disabled = false; bEx.textContent = 'Criar dados de exemplo'; }
      } });
    const bRe = $('[data-recriar]', c);
    if (bRe) bRe.onclick = () => confirmar({ titulo: 'Recriar demonstração', botao: 'Recriar', texto: 'Apaga tudo o que foi feito neste navegador e cria de novo as contas e os dados de demonstração.',
      onOk: () => { TS.DB.reset(); TS.DB.sair(); toast('Demonstração recriada. Entre de novo.'); K.telaLogin(); } });
    return { titulo: 'Painel geral<small>Visão consolidada do uso da plataforma</small>' };
  };
})();
