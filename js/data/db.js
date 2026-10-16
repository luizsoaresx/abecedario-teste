/* db.js — os dados do jogo: usuários, turmas, atividades, progresso e partidas.

   DOIS MODOS
   - NUVEM (banco de dados Supabase, js/config.js preenchido): tudo fica gravado no banco, de verdade.
     Ao entrar, o jogo baixa o que a pessoa pode ver (função "carregar") e trabalha com essa cópia na memória.
     * O que o professor e o administrador fazem (cadastrar aluno, criar atividade...) vai para o banco NA HORA;
       se o banco recusar (login repetido, sem internet...), a tela mostra o erro e nada muda.
     * O que o aluno faz no jogo (partidas, estrelas, cor do Bip) entra numa FILA e é enviado em seguida.
       Sem internet, a fila espera e é enviada quando a conexão voltar (o aluno não fica travado).
   - LOCAL (js/config.js vazio): os dados ficam só neste navegador (localStorage), com contas de demonstração.

   As telas usam sempre as mesmas funções (TS.DB.users.get, TS.DB.progresso...), nos dois modos.
   As funções que GRAVAM dados da gestão devolvem uma Promise (use await e trate o erro). */
window.TS = window.TS || {};

TS.DB = (function () {
  const KEY = 'trilhaDosSons.db.v1';             // banco do modo local
  const KEY_SESSAO = 'trilhaDosSons.sessao.v1';  // quem está logado (modo local)
  const KEY_TOKEN = 'abecedario.token';          // crachá de acesso ao banco (modo nuvem)
  const KEY_COPIA = 'abecedario.copia';          // cópia dos dados para abrir o jogo sem internet (modo nuvem)
  const KEY_FILA = 'abecedario.fila';            // partidas esperando para ir ao banco
  const N = TS.Nuvem;
  const nuvem = !!(N && N.ativo());
  const erro = (cod, msg) => (N ? N.erro(cod, msg) : Object.assign(new Error(msg || cod), { codigo: cod }));

  let db = vazio();
  let eu = null;        // quem está logado (aluno, professor ou administrador)
  let token = null;     // crachá do banco (modo nuvem)
  let fila = [];        // partidas a enviar
  let semInternet = false;
  const ouvintes = [];  // telas que querem saber quando a fila muda (ex.: aviso "sincronizando")

  function vazio() { return { versao: 3, users: [], turmas: [], progresso: {}, sessoes: [], atividades: [] }; }
  const ler = (k, area = localStorage) => { try { return JSON.parse(area.getItem(k)); } catch (e) { return null; } };
  const gravar = (k, v, area = localStorage) => { try { if (v == null) area.removeItem(k); else area.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('Falha ao guardar', k, e); } };
  const copiar = (o) => JSON.parse(JSON.stringify(o));
  const definidos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

  /* ====================== Começo ====================== */
  // Chamado uma vez quando a página abre (app.js). No modo nuvem, se houver alguém conectado, baixa os dados.
  async function iniciar() {
    if (!nuvem) {
      carregarLocal();
      eu = users.get(ler(KEY_SESSAO)) || null;
      return { modo: 'local' };
    }
    fila = ler(KEY_FILA) || [];
    token = ler(KEY_TOKEN) || ler(KEY_TOKEN, sessionStorage);
    if (token) {
      try { await recarregar(9000); } catch (e) {
        if (e.codigo === 'sessao') limparSessao();
        else { // sem internet: abre com a última cópia
          const c = ler(KEY_COPIA);
          if (c && c.usuario) { aplicar(c); semInternet = true; } else limparSessao();
        }
      }
    }
    enviarFila();
    return { modo: 'nuvem' };
  }

  function carregarLocal() {
    db = ler(KEY);
    if (!db || !db.users) { db = vazio(); seed(); seedAtividades(); save(); }
    if (!db.atividades) { db.atividades = []; seedAtividades(); save(); }
    db.versao = 3;
    return db;
  }

  // Baixa do banco tudo o que a pessoa conectada pode ver
  async function recarregar(tempo) {
    const r = await N.chamar('carregar', { p_token: token }, tempo ? { tempo } : undefined);
    aplicar(r);
    semInternet = false;
    guardarCopia();
    return r;
  }
  function aplicar(r) {
    db = { versao: 3, users: r.users || [], turmas: r.turmas || [], atividades: r.atividades || [], progresso: r.progresso || {}, sessoes: r.sessoes || [] };
    eu = users.get(r.usuario && r.usuario.id) || r.usuario || null;
    // O que ainda está na fila (ainda não chegou ao banco) vale mais que a cópia baixada
    fila.forEach((it) => {
      if (it.progresso && it.alunoId) db.progresso[it.alunoId] = copiar(it.progresso);
      if (it.sessao && !db.sessoes.some((s) => s.id === it.sessao.id)) db.sessoes.push(copiar(it.sessao));
    });
  }
  function guardarCopia() { if (nuvem && eu) gravar(KEY_COPIA, { usuario: eu, ...db }); }
  function limparSessao() {
    token = null; eu = null; db = vazio();
    gravar(KEY_TOKEN, null); gravar(KEY_TOKEN, null, sessionStorage); gravar(KEY_COPIA, null);
  }

  // Grava o banco local (modo local) ou a cópia para abrir sem internet (modo nuvem)
  function save() {
    if (nuvem) return guardarCopia();
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Falha ao salvar', e); }
  }
  function reset() { if (nuvem) return; db = vazio(); seed(); seedAtividades(); save(); }

  /* ====================== Entrar e sair ====================== */
  /* entrar(login, senha, { perfil: 'aluno' | 'gestao', manter: true })
     Devolve { user } ou { erro: 'nao_encontrado' | 'senha' | 'inativo' | 'bloqueado' | 'aluno' | 'gestao' | 'rede' ..., msg } */
  async function entrar(login, senha, o = {}) {
    return entrarCom(o, () => {
      const dias = o.perfil === 'aluno' ? 180 : (o.manter === false ? 1 : 30);
      return N.chamar('entrar', { p_login: String(login || '').trim(), p_senha: String(senha || ''), p_dias: dias });
    }, () => authLocal(login, senha));
  }
  async function entrarFiguras(login, figs, o = {}) {
    return entrarCom({ ...o, perfil: 'aluno' }, () => N.chamar('entrar_figuras', { p_login: String(login || '').trim(), p_figuras: figs, p_dias: 180 }),
      () => authFigurasLocal(login, figs));
  }
  async function entrarCom(o, naNuvem, noLocal) {
    const confere = (u) => {
      if (o.perfil === 'aluno' && u.perfil !== 'aluno') return 'gestao';
      if (o.perfil === 'gestao' && u.perfil === 'aluno') return 'aluno';
      return null;
    };
    if (!nuvem) {
      const r = noLocal();
      if (r.erro) return r;
      const cod = confere(r.user); if (cod) return { erro: cod };
      eu = r.user; gravar(KEY_SESSAO, eu.id);
      if (eu.perfil === 'aluno') marcarAcesso(eu.id);
      return { user: eu };
    }
    try {
      const r = await naNuvem();
      const cod = confere(r.usuario);
      if (cod) { N.chamar('sair', { p_token: r.token }).catch(() => {}); return { erro: cod }; }
      token = r.token;
      const lembrar = o.perfil === 'aluno' || o.manter !== false;
      gravar(KEY_TOKEN, lembrar ? token : null); gravar(KEY_TOKEN, lembrar ? null : token, sessionStorage);
      await recarregar();
      if (eu.perfil === 'aluno') marcarAcesso(eu.id);
      return { user: eu };
    } catch (e) {
      return { erro: e.codigo || 'servidor', msg: e.message };
    }
  }
  function authLocal(login, senha) {
    const u = users.byLogin(login || '') || db.users.find((x) => x.perfil !== 'aluno' && x.email && x.email.toLowerCase() === String(login).trim().toLowerCase());
    if (!u) return { erro: 'nao_encontrado' };
    if (!u.ativo) return { erro: 'inativo' };
    if (String(u.senha) !== String(senha)) return { erro: 'senha' };
    return { user: u };
  }
  function authFigurasLocal(login, figs) {
    const u = users.byLogin(login || '');
    if (!u || u.perfil !== 'aluno') return { erro: 'nao_encontrado' };
    if (!u.ativo) return { erro: 'inativo' };
    if (!u.senhaFiguras || u.senhaFiguras.join() !== figs.join()) return { erro: 'senha' };
    return { user: u };
  }

  // Sair da conta neste aparelho
  function sair() {
    if (!nuvem) { eu = null; gravar(KEY_SESSAO, null); return; }
    const t = token;
    // Se ainda há partidas na fila com este crachá, o banco só "desconecta" depois de recebê-las
    if (t && !fila.some((it) => it.token === t)) N.chamar('sair', { p_token: t }).catch(() => {});
    else if (t) fila.push({ token: t, sair: true }), gravar(KEY_FILA, fila);
    limparSessao();
  }

  // Compatibilidade: sessao.get() = quem está logado; sessao.set(null) = sair
  const sessao = {
    get: () => eu,
    set(u) { if (!u) return sair(); if (!nuvem) { eu = u; gravar(KEY_SESSAO, u.id); } },
  };

  /* Primeiro acesso (modo nuvem): ainda não existe administrador? */
  async function situacao() {
    if (!nuvem) return { ok: true, temAdmin: true, modo: 'local' };
    return { ...(await N.chamar('situacao')), modo: 'nuvem' };
  }
  async function criarPrimeiroAdmin(d) {
    const r = await N.chamar('criar_primeiro_admin', { p_nome: d.nome, p_email: d.email, p_login: d.login, p_senha: d.senha });
    token = r.token; gravar(KEY_TOKEN, token);
    await recarregar();
    return eu;
  }

  /* ====================== Usuários ====================== */
  function trocarNoCache(lista, obj) {
    const i = lista.findIndex((x) => x.id === obj.id);
    if (i >= 0) { Object.keys(lista[i]).forEach((k) => delete lista[i][k]); Object.assign(lista[i], obj); return lista[i]; }
    lista.push(obj); return obj;
  }
  const users = {
    all: (perfil) => db.users.filter((u) => !perfil || u.perfil === perfil),
    get: (id) => db.users.find((u) => u.id === id),
    byLogin: (login) => db.users.find((u) => String(u.login).toLowerCase() === String(login).trim().toLowerCase()),
    alunosDaTurma: (turmaId) => db.users.filter((u) => u.perfil === 'aluno' && u.turmaId === turmaId),
    // Cria um usuário. dados: { nome, login, email?, perfil, turmaId?, senha, senhaFiguras? }
    async create(dados) {
      if (nuvem) {
        const r = await N.chamar('salvar_usuario', { p_token: token, p_dados: { ...dados, id: TS.U.uid() } });
        const u = trocarNoCache(db.users, r.usuario); guardarCopia(); return u;
      }
      conferirUnicos(dados);
      const u = { id: TS.U.uid(), ativo: true, criadoEm: TS.U.hoje(), ...definidos(dados), temFiguras: !!(dados.senhaFiguras || []).length };
      db.users.push(u); save(); return u;
    },
    // Altera um usuário (só os campos enviados). senha / senhaFiguras: só quando for trocar.
    async update(id, dados) {
      if (nuvem) {
        const r = await N.chamar('salvar_usuario', { p_token: token, p_dados: { ...definidos(dados), id } });
        const u = trocarNoCache(db.users, r.usuario);
        if (eu && eu.id === u.id) eu = u;
        guardarCopia(); return u;
      }
      const u = users.get(id);
      conferirUnicos({ ...u, ...dados }, id);
      Object.assign(u, definidos(dados));
      if (dados.senhaFiguras) u.temFiguras = true;
      save(); return u;
    },
    async remove(id) {
      if (nuvem) await N.chamar('excluir_usuario', { p_token: token, p_id: id });
      db.users = db.users.filter((u) => u.id !== id);
      delete db.progresso[id];
      db.sessoes = db.sessoes.filter((s) => s.alunoId !== id);
      db.turmas.forEach((t) => { if (t.professorId === id) t.professorId = null; });
      save();
    },
  };
  // Modo local: as mesmas regras do banco (login e e-mail não podem repetir)
  function conferirUnicos(d, id) {
    const login = String(d.login || '').trim().toLowerCase();
    if (db.users.some((u) => u.id !== id && String(u.login).toLowerCase() === login)) throw erro('login_existe', 'Esse login já existe. Escolha outro.');
    const email = String(d.email || '').trim().toLowerCase();
    if (email && d.perfil !== 'aluno' && db.users.some((u) => u.id !== id && u.perfil !== 'aluno' && String(u.email || '').toLowerCase() === email)) throw erro('email_existe', 'Esse e-mail já está em uso.');
  }
  // Cartão de acesso do aluno (senha simples e figuras) para a professora reimprimir
  async function dadosAcesso(alunoId) {
    if (nuvem) return (await N.chamar('dados_acesso', { p_token: token, p_aluno: alunoId })).acesso || {};
    const u = users.get(alunoId) || {};
    return { senha: u.senha, senhaFiguras: u.senhaFiguras };
  }
  // Meu perfil (professor/administrador): nome, e-mail e senha. Pede a senha atual.
  async function atualizarPerfil({ senhaAtual, nome, email, novaSenha }) {
    if (nuvem) {
      const r = await N.chamar('atualizar_perfil', { p_token: token, p_senha_atual: senhaAtual, p_nome: nome || null, p_email: email || null, p_nova_senha: novaSenha || null });
      eu = trocarNoCache(db.users, r.usuario); guardarCopia(); return eu;
    }
    if (String(eu.senha) !== String(senhaAtual)) throw erro('senha_atual', 'A senha atual não confere.');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw erro('email', 'E-mail inválido.');
    if (novaSenha && novaSenha.length < 6) throw erro('senha_curta', 'A nova senha precisa ter pelo menos 6 caracteres.');
    conferirUnicos({ ...eu, email: email || eu.email }, eu.id);
    Object.assign(eu, definidos({ nome: nome || undefined, email: email ? email.toLowerCase() : undefined, senha: novaSenha || undefined }));
    save(); return eu;
  }

  /* ====================== Turmas ====================== */
  const turmas = {
    all: () => db.turmas.slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    get: (id) => db.turmas.find((t) => t.id === id),
    doProfessor: (pid) => db.turmas.filter((t) => t.professorId === pid).sort((a, b) => a.nome.localeCompare(b.nome)),
    async create(d) {
      if (nuvem) { const r = await N.chamar('salvar_turma', { p_token: token, p_dados: { ...d, id: TS.U.uid() } }); const t = trocarNoCache(db.turmas, r.turma); guardarCopia(); return t; }
      const t = { id: TS.U.uid(), criadoEm: TS.U.hoje(), ...d }; db.turmas.push(t); save(); return t;
    },
    async update(id, d) {
      if (nuvem) { const r = await N.chamar('salvar_turma', { p_token: token, p_dados: { ...d, id } }); const t = trocarNoCache(db.turmas, r.turma); guardarCopia(); return t; }
      const t = turmas.get(id); Object.assign(t, d); save(); return t;
    },
    async remove(id) {
      if (nuvem) await N.chamar('excluir_turma', { p_token: token, p_id: id });
      db.turmas = db.turmas.filter((t) => t.id !== id);
      db.users.forEach((u) => { if (u.turmaId === id) u.turmaId = null; });
      db.atividades.forEach((a) => { a.turmas = (a.turmas || []).filter((x) => x !== id); });
      save();
    },
  };

  /* ====================== Atividades criadas pelo professor ======================
     { id, titulo, modelo, criterio, turmas: [ids], hab, instrucao, rodadas: [...], status: 'rascunho' | 'publicada', professorId } */
  const atividades = {
    all: () => db.atividades.slice().sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm))),
    get: (id) => db.atividades.find((a) => a.id === id),
    // As que o aluno vê: publicadas para a turma dele (mais novas primeiro)
    daTurma: (turmaId) => db.atividades.filter((a) => a.status === 'publicada' && (a.turmas || []).includes(turmaId))
      .sort((a, b) => String(b.publicadaEm || b.criadoEm).localeCompare(String(a.publicadaEm || a.criadoEm))),
    // As que o professor vê: as que ele criou e as que foram mandadas para as turmas dele
    doProfessor: (pid) => {
      const minhas = new Set(db.turmas.filter((t) => t.professorId === pid).map((t) => t.id));
      return atividades.all().filter((a) => a.professorId === pid || (a.turmas || []).some((t) => minhas.has(t)));
    },
    async create(d) {
      const dados = { ...copiar(d), id: TS.U.uid(), professorId: d.professorId || (eu && eu.id) };
      if (nuvem) { const r = await N.chamar('salvar_atividade', { p_token: token, p_dados: dados }); const a = trocarNoCache(db.atividades, r.atividade); guardarCopia(); return a; }
      const agora = TS.U.hoje();
      const a = { ...dados, criadoEm: agora, atualizadoEm: agora };
      if (a.status === 'publicada') a.publicadaEm = agora;
      db.atividades.push(a); save(); return a;
    },
    async update(id, d) {
      if (nuvem) { const r = await N.chamar('salvar_atividade', { p_token: token, p_dados: { ...copiar(d), id } }); const a = trocarNoCache(db.atividades, r.atividade); guardarCopia(); return a; }
      const a = atividades.get(id); const agora = TS.U.hoje();
      const publicando = d.status === 'publicada' && a.status !== 'publicada';
      Object.assign(a, copiar(d), { id, atualizadoEm: agora });
      if (publicando) a.publicadaEm = agora;
      save(); return a;
    },
    // Apagar a atividade também apaga os resultados dos alunos nela
    async remove(id) {
      if (nuvem) await N.chamar('excluir_atividade', { p_token: token, p_id: id });
      db.atividades = db.atividades.filter((a) => a.id !== id);
      db.sessoes = db.sessoes.filter((s) => s.atividadeId !== id);
      Object.values(db.progresso).forEach((p) => { if (p.atividades) delete p.atividades[id]; });
      save();
    },
    sessoes: (id) => db.sessoes.filter((s) => s.atividadeId === id),
  };

  /* ====================== Progresso do aluno ====================== */
  function progresso(alunoId) {
    if (!db.progresso[alunoId]) db.progresso[alunoId] = { fases: {}, ultimaFase: 'm1f1', figurinhas: [], cor: 'rosa', ultimoAcesso: null };
    const p = db.progresso[alunoId];
    p.fases = p.fases || {}; p.figurinhas = p.figurinhas || [];
    return p;
  }
  function liberada(alunoId, faseId) {
    const f = TS.C.fase(faseId); if (!f) return false;
    if (f.idx === 0) return true;
    const ant = TS.C.FASES[f.idx - 1];
    return !!(progresso(alunoId).fases[ant.id] || {}).concluida;
  }
  function faseAtual(alunoId) {
    const p = progresso(alunoId);
    const f = TS.C.FASES.find((x) => !(p.fases[x.id] || {}).concluida);
    return f || TS.C.FASES[TS.C.FASES.length - 1];
  }
  function estrelasTotal(alunoId) {
    return Object.values(progresso(alunoId).fases).reduce((s, f) => s + (f.estrelas || 0), 0);
  }

  // Atualiza o progresso com uma partida de fase do mapa (sem enviar ao banco)
  function contarSessao(s) {
    const p = progresso(s.alunoId);
    const f = p.fases[s.faseId] || (p.fases[s.faseId] = { estrelas: 0, melhorAcc: 0, tentativas: 0, concluida: false, primeiraVez: s.inicio });
    const antes = !!f.concluida;
    f.tentativas++; f.ultimaVez = s.fim;
    f.melhorAcc = Math.max(f.melhorAcc, s.acc);
    f.estrelas = Math.max(f.estrelas, s.estrelas);
    if (s.estrelas > 0) f.concluida = true;
    if (f.concluida && !antes) {
      const fig = TS.C.FIGURINHAS[TS.C.fase(s.faseId).idx];
      if (fig && !p.figurinhas.includes(fig)) p.figurinhas.push(fig);
    }
    p.ultimaFase = s.faseId; p.ultimoAcesso = s.fim;
    const sessao = { id: TS.U.uid(), atividadeId: null, ...s };
    db.sessoes.push(sessao);
    return { desbloqueou: f.concluida && !antes, fase: f, sessao };
  }
  /* Registra uma partida (enviada ao final da fase). */
  function registrarSessao(s) {
    const r = contarSessao(s);
    if (nuvem) enfileirar({ sessao: r.sessao, alunoId: s.alunoId, progresso: progresso(s.alunoId) }); else save();
    return { desbloqueou: r.desbloqueou, fase: r.fase };
  }
  /* Atividade da professora jogada pelo aluno. Conta para o painel do professor
     (acerto por habilidade, itens mais errados, situação do aluno), mas não abre fases nem dá figurinha. */
  function progressoAtividade(alunoId, atividadeId) { return (progresso(alunoId).atividades || {})[atividadeId] || null; }
  function contarSessaoAtividade(s) {
    const p = progresso(s.alunoId);
    p.atividades = p.atividades || {};
    const a = p.atividades[s.atividadeId] || (p.atividades[s.atividadeId] = { estrelas: 0, melhorAcc: 0, tentativas: 0, primeiraVez: s.inicio });
    const primeira = a.tentativas === 0;
    a.tentativas++; a.ultimaVez = s.fim;
    a.melhorAcc = Math.max(a.melhorAcc, s.acc);
    a.estrelas = Math.max(a.estrelas, s.estrelas);
    p.ultimoAcesso = s.fim;
    const sessao = { id: TS.U.uid(), faseId: null, ...s };
    db.sessoes.push(sessao);
    return { primeira, atividade: a, sessao };
  }
  function registrarSessaoAtividade(s) {
    const r = contarSessaoAtividade(s);
    if (nuvem) enfileirar({ sessao: r.sessao, alunoId: s.alunoId, progresso: progresso(s.alunoId) }); else save();
    return { primeira: r.primeira, atividade: r.atividade };
  }
  // Grava só o progresso (ex.: o aluno trocou a cor do Bip)
  function salvarProgresso(alunoId) {
    if (nuvem) enfileirar({ alunoId, progresso: progresso(alunoId) }); else save();
  }
  function marcarAcesso(alunoId) { progresso(alunoId).ultimoAcesso = TS.U.hoje(); salvarProgresso(alunoId); }

  /* ====================== Fila de envio (modo nuvem) ====================== */
  function enfileirar(it) {
    if (!token) return;
    const item = copiar({ ...it, token });
    const ult = fila[fila.length - 1];
    // Duas gravações seguidas só de progresso: basta mandar a última
    if (ult && !ult.sessao && !ult.sair && !item.sessao && ult.token === item.token) fila[fila.length - 1] = item; else fila.push(item);
    gravar(KEY_FILA, fila); guardarCopia(); avisar();
    enviarFila();
  }
  let enviando = false, tentarDeNovo = null;
  async function enviarFila() {
    if (!nuvem || enviando || !fila.length) return;
    enviando = true; clearTimeout(tentarDeNovo);
    try {
      while (fila.length) {
        const it = fila[0];
        try {
          if (it.sair) await N.chamar('sair', { p_token: it.token });
          else await N.chamar('salvar_jogo', { p_token: it.token, p_sessao: it.sessao || null, p_progresso: it.progresso || null });
          semInternet = false;
        } catch (e) {
          if (e.codigo === 'rede' || e.codigo === 'servidor') { semInternet = e.codigo === 'rede'; tentarDeNovo = setTimeout(enviarFila, 15000); break; }
          console.warn('Gravação descartada pelo banco:', e.codigo, e.message); // sessão vencida, sem permissão...
        }
        fila.shift(); gravar(KEY_FILA, fila);
      }
    } finally { enviando = false; avisar(); }
  }
  window.addEventListener('online', () => enviarFila());
  function avisar() { ouvintes.forEach((f) => { try { f(estado()); } catch (e) { /* segue */ } }); }
  const estado = () => ({ modo: nuvem ? 'nuvem' : 'local', pendentes: fila.filter((x) => !x.sair).length, semInternet, url: nuvem ? N.url : '' });

  /* ====================== Dados de exemplo no banco (modo nuvem, administrador) ====================== */
  async function importarExemplo() {
    const real = db, eu0 = eu;
    db = vazio(); seed(); seedAtividades();
    const ex = db; db = real; eu = eu0;
    const users_ = ex.users.filter((u) => u.perfil !== 'admin');
    const r = await N.chamar('importar_exemplo', { p_token: token, p_dados: { turmas: ex.turmas, users: users_, atividades: ex.atividades, progresso: ex.progresso, sessoes: ex.sessoes } });
    await recarregar();
    return r;
  }

  /* ====================== Indicadores (painéis do professor) ====================== */
  const sessoesDe = (alunoIds, desde) => {
    const set = new Set(alunoIds);
    return db.sessoes.filter((s) => set.has(s.alunoId) && (!desde || new Date(s.fim) >= desde));
  };

  function statusAluno(alunoId) {
    const p = progresso(alunoId);
    const ss = db.sessoes.filter((s) => s.alunoId === alunoId).sort((a, b) => String(a.fim).localeCompare(String(b.fim)));
    if (!ss.length) return { cod: 'novo', rotulo: 'Ainda não jogou', motivo: 'Nenhuma sessão registrada' };
    const atual = faseAtual(alunoId);
    const fa = p.fases[atual.id];
    const ult = ss.slice(-3);
    const media = ult.reduce((s, x) => s + x.acc, 0) / ult.length;
    const diasSemJogar = TS.U.diasEntre(p.ultimoAcesso || ss[ss.length - 1].fim);
    const diasNaFase = fa && !fa.concluida ? TS.U.diasEntre(fa.primeiraVez) : 0;
    if (fa && !fa.concluida && fa.tentativas >= 3) return { cod: 'dificuldade', rotulo: 'Com dificuldade', motivo: `${fa.tentativas} tentativas sem passar da fase ${atual.mundo}-${atual.fase}`, parado: diasNaFase };
    if (fa && !fa.concluida && diasNaFase >= 7) return { cod: 'dificuldade', rotulo: 'Com dificuldade', motivo: `Parado na fase ${atual.mundo}-${atual.fase} há ${diasNaFase} dias`, parado: diasNaFase };
    if (media < 0.5) return { cod: 'dificuldade', rotulo: 'Com dificuldade', motivo: `Acerto recente de ${TS.U.pct(media)}` };
    if (diasSemJogar >= 7) return { cod: 'atencao', rotulo: 'Atenção', motivo: `Sem jogar há ${diasSemJogar} dias` };
    if (media < 0.7) return { cod: 'atencao', rotulo: 'Atenção', motivo: `Acerto recente de ${TS.U.pct(media)}` };
    return { cod: 'ok', rotulo: 'Em dia', motivo: `Acerto recente de ${TS.U.pct(media)}` };
  }

  function estadoFase(alunoId, faseId) {
    const f = progresso(alunoId).fases[faseId];
    if (f && f.concluida) return { cod: 'concluida', estrelas: f.estrelas, f };
    if (!liberada(alunoId, faseId)) return { cod: 'bloqueada' };
    if (f && (f.tentativas >= 3 || TS.U.diasEntre(f.primeiraVez) >= 7)) return { cod: 'dificuldade', f };
    if (faseAtual(alunoId).id === faseId && statusAluno(alunoId).cod === 'dificuldade') return { cod: 'dificuldade', f };
    return { cod: 'andamento', f };
  }

  function acertoPorHabilidade(ss) {
    const r = {}; Object.keys(TS.C.HAB).forEach((h) => (r[h] = { ok: 0, tot: 0 }));
    ss.forEach((s) => (s.itens || []).forEach((i) => { if (!r[s.hab]) return; r[s.hab].tot++; if (i.ok) r[s.hab].ok++; }));
    return r;
  }
  function itensMaisErrados(ss, n = 10) {
    const m = {};
    ss.forEach((s) => (s.itens || []).forEach((i) => {
      const k = i.r; m[k] = m[k] || { rotulo: k, hab: s.hab, faseId: s.faseId || s.atividadeId, ok: 0, tot: 0, ouvidos: [] };
      m[k].tot++; if (i.ok) m[k].ok++;
      if (!i.ok && i.ouvido && m[k].ouvidos.length < 3 && !m[k].ouvidos.includes(i.ouvido)) m[k].ouvidos.push(i.ouvido);
    }));
    return Object.values(m).filter((x) => x.tot - x.ok > 0)
      .map((x) => ({ ...x, erros: x.tot - x.ok, taxaErro: (x.tot - x.ok) / x.tot }))
      .sort((a, b) => b.erros - a.erros || b.taxaErro - a.taxaErro).slice(0, n);
  }
  function atividadesMaisErradas(ss) {
    const m = {};
    // "faseId" aqui pode ser uma fase do mapa ou uma atividade do professor
    ss.forEach((s) => { const k = s.faseId || s.atividadeId; m[k] = m[k] || { faseId: k, ok: 0, tot: 0 }; m[k].ok += s.acertos; m[k].tot += s.acertos + s.erros; });
    return Object.values(m).filter((x) => x.tot > 0).map((x) => ({ ...x, taxaErro: 1 - x.ok / x.tot })).sort((a, b) => b.taxaErro - a.taxaErro);
  }

  /* ====================== Dados de demonstração ======================
     No modo local, criados na primeira vez. No modo nuvem, o administrador pode mandar para o banco
     (botão "Criar dados de exemplo" no Painel geral). */
  function seed() {
    let s = 20260929;
    const r = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const mk = (d) => { const u = { id: TS.U.uid(), ativo: true, criadoEm: new Date(Date.now() - 60 * 864e5).toISOString(), ...d }; u.temFiguras = !!(u.senhaFiguras || []).length; db.users.push(u); return u; };
    mk({ nome: 'Marta Administradora', login: 'admin', senha: 'admin123', perfil: 'admin', email: 'admin@escola.edu.br' });
    const ana = mk({ nome: 'Ana Paula Souza', login: 'prof.ana', senha: '123456', perfil: 'professor', email: 'ana@escola.edu.br' });
    const carlos = mk({ nome: 'Carlos Lima', login: 'prof.carlos', senha: '123456', perfil: 'professor', email: 'carlos@escola.edu.br' });
    mk({ nome: 'Beatriz Nunes', login: 'prof.bia', senha: '123456', perfil: 'professor', email: 'bia@escola.edu.br', ativo: false });
    const tA = { id: TS.U.uid(), nome: 'Infantil 5 A', professorId: ana.id, ano: 2026 };
    const tB = { id: TS.U.uid(), nome: '1º ano B', professorId: ana.id, ano: 2026 };
    const tC = { id: TS.U.uid(), nome: '1º ano C', professorId: carlos.id, ano: 2026 };
    db.turmas.push(tA, tB, tC);

    const FIG = ['pato', 'bola', 'maca', 'gato', 'sapo', 'uva', 'carro', 'flor', 'peixe'];
    // perfil: [nível geral, habilidade fraca, dias sem jogar]
    const alunos = [
      ['João Pedro Alves', 'joao', tA, 0.86, null, 0, 6],
      ['Maria Clara Dias', 'mariaclara', tA, 0.9, null, 1],
      ['Enzo Gabriel Rocha', 'enzo', tA, 0.7, 'rima', 0],
      ['Valentina Costa', 'valentina', tA, 0.78, null, 9],
      ['Miguel Santos', 'miguel', tA, 0.55, 'silaba', 2],
      ['Helena Ribeiro', 'helena', tA, 0.82, null, 0],
      ['Arthur Mendes', 'arthur', tA, 0.6, null, 0],
      ['Laura Fernandes', 'laura', tB, 0.92, null, 0],
      ['Davi Oliveira', 'davi', tB, 0.74, 'aliteracao', 1],
      ['Alice Carvalho', 'alice', tB, 0.88, null, 3],
      ['Bernardo Pires', 'bernardo', tB, 0.66, 'rima', 0],
      ['Sophia Martins', 'sophia', tB, 0.8, null, 12],
      ['Heitor Barbosa', 'heitor', tB, null, null, 0],
      ['Lorena Teixeira', 'lorena', tC, 0.84, null, 0],
      ['Theo Araújo', 'theo', tC, 0.58, 'fonema', 1],
      ['Cecília Gomes', 'cecilia', tC, 0.9, null, 0],
      ['Gael Moreira', 'gael', tC, 0.72, null, 5],
      ['Manuela Castro', 'manuela', tC, 0.48, 'palavra', 0],
    ];
    const ultimo = TS.C.FASES.length - 1;
    const agora = Date.now();
    alunos.forEach(([nome, login, t, nivel, fraca, off, teto], i) => {
      teto = teto ?? [23, 21, 17, 15, 11, 24, 16][i % 7];
      const figs = [FIG[i % 9], FIG[(i + 3) % 9], FIG[(i + 5) % 9]];
      const a = mk({ nome, login, senha: login === 'joao' ? '1234' : String(1000 + Math.floor(r() * 8999)), perfil: 'aluno', turmaId: t.id, senhaFiguras: figs });
      const p = progresso(a.id);
      p.cor = Object.keys(TS.GALACTICO.CORES)[i % 5];
      if (nivel == null) return; // aluno recém-cadastrado
      let dia = 34;
      const fim = off;
      while (dia > fim) {
        const f = faseAtual(a.id);
        if (f.idx > teto || (f.idx >= ultimo && (p.fases[f.id] || {}).concluida)) break;
        const n = f.rodadas * (f.tpl === 'caixas' ? 4 : f.tpl === 'ligar' ? 3 : 1);
        let hab = nivel - f.idx * 0.01 + (fraca === f.hab ? -0.3 : 0) + (r() - 0.5) * 0.2;
        if (p.fases[f.id]) hab += 0.06 * p.fases[f.id].tentativas; // aprende com a prática
        hab = Math.max(0.1, Math.min(0.98, hab));
        const itens = [];
        for (let k = 0; k < f.rodadas; k++) {
          const it = f.gen();
          const subs = it.tipo === 'caixas' ? 4 : it.tipo === 'ligar' ? 3 : 1;
          for (let j = 0; j < subs; j++) {
            const ok = r() < hab;
            const item = { r: (it.subRotulos || [])[j] || it.rotulo, ok };
            if (it.tipo === 'falar' && !ok) item.ouvido = it.erroComum || '';
            itens.push(item);
          }
        }
        const ac = itens.filter((x) => x.ok).length;
        const acc = ac / itens.length;
        const ini = new Date(agora - dia * 864e5 + (8 + r() * 6) * 36e5);
        const dur = 120 + Math.floor(r() * 300);
        contarSessao({ alunoId: a.id, faseId: f.id, hab: f.hab, inicio: ini.toISOString(), fim: new Date(+ini + dur * 1000).toISOString(),
          acertos: ac, erros: itens.length - ac, acc, estrelas: TS.C.estrelas(acc), duracaoSeg: dur, itens });
        dia -= r() < 0.35 ? 1 : r() < 0.6 ? 2 : 3;
      }
      p.ultimoAcesso = db.sessoes.filter((x) => x.alunoId === a.id).map((x) => x.fim).sort().pop() || null;
      // exemplo de aluno "parado há muito tempo" na mesma fase
      if (login === 'miguel') { const fa = p.fases[faseAtual(a.id).id]; if (fa) fa.primeiraVez = new Date(agora - 12 * 864e5).toISOString(); }
    });
  }

  /* Exemplos de atividades da professora Ana (Infantil 5 A e 1º ano B), com alguns resultados de alunos. */
  function seedAtividades() {
    const ana = users.byLogin('prof.ana');
    const tA = db.turmas.find((t) => t.nome === 'Infantil 5 A'); const tB = db.turmas.find((t) => t.nome === '1º ano B');
    if (!ana || !tA || !tB) return;
    let sem = 7;
    const r = () => { sem = (sem * 9301 + 49297) % 233280; return sem / 233280; };
    const dia = (n) => new Date(Date.now() - n * 864e5).toISOString();
    const base = { professorId: ana.id, hab: null, instrucao: '' };
    const mk = (d, criado) => { const a = { ...base, ...d, id: TS.U.uid(), criadoEm: dia(criado), atualizadoEm: dia(criado) }; if (a.status === 'publicada') a.publicadaEm = dia(criado); db.atividades.push(a); return a; };
    const a1 = mk({ titulo: 'Bater palmas com os animais', modelo: 'silabas', criterio: null, turmas: [tA.id], status: 'publicada',
      rodadas: ['gato', 'macaco', 'elefante', 'sapo', 'galinha'].map((palavra) => ({ palavra })) }, 6);
    const a2 = mk({ titulo: 'Quem rima com quem?', modelo: 'ligar', criterio: 'rima', turmas: [tA.id, tB.id], status: 'publicada',
      rodadas: [{ pares: [['pato', 'gato'], ['sorvete', 'tapete'], ['chave', 'nave']] }, { pares: [['pao', 'limao'], ['torta', 'porta'], ['cogumelo', 'castelo']] }] }, 4);
    mk({ titulo: 'Fale o nome dos transportes', modelo: 'falar', criterio: 'repetir', turmas: [tA.id], status: 'publicada',
      rodadas: ['carro', 'barco', 'aviao', 'trator', 'foguete'].map((palavra) => ({ palavra })) }, 2);
    mk({ titulo: 'Qual é a primeira letra?', modelo: 'letra', criterio: null, turmas: [tA.id], status: 'publicada',
      rodadas: ['bola', 'vaca', 'mesa', 'uva', 'sapo'].map((palavra) => ({ palavra })) }, 1);
    mk({ titulo: 'Frases da fazenda', modelo: 'palavras', criterio: null, turmas: [tA.id], status: 'rascunho',
      rodadas: [{ frase: 'A vaca come capim' }, { frase: 'O pato nada no lago' }, { frase: 'Eu vi um cavalo' }] }, 0);
    // Resultados: alguns alunos já fizeram as duas primeiras
    const jogar = (at, aluno, nivel, quando) => {
      const itens = [];
      TS.ATV.itens(at).forEach((it) => (it.subRotulos || [it.rotulo]).forEach((rot) => itens.push({ r: rot, ok: r() < nivel })));
      const ac = itens.filter((x) => x.ok).length; const acc = ac / itens.length;
      const ini = new Date(Date.now() - quando * 864e5 + 10 * 36e5); const dur = 90 + Math.floor(r() * 150);
      contarSessaoAtividade({ alunoId: aluno.id, atividadeId: at.id, hab: TS.ATV.habDe(at), inicio: ini.toISOString(), fim: new Date(+ini + dur * 1000).toISOString(),
        acertos: ac, erros: itens.length - ac, acc, estrelas: TS.C.estrelas(acc), duracaoSeg: dur, itens });
    };
    const nv = { joao: 0.9, mariaclara: 0.92, enzo: 0.55, helena: 0.8, miguel: 0.5, arthur: 0.62, laura: 0.9, davi: 0.7, alice: 0.85 };
    ['joao', 'mariaclara', 'enzo', 'helena', 'miguel'].forEach((l, i) => jogar(a1, users.byLogin(l), nv[l], 5 - i * 0.6));
    ['mariaclara', 'enzo', 'arthur', 'laura', 'davi', 'alice'].forEach((l, i) => jogar(a2, users.byLogin(l), nv[l], 3 - i * 0.4));
    jogar(a2, users.byLogin('enzo'), 0.7, 0.5); // o Enzo tentou de novo
  }

  return {
    iniciar, load: iniciar, recarregar, save, reset, entrar, entrarFiguras, sair, sessao, situacao, criarPrimeiroAdmin,
    users, turmas, atividades, dadosAcesso, atualizarPerfil, importarExemplo,
    progresso, liberada, faseAtual, estrelasTotal, registrarSessao, progressoAtividade, registrarSessaoAtividade, salvarProgresso, marcarAcesso,
    statusAluno, estadoFase, sessoesDe, acertoPorHabilidade, itensMaisErrados, atividadesMaisErradas,
    estado, aoMudar: (f) => ouvintes.push(f), enviarFila,
    get nuvem() { return nuvem; }, get raw() { return db; },
  };
})();
