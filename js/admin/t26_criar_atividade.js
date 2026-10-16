/* t26_criar_atividade.js — T26 Criar / editar atividade (área do professor).
   Tudo numa página, em 3 passos: 1) tipo de atividade, 2) rodadas (com as figuras do jogo), 3) nome e turmas.
   Embaixo: "Ver como o aluno" (pré-visualização no jogo), "Salvar rascunho" e "Publicar". */
window.TS = window.TS || {};
(function () {
  const K = TS.AdminKit;
  const { I, esc, $, $$, state, toast, modal, confirmar, turmasVisiveis, figSrc, PAGINAS, ir } = K;
  const ATV = TS.ATV, W = TS.C.W;
  const MAX_RODADAS = 10;
  const SUGESTOES = ['Qual figura rima com ___?', 'Qual figura começa com o mesmo som que ___?', 'Qual figura começa com a sílaba ___?', 'Onde está o ___?'];

  // Lê e escreve um valor dentro da atividade a partir de um "caminho" como "2|opcoes|1"
  function caminho(at, txt) {
    const p = txt.split('|').map((x) => (/^\d+$/.test(x) ? Number(x) : x));
    let o = at.rodadas;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    return { obj: o, chave: p[p.length - 1] };
  }

  // param: { id } para editar, { rascunho } ao voltar da pré-visualização, ou nada para criar uma nova
  PAGINAS.criarAtividade = (c, param = {}) => {
    const original = param.id ? TS.DB.atividades.get(param.id) : null;
    const at = param.rascunho || (original ? JSON.parse(JSON.stringify(original)) : ATV.nova('silabas', state.user.id));
    if (!at.professorId) at.professorId = state.user.id;
    if (!at.id && !at.turmas.length && state.turma !== 'todas') at.turmas = [state.turma];
    let sujo = !!param.rascunho;   // há alterações não salvas?
    let mostrarErros = false;       // só mostramos os erros depois que o professor tenta publicar
    const M = () => ATV.MODELOS[at.modelo];

    c.innerHTML = `<div class="construtor">
      <div class="card passo"><div class="passo-h"><span class="num">1</span><div><h3>Tipo de atividade</h3><p class="card-sub">Escolha como a criança vai jogar. São os mesmos jogos das fases do mapa.</p></div></div>
        <div class="modelos" data-modelos></div><div data-criterio></div></div>
      <div class="card passo"><div class="passo-h"><span class="num">2</span><div><h3>Rodadas</h3><p class="card-sub" data-ajuda></p></div>
        <button class="btn btn-ghost btn-sm" data-sortear title="Preenche as rodadas vazias com um exemplo">${I('dado')} Preencher exemplo</button></div>
        <div class="rodadas" data-rodadas></div>
        <button class="btn btn-ghost add-rodada" data-add>${I('mais')} Adicionar rodada</button></div>
      <div class="card passo"><div class="passo-h"><span class="num">3</span><div><h3>Nome e turmas</h3><p class="card-sub">Quem vai receber a atividade.</p></div></div>
        <div class="form-grid">
          <div class="field full" data-campo-titulo><label for="atTitulo">Nome da atividade</label><input id="atTitulo" maxlength="60" placeholder="Ex.: Rimas dos animais" data-titulo-at><span class="hint">É o nome que o aluno vê no cartão (e o Bip lê em voz alta).</span></div>
          <div class="field full" data-campo-turmas><label>Turmas que vão receber</label><div class="checks" data-turmas></div></div>
          <div class="field"><label for="atHab">Habilidade trabalhada</label><select id="atHab" data-hab></select><span class="hint">Aparece no painel e nos relatórios.</span></div>
          <div class="field"><label for="atInstr">O que o Bip fala antes de começar (opcional)</label><input id="atInstr" maxlength="160" data-instr><span class="hint" data-instr-hint></span></div>
        </div></div>
      <div class="barra-acoes">
        <div class="erros" data-erros></div>
        <button class="btn btn-ghost" data-cancelar>Cancelar</button>
        <button class="btn btn-ghost" data-previa>${I('olho')} Ver como o aluno</button>
        <button class="btn btn-ghost" data-salvar>Salvar rascunho</button>
        <button class="btn btn-primary" data-publicar>${I('enviar')} Publicar</button>
      </div></div>`;

    // ---------- Passo 1: tipo e critério ----------
    function renderModelos() {
      $('[data-modelos]', c).innerHTML = ATV.ORDEM.map((k) => {
        const m = ATV.MODELOS[k];
        return `<button type="button" class="modelo ${at.modelo === k ? 'on' : ''}" data-modelo="${k}"><img src="${K.imgDe(m.icone)}" alt="" class="${['svg_alto', 'svg_joinha', 'svg_microfone'].includes(m.icone) ? 'ic-branco' : ''}"><b>${esc(m.nome)}</b><span>${esc(m.desc)}</span></button>`;
      }).join('');
      $$('[data-modelo]', c).forEach((b) => (b.onclick = () => trocarModelo(b.dataset.modelo)));
      const m = M();
      $('[data-criterio]', c).innerHTML = m.criterios ? `<div class="criterio"><b>${m.perguntaCriterio || 'O que a criança precisa perceber?'}</b><div class="alternador">${m.criterios.map((k) =>
        `<button type="button" class="${at.criterio === k ? 'on' : ''}" data-crit="${k}" title="${esc(ATV.CRITERIOS[k].desc)}">${esc(ATV.CRITERIOS[k].nome)}</button>`).join('')}</div></div>` : '';
      $$('[data-crit]', c).forEach((b) => (b.onclick = () => { at.criterio = b.dataset.crit; sujo = true; renderModelos(); renderRodadas(); renderDetalhes(); }));
      $('[data-ajuda]', c).textContent = m.ajuda;
    }
    function trocarModelo(k) {
      if (k === at.modelo) return;
      const aplicar = () => {
        at.modelo = k; at.criterio = ATV.MODELOS[k].criterios ? ATV.MODELOS[k].criterios[0] : null; at.hab = null;
        at.rodadas = [0, 1, 2].map(() => ATV.MODELOS[k].nova());
        sujo = true; renderTudo();
      };
      const temConteudo = at.rodadas.some((r) => !M().validar(r, at));
      if (temConteudo) confirmar({ titulo: 'Trocar o tipo de atividade?', texto: 'As rodadas que você já montou serão apagadas.', botao: 'Trocar', perigo: false, onOk: aplicar });
      else aplicar();
    }

    // ---------- Passo 2: rodadas ----------
    // Um espaço de figura: mostra a figura escolhida ou o botão "Escolher"
    const slot = (k, cam, rotulo) => `<button type="button" class="slot ${k ? 'cheio' : ''}" data-slot="${cam}" title="${k ? 'Trocar figura' : 'Escolher figura'}">
      ${k ? `<img src="${figSrc(k)}" alt=""><span>${esc(W[k].t)}</span>` : `${I('mais')}<span>${esc(rotulo || 'Escolher')}</span>`}</button>`;
    const info = (t) => (t ? `<span class="info">${t}</span>` : '');

    function editorDaRodada(r, i) {
      const crit = at.criterio;
      switch (at.modelo) {
        case 'silabas': return `${slot(r.palavra, `${i}|palavra`, 'Figura')}${info(r.palavra ? `<b>${W[r.palavra].s.join(' - ')}</b> · ${W[r.palavra].s.length} sílaba(s): a criança bate ${W[r.palavra].s.length} vez(es) no tambor` : '')}`;
        case 'palavras': {
          const n = ATV.limpar(r.frase) ? ATV.limpar(r.frase).replace(/[.!?,;:]/g, '').split(' ').filter(Boolean).length : 0;
          return `<div class="field" style="margin:0;flex:1"><input data-campo="${i}|frase" maxlength="70" placeholder="Ex.: O gato dorme" value="${esc(r.frase)}"></div>${info(`<b data-cont="${i}">${n}</b> palavra(s)`)}`;
        }
        case 'montar': return `${slot(r.palavra, `${i}|palavra`, 'Figura')}${info(r.palavra ? `Pedacinhos: <b>${W[r.palavra].s.join(' + ')}</b>` : 'Use palavras de 2 a 4 sílabas')}
          <label class="check"><input type="checkbox" data-check="${i}|extra" ${r.extra ? 'checked' : ''}> pedacinho a mais (mais difícil)</label>`;
        case 'letra': return `${slot(r.palavra, `${i}|palavra`, 'Figura')}${info(r.palavra ? `A criança vê <b>_${esc(W[r.palavra].f.slice(1))}</b> e arrasta a letra <b>${W[r.palavra].letra}</b>` : 'Use palavras de até 7 letras')}`;
        case 'escolha': return `<div class="col">
            <div class="field" style="margin:0"><label>Pergunta que o Bip faz</label><input data-campo="${i}|pergunta" maxlength="90" placeholder="Ex.: Qual figura rima com pato?" value="${esc(r.pergunta)}"></div>
            <div class="sugestoes">${SUGESTOES.map((s, j) => `<button type="button" class="chip" data-sug="${i}|${j}">${esc(s)}</button>`).join('')}</div>
            <div class="linha-slots"><div class="grupo"><small>Figura-modelo (opcional)</small>${slot(r.modelo, `${i}|modelo`, 'Modelo')}${r.modelo ? `<button type="button" class="link" data-limpa="${i}|modelo">tirar</button>` : ''}</div>
              <div class="grupo"><small>3 respostas · marque a certa</small><div class="opcoes">${r.opcoes.map((o, j) => `<div class="opcao ${r.certo === j ? 'certa' : ''}">${slot(o, `${i}|opcoes|${j}`)}<label><input type="radio" name="certo${i}" data-certo="${i}|${j}" ${r.certo === j ? 'checked' : ''}> certa</label></div>`).join('')}</div></div></div></div>`;
        case 'vf': {
          const sug = r.a && r.b ? M().sugerir(r, at) : null;
          return `${slot(r.a, `${i}|a`)}<span class="sep">×</span>${slot(r.b, `${i}|b`)}
            <div class="resp"><small>${crit === 'rima' ? 'Rimam?' : 'Começam igual?'}</small><div class="alternador">
              <button type="button" class="${r.resposta ? 'on' : ''}" data-resp="${i}|1">👍 Sim</button><button type="button" class="${!r.resposta ? 'on' : ''}" data-resp="${i}|0">👎 Não</button></div>
              ${sug != null ? `<small class="${sug === !!r.resposta ? 'ok' : 'aviso'}">Sugestão do jogo: ${sug ? 'Sim' : 'Não'}</small>` : ''}</div>`;
        }
        case 'caixas': return `<div class="grupo"><small>Figura-modelo</small>${slot(r.modelo, `${i}|modelo`, 'Modelo')}</div>
          <div class="grupo"><small>Figuras (2 a 4) · toque no selo para trocar a caixa</small><div class="opcoes">${r.figuras.map((f, j) => `<div class="opcao caixa-${f.ok ? 'sim' : 'nao'}">${slot(f.w, `${i}|figuras|${j}|w`)}
            <button type="button" class="selo-caixa" data-ok="${i}|${j}">${f.ok ? '✓ verde' : '✗ laranja'}</button>${f.w ? `<button type="button" class="link" data-limpa="${i}|figuras|${j}|w">tirar</button>` : ''}</div>`).join('')}</div></div>`;
        case 'ligar': return `<div class="pares">${r.pares.map(([a, b], j) => `<div class="par">${slot(a, `${i}|pares|${j}|0`)}<span class="sep">—</span>${crit === 'letra'
          ? `<span class="letra-auto">${a ? W[a].letra : '?'}</span>` : slot(b, `${i}|pares|${j}|1`)}</div>`).join('')}</div>`;
        case 'falar': return `${slot(r.palavra, `${i}|palavra`, 'Figura')}${info(r.palavra ? (crit === 'nomear'
          ? `A criança vê a figura e fala <b>${esc(W[r.palavra].f)}</b> sozinha` : `O Bip fala <b>${esc(W[r.palavra].f)}</b> e a criança repete no microfone`) : 'Escolha a figura que a criança vai falar')}`;
        default: return '';
      }
    }

    function renderRodadas() {
      const m = M();
      $('[data-rodadas]', c).innerHTML = at.rodadas.map((r, i) => {
        const erro = m.validar(r, at);
        return `<div class="rodada ${mostrarErros && erro ? 'erro' : ''} ${!erro ? 'pronta' : ''}">
          <div class="rodada-h"><b>Rodada ${i + 1}</b>${!erro ? `<span class="ok">${I('check')} pronta</span>` : mostrarErros ? `<span class="msg">${esc(erro)}</span>` : ''}
            <span class="sp"></span>
            <button type="button" class="btn-icon" title="Subir" data-mover="${i}|-1" ${i === 0 ? 'disabled' : ''}>${I('cima')}</button>
            <button type="button" class="btn-icon" title="Descer" data-mover="${i}|1" ${i === at.rodadas.length - 1 ? 'disabled' : ''}>${I('baixo')}</button>
            <button type="button" class="btn-icon perigo" title="Remover rodada" data-rm-rodada="${i}" ${at.rodadas.length <= 1 ? 'disabled' : ''}>${I('lixo')}</button></div>
          <div class="rodada-b">${editorDaRodada(r, i)}</div></div>`;
      }).join('');
      $('[data-add]', c).disabled = at.rodadas.length >= MAX_RODADAS;
      $('[data-add]', c).innerHTML = at.rodadas.length >= MAX_RODADAS ? `Máximo de ${MAX_RODADAS} rodadas` : `${I('mais')} Adicionar rodada`;
      ligarRodadas();
      renderErros();
    }

    function ligarRodadas() {
      const R = $('[data-rodadas]', c);
      $$('[data-slot]', R).forEach((b) => (b.onclick = () => escolherFigura(b.dataset.slot)));
      $$('[data-limpa]', R).forEach((b) => (b.onclick = () => { const { obj, chave } = caminho(at, b.dataset.limpa); obj[chave] = null; mudou(); }));
      $$('[data-campo]', R).forEach((inp) => (inp.oninput = () => {
        const { obj, chave } = caminho(at, inp.dataset.campo); obj[chave] = inp.value; sujo = true;
        const i = inp.dataset.campo.split('|')[0]; const cont = $(`[data-cont="${i}"]`, R);
        if (cont) cont.textContent = ATV.limpar(inp.value) ? ATV.limpar(inp.value).replace(/[.!?,;:]/g, '').split(' ').filter(Boolean).length : 0;
        atualizarEstado(Number(i));
      }));
      $$('[data-check]', R).forEach((inp) => (inp.onchange = () => { const { obj, chave } = caminho(at, inp.dataset.check); obj[chave] = inp.checked; mudou(); }));
      $$('[data-certo]', R).forEach((inp) => (inp.onchange = () => { const [i, j] = inp.dataset.certo.split('|').map(Number); at.rodadas[i].certo = j; mudou(); }));
      $$('[data-resp]', R).forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.resp.split('|').map(Number); at.rodadas[i].resposta = !!v; mudou(); }));
      $$('[data-ok]', R).forEach((b) => (b.onclick = () => { const [i, j] = b.dataset.ok.split('|').map(Number); at.rodadas[i].figuras[j].ok = !at.rodadas[i].figuras[j].ok; mudou(); }));
      $$('[data-sug]', R).forEach((b) => (b.onclick = () => {
        const [i, j] = b.dataset.sug.split('|').map(Number); const r = at.rodadas[i];
        r.pergunta = SUGESTOES[j].replace('___', r.modelo ? W[r.modelo].f : '___'); mudou();
        const inp = $(`[data-campo="${i}|pergunta"]`, R); if (inp) { inp.focus(); const p = inp.value.indexOf('___'); if (p >= 0) inp.setSelectionRange(p, p + 3); }
      }));
      $$('[data-mover]', R).forEach((b) => (b.onclick = () => { const [i, d] = b.dataset.mover.split('|').map(Number); const t = at.rodadas[i]; at.rodadas[i] = at.rodadas[i + d]; at.rodadas[i + d] = t; mudou(); }));
      $$('[data-rm-rodada]', R).forEach((b) => (b.onclick = () => { at.rodadas.splice(Number(b.dataset.rmRodada), 1); mudou(); }));
    }
    // Atualiza só o selo "pronta" de uma rodada (sem redesenhar, para não perder o foco do campo de texto)
    function atualizarEstado(i) {
      const el = $$('.rodada', $('[data-rodadas]', c))[i]; if (!el) return;
      const erro = M().validar(at.rodadas[i], at);
      el.classList.toggle('pronta', !erro); el.classList.toggle('erro', mostrarErros && !!erro);
      const h = $('.rodada-h', el); const ant = $('.ok, .msg', h); if (ant) ant.remove();
      if (!erro) h.querySelector('b').insertAdjacentHTML('afterend', `<span class="ok">${I('check')} pronta</span>`);
      else if (mostrarErros) h.querySelector('b').insertAdjacentHTML('afterend', `<span class="msg">${esc(erro)}</span>`);
      renderErros();
    }
    function mudou() { sujo = true; renderRodadas(); }

    // Janela para escolher uma figura do jogo (com busca e assuntos)
    function escolherFigura(cam) {
      const { obj, chave } = caminho(at, cam);
      const filtro = M().filtro && /palavra$/.test(cam) ? M().filtro : null;
      let cat = 'Todas';
      const lista = () => {
        const q = TS.U.semAcento(m.$('[data-q]').value);
        const ks = (cat === 'Todas' ? Object.keys(W) : ATV.CATEGORIAS.find((x) => x[0] === cat)[1])
          .filter((k) => (!filtro || filtro(k)) && (!q || TS.U.semAcento(W[k].f).includes(q)))
          .sort((a, b) => W[a].f.localeCompare(W[b].f, 'pt-BR'));
        m.$('[data-grade]').innerHTML = ks.length ? ks.map((k) => `<button type="button" class="fig ${obj[chave] === k ? 'on' : ''}" data-fig="${k}"><img src="${figSrc(k)}" alt=""><span>${esc(W[k].t)}</span></button>`).join('')
          : '<p class="vazio-busca">Nenhuma figura com esse nome.</p>';
        m.el.querySelectorAll('[data-fig]').forEach((b) => (b.onclick = () => { obj[chave] = b.dataset.fig; m.fechar(); sugerirResposta(cam); mudou(); }));
      };
      const m = modal({
        titulo: 'Escolher figura', largo: true,
        corpo: `<div class="picker"><label class="busca">${I('busca')}<input data-q placeholder="Buscar pelo nome (ex.: gato)" aria-label="Buscar figura"></label>
          <div class="cats">${['Todas', ...ATV.CATEGORIAS.map((x) => x[0])].map((n) => `<button type="button" class="chip ${n === cat ? 'on' : ''}" data-cat="${n}">${n}</button>`).join('')}</div>
          ${filtro ? `<p class="hint">Mostrando só as figuras que servem para “${esc(M().nome)}”.</p>` : ''}
          <div class="grade-figs" data-grade></div></div>`,
        aoMontar: (mm) => {
          mm.el.querySelector('.modal').classList.add('modal-figs');
          mm.el.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; mm.el.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b)); lista(); }));
        },
      });
      m.$('[data-q]').oninput = lista;
      lista();
    }
    // Sim ou não: quando as duas figuras estão escolhidas, o jogo já sugere a resposta
    function sugerirResposta(cam) {
      if (at.modelo !== 'vf') return;
      const r = at.rodadas[Number(cam.split('|')[0])];
      if (r.a && r.b) r.resposta = M().sugerir(r, at);
    }

    // ---------- Passo 3: nome, turmas, habilidade, instrução ----------
    function renderDetalhes() {
      $('[data-titulo-at]', c).value = at.titulo || '';
      const ts = turmasVisiveis();
      $('[data-turmas]', c).innerHTML = ts.length ? ts.map((t) => `<label class="check-turma ${at.turmas.includes(t.id) ? 'on' : ''}"><input type="checkbox" value="${t.id}" ${at.turmas.includes(t.id) ? 'checked' : ''}> ${esc(t.nome)} <small>${TS.DB.users.alunosDaTurma(t.id).length} alunos</small></label>`).join('')
        : '<span class="hint">Você ainda não tem turmas. Peça ao administrador para criar.</span>';
      $$('[data-turmas] input', c).forEach((inp) => (inp.onchange = () => {
        at.turmas = $$('[data-turmas] input', c).filter((x) => x.checked).map((x) => x.value);
        inp.closest('label').classList.toggle('on', inp.checked); sujo = true; renderErros();
      }));
      const auto = ATV.habPadrao(at);
      $('[data-hab]', c).innerHTML = `<option value="">Automática (${esc(TS.C.HAB[auto].nome)})</option>` + Object.entries(TS.C.HAB).map(([k, h]) => `<option value="${k}" ${at.hab === k ? 'selected' : ''}>${esc(h.nome)}</option>`).join('');
      $('[data-instr]', c).value = at.instrucao || '';
      $('[data-instr]', c).placeholder = TS.C.INTRO[M().tpl];
      $('[data-instr-hint]', c).textContent = 'Se deixar vazio, o Bip fala a frase de exemplo acima.';
    }
    $('[data-titulo-at]', c).oninput = (e) => { at.titulo = e.target.value; sujo = true; renderErros(); };
    $('[data-hab]', c).onchange = (e) => { at.hab = e.target.value || null; sujo = true; };
    $('[data-instr]', c).oninput = (e) => { at.instrucao = e.target.value; sujo = true; };

    // Lista de pendências (aparece depois da primeira tentativa de publicar)
    function renderErros() {
      const el = $('[data-erros]', c);
      if (!mostrarErros) { el.innerHTML = ''; return; }
      const v = ATV.validar(at, true);
      $('[data-campo-titulo]', c).classList.toggle('erro', v.erros.some((e) => e.campo === 'titulo'));
      $('[data-campo-turmas]', c).classList.toggle('erro', v.erros.some((e) => e.campo === 'turmas'));
      el.innerHTML = v.ok ? `<span class="tudo-ok">${I('check')} Tudo pronto para publicar!</span>` : `${I('alerta')} <span>${v.erros.length} pendência(s): ${esc(v.erros[0].msg)}${v.erros.length > 1 ? '…' : ''}</span>`;
    }

    function renderTudo() { renderModelos(); renderRodadas(); renderDetalhes(); }

    // ---------- Botões ----------
    $('[data-add]', c).onclick = () => { if (at.rodadas.length < MAX_RODADAS) { at.rodadas.push(M().nova()); mudou(); } };
    $('[data-sortear]', c).onclick = () => {
      let n = 0;
      at.rodadas = at.rodadas.map((r) => { if (M().validar(r, at)) { n++; return M().exemplo(at); } return r; });
      if (!n) return toast('Todas as rodadas já estão preenchidas.');
      toast(`${n} rodada(s) preenchida(s) com exemplos. Você pode trocar qualquer figura.`);
      mudou();
    };
    async function salvar(status) {
      const publicar = status === 'publicada';
      const v = ATV.validar(at, publicar);
      if (publicar && !v.ok) {
        mostrarErros = true; renderRodadas();
        const alvo = $('.rodada.erro', c) || $('.field.erro', c);
        if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return toast('Ainda falta completar: ' + v.erros[0].msg, 'erro');
      }
      const dados = { ...at, titulo: ATV.limpar(at.titulo) || 'Atividade sem nome', status };
      const bts = $$('[data-salvar],[data-publicar]', c); bts.forEach((b) => (b.disabled = true));
      let salvo;
      try { salvo = at.id ? await TS.DB.atividades.update(at.id, dados) : await TS.DB.atividades.create(dados); }
      catch (e) { bts.forEach((b) => (b.disabled = false)); return toast(e.message, 'erro'); }
      at.id = salvo.id; sujo = false;
      toast(publicar ? `Atividade publicada para ${at.turmas.length} turma(s)!` : 'Rascunho salvo.');
      ir('atividades');
    }
    $('[data-salvar]', c).onclick = () => salvar('rascunho');
    $('[data-publicar]', c).onclick = () => salvar('publicada');
    $('[data-previa]', c).onclick = () => {
      // Na pré-visualização vão só as rodadas completas
      const prontas = at.rodadas.filter((r) => !M().validar(r, at));
      if (!prontas.length) { mostrarErros = true; renderRodadas(); return toast('Complete pelo menos uma rodada para ver como o aluno.', 'erro'); }
      if (prontas.length < at.rodadas.length) toast(`Mostrando ${prontas.length} rodada(s) completa(s). As incompletas ficaram de fora.`);
      const copia = { ...JSON.parse(JSON.stringify(at)), rodadas: JSON.parse(JSON.stringify(prontas)), titulo: ATV.limpar(at.titulo) || 'Atividade sem nome' };
      TS.App.abrirPrevia(copia, () => ir('criarAtividade', { rascunho: at }));
    };
    $('[data-cancelar]', c).onclick = () => {
      if (!sujo) return ir('atividades');
      confirmar({ titulo: 'Descartar alterações?', texto: 'O que você mudou nesta atividade não foi salvo.', botao: 'Descartar', onOk: () => ir('atividades') });
    };
    // O botão "Voltar" do cabeçalho também pergunta antes de descartar o que não foi salvo
    state.antesDeVoltar = (seguir) => (sujo ? confirmar({ titulo: 'Descartar alterações?', texto: 'O que você mudou nesta atividade não foi salvo.', botao: 'Descartar', onOk: seguir }) : seguir());

    renderTudo();
    const editando = !!(at.id || original);
    return { titulo: `${editando ? 'Editar atividade' : 'Criar atividade'}<small>${editando && at.status === 'publicada' ? 'Já publicada: as mudanças valem para as próximas vezes que os alunos jogarem' : 'Monte em 3 passos e veja como o aluno vai ver antes de publicar'}</small>` };
  };
})();
