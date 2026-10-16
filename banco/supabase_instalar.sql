-- =====================================================================================
-- Abecedário Galáctico — banco de dados (Supabase / PostgreSQL)
--
-- COMO USAR (uma vez só):
--   Supabase > seu projeto > SQL Editor > New query > cole ESTE ARQUIVO INTEIRO > Run.
--   Pode rodar de novo quando sair uma versão nova do jogo: o script só cria o que ainda não existe,
--   atualiza as funções e NÃO apaga nenhum dado.
--
-- O QUE FICA GUARDADO
--   usuarios ...... nome, id, e-mail, login e senha (criptografada) de alunos, professores e administradores
--   turmas ........ as turmas e o professor responsável
--   atividades .... as atividades criadas pelos professores
--   progresso ..... fases concluídas, estrelas, figurinhas e cor do Bip de cada aluno
--   sessoes ....... cada vez que um aluno jogou uma fase ou atividade (acertos, erros, tempo, respostas)
--   acessos ....... os "crachás" de quem está conectado (só o código criptografado do crachá)
--
-- SEGURANÇA
--   * Senhas NUNCA ficam em texto: viram um "hash" bcrypt (crypt + gen_salt('bf')). Nem o administrador do
--     banco consegue ler a senha de alguém; só dá para conferir se a senha digitada está certa.
--   * A senha simples do aluno (4 números) e a senha por figuras também ficam guardadas CIFRADAS, para que a
--     professora possa reimprimir o cartão de acesso da criança. Só o professor da turma e o administrador veem.
--   * As tabelas ficam fechadas (Row Level Security ligada e sem permissão para o público).
--     O jogo só conversa com o banco por meio das FUNÇÕES abaixo, e cada função confere quem está pedindo.
--   * Depois de 8 senhas erradas seguidas, o login fica bloqueado por 5 minutos (protege contra adivinhação).
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- Funções auxiliares ficam no esquema "privado", que o site não enxerga.
create schema if not exists privado;
revoke all on schema privado from public;

-- -------------------------------------------------------------------------------------
-- 1) TABELAS
-- -------------------------------------------------------------------------------------
create table if not exists public.turmas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  ano           int,
  professor_id  uuid,                                   -- quem é o professor responsável
  criado_em     timestamptz not null default now()
);

