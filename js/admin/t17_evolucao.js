/* t17_evolucao.js — T17 Painel de evolução: em que fase cada aluno está. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, G, U, esc, root, $, $$, FIGS, ST, state, avatar, corNome, iniciais, badge, figSrc, nomeFase, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, nomeTurma, linhaAluno, PAGINAS, ir, kpi } = K;

  // ---------- T17 Painel de evolução ----------
  PAGINAS.evolucao = (c, modo) => {
    modo = modo || 'grade';
    const al = alunosVisiveis().map(linhaAluno).sort((a, b) => a.nome.localeCompare(b.nome));
    const parados = al.filter((l) => l.st.parado >= 7);
    c.innerHTML = `<div class="card"><div class="toolbar" style="margin-bottom:8px">
      <div class="alternador"><button data-m="grade" class="${modo === 'grade' ? 'on' : ''}">${I('grid')} Grade</button><button data-m="trilha" class="${modo === 'trilha' ? 'on' : ''}">${I('trilha')} Trilha</button></div>
      <span class="sp"></span>
      <div class="legenda"><span><i class="cel concluida">3★</i>Concluída (estrelas)</span><span><i class="cel andamento">▶</i>Em andamento</span><span><i class="cel dificuldade">!</i>Com dificuldade</span><span><i class="cel bloqueada">${I('cadeado')}</i>Bloqueada</span></div></div>
      ${parados.length ? `<div class="alerta erro">${I('relogio')}<div><b>${parados.length} aluno(s) parado(s) há muito tempo na mesma fase:</b> ${parados.map((p) => `<a data-aluno="${p.id}">${esc(p.nome.split(' ')[0])} (${p.st.parado} dias)</a>`).join(', ')}</div></div>` : ''}
      <div data-vis></div></div>`;
    const vis = $('[data-vis]', c);
    if (!al.length) vis.innerHTML = vazio('Nenhum aluno nesta turma', 'Cadastre alunos para acompanhar a evolução.');
    else if (modo === 'grade') {
      vis.innerHTML = `<div style="overflow-x:auto"><table class="evo"><thead><tr><th></th>${TS.C.MUNDOS.map((m) => `<th class="mundo" colspan="4" style="background:${m.cor}">${m.id}. ${esc(TS.C.HAB[m.hab].nome)}</th>`).join('')}</tr>
        <tr><th style="text-align:left">Aluno</th>${TS.C.FASES.map((f) => `<th title="${esc(f.nome)}">${f.mundo}-${f.fase}</th>`).join('')}</tr></thead>
        <tbody>${al.map((l) => `<tr><td class="aluno" data-aluno="${l.id}"><div class="nome-cel">${avatar(l.nome, 30)}<div><b>${esc(l.nome)}</b>${l.st.parado >= 7 ? ` <span class="st dificuldade" style="padding:1px 8px;font-size:11.5px">parado ${l.st.parado}d</span>` : ''}<small>${esc(l.turma)}</small></div></div></td>
          ${TS.C.FASES.map((f) => { const e = TS.DB.estadoFase(l.id, f.id); const ff = e.f;
            const tit = `${f.mundo}-${f.fase} ${f.nome}: ${{ concluida: 'concluída', andamento: 'em andamento', dificuldade: 'com dificuldade', bloqueada: 'bloqueada' }[e.cod]}${ff ? ` · ${ff.tentativas} tentativa(s) · melhor acerto ${U.pct(ff.melhorAcc)}` : ''}`;
            const s = { concluida: `${e.estrelas}★`, andamento: '▶', dificuldade: '!', bloqueada: '' }[e.cod];
            return `<td class="cel ${e.cod}" title="${esc(tit)}">${s}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    } else {
      // trilha com avatares
      const Wt = 1500, Ht = 330; const pos = TS.C.FASES.map((f, i) => ({ x: 50 + i * 74, y: 230 + Math.sin(i * 1.1) * 40 }));
      const porFase = {}; al.forEach((l) => (porFase[l.fase.id] = porFase[l.fase.id] || []).push(l));
      let s = `<svg viewBox="0 0 ${Wt} ${Ht}" width="${Wt}" height="${Ht}"><path d="M${pos.map((p) => `${p.x},${p.y}`).join(' L')}" fill="none" stroke="#f1e2c0" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
      TS.C.FASES.forEach((f, i) => {
        const p = pos[i]; const cor = TS.C.MUNDOS[f.mundo - 1].cor;
        s += `<circle cx="${p.x}" cy="${p.y}" r="20" fill="${cor}" stroke="#fff" stroke-width="4"/><text x="${p.x}" y="${p.y + 5}" text-anchor="middle" style="font:800 13px Nunito;fill:#fff">${f.mundo}-${f.fase}</text>`;
        (porFase[f.id] || []).forEach((l, j) => {
          const cy = p.y - 46 - j * 34; const bad = l.st.cod === 'dificuldade';
          s += `<g data-aluno="${l.id}" style="cursor:pointer"><title>${esc(l.nome)} — ${esc(l.st.rotulo)}</title><circle cx="${p.x}" cy="${cy}" r="15" fill="${corNome(l.nome)}" stroke="${bad ? '#D23B57' : '#fff'}" stroke-width="${bad ? 4 : 2.5}"/><text x="${p.x}" y="${cy + 4.5}" text-anchor="middle" style="font:800 11px Nunito;fill:#fff">${esc(iniciais(l.nome))}</text></g>`;
        });
      });
      TS.C.MUNDOS.forEach((m, i) => { s += `<text x="${pos[i * 4].x - 10}" y="${Ht - 12}" style="font:800 12px Nunito;fill:${m.cor}">${m.id}. ${esc(m.nome)}</text>`; });
      vis.innerHTML = `<div class="trilha">${s}</svg></div><p class="card-sub" style="margin-top:8px">Cada bolinha é um aluno, posicionado na fase em que está. Contorno vermelho = com dificuldade. Clique para ver o desempenho.</p>`;
    }
    $$('[data-aluno]', c).forEach((e) => e.addEventListener('click', () => ir('aluno', e.dataset.aluno)));
    $$('[data-m]', c).forEach((b) => (b.onclick = () => ir('evolucao', b.dataset.m)));
    return { titulo: `Painel de evolução<small>Em qual fase cada aluno está · ${state.turma === 'todas' ? 'todas as turmas' : esc(nomeTurma(state.turma))}</small>` };
  };
})();
