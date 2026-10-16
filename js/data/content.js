/* Conteúdo pedagógico: banco de palavras, mundos, fases e geradores de rodadas. */
window.TS = window.TS || {};

(function () {
  // chave | como se fala/escreve | sílabas (separadas por -)
  const RAW = `
urso|urso|ur-so
galinha|galinha|ga-li-nha
pintinho|pintinho|pin-ti-nho
vaca|vaca|va-ca
jacare|jacaré|ja-ca-ré
cachorro|cachorro|ca-chor-ro
pato|pato|pa-to
elefante|elefante|e-le-fan-te
sapo|sapo|sa-po
girafa|girafa|gi-ra-fa
cabra|cabra|ca-bra
gorila|gorila|go-ri-la
cavalo|cavalo|ca-va-lo
macaco|macaco|ma-ca-co
coruja|coruja|co-ru-ja
panda|panda|pan-da
papagaio|papagaio|pa-pa-gai-o
pinguim|pinguim|pin-guim
porco|porco|por-co
coelho|coelho|co-e-lho
cobra|cobra|co-bra
baleia|baleia|ba-lei-a
zebra|zebra|ze-bra
hipopotamo|hipopótamo|hi-po-pó-ta-mo
maca|maçã|ma-çã
banana|banana|ba-na-na
pao|pão|pão
bolo|bolo|bo-lo
cenoura|cenoura|ce-nou-ra
queijo|queijo|quei-jo
peixe|peixe|pei-xe
uva|uva|u-va
pizza|pizza|piz-za
milho|milho|mi-lho
limao|limão|li-mão
pera|pera|pe-ra
abacaxi|abacaxi|a-ba-ca-xi
tomate|tomate|to-ma-te
melancia|melancia|me-lan-ci-a
morango|morango|mo-ran-go
laranja|laranja|la-ran-ja
sorvete|sorvete|sor-ve-te
chocolate|chocolate|cho-co-la-te
abacate|abacate|a-ba-ca-te
cogumelo|cogumelo|co-gu-me-lo
panqueca|panqueca|pan-que-ca
saco|saco|sa-co
torta|torta|tor-ta
abobora|abóbora|a-bó-bo-ra
coco|coco|co-co
panela|panela|pa-ne-la
mel|mel|mel
cadeira|cadeira|ca-dei-ra
cama|cama|ca-ma
mesa|mesa|me-sa
sofa|sofá|so-fá
tapete|tapete|ta-pe-te
geladeira|geladeira|ge-la-dei-ra
fogao|fogão|fo-gão
banheira|banheira|ba-nhei-ra
planta|planta|plan-ta
carro|carro|car-ro
trator|trator|tra-tor
ambulancia|ambulância|am-bu-lân-ci-a
caminhao|caminhão|ca-mi-nhão
taxi|táxi|tá-xi
barco|barco|bar-co
navio|navio|na-vi-o
aviao|avião|a-vi-ão
nave|nave|na-ve
foguete|foguete|fo-gue-te
chave|chave|cha-ve
porta|porta|por-ta
bandeira|bandeira|ban-dei-ra
flor|flor|flor
coracao|coração|co-ra-ção
moeda|moeda|mo-e-da
arvore|árvore|ár-vo-re
escada|escada|es-ca-da
pedra|pedra|pe-dra
castelo|castelo|cas-te-lo
moinho|moinho|mo-i-nho
dado|dado|da-do
gato|gato|ga-to
rato|rato|ra-to
bola|bola|bo-la`;

  const W = {};
  RAW.trim().split('\n').forEach((l) => {
    const [k, f, s] = l.trim().split('|');
    W[k] = {
      k, f, t: f.toUpperCase(), s: s.toUpperCase().split('-'),
      img: ['gato', 'rato', 'bola'].includes(k) ? 'svg_' + k : 'fig_' + k,
      letra: f.normalize('NFD').replace(/\p{Diacritic}/gu, '')[0].toUpperCase(),
    };
  });

  const RIMAS = [
    ['pao', 'limao', 'fogao', 'aviao', 'caminhao'], ['pato', 'gato', 'rato'], ['macaco', 'saco'],
    ['sorvete', 'tapete', 'foguete'], ['cadeira', 'bandeira', 'geladeira', 'banheira'], ['torta', 'porta'],
    ['tomate', 'chocolate', 'abacate'], ['cogumelo', 'castelo'], ['flor', 'trator'],
    ['chave', 'nave'], ['abacaxi', 'taxi'],
  ].filter((g) => g.length > 1);

  // Grupos com o mesmo som inicial (fonema), escolhidos para evitar ambiguidades (ex.: C de "cenoura")
  const SONS = {
    B: ['bola', 'banana', 'baleia', 'bolo', 'barco', 'bandeira', 'banheira'],
    P: ['pato', 'porco', 'panda', 'pao', 'pera', 'peixe', 'panela', 'porta', 'pinguim', 'papagaio', 'pedra', 'panqueca'],
    M: ['macaco', 'maca', 'mesa', 'milho', 'moeda', 'melancia', 'morango', 'mel', 'moinho'],
    S: ['sapo', 'sorvete', 'sofa', 'saco'],
    C: ['cavalo', 'cama', 'carro', 'coelho', 'coruja', 'cobra', 'cadeira', 'cabra', 'coco', 'castelo', 'caminhao', 'cogumelo'],
    T: ['tomate', 'torta', 'tapete', 'trator', 'taxi'],
    G: ['gato', 'galinha', 'gorila'],
    F: ['flor', 'fogao', 'foguete'],
    L: ['limao', 'laranja'],
    A: ['abacaxi', 'abacate', 'aviao', 'arvore', 'abobora'],
    U: ['uva', 'urso'],
    E: ['elefante', 'escada'],
    N: ['nave', 'navio'],
    R: ['rato'],
    Z: ['zebra'],
    V: ['vaca'],
    D: ['dado'],
  };
  // Sons contínuos, que dá para "esticar" ao falar
  const SOM_LONGO = { M: 'mmmmm', S: 'sssss', F: 'fffff', L: 'lllll', N: 'nnnnn', Z: 'zzzzz', V: 'vvvvv' };

  const FRASES = {
    2: ['Pato nada', 'Sapo pula', 'Vaca come', 'Gato dorme', 'Cavalo corre', 'Macaco pula', 'Bola rola', 'Peixe nada'],
    3: ['O gato dorme', 'A vaca come', 'Eu amo banana', 'O carro corre', 'A bola rola', 'O sapo pula', 'Eu vi zebra', 'Eu comi pão'],
    4: ['O pato come pão', 'Eu gosto de uva', 'O macaco come banana', 'A zebra tem listras', 'O barco é grande', 'Eu vi um avião'],
    5: ['O gato viu o rato', 'O coelho come a cenoura', 'Eu vi um barco grande', 'A vovó fez um bolo', 'O sapo pulou na pedra'],
  };
  // Frases que terminam com uma palavra ilustrada (para "qual foi a última palavra?")
  const FRASES_FIM = [
    ['Eu comi uma', 'maca'], ['A menina viu o', 'sapo'], ['O menino chutou a', 'bola'], ['Papai dirigiu o', 'carro'],
    ['A vovó fez um', 'bolo'], ['No céu passou um', 'aviao'], ['Na fazenda tem uma', 'vaca'], ['No mar nadou uma', 'baleia'],
    ['Na árvore tem um', 'macaco'], ['Eu abri a', 'porta'], ['No rio tem um', 'jacare'], ['Eu achei uma', 'moeda'],
  ];

  const SIMPLES2 = ['pato', 'sapo', 'bola', 'vaca', 'gato', 'rato', 'dado', 'mesa', 'cama', 'uva', 'pera', 'bolo', 'coco', 'saco', 'nave', 'sofa', 'zebra', 'porco', 'panda'];
  const SIMPLES3 = ['macaco', 'cavalo', 'banana', 'girafa', 'gorila', 'tomate', 'panela', 'tapete', 'cadeira', 'coruja', 'galinha', 'sorvete', 'moeda', 'escada', 'castelo'];
  const LONGAS = ['abacaxi', 'abacate', 'chocolate', 'cogumelo', 'elefante', 'melancia', 'hipopotamo', 'papagaio'];
  const MONO = ['pao', 'flor', 'mel'];

  // ---------- utilidades ----------
  const rnd = () => Math.random();
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const rimaDe = (k) => RIMAS.find((g) => g.includes(k));
  const somDe = (k) => Object.keys(SONS).find((l) => SONS[l].includes(k));
  const TODAS = Object.keys(W);
  const naoRima = (k, n) => sample(TODAS.filter((x) => !(rimaDe(k) || []).includes(x) && x !== k && ultima(x) !== ultima(k)), n);
  const ultima = (k) => W[k].s[W[k].s.length - 1];
  const outroSom = (k, n) => { const l = somDe(k); return sample(TODAS.filter((x) => somDe(x) && somDe(x) !== l && W[x].letra !== W[k].letra), n); };
  /* Como o Bip fala UMA sílaba sozinha.
     A voz do computador não sabe que aquilo é uma sílaba: lê "de" como "dji", "te" como "tchi", "car" e "pin" como
     palavras em inglês, "am" e "es" como letras soletradas. Com acento na vogal forte, ela entende que é uma sílaba
     tônica do português e fala como a professora: dê, tê, cár, pín, âm, ês, sôr, chôr, nhá...
     Regras: a → á (â antes de m/n), e → ê, i → í, o → ô, u → ú.
     Em "qua/que/gui" a vogal forte é a depois do u; em "ai/ei/ou" é a primeira. */
  const ACENTO = { a: 'á', e: 'ê', i: 'í', o: 'ô', u: 'ú' };
  const ACENTO_NASAL = { a: 'â', e: 'ê', i: 'í', o: 'ô', u: 'ú' };
  const falaSilaba = (s) => {
    const x = String(s).toLowerCase().trim();
    if (/[áéíóúâêôãõà]/.test(x)) return x;               // já tem acento: fala como está
    if (Object.values(W).some((w) => w.f.toLowerCase() === x)) return x; // a sílaba é a palavra inteira (mel, flor): fala a palavra
    const grupos = [...x.matchAll(/[aeiou]+/g)];
    if (!grupos.length) return x;
    const g = grupos[grupos.length - 1];                 // o grupo de vogais da sílaba
    let j = g[0].length - 1;                             // qual vogal do grupo é a forte
    if (g[0].length > 1) {
      if (g[0][0] === 'u' && /[gq]$/.test(x.slice(0, g.index))) j = 1; // qua, que, gui, quei
      else if (/[iu]$/.test(g[0])) j = 0;                // ai, ei, oi, ou, au: a primeira
    }
    const p = g.index + j;
    const nasal = /^[mn]/.test(x.slice(p + 1).replace(/^[aeiou]+/, ''));
    return x.slice(0, p) + (nasal ? ACENTO_NASAL : ACENTO)[x[p]] + x.slice(p + 1);
  };
  const falaSilabas = (k) => W[k].s.map(falaSilaba).join('... ');
  // Duas palavras rimam? (estão no mesmo grupo de rimas ou terminam com a mesma sílaba)
  const rimam = (a, b) => a !== b && (!!(rimaDe(a) || []).includes(b) || ultima(a) === ultima(b));
  // Duas palavras começam com o mesmo som? (mesmo grupo de sons ou mesma primeira sílaba)
  const mesmoSom = (a, b) => a !== b && ((!!somDe(a) && somDe(a) === somDe(b)) || W[a].s[0] === W[b].s[0]);

  /* Terminação que faz rimar: da vogal da sílaba mais forte até o fim.
     pato -> "ato", limão -> "ao", trator -> "or", cadeira -> "eira". Usada na atividade de falar uma rima. */
  const semAc = (t) => String(t).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  function terminacao(k) {
    const w = W[k]; const s = w.s.map((x) => x.toLowerCase()); const f = semAc(w.f);
    let t = s.findIndex((x) => /[áéíóúâêôãõ]/.test(x));                         // sílaba com acento escrito
    if (t < 0) t = s.length === 1 || (/([rlzxiu]|im|um|om)$/.test(f)) ? s.length - 1 : s.length - 2; // oxítona ou paroxítona
    const resto = semAc(s.slice(Math.max(0, t)).join('')).replace(/^([^aeiou]*?)(q|g)u(?=[ei])/, '$1$2');
    const v = resto.search(/[aeiou]/);
    return v < 0 ? resto : resto.slice(v);
  }
  // Um jeito comum de a criança errar a palavra (usado só nos dados de demonstração)
  const erroComum = (k) => { const f = W[k].f; const e = f.replace(/rr/, 'r').replace(/lh/, 'li').replace(/^r/, 'l').replace(/ç/, 's'); return e !== f ? e : f.slice(0, -1); };
  /* Rodada de FALAR (microfone). modo:
     repetir: o Bip fala a palavra e a criança repete;  nomear: a criança vê a figura e fala o nome sozinha. */
  const itemFalar = (k, modo = 'repetir') => ({
    tipo: 'falar', modo, palavra: k, mostrarPalavra: modo !== 'nomear', regra: { tipo: 'palavra', palavra: W[k].f },
    fala: modo === 'nomear' ? 'Que figura é essa? Aperte o microfone e fale o nome dela.' : `Aperte o microfone e fale: ${W[k].f}.`,
    falaCurta: W[k].f, rotulo: `Falar: ${W[k].t}`, erroComum: erroComum(k),
  });

  // ---------- geradores por tipo de fase ----------
  const G = {
    contaPalavras(tams) {
      return () => {
        const n = pick(tams); const f = pick(FRASES[n]);
        return { tipo: 'contagem', modo: 'palavras', fala: f, n, rotulo: `Palavras: "${f}"` };
      };
    },
    contaSilabas(bancos) {
      return () => {
        const k = pick(pick(bancos));
        return { tipo: 'contagem', modo: 'silabas', palavra: k, fala: W[k].f, n: W[k].s.length, rotulo: `Sílabas: ${W[k].t}` };
      };
    },
    ultimaPalavra() {
      return () => {
        const [ini, k] = pick(FRASES_FIM);
        const ops = shuffle([k, ...sample(TODAS.filter((x) => x !== k && FRASES_FIM.some((p) => p[1] === x)), 2)]);
        return { tipo: 'escolha', fala: `${ini} ${W[k].f}. Qual foi a última palavra?`, falaCurta: `${ini} ${W[k].f}.`,
          opcoes: ops.map((x) => ({ id: x, img: W[x].img, fala: W[x].f })), certo: k, rotulo: `Última palavra: ${W[k].t}` };
      };
    },
    montaSilabas(banco, distrator) {
      return () => {
        const k = pick(banco); const alvo = W[k].s;
        let pecas = alvo.slice();
        if (distrator) pecas.push(pick(['LA', 'MI', 'TU', 'BE', 'RO', 'NA', 'PI', 'DE'].filter((s) => !alvo.includes(s))));
        return { tipo: 'montar', modo: 'silabas', palavra: k, alvo, pecas: shuffle(pecas), rotulo: `Montar: ${W[k].t}` };
      };
    },
    comecaCom() {
      return () => {
        const base = pick(SIMPLES2.concat(SIMPLES3));
        const sil = W[base].s[0];
        const outros = sample(TODAS.filter((x) => W[x].s[0] !== sil && W[x].s[0][0] !== sil[0]), 2);
        return { tipo: 'escolha', fala: `Qual figura começa com... ${falaSilaba(sil)}?`, falaCurta: falaSilaba(sil), texto: `Qual figura começa com ${sil}?`,
          opcoes: shuffle([base, ...outros]).map((x) => ({ id: x, img: W[x].img, fala: W[x].f })), certo: base,
          rotulo: `Sílaba inicial ${sil}` };
      };
    },
    vfRima() {
      return () => {
        const sim = rnd() < 0.5; const g = pick(RIMAS); const [a, b] = sample(g, 2);
        const bb = sim ? b : naoRima(a, 1)[0];
        return { tipo: 'vf', a, b: bb, resposta: sim, fala: `${W[a].f}... ${W[bb].f}... Essas palavras rimam?`,
          rotulo: `Rima? ${W[a].t} × ${W[bb].t}` };
      };
    },
    escolhaRima() {
      return () => {
        const g = pick(RIMAS); const [a, b] = sample(g, 2);
        return { tipo: 'escolha', modelo: a, fala: `Qual figura rima com ${W[a].f}?`, falaCurta: W[a].f,
          opcoes: shuffle([b, ...naoRima(a, 2)]).map((x) => ({ id: x, img: W[x].img, fala: W[x].f })), certo: b,
          rotulo: `Rima com ${W[a].t}` };
      };
    },
    caixasRima() {
      return () => {
        const g = pick(RIMAS.filter((r) => r.length >= 3)); const [a, ...rest] = shuffle(g);
        const sim = rest.slice(0, 2); const nao = naoRima(a, 4 - sim.length);
        return { tipo: 'caixas', criterio: 'rima', modelo: a, fala: `Leve para a caixa verde as figuras que rimam com ${W[a].f}.`,
          figuras: shuffle([...sim.map((w) => ({ w, ok: true })), ...nao.map((w) => ({ w, ok: false }))]),
          rotulo: `Rima com ${W[a].t}` };
      };
    },
    ligarRima() {
      return () => {
        const gs = sample(RIMAS, 3);
        return { tipo: 'ligar', criterio: 'rima', fala: 'Ligue as figuras que rimam.',
          pares: gs.map((g) => sample(g, 2)), rotulo: 'Ligar rimas' };
      };
    },
    vfSom() {
      return () => {
        const sim = rnd() < 0.5; const l = pick(Object.keys(SONS).filter((x) => SONS[x].length >= 2));
        const [a, b] = sample(SONS[l], 2); const bb = sim ? b : outroSom(a, 1)[0];
        return { tipo: 'vf', a, b: bb, resposta: sim, fala: `${W[a].f}... ${W[bb].f}... Começam com o mesmo som?`,
          rotulo: `Mesmo som? ${W[a].t} × ${W[bb].t}` };
      };
    },
    escolhaSom() {
      return () => {
        const l = pick(Object.keys(SONS).filter((x) => SONS[x].length >= 3)); const [a, b] = sample(SONS[l], 2);
        return { tipo: 'escolha', modelo: a, fala: `Qual figura começa com o mesmo som que ${W[a].f}?`, falaCurta: W[a].f,
          opcoes: shuffle([b, ...outroSom(a, 2)]).map((x) => ({ id: x, img: W[x].img, fala: W[x].f })), certo: b,
          rotulo: `Mesmo som inicial: ${W[a].t}` };
      };
    },
    ligarSom() {
      return () => {
        const ls = sample(Object.keys(SONS).filter((x) => SONS[x].length >= 2), 3);
        return { tipo: 'ligar', criterio: 'som', fala: 'Ligue as figuras que começam com o mesmo som.',
          pares: ls.map((l) => sample(SONS[l], 2)), rotulo: 'Ligar mesmo som' };
      };
    },
    caixasSom() {
      return () => {
        const l = pick(Object.keys(SONS).filter((x) => SONS[x].length >= 4)); const [a, ...rest] = shuffle(SONS[l]);
        const sim = rest.slice(0, 2); const nao = outroSom(a, 2);
        return { tipo: 'caixas', criterio: 'som', modelo: a, fala: `Leve para a caixa verde as figuras que começam como ${W[a].f}.`,
          figuras: shuffle([...sim.map((w) => ({ w, ok: true })), ...nao.map((w) => ({ w, ok: false }))]),
          rotulo: `Começa como ${W[a].t}` };
      };
    },
    somLongo() {
      return () => {
        const l = pick(Object.keys(SOM_LONGO).filter((x) => SONS[x].length >= 1));
        const a = pick(SONS[l]); const outros = outroSom(a, 2);
        return { tipo: 'escolha', fala: `Qual figura começa com o som... ${SOM_LONGO[l]}?`, falaCurta: SOM_LONGO[l], texto: `Qual figura começa com o som /${l.toLowerCase()}/?`,
          opcoes: shuffle([a, ...outros]).map((x) => ({ id: x, img: W[x].img, fala: W[x].f })), certo: a,
          rotulo: `Som /${l.toLowerCase()}/` };
      };
    },
    escolhaLetra() {
      return () => {
        const l = pick(Object.keys(SONS)); const a = pick(SONS[l]);
        const ops = shuffle([l, ...sample(Object.keys(SONS).filter((x) => x !== l), 2)]);
        return { tipo: 'escolha', modelo: a, modeloGrande: true, fala: `Com que letra começa ${W[a].f}?`, falaCurta: W[a].f,
          opcoes: ops.map((x) => ({ id: x, letra: x, fala: `letra ${x}` })), certo: l, rotulo: `Letra inicial de ${W[a].t}` };
      };
    },
    ligarLetra() {
      return () => {
        const ls = sample(Object.keys(SONS), 3);
        return { tipo: 'ligar', criterio: 'letra', fala: 'Ligue cada figura à letra do seu primeiro som.',
          pares: ls.map((l) => [pick(SONS[l]), l]), rotulo: 'Ligar som e letra' };
      };
    },
    // ----- Falar no microfone (uma fase no fim de cada mundo) -----
    falarRepetir(banco) { return () => itemFalar(pick(banco), 'repetir'); },
    falarSilaba() {
      return () => {
        const iniciais = {}; TODAS.forEach((k) => { const s0 = W[k].s[0]; if (/^[A-Z]{2}$/.test(s0)) (iniciais[s0] = iniciais[s0] || []).push(k); });
        const sil = pick(Object.keys(iniciais).filter((x) => iniciais[x].length >= 2));
        const ex = iniciais[sil];
        return { tipo: 'falar', modo: 'silaba', silaba: sil, palavra: pick(ex), exemplos: ex, regra: { tipo: 'silaba', silaba: sil },
          fala: `Fale uma palavra que começa com... ${falaSilaba(sil)}!`, falaCurta: falaSilaba(sil), rotulo: `Falar: começa com ${sil}`, erroComum: falaSilaba(sil) };
      };
    },
    falarRima() {
      return () => {
        const g = pick(RIMAS); const a = pick(g);
        return { tipo: 'falar', modo: 'rima', palavra: a, exemplos: g.filter((x) => x !== a), regra: { tipo: 'rima', palavra: W[a].f, rima: terminacao(a) },
          fala: `Fale uma palavra que rima com ${W[a].f}.`, falaCurta: W[a].f, rotulo: `Falar rima de ${W[a].t}`, erroComum: W[a].f };
      };
    },
    falarSom() {
      return () => {
        const l = pick(Object.keys(SONS).filter((x) => SONS[x].length >= 3)); const a = pick(SONS[l]);
        return { tipo: 'falar', modo: 'som', palavra: a, exemplos: SONS[l].filter((x) => x !== a), regra: { tipo: 'som', palavra: W[a].f },
          fala: `Fale outra palavra que começa com o mesmo som de ${W[a].f}.`, falaCurta: W[a].f, rotulo: `Falar som inicial de ${W[a].t}`, erroComum: W[a].f };
      };
    },
    falarLetra() {
      return () => {
        const l = pick(Object.keys(SONS).filter((x) => SONS[x].length >= 2));
        return { tipo: 'falar', modo: 'letra', letra: l, palavra: pick(SONS[l]), exemplos: SONS[l], regra: { tipo: 'letra', letra: l },
          fala: `Fale uma palavra que começa com a letra ${l}.`, falaCurta: `letra ${l}`, rotulo: `Falar: começa com a letra ${l}`, erroComum: '' };
      };
    },
    completaLetra() {
      return () => {
        const k = pick(SIMPLES2.concat(SIMPLES3).filter((x) => somDe(x)));
        const l = W[k].letra; const ops = shuffle([l, ...sample(Object.keys(SONS).filter((x) => x !== l), 2)]);
        return { tipo: 'montar', modo: 'letra', minuscula: true, palavra: k, alvo: [l], pecas: ops, rotulo: `Primeira letra: ${W[k].t}` };
      };
    },
  };

  const HAB = {
    palavra: { nome: 'Palavras', cor: '#D63F86' }, silaba: { nome: 'Sílabas', cor: '#2E9A3E' },
    rima: { nome: 'Rimas', cor: '#E0661E' }, aliteracao: { nome: 'Aliteração', cor: '#7A5AF0' }, fonema: { nome: 'Fonemas', cor: '#1E88D0' },
  };

  const MUNDOS = [
    { id: 1, nome: 'Planeta das Palavras', hab: 'palavra', bg: 'bg_mundo1', cor: '#D63F86' },
    { id: 2, nome: 'Lua das Sílabas', hab: 'silaba', bg: 'bg_mundo2', cor: '#2E9A3E' },
    { id: 3, nome: 'Anéis das Rimas', hab: 'rima', bg: 'bg_mundo3', cor: '#E0661E' },
    { id: 4, nome: 'Nebulosa do Eco', hab: 'aliteracao', bg: 'bg_mundo4', cor: '#7A5AF0' },
    { id: 5, nome: 'Constelação das Letras', hab: 'fonema', bg: 'bg_mundo5', cor: '#1E88D0' },
  ];

  const INTRO = {
    contagem_palavras: 'Escute a frase e toque no tambor uma vez para cada palavra. Depois toque no botão verde.',
    contagem_silabas: 'Escute a palavra e toque no tambor para cada pedacinho, como bater palmas! Depois toque no botão verde.',
    escolha: 'Escute com atenção e toque na figura certa.',
    montar_silabas: 'Arraste os pedacinhos para montar o nome da figura.',
    montar_letra: 'Arraste a letra que falta para completar a palavra.',
    vf: 'Escute as duas palavras. Se estiver certo, toque no joinha para cima. Se não, no joinha para baixo.',
    caixas: 'Arraste cada figura para a caixa certa.',
    ligar: 'Toque numa figura e depois no par dela para ligar as duas.',
    falar: 'Toque no microfone, espere ele ficar vermelho e fale bem alto. O Bip vai escutar!',
  };

  // Rótulos por sub-item (cada par ligado / cada figura da caixa é registrado separadamente)
  const nomeItem = (x) => (W[x] ? W[x].t : x);
  function comSubRotulos(gen) {
    return () => {
      const it = gen();
      if (it.tipo === 'ligar') {
        const pre = { rima: 'Rima', som: 'Mesmo som', letra: 'Som e letra' }[it.criterio];
        it.subRotulos = it.pares.map(([a, b]) => `${pre}: ${nomeItem(a)} × ${nomeItem(b)}`);
      } else if (it.tipo === 'caixas') {
        const pre = it.criterio === 'rima' ? 'Rima' : 'Mesmo som';
        it.subRotulos = it.figuras.map((f) => `${pre}: ${nomeItem(it.modelo)} × ${nomeItem(f.w)}`);
      }
      return it;
    };
  }

  const FASES = [
    // mundo, fase, template(intro), gerador, rodadas
    [1, 1, 'contagem_palavras', G.contaPalavras([2, 3]), 6, 'Contar palavras'],
    [1, 2, 'contagem_palavras', G.contaPalavras([3, 4]), 6, 'Contar mais palavras'],
    [1, 3, 'escolha', G.ultimaPalavra(), 6, 'A última palavra'],
    [1, 4, 'contagem_palavras', G.contaPalavras([3, 4, 5]), 6, 'Frases compridas'],
    [1, 5, 'falar', G.falarRepetir(SIMPLES2.concat(SIMPLES3)), 5, 'Fale comigo'],
    [2, 1, 'contagem_silabas', G.contaSilabas([MONO, SIMPLES2, SIMPLES3]), 6, 'Bater palmas'],
    [2, 2, 'montar_silabas', G.montaSilabas(SIMPLES2, false), 6, 'Juntar pedacinhos'],
    [2, 3, 'montar_silabas', G.montaSilabas(SIMPLES3, true), 6, 'Palavras de três pedaços'],
    [2, 4, 'escolha', G.comecaCom(), 6, 'Como começa?'],
    [2, 5, 'falar', G.falarSilaba(), 5, 'Fale uma palavra com...'],
    [3, 1, 'vf', G.vfRima(), 6, 'Rima ou não rima?'],
    [3, 2, 'escolha', G.escolhaRima(), 6, 'Achar a rima'],
    [3, 3, 'caixas', G.caixasRima(), 2, 'Caixa das rimas'],
    [3, 4, 'ligar', G.ligarRima(), 3, 'Ligar rimas'],
    [3, 5, 'falar', G.falarRima(), 5, 'Fale uma rima'],
    [4, 1, 'vf', G.vfSom(), 6, 'Mesmo som?'],
    [4, 2, 'escolha', G.escolhaSom(), 6, 'Começa igual'],
    [4, 3, 'ligar', G.ligarSom(), 3, 'Pares de sons'],
    [4, 4, 'caixas', G.caixasSom(), 2, 'Caixa dos sons'],
    [4, 5, 'falar', G.falarSom(), 5, 'Fale começando igual'],
    [5, 1, 'escolha', G.somLongo(), 6, 'Que som é esse?'],
    [5, 2, 'escolha', G.escolhaLetra(), 6, 'Qual é a letra?'],
    [5, 3, 'ligar', G.ligarLetra(), 3, 'Som e letra'],
    [5, 4, 'montar_letra', G.completaLetra(), 6, 'Complete a palavra'],
    [5, 5, 'falar', G.falarLetra(), 5, 'Fale com a letra'],
  ].map(([m, f, tpl, gen, rodadas, nome], i) => ({
    id: `m${m}f${f}`, idx: i, mundo: m, fase: f, tpl, gen: comSubRotulos(gen), rodadas, nome,
    hab: MUNDOS[m - 1].hab, intro: INTRO[tpl],
  }));

  // Recompensas: uma figurinha por fase concluída (25 fases = 25 figurinhas)
  const FIGURINHAS = ['panda', 'girafa', 'zebra', 'pinguim', 'coruja', 'elefante', 'papagaio', 'baleia', 'coelho', 'macaco',
    'urso', 'cavalo', 'porco', 'vaca', 'sapo', 'pato', 'galinha', 'cobra', 'jacare', 'hipopotamo', 'cachorro', 'gorila', 'cabra', 'pintinho', 'peixe'];

  TS.C = { W, RIMAS, SONS, MUNDOS, FASES, HAB, FIGURINHAS, INTRO, falaSilaba, falaSilabas, rimam, mesmoSom, shuffle, pick, sample, terminacao, itemFalar,
    fase: (id) => FASES.find((f) => f.id === id),
    META: 0.5, // acerto mínimo para liberar a próxima fase
    estrelas: (acc) => (acc >= 0.85 ? 3 : acc >= 0.65 ? 2 : acc >= 0.5 ? 1 : 0) };
})();
