/* t13_inicio.js — T13 Início do professor: números da turma e alunos que precisam de atenção. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T13 Início ----------
  PAGINAS.inicio = (c) => {
    const al = alunosVisiveis().map(linhaAluno);
    const sete = new Date(Date.now() - 7 * 864e5);
    const ss = TS.DB.sessoesDe(al.map((x) => x.id));
    const ativos = new Set(ss.filter((s) => new Date(s.fim) >= sete).map((s) => s.alunoId)).size;
    const dif = al.filter((x) => x.st.cod === 'dificuldade');
    const faseMedia = al.length ? al.reduce((s, x) => s + x.faseIdx, 0) / al.length : 0;
    const fm = TS.C.FASES[Math.round(faseMedia)];
    const atencao = al.filter((x) => ['dificuldade', 'atencao'].includes(x.st.cod)).sort((a, b) => a.stOrd - b.stOrd).slice(0, 7);
    const cont = (k) => al.filter((x) => x.st.cod === k).length;
    const ativ = TS.DB.atividadesMaisErradas(ss.filter((s) => new Date(s.fim) >= new Date(Date.now() - 30 * 864e5))).slice(0, 5);
    c.innerHTML = `
      <div class="grid g4">
        ${kpi('users', '#1E88D0', al.length, 'Total de alunos', `${turmasVisiveis().length} turma(s)`)}
        ${kpi('ativo', '#2E9A3E', ativos, 'Ativos na semana', al.length ? `${Math.round((ativos / al.length) * 100)}% da turma` : '')}
        ${kpi('alerta', '#D23B57', dif.length, 'Com dificuldade', 'precisam de intervenção', dif.length ? 'destaque' : '')}
        ${kpi('trilha', '#7A5AF0', fm ? `${fm.mundo}-${fm.fase}` : '—', 'Fase média da turma', fm ? esc(TS.C.MUNDOS[fm.mundo - 1].nome) : '')}
      </div>
      <div class="grid g-2-1">
        <div class="card"><div class="card-head"><div><h3>Precisam de atenção</h3><p class="card-sub" style="margin:0">Alunos com muitos erros ou parados na mesma fase</p></div><button class="btn btn-ghost btn-sm" data-ir="alunos">Ver todos</button></div>
          ${atencao.length ? `<div class="lista-atencao">${atencao.map((x) => `<div class="it" data-aluno="${x.id}">${avatar(x.nome)}<div class="info"><b>${esc(x.nome)}</b><span>${esc(x.turma)} · Fase ${esc(nomeFase(x.fase))} · ${esc(x.st.motivo)}</span></div>${badge(x.st.cod)}</div>`).join('')}</div>`
            : vazio('Tudo em dia!', 'Nenhum aluno precisa de atenção especial agora.')}
        </div>
        <div class="card"><h3>Situação da turma</h3><p class="card-sub">Status atual dos alunos</p>
          ${G.rosca([{ rot: 'Em dia', v: cont('ok'), cor: ST.ok.cor }, { rot: 'Atenção', v: cont('atencao'), cor: ST.atencao.cor }, { rot: 'Com dificuldade', v: cont('dificuldade'), cor: ST.dificuldade.cor }, { rot: 'Ainda não jogou', v: cont('novo'), cor: ST.novo.cor }], { rotCentro: 'alunos' })}
        </div>
      </div>
      ${(() => {
        // Atividades criadas pelo professor: quantas estão publicadas e quantos alunos ainda não fizeram
        const ats = K.atividadesVisiveis().filter((x) => x.status === 'publicada');
        if (!ats.length) return `<div class="card dica-ativ"><img src="${TS.GALACTICO.img.bip_disco_rosa}" alt=""><div><h3>Crie uma atividade para a turma</h3><p>Use as figuras do jogo para montar atividades de sílabas, rimas, sons e letras. Os resultados aparecem aqui.</p></div><button class="btn btn-primary" data-ir="criarAtividade">${I('mais')} Criar atividade</button></div>`;
        return `<div class="card"><div class="card-head"><div><h3>Atividades da professora</h3><p class="card-sub" style="margin:0">Quantos alunos já fizeram cada atividade publicada</p></div><button class="btn btn-ghost btn-sm" data-ir="atividades">${I('tarefa')} Ver todas</button></div>
          ${G.barrasH(ats.slice(0, 5).map((x) => { const n = K.numerosAtividade(x); return { rot: x.titulo, sub: `${n.fizeram} de ${n.total} aluno(s)${n.acc != null ? ' · acerto ' + U.pct(n.acc) : ''}`, v: n.total ? n.fizeram / n.total : 0, cor: '#D63F86' }; }), { w: 900, pl: 260, max: 1 })}</div>`;
      })()}
      <div class="card"><div class="card-head"><div><h3>Atividades com maior índice de erro</h3><p class="card-sub" style="margin:0">Últimos 30 dias · use para planejar a intervenção pedagógica</p></div><button class="btn btn-ghost btn-sm" data-ir="relatorios">${I('chart')} Abrir relatório</button></div>
        ${ativ.length ? G.barrasH(ativ.map((a) => { const o = K.origem(a.faseId); return { rot: o.rot.replace(' · ', ' '), sub: o.hab ? TS.C.HAB[o.hab].nome + (o.custom ? ' · atividade da professora' : '') : '', v: a.taxaErro, cor: o.cor }; }), { w: 900, pl: 260, max: 1 }) : vazio('Sem dados ainda', 'Os alunos ainda não jogaram nos últimos 30 dias.')}
      </div>`;
    $$('[data-aluno]', c).forEach((e) => (e.onclick = () => ir('aluno', e.dataset.aluno)));
    $$('[data-ir]', c).forEach((e) => (e.onclick = () => ir(e.dataset.ir)));
    return { titulo: `Olá, ${esc(state.user.nome.split(' ')[0])}!<small>Resumo de ${state.turma === 'todas' ? 'todas as suas turmas' : esc(nomeTurma(state.turma))}</small>` };
  };
})();
