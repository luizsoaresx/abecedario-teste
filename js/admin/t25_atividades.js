/* t25_atividades.js — T25 Atividades (área do professor): lista das atividades criadas para as turmas,
   com quantos alunos já fizeram, o acerto médio e as ações: ver como o aluno, resultados, editar, duplicar e excluir. */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit; // ferramentas criadas em admin_base.js
  const { I, U, esc, $, $$, state, toast, confirmar, tabela, vazio, nomeTurma, PAGINAS, ir, atividadesVisiveis, podeEditar } = K;

  // Números de uma atividade: quantos alunos das turmas dela já fizeram, acerto médio e tentativas
  function numeros(at) {
    const alunos = at.turmas.flatMap((t) => TS.DB.users.alunosDaTurma(t));
    const ids = new Set(alunos.map((a) => a.id));
    const ss = TS.DB.atividades.sessoes(at.id).filter((s) => ids.has(s.alunoId));
    const ok = ss.reduce((s, x) => s + x.acertos, 0), tot = ss.reduce((s, x) => s + x.acertos + x.erros, 0);
    return { alunos, total: alunos.length, fizeram: new Set(ss.map((s) => s.alunoId)).size, acc: tot ? ok / tot : null, ss };
  }

  // Imagem (para HTML) de uma textura do jogo: 'fig_pato', 'svg_tambor'...
  function imgDe(chave) {
    if (chave.startsWith('svg_')) { const k = chave.slice(4); return TS.Art.uri(TS.Art.FIGURAS[k] || TS.Art.ICONES[k]); }
    return TS.ASSETS.img[chave];
  }

  const chipStatus = (at) => (at.status === 'publicada' ? `<span class="st ok">${I('check')}Publicada</span>` : `<span class="st novo">${I('editar')}Rascunho</span>`);
  const barra = (v, cor = 'var(--brand)') => `<span class="barra-mini"><i style="width:${Math.round(v * 100)}%;background:${cor}"></i></span>`;

  // Abre a atividade no jogo, do jeito que o aluno vê (nada é salvo)
  function verComoAluno(at, aoVoltar) {
    const v = TS.ATV.validar(at, false);
    if (!v.ok) return toast('Complete as rodadas antes de ver como o aluno.', 'erro');
    TS.App.abrirPrevia(JSON.parse(JSON.stringify(at)), aoVoltar || (() => ir(state.pagina, state.param)));
  }

  function remover(at, depois) {
    const n = TS.DB.atividades.sessoes(at.id).length;
    confirmar({
      titulo: 'Excluir atividade',
      texto: `Excluir <b>${esc(at.titulo || 'Atividade sem nome')}</b>?${n ? ` Os ${n} resultado(s) dos alunos nesta atividade também serão apagados.` : ''} Isso não pode ser desfeito.`,
      botao: 'Excluir', onOk: async () => { try { await TS.DB.atividades.remove(at.id); toast('Atividade excluída.'); depois(); } catch (e) { toast(e.message, 'erro'); } },
    });
  }

  async function duplicar(at, depois) {
    const copia = JSON.parse(JSON.stringify(at));
    delete copia.id; delete copia.publicadaEm;
    copia.titulo = (at.titulo || 'Atividade') + ' (cópia)';
    copia.status = 'rascunho'; copia.professorId = state.user.id;
    try { await TS.DB.atividades.create(copia); toast('Cópia criada como rascunho.'); depois(); } catch (e) { toast(e.message, 'erro'); }
  }

  // ---------- T25 Lista de atividades ----------
  PAGINAS.atividades = (c) => {
    const todas = atividadesVisiveis();
    c.innerHTML = `
      <div class="card dica-ativ">
        <img src="${TS.GALACTICO.img.bip_disco_rosa}" alt="">
        <div><h3>Crie atividades com as figuras do jogo</h3>
          <p>Em 3 passos: escolha o <b>tipo</b> (contar sílabas, rimas, primeira letra...), escolha as <b>figuras</b> e <b>publique</b> para a turma.
          O aluno encontra a atividade no botão <b>“Atividades da professora”</b> e as respostas entram no seu painel.</p></div>
        <button class="btn btn-primary" data-novo>${I('mais')} Criar atividade</button>
      </div>
      <div class="card"><div class="toolbar">
        <label class="busca">${I('busca')}<input placeholder="Buscar atividade" data-busca aria-label="Buscar atividade"></label>
        <select class="sel" data-fst aria-label="Filtrar por situação"><option value="">Todas</option><option value="publicada">Publicadas</option><option value="rascunho">Rascunhos</option></select>
        <span class="sp"></span></div><div data-tab></div></div>`;
    const busca = $('[data-busca]', c), fst = $('[data-fst]', c);
    const cache = {};
    const num = (at) => (cache[at.id] = cache[at.id] || numeros(at));
    const tb = tabela($('[data-tab]', c), {
      ordem: { k: 'atualizado', dir: -1 },
      linhas: () => {
        const q = U.semAcento(busca.value);
        return atividadesVisiveis().filter((a) => (!q || U.semAcento(a.titulo).includes(q)) && (!fst.value || a.status === fst.value));
      },
      cols: [
        { k: 'titulo', rot: 'Atividade', render: (a) => `<div class="nome-cel" style="min-width:230px"><img class="mini-fig" src="${imgDe(TS.ATV.figuraDe(a))}" alt=""><div><b>${esc(a.titulo || 'Atividade sem nome')}</b><small>${esc(TS.ATV.MODELOS[a.modelo].nome)} · ${a.rodadas.length} rodada(s)</small></div></div>` },
        { k: 'turmas', rot: 'Turmas', valor: (a) => a.turmas.map(nomeTurma).join(), render: (a) => (a.turmas.length ? a.turmas.map((t) => `<span class="chip">${esc(nomeTurma(t))}</span>`).join(' ') : '<span style="color:var(--ink-3)">—</span>') },
        { k: 'feita', rot: 'Já fizeram', num: true, valor: (a) => (num(a).total ? num(a).fizeram / num(a).total : -1), render: (a) => (a.status !== 'publicada' ? '—' : `${num(a).fizeram} de ${num(a).total} ${barra(num(a).total ? num(a).fizeram / num(a).total : 0)}`) },
        { k: 'acc', rot: 'Acerto médio', num: true, valor: (a) => num(a).acc ?? -1, render: (a) => (num(a).acc == null ? '—' : `<b>${U.pct(num(a).acc)}</b>`) },
        { k: 'status', rot: 'Situação', render: chipStatus },
        { k: 'atualizado', rot: 'Atualizada', valor: (a) => a.atualizadoEm || '', render: (a) => esc(U.relativo(a.atualizadoEm)) },
        { k: 'acoes', rot: '', ord: false, render: (a) => `<div class="acoes">
          <button class="btn-icon" title="Ver como o aluno" data-prev="${a.id}">${I('play')}</button>
          <button class="btn-icon" title="Resultados" data-res="${a.id}">${I('chart')}</button>
          ${podeEditar(a) ? `<button class="btn-icon" title="Editar" data-ed="${a.id}">${I('editar')}</button>` : ''}
          <button class="btn-icon" title="Duplicar" data-dup="${a.id}">${I('copiar')}</button>
          ${podeEditar(a) ? `<button class="btn-icon perigo" title="Excluir" data-rm="${a.id}">${I('lixo')}</button>` : ''}</div>` },
      ],
      onLinha: (id) => ir('resultadoAtividade', id),
      vazio: vazio('Nenhuma atividade ainda', 'Crie a primeira atividade para a sua turma: leva menos de 2 minutos.', `<button class="btn btn-primary" data-novo2>${I('mais')} Criar atividade</button>`),
      aposRender: (el) => {
        const pega = (id) => TS.DB.atividades.get(id);
        $$('[data-prev]', el).forEach((b) => (b.onclick = () => verComoAluno(pega(b.dataset.prev), () => ir('atividades'))));
        $$('[data-res]', el).forEach((b) => (b.onclick = () => ir('resultadoAtividade', b.dataset.res)));
        $$('[data-ed]', el).forEach((b) => (b.onclick = () => ir('criarAtividade', { id: b.dataset.ed })));
        $$('[data-dup]', el).forEach((b) => (b.onclick = () => duplicar(pega(b.dataset.dup), () => ir('atividades'))));
        $$('[data-rm]', el).forEach((b) => (b.onclick = () => remover(pega(b.dataset.rm), () => ir('atividades'))));
        const n2 = $('[data-novo2]', el); if (n2) n2.onclick = () => ir('criarAtividade');
        if (busca.value || fst.value) { const v = $('.vazio h4', el); if (v) { v.textContent = 'Nenhuma atividade encontrada'; $('.vazio p', el).textContent = 'Tente outro nome ou limpe os filtros.'; } }
      },
    });
    busca.oninput = tb.render; fst.onchange = tb.render;
    $('[data-novo]', c).onclick = () => ir('criarAtividade');
    const pub = todas.filter((a) => a.status === 'publicada').length;
    return { titulo: `Atividades<small>${pub} publicada(s) · ${todas.length - pub} rascunho(s) · ${state.turma === 'todas' ? 'todas as turmas' : esc(nomeTurma(state.turma))}</small>` };
  };

  // Disponível para as outras telas (construtor, resultados, painel)
  Object.assign(K, { numerosAtividade: numeros, imgDe, verComoAluno, removerAtividade: remover, chipStatusAtividade: chipStatus });
})();
