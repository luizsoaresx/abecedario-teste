/* t19_aluno.js — T19 Desempenho individual de um aluno. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T19 Desempenho individual ----------
  PAGINAS.aluno = (c, id) => {
    const a = TS.DB.users.get(id);
    if (!a) { c.innerHTML = `<div class="card">${vazio('Aluno não encontrado', 'Ele pode ter sido removido.')}</div>`; return { titulo: 'Aluno' }; }
    const l = linhaAluno(a);
    const ss = TS.DB.raw.sessoes.filter((s) => s.alunoId === id).sort((x, y) => x.fim.localeCompare(y.fim));
    const ph = TS.DB.acertoPorHabilidade(ss);
    const ult = ss.slice(-20);
    const itens = TS.DB.itensMaisErrados(ss, 8);
    const habs = Object.entries(ph).filter(([, v]) => v.tot).map(([k, v]) => ({ k, taxa: v.ok / v.tot })).sort((x, y) => x.taxa - y.taxa);
    const pior = habs[0];
    const totT = ss.reduce((s, x) => s + x.duracaoSeg, 0);
    const piorItens = pior ? itens.filter((i) => i.hab === pior.k).slice(0, 3) : [];
    c.innerHTML = `
      <div class="card"><div class="perfil-h">${avatar(a.nome)}<div style="flex:1"><h2>${esc(a.nome)}</h2>
        <div class="meta"><span>${I('escola')} ${esc(l.turma)}</span><span>${I('trilha')} Fase atual: <b>${esc(nomeFase(l.fase))}</b></span><span>${I('relogio')} Último acesso: <b>${esc(U.relativo(l.ultimo))}</b></span><span>${I('user')} Login: <code>${esc(a.login)}</code></span></div></div>
        ${badge(l.st.cod, l.st.motivo)}
        <div class="no-print" style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" data-cred>${I('chave')} Dados de acesso</button><button class="btn btn-ghost btn-sm" data-ed>${I('editar')} Editar</button><button class="btn btn-ghost btn-sm" data-pdf>${I('imprimir')} PDF</button></div></div>
        ${l.st.cod !== 'ok' && l.st.cod !== 'novo' ? `<div class="alerta ${l.st.cod === 'dificuldade' ? 'erro' : 'info'}" style="margin:16px 0 0">${I('exclama')}<div>${esc(l.st.motivo)}.</div></div>` : ''}
      </div>
      ${ss.length ? `
      <div class="grid g4">${kpi('ativo', '#1E88D0', ss.length, 'Sessões jogadas', '')}${kpi('check', '#2E9A3E', U.pct(ss.reduce((s, x) => s + x.acertos, 0) / Math.max(1, ss.reduce((s, x) => s + x.acertos + x.erros, 0))), 'Acerto geral', '')}
        ${kpi('estrela', '#ffc93c', TS.DB.estrelasTotal(id), 'Estrelas', `${Object.values(TS.DB.progresso(id).fases).filter((x) => x.concluida).length} fase(s) concluída(s)`)}${kpi('relogio', '#7A5AF0', minutos(totT) + ' min', 'Tempo jogado', '')}</div>
      ${pior ? `<div class="insight">${I('alvo')}<div>Maior dificuldade em <b>${TS.C.HAB[pior.k].nome}</b> (${U.pct(pior.taxa)} de acerto).${piorItens.length ? ` Itens que mais erra: <b>${piorItens.map((i) => esc(i.rotulo)).join('</b>, <b>')}</b>.` : ''}${habs.length > 1 ? ` Vai melhor em <b>${TS.C.HAB[habs[habs.length - 1].k].nome}</b> (${U.pct(habs[habs.length - 1].taxa)}).` : ''}</div></div>` : ''}
      <div class="grid g-2-1">
        <div class="card"><h3>Evolução de acertos e erros</h3><p class="card-sub">Últimas ${ult.length} sessões</p>
          ${G.linhas([{ nome: 'Acertos', cor: '#2E9A3E', area: true, pontos: ult.map((s) => ({ y: s.acertos })) }, { nome: 'Erros', cor: '#E8731A', pontos: ult.map((s) => ({ y: s.erros })) }], ult.map((s) => new Date(s.fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), { w: 700, h: 260 })}
          <div class="legenda" style="margin-top:6px"><span><i style="background:#2E9A3E"></i>Acertos</span><span><i style="background:#E8731A"></i>Erros</span></div></div>
        <div class="card"><h3>Por habilidade</h3><p class="card-sub">Onde vai bem e onde tem dificuldade</p>
          ${G.barrasH(Object.entries(TS.C.HAB).map(([k, h]) => ({ rot: h.nome, sub: ph[k].tot ? `${ph[k].tot} itens` : 'ainda não jogou', v: ph[k].tot ? ph[k].ok / ph[k].tot : 0, vazio: !ph[k].tot, cor: h.cor })), { w: 420, pl: 120, max: 1 })}</div>
      </div>
      <div class="grid g2">
        <div class="card"><h3>Detalhe por atividade</h3><p class="card-sub">Itens que o aluno mais erra</p>
          ${itens.length ? `<div class="tabela-wrap"><table class="t"><thead><tr><th>Item</th><th>Habilidade</th><th class="num">Erros</th><th class="num">% erro</th></tr></thead><tbody>${itens.map((i) => `<tr><td><b>${esc(i.rotulo)}</b></td><td><span class="chip" style="background:${TS.C.HAB[i.hab].cor}22">${TS.C.HAB[i.hab].nome}</span></td><td class="num">${i.erros}/${i.tot}</td><td class="num">${U.pct(i.taxaErro)}</td></tr>`).join('')}</tbody></table></div>` : '<p>Nenhum erro registrado.</p>'}</div>
        ${(() => {
          // Atividades que a professora mandou para a turma deste aluno
          const ats = TS.DB.atividades.daTurma(a.turmaId);
          if (!ats.length) return '';
          return `<div class="card"><h3>Atividades da professora</h3><p class="card-sub">${ats.filter((x) => TS.DB.progressoAtividade(id, x.id)).length} de ${ats.length} feitas</p>
            <div class="tabela-wrap"><table class="t"><thead><tr><th>Atividade</th><th>Situação</th><th class="num">Melhor acerto</th><th class="num">Tentativas</th></tr></thead><tbody>
            ${ats.map((x) => { const p = TS.DB.progressoAtividade(id, x.id); return `<tr class="clicavel" data-ativ="${x.id}"><td><b>${esc(x.titulo)}</b><br><small style="color:var(--ink-3)">${esc(TS.ATV.MODELOS[x.modelo].nome)}</small></td>
              <td>${p ? '★'.repeat(p.estrelas) + '<span style="color:#d5dae3">' + '★'.repeat(3 - p.estrelas) + '</span>' : '<span class="st novo">Ainda não fez</span>'}</td><td class="num">${p ? U.pct(p.melhorAcc) : '—'}</td><td class="num">${p ? p.tentativas : '—'}</td></tr>`; }).join('')}
            </tbody></table></div></div>`;
        })()}
        <div class="card"><h3>Histórico de sessões</h3><p class="card-sub">${ss.length} sessões no total</p><div data-hist></div></div>
      </div>` : `<div class="card">${vazio('Este aluno ainda não jogou', 'Quando ele jogar a primeira fase, o desempenho aparece aqui. Entregue os dados de acesso à família.')}</div>`}`;
    if (ss.length) tabela($('[data-hist]', c), {
      ordem: { k: 'fim', dir: -1 }, linhas: () => ss.slice(-30),
      cols: [{ k: 'fim', rot: 'Data', render: (s) => U.fmtDataHora(s.fim) }, { k: 'faseId', rot: 'Fase / atividade', valor: (s) => (s.faseId ? TS.C.fase(s.faseId).idx : 99), render: (s) => esc(K.origem(s.faseId || s.atividadeId).curto) },
        { k: 'acertos', rot: 'Acertos', num: true }, { k: 'erros', rot: 'Erros', num: true }, { k: 'estrelas', rot: '★', num: true, render: (s) => '★'.repeat(s.estrelas) || '—' }, { k: 'duracaoSeg', rot: 'Tempo', num: true, render: (s) => `${minutos(s.duracaoSeg) || '<1'} min` }],
      vazio: '',
    });
    $$('[data-ativ]', c).forEach((tr) => (tr.onclick = () => ir('resultadoAtividade', tr.dataset.ativ)));
    $('[data-cred]', c).onclick = () => K.credenciais(a, false);
    $('[data-ed]', c).onclick = () => K.formAluno(a, () => ir('aluno', id));
    $('[data-pdf]', c).onclick = () => window.print();
    return { titulo: `Desempenho individual` };
  };
})();
