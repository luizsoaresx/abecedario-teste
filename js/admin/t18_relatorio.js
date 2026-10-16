/* t18_relatorio.js — T18 Relatório da turma: filtros, gráficos, tabela dinâmica e planilha. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T18 Relatório da turma ----------
  PAGINAS.relatorios = (c) => {
    const f = PAGINAS.relatorios.filtros = PAGINAS.relatorios.filtros || { periodo: '30', fase: '', hab: '', agrupar: 'aluno', visao: 'hab' };
    c.innerHTML = `<div class="card no-print" style="padding:16px 20px"><div class="toolbar" style="margin:0">
        <select class="sel" data-f="periodo" aria-label="Período"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="0">Todo o período</option></select>
        <select class="sel" data-f="hab" aria-label="Habilidade"><option value="">Todas as habilidades</option>${Object.entries(TS.C.HAB).map(([k, h]) => `<option value="${k}">${h.nome}</option>`).join('')}</select>
        <select class="sel" data-f="fase" aria-label="Fase"><option value="">Todas as fases e atividades</option><optgroup label="Fases do mapa">${TS.C.FASES.map((x) => `<option value="${x.id}">${esc(nomeFase(x))}</option>`).join('')}</optgroup>${K.atividadesVisiveis().length ? `<optgroup label="Atividades da professora">${K.atividadesVisiveis().map((x) => `<option value="${x.id}">★ ${esc(x.titulo)}</option>`).join('')}</optgroup>` : ''}</select>
        <span class="sp"></span>
        <button class="btn btn-ghost" data-csv>${I('baixar')} Planilha (CSV)</button><button class="btn btn-ghost" data-pdf>${I('imprimir')} PDF</button></div></div>
      <div data-rel></div>`;
    $$('[data-f]', c).forEach((s) => { s.value = f[s.dataset.f]; s.onchange = () => { f[s.dataset.f] = s.value; desenhar(); }; });
    const filtrar = () => {
      const desde = +f.periodo ? new Date(Date.now() - +f.periodo * 864e5) : null;
      return TS.DB.sessoesDe(alunosVisiveis().map((a) => a.id), desde).filter((s) => (!f.fase || (s.faseId || s.atividadeId) === f.fase) && (!f.hab || s.hab === f.hab));
    };
    let pivot = [];
    function desenhar() {
      const ss = filtrar(); const el = $('[data-rel]', c);
      if (!ss.length) { el.innerHTML = `<div class="card">${vazio('Sem dados para esses filtros', 'Tente ampliar o período ou limpar os filtros de fase e habilidade.')}</div>`; pivot = []; return; }
      const ph = TS.DB.acertoPorHabilidade(ss);
      const porFase = {}; ss.forEach((s) => { const k = s.faseId || s.atividadeId; const x = (porFase[k] = porFase[k] || { ok: 0, tot: 0 }); x.ok += s.acertos; x.tot += s.acertos + s.erros; });
      const barrasHab = Object.entries(TS.C.HAB).map(([k, h]) => ({ rot: h.nome, v: ph[k].tot ? ph[k].ok / ph[k].tot : 0, vazio: !ph[k].tot, cor: h.cor, sub: `${ph[k].tot} itens` }));
      const barrasFase = TS.C.FASES.filter((x) => porFase[x.id]).map((x) => ({ rot: `${x.mundo}-${x.fase}`, v: porFase[x.id].ok / porFase[x.id].tot, cor: TS.C.HAB[x.hab].cor }))
        .concat(Object.keys(porFase).filter((k) => !TS.C.fase(k)).map((k, i) => ({ rot: `★${i + 1}`, v: porFase[k].ok / porFase[k].tot, cor: K.origem(k).cor }))); // ★ = atividades da professora
      const itens = TS.DB.itensMaisErrados(ss, 8);
      const totItens = ss.reduce((s, x) => s + x.acertos + x.erros, 0), totOk = ss.reduce((s, x) => s + x.acertos, 0);
      // tabela dinâmica
      const chave = { aluno: (s) => s.alunoId, turma: (s) => (TS.DB.users.get(s.alunoId) || {}).turmaId, fase: (s) => s.faseId || s.atividadeId, habilidade: (s) => s.hab }[f.agrupar];
      const nome = { aluno: (k) => (TS.DB.users.get(k) || {}).nome, turma: (k) => nomeTurma(k), fase: (k) => K.origem(k).rot, habilidade: (k) => TS.C.HAB[k].nome }[f.agrupar];
      const g = {}; ss.forEach((s) => { const k = chave(s); const x = (g[k] = g[k] || { id: k, sess: 0, ok: 0, err: 0, seg: 0, alunos: new Set() }); x.sess++; x.ok += s.acertos; x.err += s.erros; x.seg += s.duracaoSeg; x.alunos.add(s.alunoId); });
      pivot = Object.values(g).map((x) => ({ ...x, nome: nome(x.id), taxa: x.ok / (x.ok + x.err), nAlunos: x.alunos.size }));
      el.innerHTML = `
        <div class="grid g4">${kpi('ativo', '#1E88D0', ss.length, 'Sessões de jogo', `${new Set(ss.map((s) => s.alunoId)).size} aluno(s)`)}${kpi('check', '#2E9A3E', U.pct(totOk / totItens), 'Taxa de acerto', `${totOk} de ${totItens} itens`)}
          ${kpi('alerta', '#D23B57', totItens - totOk, 'Erros registrados', '')}${kpi('relogio', '#7A5AF0', minutos(ss.reduce((s, x) => s + x.duracaoSeg, 0)) + ' min', 'Tempo jogado', '')}</div>
        <div class="grid g2">
          <div class="card"><div class="card-head"><div><h3>Taxa de acerto por ${f.visao === 'hab' ? 'habilidade' : 'fase'}</h3><p class="card-sub" style="margin:0">Linha tracejada: meta de 70%</p></div>
            <div class="alternador no-print"><button data-v="hab" class="${f.visao === 'hab' ? 'on' : ''}">Habilidade</button><button data-v="fase" class="${f.visao === 'fase' ? 'on' : ''}">Fase</button></div></div>
            ${G.barras(f.visao === 'hab' ? barrasHab : barrasFase, { pct: true, max: 1, meta: 0.7, w: 600, h: 260 })}</div>
          <div class="card"><h3>Itens com maior índice de erro</h3><p class="card-sub">Onde a turma mais erra — orienta a intervenção pedagógica</p>
            ${itens.length ? G.barrasH(itens.map((i) => ({ rot: i.rotulo, sub: `${i.erros} erro(s) em ${i.tot}${i.ouvidos && i.ouvidos.filter(Boolean).length ? ' (ouvimos: ' + i.ouvidos.filter(Boolean).join(', ') + ')' : ''} · ${K.origem(i.faseId).custom ? 'atividade da professora' : 'fase ' + K.origem(i.faseId).curto}`, v: i.taxaErro, cor: TS.C.HAB[i.hab].cor })), { w: 600, pl: 250, max: 1 }) : '<p>Nenhum erro no período.</p>'}</div>
        </div>
        <div class="card"><div class="card-head"><div><h3>Tabela dinâmica</h3><p class="card-sub" style="margin:0">Clique nos títulos das colunas para ordenar</p></div>
          <label style="display:flex;gap:8px;align-items:center;font-weight:700;color:var(--ink-2)" class="no-print">Agrupar por <select class="sel" data-agr><option value="aluno">Aluno</option><option value="turma">Turma</option><option value="fase">Fase</option><option value="habilidade">Habilidade</option></select></label></div>
          <div data-piv></div></div>`;
      $('[data-agr]', el).value = f.agrupar; $('[data-agr]', el).onchange = (e) => { f.agrupar = e.target.value; desenhar(); };
      $$('[data-v]', el).forEach((b) => (b.onclick = () => { f.visao = b.dataset.v; desenhar(); }));
      tabela($('[data-piv]', el), {
        ordem: { k: 'taxa', dir: 1 }, linhas: () => pivot,
        cols: [
          { k: 'nome', rot: { aluno: 'Aluno', turma: 'Turma', fase: 'Fase', habilidade: 'Habilidade' }[f.agrupar], render: (l) => (f.agrupar === 'aluno' ? `<div class="nome-cel">${avatar(l.nome || '?', 30)}<a data-aluno="${l.id}">${esc(l.nome)}</a></div>` : `<b>${esc(l.nome)}</b>`) },
          ...(f.agrupar === 'aluno' ? [] : [{ k: 'nAlunos', rot: 'Alunos', num: true }]),
          { k: 'sess', rot: 'Sessões', num: true }, { k: 'ok', rot: 'Acertos', num: true }, { k: 'err', rot: 'Erros', num: true },
          { k: 'taxa', rot: '% de acerto', num: true, render: (l) => `<div style="display:flex;gap:10px;align-items:center;justify-content:flex-end"><div class="barra-mini" style="width:90px"><i style="width:${l.taxa * 100}%;background:${l.taxa < 0.5 ? '#D23B57' : l.taxa < 0.7 ? '#e0a526' : '#2E9A3E'}"></i></div><b>${U.pct(l.taxa)}</b></div>` },
          { k: 'seg', rot: 'Tempo', num: true, render: (l) => `${minutos(l.seg)} min` },
        ],
        vazio: '', aposRender: (t) => $$('[data-aluno]', t).forEach((a) => (a.onclick = () => ir('aluno', a.dataset.aluno))),
      });
    }
    desenhar();
    $('[data-csv]', c).onclick = () => {
      const cab = ['Grupo', 'Alunos', 'Sessões', 'Acertos', 'Erros', '% acerto', 'Tempo (min)'];
      const linhas = pivot.map((l) => [l.nome, l.nAlunos, l.sess, l.ok, l.err, Math.round(l.taxa * 100) + '%', minutos(l.seg)]);
      baixarCSV(`relatorio-${f.agrupar}-${new Date().toISOString().slice(0, 10)}.csv`, [cab, ...linhas]);
    };
    $('[data-pdf]', c).onclick = () => window.print();
    return { titulo: `Relatório de desempenho<small>${state.turma === 'todas' ? 'Todas as turmas' : esc(nomeTurma(state.turma))}</small>` };
  };
  function baixarCSV(nome, linhas) {
    const csv = String.fromCharCode(0xFEFF) + linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); toast('Planilha gerada.');
  }
})();
