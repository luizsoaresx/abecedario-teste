/* admin_base.js — base da área do professor e do administrador (HTML, sem Phaser).
   Aqui ficam as ferramentas que todas as telas da gestão usam, o menu lateral e a navegação. */
window.TS = window.TS || {};

TS.Admin = (function () {
  const K = TS.AdminKit = TS.AdminKit || {}; // "caixa de ferramentas" compartilhada
  const I = TS.Ic, G = TS.Graf, U = TS.U, esc = U.esc;
  const root = () => document.getElementById('gestao');
  const $ = (s, el = root()) => el.querySelector(s);
  const $$ = (s, el = root()) => Array.from(el.querySelectorAll(s));
  const FIGS = ['pato', 'bola', 'maca', 'gato', 'sapo', 'uva', 'carro', 'flor', 'peixe'];
  const ST = {
    ok: { rot: 'Em dia', ic: 'check', cor: '#23853A' }, atencao: { rot: 'Atenção', ic: 'exclama', cor: '#e0a526' },
    dificuldade: { rot: 'Com dificuldade', ic: 'alerta', cor: '#D23B57' }, novo: { rot: 'Ainda não jogou', ic: 'relogio', cor: '#aab1c2' },
  };
  const state = { user: null, turma: 'todas', pagina: null, param: null };

  // ---------- utilidades de UI ----------
  const cores = ['#1E88D0', '#7A5AF0', '#E8731A', '#2E9A3E', '#D63F86', '#14b8a6', '#f59e0b', '#6366f1'];
  const corNome = (n) => cores[[...String(n)].reduce((s, c) => s + c.charCodeAt(0), 0) % cores.length];
  const iniciais = (n) => String(n).split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const avatar = (n, tam) => `<span class="avatar" style="background:${corNome(n)}${tam ? `;width:${tam}px;height:${tam}px;font-size:${tam * 0.38}px` : ''}">${esc(iniciais(n))}</span>`;
  const badge = (cod, titulo) => `<span class="st ${cod}" title="${esc(titulo || '')}">${I(ST[cod].ic)}${ST[cod].rot}</span>`;
  const figSrc = (k) => (['gato', 'bola', 'rato'].includes(k) ? TS.Art.uri(TS.Art.FIGURAS[k]) : TS.ASSETS.img['fig_' + k]);
  const nomeFase = (f) => `${f.mundo}-${f.fase} · ${f.nome}`;
  /* origem(id): de onde veio um resultado — uma fase do mapa ("1-2 · Contar mais palavras")
     ou uma atividade criada pelo professor ("★ Rimas dos animais"). Usado nos painéis e relatórios. */
  function origem(id) {
    const f = TS.C.fase(id);
    if (f) return { rot: nomeFase(f), curto: `${f.mundo}-${f.fase}`, hab: f.hab, cor: TS.C.HAB[f.hab].cor, custom: false };
    const at = TS.DB.atividades.get(id);
    if (at) { const h = TS.ATV.habDe(at); return { rot: `★ ${at.titulo}`, curto: `★ ${at.titulo}`, hab: h, cor: TS.C.HAB[h].cor, custom: true, at }; }
    return { rot: 'Atividade apagada', curto: '—', hab: null, cor: '#aab1c2', custom: true };
  }
  const minutos = (s) => Math.round(s / 60);

  function toast(msg, tipo = 'ok') {
    let c = document.querySelector('.toasts');
    if (!c) { c = document.createElement('div'); c.className = 'toasts'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = 'toast ' + tipo; t.innerHTML = I(tipo === 'ok' ? 'check' : 'exclama') + esc(msg);
    c.appendChild(t); setTimeout(() => t.remove(), 3200);
  }

  function modal({ titulo, corpo, rodape, largo, aoMontar }) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${largo ? 'largo' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="modal-h"><h3>${esc(titulo)}</h3><button class="btn-icon" data-fechar aria-label="Fechar">${I('x')}</button></div>
      <div class="modal-b">${corpo}</div>${rodape ? `<div class="modal-f">${rodape}</div>` : ''}</div>`;
    document.body.appendChild(bg);
    const fechar = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = (e) => e.key === 'Escape' && fechar();
    document.addEventListener('keydown', esc_);
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-fechar]')) fechar(); });
    const m = { el: bg, fechar, $: (s) => bg.querySelector(s) };
    aoMontar && aoMontar(m);
    const f = bg.querySelector('input,select'); f && f.focus();
    return m;
  }

  function confirmar({ titulo, texto, botao = 'Remover', perigo = true, onOk }) {
    modal({
      titulo, corpo: `<div class="aviso-ic" style="background:${perigo ? 'var(--bad-bg)' : 'var(--warn-bg)'};color:${perigo ? 'var(--bad)' : 'var(--warn)'}">${I('alerta')}</div><p style="margin:0;color:var(--ink-2);line-height:1.5">${texto}</p>`,
      rodape: `<button class="btn btn-ghost" data-fechar>Cancelar</button><button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(botao)}</button>`,
      aoMontar: (m) => m.$('[data-ok]').addEventListener('click', () => { m.fechar(); onOk(); }),
    });
  }

  /* Tabela com ordenação por coluna. */
  function tabela(el, cfg) {
    const st = { k: cfg.ordem?.k, dir: cfg.ordem?.dir || 1 };
    function render() {
      let linhas = cfg.linhas();
      const col = cfg.cols.find((c) => c.k === st.k);
      if (col) linhas = linhas.slice().sort((a, b) => {
        const va = col.valor ? col.valor(a) : a[col.k]; const vb = col.valor ? col.valor(b) : b[col.k];
        return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR')) * st.dir;
      });
      if (!linhas.length) { el.innerHTML = cfg.vazio; cfg.aposRender && cfg.aposRender(el); return; }
      el.innerHTML = `<div class="tabela-wrap"><table class="t"><thead><tr>${cfg.cols.map((c) =>
        `<th class="${c.ord === false ? '' : 'ord'} ${st.k === c.k ? 'ativa' : ''} ${c.num ? 'num' : ''}" data-k="${c.k}">${esc(c.rot)}${c.ord === false ? '' : `<span class="seta">${st.k === c.k ? (st.dir > 0 ? '▲' : '▼') : '↕'}</span>`}</th>`).join('')}</tr></thead>
        <tbody>${linhas.map((l) => `<tr class="${cfg.onLinha ? 'clicavel' : ''}" data-id="${esc(l.id)}">${cfg.cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(l) : esc(l[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      $$('th.ord', el).forEach((th) => th.addEventListener('click', () => { const k = th.dataset.k; st.dir = st.k === k ? -st.dir : 1; st.k = k; render(); }));
      if (cfg.onLinha) $$('tbody tr', el).forEach((tr) => tr.addEventListener('click', (e) => { if (!e.target.closest('button,a')) cfg.onLinha(tr.dataset.id); }));
      cfg.aposRender && cfg.aposRender(el);
    }
    render();
    return { render };
  }

  const vazio = (titulo, texto, botao) => `<div class="vazio"><img src="${TS.GALACTICO.img.bibo_rosa_pensando}" alt=""><h4>${esc(titulo)}</h4><p>${esc(texto)}</p>${botao || ''}</div>`;

  // ---------- escopo de dados ----------
  const isAdmin = () => state.user && state.user.perfil === 'admin';
  const turmasVisiveis = () => (isAdmin() ? TS.DB.turmas.all() : TS.DB.turmas.doProfessor(state.user.id));
  function alunosVisiveis() {
    const ids = state.turma === 'todas' ? turmasVisiveis().map((t) => t.id) : [state.turma];
    const semTurma = isAdmin() && state.turma === 'todas';
    return TS.DB.users.all('aluno').filter((a) => ids.includes(a.turmaId) || (semTurma && !a.turmaId));
  }
  // Atividades que este usuário vê (admin: todas; professor: as dele e as das turmas dele), filtradas pela turma escolhida no topo
  function atividadesVisiveis() {
    let l = isAdmin() ? TS.DB.atividades.all() : TS.DB.atividades.doProfessor(state.user.id);
    if (state.turma !== 'todas') l = l.filter((a) => a.turmas.includes(state.turma));
    return l;
  }
  const podeEditar = (at) => isAdmin() || at.professorId === state.user.id;
  const nomeTurma = (id) => (TS.DB.turmas.get(id) || {}).nome || 'Sem turma';
  function linhaAluno(a) {
    const s = TS.DB.statusAluno(a.id); const f = TS.DB.faseAtual(a.id); const p = TS.DB.progresso(a.id);
    return { id: a.id, a, nome: a.nome, login: a.login, turma: nomeTurma(a.turmaId), fase: f, faseIdx: f.idx, ultimo: p.ultimoAcesso, st: s, stOrd: { dificuldade: 0, atencao: 1, novo: 2, ok: 3 }[s.cod] };
  }

  // ---------- Estrutura (menu lateral + cabeçalho) ----------
  const NAV_PROF = [['inicio', 'Início', 'home'], ['alunos', 'Alunos', 'users'], ['atividades', 'Atividades', 'tarefa'], ['evolucao', 'Evolução', 'trilha'], ['relatorios', 'Relatórios', 'chart']];
  const NAV_ADMIN = [['painel', 'Painel geral', 'home'], ['professores', 'Professores', 'user'], ['turmas', 'Turmas', 'escola'], null, ['alunos', 'Alunos', 'users'], ['atividades', 'Atividades', 'tarefa'], ['evolucao', 'Evolução', 'trilha'], ['relatorios', 'Relatórios', 'chart']];
  // Páginas "filhas": acendem o item do menu da página-mãe
  const MAE = { aluno: 'alunos', criarAtividade: 'atividades', resultadoAtividade: 'atividades' };
  function shell() {
    const nav = isAdmin() ? NAV_ADMIN : NAV_PROF;
    root().innerHTML = `<div class="shell"><aside class="side">
      <div class="marca"><img class="logo" src="${TS.Art.uri(TS.GALACTICO.svg.logo)}" alt="Abecedário Galáctico"><span class="papel">${isAdmin() ? 'Administração' : 'Área do professor'}</span></div>
      ${nav.map((n) => (n ? `<button class="nav-item" data-nav="${n[0]}">${I(n[2])}<span class="txt">${n[1]}</span></button>` : '<div class="nav-sep"></div>')).join('')}
      <div class="rodape"><button class="nav-item" data-nav="perfil">${I('perfil')}<span class="txt">Meu perfil</span></button><button class="nav-item" data-sair>${I('sair')}<span class="txt">Sair</span></button></div>
    </aside><div class="main">
      <div class="banner-off" hidden>${I('sinal')} Sem conexão. Você pode continuar consultando; as alterações serão enviadas quando a internet voltar.</div>
      <header class="topo"><button class="btn-voltar" data-voltar-pag hidden>${I('voltar')}<span>Voltar</span></button><h1 data-titulo></h1>
        <label class="seletor-turma" data-seletor>${I('escola')}<select aria-label="Turma"></select></label>
        <button type="button" class="usuario" data-ir-perfil title="Meu perfil">${avatar(state.user.nome)}<div><b>${esc(state.user.nome.split(' ')[0])}</b><div style="color:var(--ink-3);font-size:12.5px">${isAdmin() ? 'Administrador' : 'Professor'}</div></div></button>
      </header><main class="conteudo" data-conteudo></main></div></div>`;
    $$('[data-nav]').forEach((b) => (b.onclick = () => ir(b.dataset.nav)));
    $('[data-voltar-pag]').onclick = () => voltar();
    $('[data-ir-perfil]').onclick = () => ir('perfil');
    $('[data-sair]').onclick = () => confirmar({ titulo: 'Sair da conta', texto: 'Deseja sair da área de gestão?', botao: 'Sair', perigo: false, onOk: () => { TS.DB.sair(); TS.App.abrirJogo('Acesso'); } });
    const sel = $('[data-seletor] select');
    sel.innerHTML = `<option value="todas">${isAdmin() ? 'Todas as turmas' : 'Todas as minhas turmas'}</option>` + turmasVisiveis().map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
    sel.value = state.turma;
    sel.onchange = () => { state.turma = sel.value; ir(state.pagina, state.param); };
    const net = () => { const b = $('.banner-off'); if (b) b.hidden = navigator.onLine !== false; };
    // Selo do banco de dados no rodapé do menu: conectado (nuvem) ou modo local
    const est = TS.DB.estado();
    const selo = document.createElement('div'); selo.className = 'selo-banco ' + est.modo;
    selo.innerHTML = est.modo === 'nuvem' ? `${I('banco')}<span>Banco de dados conectado</span>` : `${I('info')}<span>Modo local (teste)</span>`;
    selo.title = est.modo === 'nuvem' ? 'Os dados ficam gravados no Supabase' : 'Os dados ficam só neste navegador. Veja o LEIA-ME para ligar o banco.';
    $('.side .rodape').prepend(selo);
    window.addEventListener('online', net); window.addEventListener('offline', net); net();
  }

  /* ---------- Navegação com "Voltar" ----------
     hist guarda as páginas por onde o professor passou. ir() acrescenta a página atual antes de trocar;
     voltar() tira a última e volta para ela. O botão "Voltar" do cabeçalho só aparece quando há para onde voltar.
     A tela de criar/editar atividade não entra no histórico (depois de salvar, "Voltar" não reabre o formulário). */
  const PAGINAS = {};
  const hist = [];
  const inicial = () => (isAdmin() ? 'painel' : 'inicio');
  function ir(pagina, param, voltando = false) {
    if (!voltando && state.pagina && state.pagina !== pagina && state.pagina !== 'criarAtividade') {
      hist.push({ pagina: state.pagina, param: state.param });
      if (hist.length > 30) hist.shift();
    }
    state.pagina = pagina; state.param = param; state.antesDeVoltar = null;
    const bv = $('[data-voltar-pag]');
    if (bv) bv.hidden = !hist.length && pagina === inicial();
    $$('[data-nav]').forEach((b) => b.classList.toggle('ativo', b.dataset.nav === (MAE[pagina] || pagina)));
    const semTurma = ['professores', 'turmas', 'painel', 'criarAtividade', 'perfil'].includes(pagina);
    $('[data-seletor]').hidden = semTurma;
    const c = $('[data-conteudo]');
    // estado de carregamento (skeleton)
    c.innerHTML = `<div class="grid g4">${'<div class="sk" style="height:96px"></div>'.repeat(4)}</div><div class="sk" style="height:320px"></div>`;
    root().scrollTop = 0;
    clearTimeout(ir.t);
    const minha = (ir.vez = (ir.vez || 0) + 1);
    const desenhar = () => {
      if (minha !== ir.vez) return;     // a pessoa já clicou em outra página
      const p = PAGINAS[pagina];
      // Ajuda para quem está montando: a página ainda não tem arquivo
      if (!p) { c.innerHTML = `<div class="card">${vazio('Esta página ainda não foi criada', 'Ela aparece quando você criar o arquivo dela.')}</div>`; $('[data-titulo]').innerHTML = 'Em construção'; return; }
      const r = p(c, param); $('[data-titulo]').innerHTML = r.titulo;
    };
    // Modo banco de dados: se os dados baixados têm mais de 45 s, baixa de novo antes de mostrar (os alunos jogam em outros aparelhos)
    if (TS.DB.nuvem && pagina !== 'criarAtividade' && Date.now() - (state.carga || 0) > 45000) {
      TS.DB.recarregar().then(() => { state.carga = Date.now(); state.user = TS.DB.sessao.get() || state.user; }, (e) => {
        if (e.codigo === 'sessao') { toast('Sua sessão terminou. Entre de novo.', 'erro'); TS.DB.sair(); return K.telaLogin(); }
        toast('Sem conexão com o banco: mostrando os últimos dados baixados.', 'erro');
      }).finally(() => setTimeout(desenhar, 60));
    } else ir.t = setTimeout(desenhar, 160);
  }

  const kpi = (ic, cor, v, l, s, extra = '') => `<div class="card kpi ${extra}"><div class="ic" style="background:${cor}1a;color:${cor}">${I(ic)}</div><div><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ''}</div></div>`;

  // Volta para a página anterior (sem histórico: vai para a página inicial).
  // Uma página pode pedir para confirmar antes (state.antesDeVoltar), como o formulário de atividade com mudanças não salvas.
  function voltar() {
    const seguir = () => {
      let ant = hist.pop();
      while (ant && ant.pagina === state.pagina) ant = hist.pop(); // pula a própria página (ex.: lista -> criar -> lista)
      ir(ant ? ant.pagina : inicial(), ant ? ant.param : null, true);
    };
    if (state.antesDeVoltar) state.antesDeVoltar(seguir); else seguir();
  }

  // ---------- entrada ----------
  function abrir() {
    const u = TS.DB.sessao.get();
    hist.length = 0; state.pagina = null; state.param = null; // cada entrada começa sem histórico
    if (!u || u.perfil === 'aluno') { state.user = null; return K.telaLogin(); }
    state.user = u; state.turma = 'todas'; state.carga = Date.now();
    shell(); ir(inicial());
  }
  // Links "voltar" dentro das páginas (atributo data-back) fazem o mesmo que o botão do cabeçalho
  document.addEventListener('click', (e) => { if (e.target.closest('#gestao [data-back]')) voltar(); });

  // Kit de ferramentas: os arquivos de cada tela pegam daqui o que precisam
  Object.assign(K, { I, G, U, esc, root, $, $$, FIGS, ST, state, cores, corNome, iniciais, avatar, badge, figSrc, nomeFase, origem, minutos,
    toast, modal, confirmar, tabela, vazio, isAdmin, turmasVisiveis, alunosVisiveis, atividadesVisiveis, podeEditar, nomeTurma, linhaAluno, shell, PAGINAS, ir, voltar, kpi, abrir });

  return { abrir, ir, voltar, state };
})();