create table if not exists public.usuarios (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  email          text,                                  -- obrigatório para professor e administrador
  login          text not null,                         -- o que a pessoa digita para entrar
  senha_hash     text not null,                         -- senha criptografada (bcrypt)
  figuras_hash   text,                                  -- senha por figuras do aluno (criptografada)
  acesso_cifrado bytea,                                 -- cartão de acesso do aluno (senha e figuras), cifrado
  perfil         text not null check (perfil in ('aluno', 'professor', 'admin')),
  turma_id       uuid references public.turmas(id) on delete set null,   -- só para alunos
  ativo          boolean not null default true,
  falhas         int not null default 0,                -- senhas erradas seguidas
  bloqueado_ate  timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create unique index if not exists usuarios_login_unico on public.usuarios (lower(login));
create unique index if not exists usuarios_email_unico on public.usuarios (lower(email)) where email is not null and perfil <> 'aluno';
create index if not exists usuarios_turma on public.usuarios (turma_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'turmas_professor_fk') then
    alter table public.turmas add constraint turmas_professor_fk
      foreign key (professor_id) references public.usuarios(id) on delete set null;
  end if;
end $$;

create table if not exists public.acessos (
  token_hash  text primary key,                          -- sha256 do crachá (o crachá mesmo só fica no aparelho)
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null,
  ultimo_uso  timestamptz not null default now()
);
create index if not exists acessos_usuario on public.acessos (usuario_id);

create table if not exists public.atividades (
  id            uuid primary key default gen_random_uuid(),
  professor_id  uuid references public.usuarios(id) on delete set null,
  titulo        text not null,
  modelo        text not null,                           -- silabas, palavras, montar, letra, escolha, vf, caixas, ligar, falar
  criterio      text,
  hab           text,
  instrucao     text,
  turmas        uuid[] not null default '{}',
  rodadas       jsonb not null default '[]',
  status        text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  publicada_em  timestamptz
);

create table if not exists public.progresso (
  aluno_id      uuid primary key references public.usuarios(id) on delete cascade,
  dados         jsonb not null default '{}',             -- fases, estrelas, figurinhas, cor do Bip, atividades
  atualizado_em timestamptz not null default now()
);

create table if not exists public.sessoes (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.usuarios(id) on delete cascade,
  fase_id       text,                                    -- fase do mapa (ex.: m1f2) ...
  atividade_id  uuid references public.atividades(id) on delete cascade,  -- ... ou atividade da professora
  hab           text,
  inicio        timestamptz,
  fim           timestamptz,
  acertos       int not null default 0,
  erros         int not null default 0,
  acc           real,
  estrelas      int not null default 0,
  duracao_seg   int not null default 0,
  itens         jsonb not null default '[]',             -- cada resposta: { r: "rótulo", ok: true/false, ouvido?: "..." }
  criado_em     timestamptz not null default now()
);
create index if not exists sessoes_aluno on public.sessoes (aluno_id, fim);
create index if not exists sessoes_atividade on public.sessoes (atividade_id);

-- Chave usada para cifrar o cartão de acesso dos alunos (gerada uma vez, fica só no banco)
create table if not exists privado.config (
  id     int primary key default 1 check (id = 1),
  chave  text not null
);
insert into privado.config (id, chave) values (1, encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;

-- Tabelas fechadas para o público: só as funções (security definer) mexem nelas
alter table public.turmas     enable row level security;
alter table public.usuarios   enable row level security;
alter table public.acessos    enable row level security;
alter table public.atividades enable row level security;
alter table public.progresso  enable row level security;
alter table public.sessoes    enable row level security;
revoke all on public.turmas, public.usuarios, public.acessos, public.atividades, public.progresso, public.sessoes from anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 2) FUNÇÕES AUXILIARES (esquema privado)
-- -------------------------------------------------------------------------------------
create or replace function privado.hash(p text) returns text
language sql volatile set search_path = public, extensions, pg_temp
as $$ select case when p is null then null else crypt(p, gen_salt('bf', 8)) end $$;

create or replace function privado.confere(p text, h text) returns boolean
language sql stable set search_path = public, extensions, pg_temp
as $$ select coalesce(h is not null and p is not null and h = crypt(p, h), false) $$;

create or replace function privado.sha(p text) returns text
language sql immutable set search_path = public, extensions, pg_temp
as $$ select encode(digest(coalesce(p, ''), 'sha256'), 'hex') $$;

-- Data no formato que o JavaScript usa (2026-10-12T20:12:00.000Z)
create or replace function privado.iso(t timestamptz) returns text
language sql immutable
as $$ select case when t is null then null else to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end $$;

-- Senha por figuras: a ordem importa ("pato,gato,uva")
create or replace function privado.figuras_txt(f jsonb) returns text
language sql immutable
as $$ select case when f is null or jsonb_typeof(f) <> 'array' or jsonb_array_length(f) = 0 then null
                  else (select string_agg(lower(x), ',' order by n) from jsonb_array_elements_text(f) with ordinality as e(x, n)) end $$;

create or replace function privado.cifrar(j jsonb) returns bytea
language sql volatile set search_path = public, extensions, pg_temp
as $$ select pgp_sym_encrypt(j::text, (select chave from privado.config where id = 1)) $$;

create or replace function privado.decifrar(b bytea) returns jsonb
language sql stable set search_path = public, extensions, pg_temp
as $$ select case when b is null then null else pgp_sym_decrypt(b, (select chave from privado.config where id = 1))::jsonb end $$;

create or replace function privado.erro(cod text, msg text default null) returns jsonb
language sql immutable
as $$ select jsonb_build_object('erro', cod, 'msg', coalesce(msg, cod)) $$;

create or replace function privado.json_usuario(u public.usuarios, ver_email boolean default true) returns jsonb
language sql stable
as $$ select jsonb_build_object('id', u.id, 'nome', u.nome, 'email', case when ver_email then u.email end, 'login', u.login,
            'perfil', u.perfil, 'turmaId', u.turma_id, 'ativo', u.ativo, 'criadoEm', privado.iso(u.criado_em),
            'temFiguras', u.figuras_hash is not null) $$;

create or replace function privado.json_turma(t public.turmas) returns jsonb
language sql stable
as $$ select jsonb_build_object('id', t.id, 'nome', t.nome, 'ano', t.ano, 'professorId', t.professor_id, 'criadoEm', privado.iso(t.criado_em)) $$;

create or replace function privado.json_atividade(a public.atividades) returns jsonb
language sql stable
as $$ select jsonb_build_object('id', a.id, 'professorId', a.professor_id, 'titulo', a.titulo, 'modelo', a.modelo, 'criterio', a.criterio,
            'hab', a.hab, 'instrucao', coalesce(a.instrucao, ''), 'turmas', to_jsonb(a.turmas), 'rodadas', a.rodadas, 'status', a.status,
            'criadoEm', privado.iso(a.criado_em), 'atualizadoEm', privado.iso(a.atualizado_em), 'publicadaEm', privado.iso(a.publicada_em)) $$;

create or replace function privado.json_sessao(s public.sessoes) returns jsonb
language sql stable
as $$ select jsonb_build_object('id', s.id, 'alunoId', s.aluno_id, 'faseId', s.fase_id, 'atividadeId', s.atividade_id, 'hab', s.hab,
            'inicio', privado.iso(s.inicio), 'fim', privado.iso(s.fim), 'acertos', s.acertos, 'erros', s.erros, 'acc', s.acc,
            'estrelas', s.estrelas, 'duracaoSeg', s.duracao_seg, 'itens', s.itens) $$;

-- Cria um crachá de acesso (token) e devolve o crachá. No banco fica só o sha256 dele.
create or replace function privado.novo_acesso(p_uid uuid, p_dias int) returns text
language plpgsql volatile set search_path = public, extensions, pg_temp
as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  delete from public.acessos where usuario_id = p_uid and expira_em < now();
  insert into public.acessos (token_hash, usuario_id, expira_em)
  values (privado.sha(t), p_uid, now() + make_interval(days => greatest(1, least(coalesce(p_dias, 30), 180))));
  return t;
end $$;

-- Quem está pedindo? Confere o crachá. Se não valer, a função para com o erro "sessao".
create or replace function privado.quem(p_token text) returns public.usuarios
language plpgsql volatile set search_path = public, extensions, pg_temp
as $$
declare u public.usuarios; a public.acessos;
begin
  select * into a from public.acessos where token_hash = privado.sha(p_token) and expira_em > now();
  if not found then raise exception 'sessao' using errcode = 'P0001'; end if;
  select * into u from public.usuarios where id = a.usuario_id;
  if not found or not u.ativo then raise exception 'sessao' using errcode = 'P0001'; end if;
  if a.ultimo_uso < now() - interval '1 hour' then
    update public.acessos set ultimo_uso = now() where token_hash = a.token_hash;
  end if;
  return u;
end $$;

-- Turmas que a pessoa pode ver
create or replace function privado.turmas_de(eu public.usuarios) returns uuid[]
language sql stable set search_path = public, pg_temp
as $$ select case
  when eu.perfil = 'admin' then coalesce((select array_agg(id) from public.turmas), '{}')
  when eu.perfil = 'professor' then coalesce((select array_agg(id) from public.turmas where professor_id = eu.id), '{}')
  else case when eu.turma_id is null then '{}'::uuid[] else array[eu.turma_id] end end $$;

-- Confere senha (ou figuras) e cuida do bloqueio depois de muitas tentativas erradas
create or replace function privado.tentar(u public.usuarios, ok boolean, p_dias int) returns jsonb
language plpgsql volatile set search_path = public, extensions, pg_temp
as $$
begin
  if not ok then
    -- mais uma senha errada; na 8ª seguida, bloqueia por 5 minutos e zera a contagem
    update public.usuarios set
      bloqueado_ate = case when falhas + 1 >= 8 then now() + interval '5 minutes' else bloqueado_ate end,
      falhas = case when falhas + 1 >= 8 then 0 else falhas + 1 end
    where id = u.id;
    return privado.erro('senha', 'Senha incorreta.');
  end if;
  update public.usuarios set falhas = 0, bloqueado_ate = null where id = u.id;
  return jsonb_build_object('ok', true, 'token', privado.novo_acesso(u.id, p_dias), 'usuario', privado.json_usuario(u));
end $$;

revoke all on all functions in schema privado from public;

-- -------------------------------------------------------------------------------------
-- 3) FUNÇÕES QUE O JOGO CHAMA (cada uma confere quem está pedindo)
-- -------------------------------------------------------------------------------------

