/* t27_resultado_atividade.js — T27 Resultados de uma atividade criada pelo professor:
   quantos alunos fizeram, acerto médio, tabela por aluno e os itens com mais erros. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit;
  const { I, G, U, esc, $, $$, state, vazio, nomeTurma, avatar, PAGINAS, ir, kpi, minutos, podeEditar } = K;

  PAGINAS.resultadoAtividade = (c, id) => {
    const at = TS.DB.atividades.get(id);
    if (!at) {
      c.innerHTML = `<div class="card">${vazio('Atividade não encontrada', 'Ela pode ter sido excluída.', `<button class="btn btn-primary" data-volta>${I('voltar')} Voltar às atividades</button>`)}</div>`;
      $('[data-volta]', c).onclick = () => ir('atividades');
      return { titulo: 'Resultados' };
    }
    const n = K.numerosAtividade(at);
    const ss = n.ss;
    const tempo = ss.length ? ss.reduce((s, x) => s + x.duracaoSeg, 0) / ss.length : 0;
    const itens = TS.DB.itensMaisErrados(ss, 8);
    const hab = TS.ATV.habDe(at);

    // Uma linha por aluno das turmas que receberam a atividade
    const linhas = n.alunos.map((a) => {
      const p = TS.DB.progressoAtividade(a.id, at.id);
      return { id: a.id, nome: a.nome, turma: nomeTurma(a.turmaId), p, acc: p ? p.melhorAcc : -1, tent: p ? p.tentativas : 0, ult: p ? p.ultimaVez : '' };
    }).sort((x, y) => (x.p ? 1 : 0) - (y.p ? 1 : 0) || x.acc - y.acc || x.nome.localeCompare(y.nome));
    const estrelas = (k) => '★'.repeat(k) + '<span style="color:#d5dae3">' + '★'.repeat(3 - k) + '</span>';

    c.innerHTML = `
      <div class="card cab-ativ"><img class="mini-fig grande" src="${K.imgDe(TS.ATV.figuraDe(at))}" alt="">
        <div class="info"><h2>${esc(at.titulo)}</h2>
          <div class="meta"><span>${I('tarefa')} ${esc(TS.ATV.MODELOS[at.modelo].nome)}</span><span>${I('alvo')} ${esc(TS.C.HAB[hab].nome)}</span>
          <span>${I('escola')} ${at.turmas.map((t) => esc(nomeTurma(t))).join(', ') || '—'}</span><span>${at.rodadas.length} rodada(s)</span>${K.chipStatusAtividade(at)}</div></div>
        <div class="acoes-cab">
          <button class="btn btn-ghost" data-volta>${I('voltar')} Voltar</button>
          <button class="btn btn-ghost" data-prev>${I('play')} Ver como o aluno</button>
          ${podeEditar(at) ? `<button class="btn btn-primary" data-ed>${I('editar')} Editar</button>` : ''}</div></div>
      <div class="grid g4">
        ${kpi('users', '#1E88D0', `${n.fizeram}<small> / ${n.total}</small>`, 'Alunos que já fizeram', n.total ? U.pct(n.fizeram / n.total) + ' da turma' : '')}
        ${kpi('alvo', '#2E9A3E', n.acc == null ? '—' : U.pct(n.acc), 'Acerto médio', 'considerando todas as tentativas')}
        ${kpi('ativo', '#E8731A', ss.length, 'Tentativas', n.fizeram ? (ss.length / n.fizeram).toFixed(1).replace('.', ',') + ' por aluno' : '')}
        ${kpi('relogio', '#7A5AF0', ss.length ? `${Math.max(1, minutos(tempo))} min` : '—', 'Tempo médio', 'por tentativa')}
      </div>
        <div class="card"><h3>Onde os alunos mais erraram</h3><p class="card-sub">Itens desta atividade com mais erros</p>
          ${itens.length ? G.barrasH(itens.map((i) => ({ rot: i.rotulo, sub: `${i.erros} erro(s) em ${i.tot}${i.ouvidos && i.ouvidos.filter(Boolean).length ? ' · ouvimos: ' + i.ouvidos.filter(Boolean).join(', ') : ''}`, v: i.taxaErro, cor: TS.C.HAB[hab].cor })), { w: 900, pl: 280, max: 1 })
            : vazio(ss.length ? 'Nenhum erro!' : 'Sem respostas ainda', ss.length ? 'Os alunos acertaram todos os itens.' : 'Os resultados aparecem aqui assim que os alunos jogarem.')}</div>
        <div class="card"><h3>Alunos</h3><p class="card-sub">Quem ainda não fez aparece primeiro. Toque no aluno para ver o desempenho completo.</p>
          ${linhas.length ? `<div class="tabela-wrap"><table class="t"><thead><tr><th>Aluno</th><th>Turma</th><th>Situação</th><th class="num">Melhor acerto</th><th class="num">Tentativas</th><th>Última vez</th></tr></thead><tbody>
            ${linhas.map((l) => `<tr class="clicavel" data-aluno="${l.id}"><td><div class="nome-cel">${avatar(l.nome)}<div>${esc(l.nome)}</div></div></td><td>${esc(l.turma)}</td>
              <td>${l.p ? `<span class="estrelas-txt">${estrelas(l.p.estrelas)}</span>` : '<span class="st novo">Ainda não fez</span>'}</td>
              <td class="num">${l.p ? `<b>${U.pct(l.acc)}</b>` : '—'}</td><td class="num">${l.tent || '—'}</td><td>${l.p ? esc(U.relativo(l.ult)) : '—'}</td></tr>`).join('')}
            </tbody></table></div>` : vazio('Nenhum aluno nas turmas', 'Escolha uma turma com alunos na edição da atividade.')}</div>`;
    $('[data-volta]', c).onclick = () => ir('atividades');
    $('[data-prev]', c).onclick = () => K.verComoAluno(at, () => ir('resultadoAtividade', at.id));
    const ed = $('[data-ed]', c); if (ed) ed.onclick = () => ir('criarAtividade', { id: at.id });
    $$('[data-aluno]', c).forEach((tr) => (tr.onclick = () => ir('aluno', tr.dataset.aluno)));
    return { titulo: `Resultados da atividade<small>${esc(at.titulo)}</small>` };
  };
})();
