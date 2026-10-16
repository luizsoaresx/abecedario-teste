/* config.js — ligação do jogo com o banco de dados (Supabase, gratuito).

   COMO LIGAR O BANCO (passo a passo completo no LEIA-ME.txt):
   1) Crie uma conta grátis em https://supabase.com e um projeto novo.
   2) No projeto, abra "SQL Editor", cole o arquivo banco/supabase_instalar.sql e clique em "Run".
   3) Abra "Project Settings" > "API" (ou "API Keys") e copie:
        - a Project URL ........................ cole em SUPABASE_URL
        - a chave "anon public" (ou "publishable") cole em SUPABASE_CHAVE
      (NUNCA use a chave "service_role" / "secret" aqui: ela dá acesso total e este arquivo é público.)
   4) Salve este arquivo e abra o jogo. Na primeira vez, a área do professor pede para criar o administrador.

   Deixando os dois campos vazios, o jogo funciona no MODO LOCAL: os dados ficam só neste navegador
   (bom para testar; com contas de demonstração). */
window.TS = window.TS || {};
TS.CONFIG = {
  SUPABASE_URL: '',     // ex.: 'https://abcdefghijklmno.supabase.co'
  SUPABASE_CHAVE: '',   // ex.: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....' ou 'sb_publishable_...'
};