-- O banco está instalado? Já existe administrador?
create or replace function public.situacao() returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$ select jsonb_build_object('ok', true, 'versao', 1, 'temAdmin', exists (select 1 from public.usuarios where perfil = 'admin')) $$;

-- Primeiro acesso: cria a conta do administrador (só funciona enquanto não existir nenhum)
create or replace function public.criar_primeiro_admin(p_nome text, p_email text, p_login text, p_senha text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare u public.usuarios;
begin
  perform pg_advisory_xact_lock(4242);
  if exists (select 1 from public.usuarios where perfil = 'admin') then return privado.erro('ja_existe', 'O administrador já foi criado.'); end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then return privado.erro('nome', 'Informe o nome.'); end if;
  if coalesce(p_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return privado.erro('email', 'E-mail inválido.'); end if;
  if coalesce(p_login, '') !~ '^[a-z0-9._]{3,40}$' then return privado.erro('login', 'Login: de 3 a 40 letras minúsculas, números, ponto ou _.'); end if;
  if length(coalesce(p_senha, '')) < 6 then return privado.erro('senha_curta', 'A senha precisa ter pelo menos 6 caracteres.'); end if;
  begin
    insert into public.usuarios (nome, email, login, senha_hash, perfil)
    values (trim(p_nome), lower(trim(p_email)), lower(trim(p_login)), privado.hash(p_senha), 'admin') returning * into u;
  exception when unique_violation then
    return privado.erro('login_existe', 'Esse login já existe.');
  end;
  return jsonb_build_object('ok', true, 'token', privado.novo_acesso(u.id, 30), 'usuario', privado.json_usuario(u));
end $$;

-- Entrar com login (ou e-mail) e senha. Serve para alunos, professores e administradores.
create or replace function public.entrar(p_login text, p_senha text, p_dias int default 30) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare u public.usuarios;
begin
  select * into u from public.usuarios
   where lower(login) = lower(trim(coalesce(p_login, ''))) or (perfil <> 'aluno' and lower(email) = lower(trim(coalesce(p_login, ''))))
   order by (lower(login) = lower(trim(coalesce(p_login, '')))) desc limit 1;
  if not found then return privado.erro('nao_encontrado', 'Usuário não encontrado.'); end if;
  if not u.ativo then return privado.erro('inativo', 'Usuário desativado.'); end if;
  if u.bloqueado_ate is not null and u.bloqueado_ate > now() then
    return privado.erro('bloqueado', 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.');
  end if;
  return privado.tentar(u, privado.confere(coalesce(p_senha, ''), u.senha_hash), p_dias);
end $$;

-- Entrar com a senha por figuras (só alunos)
create or replace function public.entrar_figuras(p_login text, p_figuras jsonb, p_dias int default 180) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare u public.usuarios;
begin
  select * into u from public.usuarios where lower(login) = lower(trim(coalesce(p_login, ''))) and perfil = 'aluno';
  if not found then return privado.erro('nao_encontrado', 'Usuário não encontrado.'); end if;
  if not u.ativo then return privado.erro('inativo', 'Usuário desativado.'); end if;
  if u.bloqueado_ate is not null and u.bloqueado_ate > now() then
    return privado.erro('bloqueado', 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.');
  end if;
  return privado.tentar(u, privado.confere(privado.figuras_txt(p_figuras), u.figuras_hash), p_dias);
end $$;

-- Sair: apaga o crachá deste aparelho
create or replace function public.sair(p_token text) returns jsonb
language sql volatile security definer set search_path = public, extensions, pg_temp
as $$ delete from public.acessos where token_hash = privado.sha(p_token); select jsonb_build_object('ok', true) $$;

-- Tudo o que a pessoa pode ver, de uma vez (o jogo guarda uma cópia e trabalha com ela)
create or replace function public.carregar(p_token text, p_dias_sessoes int default 400) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; ts uuid[]; al uuid[]; desde timestamptz;
begin
  eu := privado.quem(p_token);
  if eu.perfil = 'aluno' then
    return jsonb_build_object('ok', true, 'usuario', privado.json_usuario(eu),
      'users', jsonb_build_array(privado.json_usuario(eu)),
      'turmas', coalesce((select jsonb_agg(privado.json_turma(t)) from public.turmas t where t.id = eu.turma_id), '[]'::jsonb),
      'atividades', coalesce((select jsonb_agg(privado.json_atividade(a)) from public.atividades a
                               where a.status = 'publicada' and eu.turma_id is not null and eu.turma_id = any(a.turmas)), '[]'::jsonb),
      'progresso', jsonb_build_object(eu.id::text, coalesce((select dados from public.progresso where aluno_id = eu.id), '{}'::jsonb)),
      'sessoes', '[]'::jsonb);
  end if;
  ts := privado.turmas_de(eu);
  desde := now() - make_interval(days => greatest(30, least(coalesce(p_dias_sessoes, 400), 3650)));
  select coalesce(array_agg(id), '{}') into al from public.usuarios
   where perfil = 'aluno' and (eu.perfil = 'admin' or turma_id = any(ts));
  return jsonb_build_object('ok', true, 'usuario', privado.json_usuario(eu),
    'users', coalesce((select jsonb_agg(privado.json_usuario(u, eu.perfil = 'admin' or u.id = eu.id or u.perfil = 'aluno'))
                         from public.usuarios u where u.perfil <> 'aluno' or u.id = any(al)), '[]'::jsonb),
    'turmas', coalesce((select jsonb_agg(privado.json_turma(t)) from public.turmas t where eu.perfil = 'admin' or t.id = any(ts)), '[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(privado.json_atividade(a)) from public.atividades a
                             where eu.perfil = 'admin' or a.professor_id = eu.id or a.turmas && ts), '[]'::jsonb),
    'progresso', coalesce((select jsonb_object_agg(p.aluno_id::text, p.dados) from public.progresso p where p.aluno_id = any(al)), '{}'::jsonb),
    'sessoes', coalesce((select jsonb_agg(privado.json_sessao(s) order by s.fim) from public.sessoes s
                          where s.aluno_id = any(al) and (s.fim is null or s.fim >= desde)), '[]'::jsonb));
end $$;

-- Cria ou altera um usuário. Professor: só alunos das turmas dele. Administrador: qualquer um.
-- p_dados: { id?, nome, login, email?, perfil?, turmaId?, ativo?, senha?, senhaFiguras?: ["pato","gato","uva"] }
create or replace function public.salvar_usuario(p_token text, p_dados jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare
  eu public.usuarios; alvo public.usuarios; novo boolean;
  v_id uuid; v_perfil text; v_turma uuid; v_nome text; v_login text; v_email text; v_senha text; v_figs text; v_ativo boolean;
  c text; acesso jsonb;
begin
  eu := privado.quem(p_token);
  if eu.perfil not in ('professor', 'admin') then return privado.erro('permissao', 'Sem permissão.'); end if;
  v_id := nullif(p_dados->>'id', '')::uuid;
  if v_id is not null then select * into alvo from public.usuarios where id = v_id; end if;
  novo := alvo.id is null;
  v_perfil := coalesce(nullif(p_dados->>'perfil', ''), alvo.perfil, 'aluno');
  if v_perfil not in ('aluno', 'professor', 'admin') then return privado.erro('perfil', 'Perfil inválido.'); end if;
  if not novo and alvo.perfil <> v_perfil then return privado.erro('perfil', 'Não é possível trocar o perfil de uma conta.'); end if;

  v_nome  := coalesce(nullif(trim(p_dados->>'nome'), ''), alvo.nome);
  v_login := lower(coalesce(nullif(trim(p_dados->>'login'), ''), alvo.login));
  v_email := case when p_dados ? 'email' then nullif(lower(trim(p_dados->>'email')), '') else alvo.email end;
  v_senha := nullif(p_dados->>'senha', '');
  v_figs  := case when p_dados ? 'senhaFiguras' then privado.figuras_txt(p_dados->'senhaFiguras') else null end;
  v_ativo := coalesce((p_dados->>'ativo')::boolean, alvo.ativo, true);
  v_turma := case when v_perfil <> 'aluno' then null
                  when p_dados ? 'turmaId' then nullif(p_dados->>'turmaId', '')::uuid
                  else alvo.turma_id end;

  -- Permissões
  if eu.perfil = 'professor' then
    if v_perfil <> 'aluno' then return privado.erro('permissao', 'Professores só cadastram alunos.'); end if;
    if not novo and (alvo.turma_id is null or not (alvo.turma_id = any(privado.turmas_de(eu)))) then
      return privado.erro('permissao', 'Este aluno não é de uma turma sua.'); end if;
    if v_turma is null or not (v_turma = any(privado.turmas_de(eu))) then return privado.erro('turma', 'Escolha uma das suas turmas.'); end if;
  end if;
  if eu.perfil = 'admin' and not novo and alvo.id = eu.id and not v_ativo then
    return privado.erro('permissao', 'Você não pode desativar a sua própria conta.'); end if;

  -- Validações
  if v_nome is null or length(v_nome) < 2 then return privado.erro('nome', 'Informe o nome.'); end if;
  if v_login is null or v_login !~ '^[a-z0-9._]{2,40}$' then return privado.erro('login', 'Login: use letras minúsculas, números, ponto ou _.'); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return privado.erro('email', 'E-mail inválido.'); end if;
  if v_perfil <> 'aluno' and v_email is null then return privado.erro('email', 'Informe o e-mail.'); end if;
  if novo and v_senha is null then return privado.erro('senha', 'Informe a senha.'); end if;
  if v_senha is not null and length(v_senha) < (case when v_perfil = 'aluno' then 4 else 6 end) then
    return privado.erro('senha_curta', case when v_perfil = 'aluno' then 'A senha precisa ter pelo menos 4 caracteres.' else 'A senha precisa ter pelo menos 6 caracteres.' end); end if;

  -- Cartão de acesso do aluno (para a professora reimprimir): guardado cifrado
  if v_perfil = 'aluno' and (v_senha is not null or p_dados ? 'senhaFiguras') then
    acesso := coalesce(privado.decifrar(alvo.acesso_cifrado), '{}'::jsonb);
    if v_senha is not null then acesso := acesso || jsonb_build_object('senha', v_senha); end if;
    if p_dados ? 'senhaFiguras' then acesso := acesso || jsonb_build_object('senhaFiguras', coalesce(p_dados->'senhaFiguras', '[]'::jsonb)); end if;
  end if;

  begin
    if novo then
      insert into public.usuarios (id, nome, email, login, senha_hash, figuras_hash, acesso_cifrado, perfil, turma_id, ativo)
      values (coalesce(v_id, gen_random_uuid()), v_nome, v_email, v_login, privado.hash(v_senha), privado.hash(v_figs),
              case when acesso is null then null else privado.cifrar(acesso) end, v_perfil, v_turma, v_ativo)
      returning * into alvo;
    else
      update public.usuarios set
        nome = v_nome, email = v_email, login = v_login, turma_id = v_turma, ativo = v_ativo,
        senha_hash = coalesce(privado.hash(v_senha), senha_hash),
        figuras_hash = case when p_dados ? 'senhaFiguras' then privado.hash(v_figs) else figuras_hash end,
        acesso_cifrado = case when acesso is null then acesso_cifrado else privado.cifrar(acesso) end,
        falhas = case when v_senha is not null then 0 else falhas end,
        bloqueado_ate = case when v_senha is not null then null else bloqueado_ate end,
        atualizado_em = now()
      where id = alvo.id returning * into alvo;
      -- Senha nova ou conta desativada: desconecta os outros aparelhos dessa pessoa
      if (v_senha is not null or not v_ativo) and alvo.id <> eu.id then delete from public.acessos where usuario_id = alvo.id; end if;
    end if;
  exception when unique_violation then
    get stacked diagnostics c = constraint_name;
    if c = 'usuarios_email_unico' then return privado.erro('email_existe', 'Esse e-mail já está em uso.'); end if;
    return privado.erro('login_existe', 'Esse login já existe. Escolha outro.');
  end;
  return jsonb_build_object('ok', true, 'usuario', privado.json_usuario(alvo));
end $$;

-- Cartão de acesso de um aluno (senha simples e figuras), para a professora reimprimir
create or replace function public.dados_acesso(p_token text, p_aluno uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; al public.usuarios;
begin
  eu := privado.quem(p_token);
  select * into al from public.usuarios where id = p_aluno and perfil = 'aluno';
  if not found then return privado.erro('nao_encontrado', 'Aluno não encontrado.'); end if;
  if not (eu.perfil = 'admin' or (eu.perfil = 'professor' and al.turma_id = any(privado.turmas_de(eu)))) then
    return privado.erro('permissao', 'Sem permissão.'); end if;
  return jsonb_build_object('ok', true, 'acesso', coalesce(privado.decifrar(al.acesso_cifrado), '{}'::jsonb));
end $$;

-- Remove um usuário (e, se for aluno, todo o histórico dele)
create or replace function public.excluir_usuario(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; al public.usuarios;
begin
  eu := privado.quem(p_token);
  select * into al from public.usuarios where id = p_id;
  if not found then return jsonb_build_object('ok', true); end if;
  if al.id = eu.id then return privado.erro('permissao', 'Você não pode remover a sua própria conta.'); end if;
  if eu.perfil = 'professor' then
    if al.perfil <> 'aluno' or al.turma_id is null or not (al.turma_id = any(privado.turmas_de(eu))) then
      return privado.erro('permissao', 'Sem permissão.'); end if;
  elsif eu.perfil <> 'admin' then return privado.erro('permissao', 'Sem permissão.');
  end if;
  delete from public.usuarios where id = al.id;
  return jsonb_build_object('ok', true);
end $$;

-- Turmas (só o administrador). p_dados: { id?, nome, ano?, professorId? } — campos ausentes não mudam
create or replace function public.salvar_turma(p_token text, p_dados jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; t public.turmas; v_id uuid; v_prof uuid;
begin
  eu := privado.quem(p_token);
  if eu.perfil <> 'admin' then return privado.erro('permissao', 'Só o administrador mexe nas turmas.'); end if;
  v_id := nullif(p_dados->>'id', '')::uuid;
  if v_id is not null then select * into t from public.turmas where id = v_id; end if;
  if p_dados ? 'professorId' then
    v_prof := nullif(p_dados->>'professorId', '')::uuid;
    if v_prof is not null and not exists (select 1 from public.usuarios where id = v_prof and perfil in ('professor', 'admin')) then
      return privado.erro('professor', 'Professor não encontrado.'); end if;
  else v_prof := t.professor_id; end if;
  if t.id is null then
    if length(trim(coalesce(p_dados->>'nome', ''))) < 1 then return privado.erro('nome', 'Informe o nome da turma.'); end if;
    insert into public.turmas (id, nome, ano, professor_id)
    values (coalesce(v_id, gen_random_uuid()), trim(p_dados->>'nome'), nullif(p_dados->>'ano', '')::int, v_prof) returning * into t;
  else
    update public.turmas set
      nome = coalesce(nullif(trim(p_dados->>'nome'), ''), nome),
      ano = case when p_dados ? 'ano' then nullif(p_dados->>'ano', '')::int else ano end,
      professor_id = v_prof
    where id = t.id returning * into t;
  end if;
  return jsonb_build_object('ok', true, 'turma', privado.json_turma(t));
end $$;

create or replace function public.excluir_turma(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios;
begin
  eu := privado.quem(p_token);
  if eu.perfil <> 'admin' then return privado.erro('permissao', 'Só o administrador mexe nas turmas.'); end if;
  update public.atividades set turmas = array_remove(turmas, p_id) where p_id = any(turmas);
  delete from public.turmas where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Atividades da professora. Professor: as dele (e só para as turmas dele). Administrador: todas.
create or replace function public.salvar_atividade(p_token text, p_dados jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; a public.atividades; v_id uuid; v_turmas uuid[]; v_status text; minhas uuid[];
begin
  eu := privado.quem(p_token);
  if eu.perfil not in ('professor', 'admin') then return privado.erro('permissao', 'Sem permissão.'); end if;
  v_id := nullif(p_dados->>'id', '')::uuid;
  if v_id is not null then select * into a from public.atividades where id = v_id; end if;
  if a.id is not null and eu.perfil = 'professor' and a.professor_id is distinct from eu.id then
    return privado.erro('permissao', 'Só quem criou a atividade pode alterá-la.'); end if;
  select coalesce(array_agg(x::uuid), '{}') into v_turmas from jsonb_array_elements_text(coalesce(p_dados->'turmas', '[]'::jsonb)) x;
  if eu.perfil = 'professor' then
    minhas := privado.turmas_de(eu);
    select coalesce(array_agg(x), '{}') into v_turmas from unnest(v_turmas) x where x = any(minhas);
  end if;
  v_status := case when p_dados->>'status' = 'publicada' then 'publicada' else 'rascunho' end;
  if length(trim(coalesce(p_dados->>'titulo', ''))) = 0 then return privado.erro('titulo', 'Dê um nome para a atividade.'); end if;
  if coalesce(p_dados->>'modelo', '') = '' then return privado.erro('modelo', 'Escolha o tipo de atividade.'); end if;
  if a.id is null then
    insert into public.atividades (id, professor_id, titulo, modelo, criterio, hab, instrucao, turmas, rodadas, status, publicada_em)
    values (coalesce(v_id, gen_random_uuid()), coalesce(nullif(p_dados->>'professorId', '')::uuid, eu.id), left(trim(p_dados->>'titulo'), 120),
            p_dados->>'modelo', nullif(p_dados->>'criterio', ''), nullif(p_dados->>'hab', ''), left(coalesce(p_dados->>'instrucao', ''), 400),
            v_turmas, coalesce(p_dados->'rodadas', '[]'::jsonb), v_status, case when v_status = 'publicada' then now() end)
    returning * into a;
  else
    update public.atividades set titulo = left(trim(p_dados->>'titulo'), 120), modelo = p_dados->>'modelo',
      criterio = nullif(p_dados->>'criterio', ''), hab = nullif(p_dados->>'hab', ''), instrucao = left(coalesce(p_dados->>'instrucao', ''), 400),
      turmas = v_turmas, rodadas = coalesce(p_dados->'rodadas', '[]'::jsonb), status = v_status, atualizado_em = now(),
      publicada_em = case when v_status = 'publicada' and status <> 'publicada' then now() else publicada_em end
    where id = a.id returning * into a;
  end if;
  return jsonb_build_object('ok', true, 'atividade', privado.json_atividade(a));
end $$;

create or replace function public.excluir_atividade(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; a public.atividades;
begin
  eu := privado.quem(p_token);
  select * into a from public.atividades where id = p_id;
  if not found then return jsonb_build_object('ok', true); end if;
  if not (eu.perfil = 'admin' or (eu.perfil = 'professor' and a.professor_id = eu.id)) then
    return privado.erro('permissao', 'Só quem criou a atividade pode excluí-la.'); end if;
  delete from public.atividades where id = p_id;           -- os resultados (sessoes) vão junto
  update public.progresso set dados = dados #- array['atividades', p_id::text] where dados->'atividades' ? p_id::text;
  return jsonb_build_object('ok', true);
end $$;

-- O aluno terminou uma fase/atividade (ou trocou a cor do Bip): grava a sessão e o progresso.
-- p_sessao: { id, faseId?, atividadeId?, hab, inicio, fim, acertos, erros, acc, estrelas, duracaoSeg, itens }
create or replace function public.salvar_jogo(p_token text, p_sessao jsonb default null, p_progresso jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; v_ativ uuid;
begin
  eu := privado.quem(p_token);
  if eu.perfil <> 'aluno' then return privado.erro('permissao', 'Só alunos registram partidas.'); end if;
  if p_sessao is not null and jsonb_typeof(p_sessao) = 'object' then
    v_ativ := nullif(p_sessao->>'atividadeId', '')::uuid;
    if v_ativ is null or exists (select 1 from public.atividades where id = v_ativ) then
      insert into public.sessoes (id, aluno_id, fase_id, atividade_id, hab, inicio, fim, acertos, erros, acc, estrelas, duracao_seg, itens)
      values (coalesce(nullif(p_sessao->>'id', '')::uuid, gen_random_uuid()), eu.id, nullif(p_sessao->>'faseId', ''), v_ativ,
              left(p_sessao->>'hab', 20), (p_sessao->>'inicio')::timestamptz, (p_sessao->>'fim')::timestamptz,
              coalesce((p_sessao->>'acertos')::int, 0), coalesce((p_sessao->>'erros')::int, 0), (p_sessao->>'acc')::real,
              coalesce((p_sessao->>'estrelas')::int, 0), least(coalesce((p_sessao->>'duracaoSeg')::int, 0), 86400),
              case when jsonb_typeof(p_sessao->'itens') = 'array' and jsonb_array_length(p_sessao->'itens') <= 300 then p_sessao->'itens' else '[]'::jsonb end)
      on conflict (id) do nothing;   -- a mesma sessão enviada duas vezes (internet instável) não duplica
    end if;
  end if;
  if p_progresso is not null and jsonb_typeof(p_progresso) = 'object' and length(p_progresso::text) < 200000 then
    insert into public.progresso (aluno_id, dados, atualizado_em) values (eu.id, p_progresso, now())
    on conflict (aluno_id) do update set dados = excluded.dados, atualizado_em = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Meu perfil (professor e administrador): trocar nome, e-mail e senha. Pede a senha atual.
create or replace function public.atualizar_perfil(p_token text, p_senha_atual text, p_nome text default null,
                                                   p_email text default null, p_nova_senha text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; v_email text;
begin
  eu := privado.quem(p_token);
  if eu.perfil not in ('professor', 'admin') then return privado.erro('permissao', 'Sem permissão.'); end if;
  if not privado.confere(coalesce(p_senha_atual, ''), eu.senha_hash) then return privado.erro('senha_atual', 'A senha atual não confere.'); end if;
  v_email := coalesce(nullif(lower(trim(p_email)), ''), eu.email);
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return privado.erro('email', 'E-mail inválido.'); end if;
  if p_nova_senha is not null and p_nova_senha <> '' and length(p_nova_senha) < 6 then
    return privado.erro('senha_curta', 'A nova senha precisa ter pelo menos 6 caracteres.'); end if;
  begin
    update public.usuarios set
      nome = coalesce(nullif(trim(p_nome), ''), nome), email = v_email,
      senha_hash = case when coalesce(p_nova_senha, '') <> '' then privado.hash(p_nova_senha) else senha_hash end,
      atualizado_em = now()
    where id = eu.id returning * into eu;
  exception when unique_violation then
    return privado.erro('email_existe', 'Esse e-mail já está em uso por outra conta.');
  end;
  -- Senha nova: desconecta os OUTROS aparelhos (este continua conectado)
  if coalesce(p_nova_senha, '') <> '' then
    delete from public.acessos where usuario_id = eu.id and token_hash <> privado.sha(p_token);
  end if;
  return jsonb_build_object('ok', true, 'usuario', privado.json_usuario(eu));
end $$;

-- Dados de exemplo (só administrador): turmas, professores, alunos, partidas e atividades de demonstração
create or replace function public.importar_exemplo(p_token text, p_dados jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions, pg_temp
as $$
declare eu public.usuarios; x jsonb; n_al int := 0;
begin
  eu := privado.quem(p_token);
  if eu.perfil <> 'admin' then return privado.erro('permissao', 'Só o administrador pode criar dados de exemplo.'); end if;
  if exists (select 1 from public.usuarios u, jsonb_array_elements(coalesce(p_dados->'users', '[]'::jsonb)) j where lower(u.login) = lower(j->>'login')) then
    return privado.erro('exemplo_existe', 'Os dados de exemplo já foram criados (alguns logins já existem).');
  end if;
  -- professores e alunos (as turmas entram antes, sem professor, por causa das ligações entre as tabelas)
  insert into public.turmas (id, nome, ano)
  select (t->>'id')::uuid, t->>'nome', nullif(t->>'ano', '')::int from jsonb_array_elements(coalesce(p_dados->'turmas', '[]'::jsonb)) t;
  for x in select * from jsonb_array_elements(coalesce(p_dados->'users', '[]'::jsonb)) loop
    insert into public.usuarios (id, nome, email, login, senha_hash, figuras_hash, acesso_cifrado, perfil, turma_id, ativo, criado_em)
    values ((x->>'id')::uuid, x->>'nome', nullif(lower(x->>'email'), ''), lower(x->>'login'), privado.hash(x->>'senha'),
            privado.hash(privado.figuras_txt(x->'senhaFiguras')),
            case when x->>'perfil' = 'aluno' then privado.cifrar(jsonb_build_object('senha', x->>'senha', 'senhaFiguras', coalesce(x->'senhaFiguras', '[]'::jsonb))) end,
            x->>'perfil', case when x->>'perfil' = 'aluno' then nullif(x->>'turmaId', '')::uuid end,
            coalesce((x->>'ativo')::boolean, true), coalesce((x->>'criadoEm')::timestamptz, now()));
    if x->>'perfil' = 'aluno' then n_al := n_al + 1; end if;
  end loop;
  update public.turmas t set professor_id = (j->>'professorId')::uuid
    from jsonb_array_elements(coalesce(p_dados->'turmas', '[]'::jsonb)) j where t.id = (j->>'id')::uuid and nullif(j->>'professorId', '') is not null;
  insert into public.atividades (id, professor_id, titulo, modelo, criterio, hab, instrucao, turmas, rodadas, status, criado_em, atualizado_em, publicada_em)
  select (a->>'id')::uuid, nullif(a->>'professorId', '')::uuid, a->>'titulo', a->>'modelo', nullif(a->>'criterio', ''), nullif(a->>'hab', ''),
         coalesce(a->>'instrucao', ''), coalesce((select array_agg(v::uuid) from jsonb_array_elements_text(a->'turmas') v), '{}'),
         coalesce(a->'rodadas', '[]'::jsonb), coalesce(a->>'status', 'rascunho'),
         coalesce((a->>'criadoEm')::timestamptz, now()), coalesce((a->>'atualizadoEm')::timestamptz, now()), (a->>'publicadaEm')::timestamptz
    from jsonb_array_elements(coalesce(p_dados->'atividades', '[]'::jsonb)) a;
  insert into public.progresso (aluno_id, dados)
  select k::uuid, v from jsonb_each(coalesce(p_dados->'progresso', '{}'::jsonb)) as e(k, v)
   where exists (select 1 from public.usuarios where id = k::uuid);
  insert into public.sessoes (id, aluno_id, fase_id, atividade_id, hab, inicio, fim, acertos, erros, acc, estrelas, duracao_seg, itens)
  select coalesce(nullif(s->>'id', '')::uuid, gen_random_uuid()), (s->>'alunoId')::uuid, nullif(s->>'faseId', ''), nullif(s->>'atividadeId', '')::uuid,
         s->>'hab', (s->>'inicio')::timestamptz, (s->>'fim')::timestamptz, (s->>'acertos')::int, (s->>'erros')::int, (s->>'acc')::real,
         (s->>'estrelas')::int, (s->>'duracaoSeg')::int, coalesce(s->'itens', '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_dados->'sessoes', '[]'::jsonb)) s;
  return jsonb_build_object('ok', true, 'alunos', n_al);
end $$;

-- Só as funções públicas acima podem ser chamadas pelo site
revoke all on all functions in schema privado from public, anon, authenticated;
grant execute on function
  public.situacao(), public.criar_primeiro_admin(text, text, text, text), public.entrar(text, text, int),
  public.entrar_figuras(text, jsonb, int), public.sair(text), public.carregar(text, int),
  public.salvar_usuario(text, jsonb), public.dados_acesso(text, uuid), public.excluir_usuario(text, uuid),
  public.salvar_turma(text, jsonb), public.excluir_turma(text, uuid), public.salvar_atividade(text, jsonb),
  public.excluir_atividade(text, uuid), public.salvar_jogo(text, jsonb, jsonb),
  public.atualizar_perfil(text, text, text, text, text), public.importar_exemplo(text, jsonb)
to anon, authenticated;

-- Avisa a API do Supabase que as funções mudaram
notify pgrst, 'reload schema';

-- Pronto! Agora copie a "Project URL" e a chave "anon public" (Project Settings > API) para o arquivo js/config.js do jogo.
