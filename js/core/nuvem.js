/* nuvem.js — conversa com o banco de dados na nuvem (Supabase).
   O jogo não lê as tabelas diretamente: ele chama FUNÇÕES do banco (as de banco/supabase_instalar.sql),
   pelo endereço  <SUPABASE_URL>/rest/v1/rpc/<nome_da_funcao>. Cada função confere quem está pedindo.
   Não precisa de nenhuma biblioteca: é um fetch() comum. */
window.TS = window.TS || {};

TS.Nuvem = (function () {
  const cfg = TS.CONFIG || {};
  const url = String(cfg.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const chave = String(cfg.SUPABASE_CHAVE || '').trim();

  // O banco está configurado em js/config.js?
  const ativo = () => /^https?:\/\/\S+$/.test(url) && chave.length > 20;

  // Mensagens que aparecem para o professor/aluno quando algo dá errado
  const TEXTOS = {
    rede: 'Sem conexão com o banco de dados. Verifique a internet e tente de novo.',
    instalacao: 'O banco de dados ainda não foi preparado. No Supabase, rode o arquivo banco/supabase_instalar.sql (SQL Editor > Run).',
    chave: 'O Supabase não aceitou a chave. Confira SUPABASE_URL e SUPABASE_CHAVE em js/config.js.',
    sessao: 'Sua sessão terminou. Entre de novo.',
    servidor: 'O banco de dados respondeu com um erro. Tente de novo em instantes.',
  };
  function erro(codigo, msg, extra) {
    const e = new Error(msg || TEXTOS[codigo] || codigo);
    e.codigo = codigo; e.extra = extra;
    return e;
  }

  /* chamar('entrar', { p_login: 'ana', p_senha: '...' }) -> Promise com a resposta da função.
     Se a função devolver { erro: 'codigo', msg }, a Promise falha com esse código (e.codigo) e mensagem. */
  async function chamar(fn, args = {}, { tempo = 20000 } = {}) {
    if (!ativo()) throw erro('instalacao', 'O banco não está configurado (js/config.js).');
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', apikey: chave };
    // A chave "anon" antiga é um JWT e também vai no Authorization; a nova "publishable" vai só no apikey
    if (/^eyJ/.test(chave)) headers.Authorization = 'Bearer ' + chave;
    const ctl = window.AbortController ? new AbortController() : null;
    const relogio = setTimeout(() => ctl && ctl.abort(), tempo);
    let res;
    try {
      res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args), signal: ctl ? ctl.signal : undefined, cache: 'no-store' });
    } catch (e) {
      throw erro('rede');
    } finally { clearTimeout(relogio); }
    let dados = null;
    try { dados = await res.json(); } catch (e) { dados = null; }
    if (!res.ok) {
      const msg = String((dados && (dados.message || dados.msg || dados.error_description || dados.error)) || `HTTP ${res.status}`);
      if (/\bsessao\b/.test(msg)) throw erro('sessao');
      if (res.status === 404 || (dados && dados.code === 'PGRST202')) throw erro('instalacao');
      if (res.status === 401 || res.status === 403 || /api key|apikey|JWT/i.test(msg)) throw erro('chave');
      throw erro('servidor', TEXTOS.servidor + ' (' + msg + ')');
    }
    if (dados && dados.erro) throw erro(dados.erro, dados.msg || dados.erro, dados);
    return dados;
  }

  return { ativo, chamar, erro, TEXTOS, get url() { return url; } };
})();
