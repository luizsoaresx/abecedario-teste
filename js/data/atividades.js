/* atividades.js — Atividades criadas pelo professor.
   O professor escolhe um dos 9 modelos prontos (os mesmos jeitos de jogar das fases), escolhe as figuras do jogo
   e o sistema transforma cada rodada que ele montou numa rodada do jogo (o mesmo formato que content.js gera).
   Aqui ficam: os modelos, a validação do que foi preenchido e a conversão "rodada do professor" -> "rodada do jogo". */
window.TS = window.TS || {};

TS.ATV = (function () {
  const C = TS.C, W = C.W;
  const nome = (k) => (W[k] ? W[k].t : String(k || ''));
  const LETRAS = 'ABCDEFGJLMNOPRSTUVZ'.split('');
  const SIL_EXTRA = ['LA', 'MI', 'TU', 'BE', 'RO', 'NA', 'PI', 'DE'];

  // Frase digitada pelo professor: tira espaços repetidos e pontuação solta; conta as palavras
  const limpar = (f) => String(f || '').replace(/\s+/g, ' ').trim();
  const palavras = (f) => limpar(f).replace(/[.!?,;:]/g, '').split(' ').filter(Boolean);

  // O que a criança precisa perceber (usado por Sim ou não, Caixas e Ligar)
  const CRITERIOS = {
    rima: { nome: 'Rima', desc: 'As palavras terminam com o mesmo som', hab: 'rima', pre: 'Rima' },
    som: { nome: 'Mesmo som inicial', desc: 'As palavras começam com o mesmo som', hab: 'aliteracao', pre: 'Mesmo som' },
    letra: { nome: 'Letra inicial', desc: 'Ligar a figura à letra do primeiro som', hab: 'fonema', pre: 'Som e letra' },
    // Atividade de falar no microfone
    repetir: { nome: 'Repetir depois do Bip', desc: 'O Bip fala a palavra e a criança repete', hab: 'palavra', pre: 'Falar' },
    nomear: { nome: 'Dizer o nome sozinha', desc: 'A criança vê a figura e fala o nome, sem ouvir antes', hab: 'palavra', pre: 'Falar' },
  };

  // Figuras do jogo organizadas por assunto (para o professor achar rápido)
  const CATEGORIAS = [
    ['Animais', ['urso', 'galinha', 'pintinho', 'vaca', 'jacare', 'cachorro', 'pato', 'elefante', 'sapo', 'girafa', 'cabra', 'gorila', 'cavalo', 'macaco', 'coruja', 'panda', 'papagaio', 'pinguim', 'porco', 'coelho', 'cobra', 'baleia', 'zebra', 'hipopotamo', 'gato', 'rato', 'peixe']],
    ['Comidas', ['maca', 'banana', 'pao', 'bolo', 'cenoura', 'queijo', 'uva', 'pizza', 'milho', 'limao', 'pera', 'abacaxi', 'tomate', 'melancia', 'morango', 'laranja', 'sorvete', 'chocolate', 'abacate', 'cogumelo', 'panqueca', 'torta', 'abobora', 'coco', 'mel']],
    ['Casa', ['cadeira', 'cama', 'mesa', 'sofa', 'tapete', 'geladeira', 'fogao', 'banheira', 'planta', 'panela', 'saco', 'porta', 'chave', 'escada']],
    ['Transportes', ['carro', 'trator', 'ambulancia', 'caminhao', 'taxi', 'barco', 'navio', 'aviao', 'nave', 'foguete']],
    ['Outros', ['bola', 'dado', 'flor', 'arvore', 'pedra', 'castelo', 'moinho', 'bandeira', 'coracao', 'moeda']],
  ].map(([n, ks]) => [n, ks.filter((k) => W[k])]);

  // Monta os rótulos de cada par/figura (cada um é contado separado no painel do professor)
  function comSubRotulos(it) {
    if (it.tipo === 'ligar') it.subRotulos = it.pares.map(([a, b]) => `${CRITERIOS[it.criterio].pre}: ${nome(a)} × ${nome(b)}`);
    if (it.tipo === 'caixas') it.subRotulos = it.figuras.map((f) => `${CRITERIOS[it.criterio].pre}: ${nome(it.modelo)} × ${nome(f.w)}`);
    return it;
  }

  /* ---------- Os 9 modelos ----------
     Cada modelo tem: nome e descrição (para o professor), tpl (a demonstração da Introdução), hab (habilidade padrão),
     nova() = rodada em branco, exemplo() = rodada sorteada, filtro = quais figuras servem,
     validar(r) = mensagem de erro ou null, resumo(r) = texto curto, item(r, at) = rodada no formato do jogo. */
  const MODELOS = {
    silabas: {
      nome: 'Contar sílabas', desc: 'A criança ouve o nome da figura e bate no tambor uma vez para cada sílaba.',
      tpl: 'contagem_silabas', hab: 'silaba', icone: 'svg_tambor',
      ajuda: 'Escolha uma figura por rodada. O jogo já sabe quantas sílabas cada palavra tem.',
      nova: () => ({ palavra: null }),
      exemplo: () => ({ palavra: C.pick(Object.keys(W).filter((k) => W[k].s.length <= 4)) }),
      validar: (r) => (!r.palavra ? 'Escolha a figura.' : null),
      resumo: (r) => (r.palavra ? `${nome(r.palavra)} · ${W[r.palavra].s.join('-')} (${W[r.palavra].s.length})` : ''),
      item: (r) => ({ tipo: 'contagem', modo: 'silabas', palavra: r.palavra, fala: W[r.palavra].f, n: W[r.palavra].s.length, rotulo: `Sílabas: ${W[r.palavra].t}` }),
    },
    palavras: {
      nome: 'Contar palavras', desc: 'O Bip fala uma frase e a criança bate no tambor uma vez para cada palavra.',
      tpl: 'contagem_palavras', hab: 'palavra', icone: 'svg_palmas',
      ajuda: 'Escreva frases curtas (de 2 a 7 palavras). O Bip lê a frase em voz alta.',
      nova: () => ({ frase: '' }),
      exemplo: () => ({ frase: C.pick(['O gato dorme', 'A vaca come capim', 'Eu gosto de bolo', 'O sapo pula na lagoa', 'Papai lavou o carro', 'A bola é azul']) }),
      validar: (r) => { const n = palavras(r.frase).length; return !n ? 'Escreva a frase.' : n < 2 ? 'Use pelo menos 2 palavras.' : n > 7 ? 'Use no máximo 7 palavras.' : null; },
      resumo: (r) => (limpar(r.frase) ? `"${limpar(r.frase)}" (${palavras(r.frase).length} palavras)` : ''),
      item: (r) => ({ tipo: 'contagem', modo: 'palavras', fala: limpar(r.frase), n: palavras(r.frase).length, rotulo: `Palavras: "${limpar(r.frase)}"` }),
    },
    montar: {
      nome: 'Montar a palavra', desc: 'A criança arrasta os pedacinhos (sílabas) para montar o nome da figura.',
      tpl: 'montar_silabas', hab: 'silaba', icone: 'svg_gato',
      ajuda: 'Escolha figuras com 2 a 4 sílabas. Marque "pedacinho a mais" para colocar uma sílaba que não serve (fica mais difícil).',
      filtro: (k) => W[k].s.length >= 2 && W[k].s.length <= 4,
      nova: () => ({ palavra: null, extra: false }),
      exemplo: () => ({ palavra: C.pick(Object.keys(W).filter((k) => W[k].s.length >= 2 && W[k].s.length <= 3)), extra: false }),
      validar: (r) => (!r.palavra ? 'Escolha a figura.' : W[r.palavra].s.length < 2 || W[r.palavra].s.length > 4 ? 'Escolha uma palavra de 2 a 4 sílabas.' : null),
      resumo: (r) => (r.palavra ? `${W[r.palavra].s.join(' + ')}${r.extra ? ' (+1 pedacinho a mais)' : ''}` : ''),
      item: (r) => {
        const alvo = W[r.palavra].s.slice();
        const pecas = alvo.slice();
        if (r.extra) pecas.push(C.pick(SIL_EXTRA.filter((s) => !alvo.includes(s))));
        return { tipo: 'montar', modo: 'silabas', palavra: r.palavra, alvo, pecas: C.shuffle(pecas), rotulo: `Montar: ${W[r.palavra].t}` };
      },
    },
    letra: {
      nome: 'Primeira letra', desc: 'A palavra aparece sem a primeira letra; a criança arrasta a letra que falta.',
      tpl: 'montar_letra', hab: 'fonema', icone: 'svg_bola',
      ajuda: 'Escolha figuras com nomes curtos (até 7 letras). O jogo sorteia duas letras erradas para a criança escolher.',
      filtro: (k) => W[k].f.length <= 7,
      nova: () => ({ palavra: null }),
      exemplo: () => ({ palavra: C.pick(Object.keys(W).filter((k) => W[k].f.length <= 5)) }),
      validar: (r) => (!r.palavra ? 'Escolha a figura.' : W[r.palavra].f.length > 7 ? 'Escolha uma palavra de até 7 letras.' : null),
      resumo: (r) => (r.palavra ? `_${W[r.palavra].f.slice(1)} → ${W[r.palavra].letra}` : ''),
      item: (r) => {
        const l = W[r.palavra].letra;
        return { tipo: 'montar', modo: 'letra', minuscula: true, palavra: r.palavra, alvo: [l], pecas: C.shuffle([l, ...C.sample(LETRAS.filter((x) => x !== l), 2)]), rotulo: `Primeira letra: ${W[r.palavra].t}` };
      },
    },
    escolha: {
      nome: 'Escolher a figura', desc: 'O Bip faz uma pergunta e a criança toca na figura certa entre três.',
      tpl: 'escolha', hab: 'rima', icone: 'fig_uva',
      ajuda: 'Escreva a pergunta que o Bip vai falar, escolha 3 figuras e marque a certa. A figura-modelo é opcional (aparece em cima, com alto-falante).',
      nova: () => ({ pergunta: '', modelo: null, opcoes: [null, null, null], certo: 0 }),
      exemplo: () => {
        const g = C.pick(C.RIMAS); const [a, b] = C.sample(g, 2);
        const outras = C.sample(Object.keys(W).filter((x) => !g.includes(x) && !C.rimam(a, x)), 2);
        return { pergunta: `Qual figura rima com ${W[a].f}?`, modelo: a, opcoes: [b, ...outras], certo: 0 };
      },
      validar: (r) => {
        if (!limpar(r.pergunta)) return 'Escreva a pergunta que o Bip vai fazer.';
        if (r.opcoes.some((o) => !o)) return 'Escolha as 3 figuras.';
        if (new Set(r.opcoes).size < 3) return 'As 3 figuras precisam ser diferentes.';
        if (r.modelo && r.opcoes.includes(r.modelo)) return 'A figura-modelo não pode ser uma das respostas.';
        return null;
      },
      resumo: (r) => (r.opcoes[r.certo] ? `${limpar(r.pergunta)} → ${nome(r.opcoes[r.certo])}` : limpar(r.pergunta)),
      item: (r) => {
        const certo = r.opcoes[r.certo];
        return { tipo: 'escolha', modelo: r.modelo || undefined, fala: limpar(r.pergunta), opcoes: C.shuffle(r.opcoes).map((x) => ({ id: x, img: W[x].img, fala: W[x].f })),
          certo, rotulo: `${limpar(r.pergunta)} → ${W[certo].t}` };
      },
    },
    vf: {
      nome: 'Sim ou não (joinha)', desc: 'O Bip fala duas palavras e pergunta se rimam (ou se começam igual). A criança responde com o joinha.',
      tpl: 'vf', criterios: ['rima', 'som'], icone: 'svg_joinha',
      ajuda: 'Escolha duas figuras por rodada. O jogo sugere a resposta certa, mas você pode trocar.',
      nova: () => ({ a: null, b: null, resposta: true }),
      exemplo: (at) => {
        const sim = Math.random() < 0.5;
        if ((at.criterio || 'rima') === 'rima') {
          const [a, b] = C.sample(C.pick(C.RIMAS), 2);
          const bb = sim ? b : C.pick(Object.keys(W).filter((x) => x !== a && !C.rimam(a, x)));
          return { a, b: bb, resposta: sim };
        }
        const l = C.pick(Object.keys(C.SONS).filter((x) => C.SONS[x].length >= 2)); const [a, b] = C.sample(C.SONS[l], 2);
        const bb = sim ? b : C.pick(Object.keys(W).filter((x) => x !== a && !C.mesmoSom(a, x)));
        return { a, b: bb, resposta: sim };
      },
      sugerir: (r, at) => ((at.criterio || 'rima') === 'rima' ? C.rimam(r.a, r.b) : C.mesmoSom(r.a, r.b)),
      validar: (r) => (!r.a || !r.b ? 'Escolha as duas figuras.' : r.a === r.b ? 'Escolha duas figuras diferentes.' : null),
      resumo: (r) => (r.a && r.b ? `${nome(r.a)} × ${nome(r.b)} → ${r.resposta ? 'Sim' : 'Não'}` : ''),
      item: (r, at) => {
        const rima = (at.criterio || 'rima') === 'rima';
        return { tipo: 'vf', a: r.a, b: r.b, resposta: !!r.resposta, fala: `${W[r.a].f}... ${W[r.b].f}... ${rima ? 'Essas palavras rimam?' : 'Começam com o mesmo som?'}`,
          rotulo: `${rima ? 'Rima?' : 'Mesmo som?'} ${W[r.a].t} × ${W[r.b].t}` };
      },
    },
    caixas: {
      nome: 'Separar nas caixas', desc: 'A criança arrasta cada figura para a caixa verde (combina com o modelo) ou laranja (não combina).',
      tpl: 'caixas', criterios: ['rima', 'som'], icone: 'fig_pao',
      ajuda: 'Escolha a figura-modelo e de 2 a 4 figuras. Para cada uma, diga se vai para a caixa verde (sim) ou laranja (não).',
      nova: () => ({ modelo: null, figuras: [{ w: null, ok: true }, { w: null, ok: false }, { w: null, ok: true }, { w: null, ok: false }] }),
      exemplo: (at) => {
        const rima = (at.criterio || 'rima') === 'rima';
        const grupo = rima ? C.pick(C.RIMAS.filter((g) => g.length >= 3)) : C.SONS[C.pick(Object.keys(C.SONS).filter((x) => C.SONS[x].length >= 3))];
        const [m, s1, s2] = C.shuffle(grupo);
        const teste = rima ? C.rimam : C.mesmoSom;
        const [n1, n2] = C.sample(Object.keys(W).filter((x) => !grupo.includes(x) && !teste(m, x)), 2);
        return { modelo: m, figuras: C.shuffle([{ w: s1, ok: true }, { w: n1, ok: false }, { w: s2, ok: true }, { w: n2, ok: false }]) };
      },
      validar: (r) => {
        if (!r.modelo) return 'Escolha a figura-modelo.';
        const fs = r.figuras.filter((f) => f.w);
        if (fs.length < 2) return 'Escolha pelo menos 2 figuras.';
        const ks = fs.map((f) => f.w).concat(r.modelo);
        if (new Set(ks).size < ks.length) return 'Não repita figuras na mesma rodada.';
        return null;
      },
      resumo: (r) => (r.modelo ? `Modelo ${nome(r.modelo)}: ${r.figuras.filter((f) => f.w).map((f) => `${nome(f.w)} ${f.ok ? '✓' : '✗'}`).join(', ')}` : ''),
      item: (r, at) => {
        const crit = at.criterio || 'rima';
        const figuras = C.shuffle(r.figuras.filter((f) => f.w).map((f) => ({ w: f.w, ok: !!f.ok })));
        return comSubRotulos({ tipo: 'caixas', criterio: crit, modelo: r.modelo, figuras,
          fala: crit === 'rima' ? `Leve para a caixa verde as figuras que rimam com ${W[r.modelo].f}.` : `Leve para a caixa verde as figuras que começam como ${W[r.modelo].f}.`,
          rotulo: `${crit === 'rima' ? 'Rima com' : 'Começa como'} ${W[r.modelo].t}` });
      },
    },
    ligar: {
      nome: 'Ligar os pares', desc: 'A criança liga cada figura ao seu par com uma linha. São 3 pares por rodada.',
      tpl: 'ligar', criterios: ['rima', 'som', 'letra'], icone: 'fig_torta',
      ajuda: 'Monte 3 pares por rodada. Em "Letra inicial", escolha só as figuras: a letra aparece sozinha.',
      nova: () => ({ pares: [[null, null], [null, null], [null, null]] }),
      exemplo: (at) => {
        const crit = at.criterio || 'rima';
        if (crit === 'rima') return { pares: C.sample(C.RIMAS, 3).map((g) => C.sample(g, 2)) };
        const ls = C.sample(Object.keys(C.SONS).filter((x) => C.SONS[x].length >= 2), 3);
        return { pares: ls.map((l) => (crit === 'letra' ? [C.pick(C.SONS[l]), null] : C.sample(C.SONS[l], 2))) };
      },
      validar: (r, at) => {
        const letra = (at.criterio || 'rima') === 'letra';
        if (r.pares.some(([a, b]) => !a || (!letra && !b))) return letra ? 'Escolha as 3 figuras.' : 'Complete os 3 pares.';
        const ks = letra ? r.pares.map((p) => p[0]) : r.pares.flat();
        if (new Set(ks).size < ks.length) return 'Não repita figuras na mesma rodada.';
        if (letra && new Set(r.pares.map(([a]) => W[a].letra)).size < 3) return 'As 3 figuras precisam começar com letras diferentes.';
        return null;
      },
      resumo: (r, at) => r.pares.filter(([a]) => a).map(([a, b]) => `${nome(a)}–${(at.criterio || 'rima') === 'letra' ? W[a].letra : nome(b)}`).join(', '),
      item: (r, at) => {
        const crit = at.criterio || 'rima';
        const pares = crit === 'letra' ? r.pares.map(([a]) => [a, W[a].letra]) : r.pares.map((p) => p.slice());
        return comSubRotulos({ tipo: 'ligar', criterio: crit, pares,
          fala: { rima: 'Ligue as figuras que rimam.', som: 'Ligue as figuras que começam com o mesmo som.', letra: 'Ligue cada figura à letra do seu primeiro som.' }[crit],
          rotulo: { rima: 'Ligar rimas', som: 'Ligar mesmo som', letra: 'Ligar som e letra' }[crit] });
      },
    },
    falar: {
      nome: 'Falar a palavra', desc: 'A criança toca no microfone e fala o nome da figura. O jogo escuta e confere se ela falou certo.',
      tpl: 'falar', criterios: ['repetir', 'nomear'], icone: 'svg_microfone', perguntaCriterio: 'Como a criança vai falar?',
      ajuda: 'Escolha uma figura por rodada. O microfone funciona no Google Chrome e no Microsoft Edge (com internet). Em outros navegadores, um adulto confere com o joinha.',
      nova: () => ({ palavra: null }),
      exemplo: () => ({ palavra: C.pick(Object.keys(W).filter((k) => W[k].s.length <= 3)) }),
      validar: (r) => (!r.palavra ? 'Escolha a figura.' : null),
      resumo: (r, at) => (r.palavra ? `${(at.criterio || 'repetir') === 'nomear' ? 'Dizer o nome' : 'Repetir'}: ${nome(r.palavra)}` : ''),
      item: (r, at) => C.itemFalar(r.palavra, at.criterio || 'repetir'),
    },
  };
  const ORDEM = ['silabas', 'palavras', 'montar', 'letra', 'escolha', 'vf', 'caixas', 'ligar', 'falar'];

  // Habilidade que a atividade trabalha: a escolhida pelo professor ou a padrão do modelo
  const habPadrao = (at) => { const m = MODELOS[at.modelo]; return m.criterios ? CRITERIOS[at.criterio || m.criterios[0]].hab : m.hab; };
  const habDe = (at) => at.hab || habPadrao(at);

  // Atividade em branco (o que o construtor começa preenchendo)
  function nova(modelo = 'silabas', professorId = null) {
    const m = MODELOS[modelo];
    return { id: null, titulo: '', modelo, criterio: m.criterios ? m.criterios[0] : null, turmas: [], hab: null, instrucao: '',
      rodadas: [m.nova(), m.nova(), m.nova()], status: 'rascunho', professorId };
  }

  // Confere a atividade inteira. paraPublicar=true exige título e turma.
  function validar(at, paraPublicar = true) {
    const m = MODELOS[at.modelo];
    const erros = [];
    if (!m) return { ok: false, erros: [{ campo: 'modelo', msg: 'Escolha o tipo de atividade.' }] };
    if (paraPublicar && !limpar(at.titulo)) erros.push({ campo: 'titulo', msg: 'Dê um nome para a atividade.' });
    if (paraPublicar && !(at.turmas || []).length) erros.push({ campo: 'turmas', msg: 'Escolha pelo menos uma turma.' });
    if (!at.rodadas.length) erros.push({ campo: 'rodadas', msg: 'Crie pelo menos uma rodada.' });
    at.rodadas.forEach((r, i) => { const e = m.validar(r, at); if (e) erros.push({ campo: 'rodada', i, msg: `Rodada ${i + 1}: ${e}` }); });
    return { ok: !erros.length, erros };
  }

  // Transforma as rodadas do professor em rodadas do jogo (na ordem em que ele montou)
  const itens = (at) => at.rodadas.map((r) => MODELOS[at.modelo].item(r, at));

  // A atividade "vestida" de fase, para a Introdução e a tela de Atividade usarem sem mudar quase nada
  function comoFase(at) {
    const hab = habDe(at);
    const mundo = C.MUNDOS.find((m) => m.hab === hab) || C.MUNDOS[0];
    const tpl = MODELOS[at.modelo].tpl;
    return { id: at.id, atividadeId: at.id, custom: true, nome: limpar(at.titulo) || 'Atividade da professora', mundo: mundo.id, fase: null, idx: -1,
      tpl, hab, intro: limpar(at.instrucao) || C.INTRO[tpl], rodadas: at.rodadas.length };
  }

  // Figura que representa a atividade (aparece no cartão do aluno)
  function figuraDe(at) {
    const r = at.rodadas[0] || {};
    const k = r.palavra || r.modelo || r.a || (r.opcoes && r.opcoes[r.certo]) || (r.pares && r.pares[0] && r.pares[0][0]);
    return k && W[k] ? W[k].img : MODELOS[at.modelo].icone;
  }

  return { MODELOS, ORDEM, CRITERIOS, CATEGORIAS, nova, validar, itens, comoFase, figuraDe, habDe, habPadrao, limpar, nome };
})();
