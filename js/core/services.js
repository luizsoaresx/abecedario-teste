/* Serviços compartilhados: voz (fala em pt-BR), efeitos sonoros e utilidades. */
window.TS = window.TS || {};

TS.U = {
  // Identificador único no formato UUID (o mesmo que o banco de dados usa)
  uid: () => {
    const c = window.crypto;
    if (c && c.randomUUID) { try { return c.randomUUID(); } catch (e) { /* página sem https: usa o jeito abaixo */ } }
    const b = c && c.getRandomValues ? c.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  },
  hoje: () => new Date().toISOString(),
  diasEntre: (a, b = new Date()) => Math.floor((new Date(b) - new Date(a)) / 86400000),
  fmtData: (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'),
  fmtDataHora: (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'),
  relativo(iso) {
    if (!iso) return 'nunca';
    const d = TS.U.diasEntre(iso);
    if (d <= 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 30) return `há ${d} dias`;
    return TS.U.fmtData(iso);
  },
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  pct: (x) => (isFinite(x) ? Math.round(x * 100) + '%' : '—'),
  semAcento: (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(),
};

/* Voz do Bip — dois jeitos de falar, nesta ordem:

   1) GRAVAÇÕES com voz neural feminina (arquivos MP3 em audio/falas/, listados em js/data/falas.js).
      São geradas UMA VEZ com ferramentas/gerar_vozes.py (voz pt-BR-ThalitaMultilingualNeural da Microsoft, gratuita).
      Todo aluno ouve a mesma voz humana, as sílabas saem certinhas e sem engasgos.
      Uma frase que não foi gravada inteira é MONTADA com os pedaços gravados ("Monte a palavra" + "gato"):
      o jogo procura sempre o maior pedaço gravado que cabe (veja montar()).
   2) Se alguma parte da frase não tiver gravação (um nome de aluno, uma frase digitada pela professora),
      a frase inteira é falada pela VOZ DO NAVEGADOR (Web Speech API), a mais natural que existir:
      Edge: "Thalita/Francisca Online (Natural)"; Chrome: "Google português do Brasil"; iPhone/Mac: "Luciana".
      Assim a voz nunca muda no meio de uma frase.

   Detalhes que evitam engasgos na voz do navegador: velocidade normal, "..." vira vírgula, só cancela a fala anterior
   quando há alguma tocando, frases longas são divididas, e sílabas soltas recebem acento ("gá", "tô"). */
TS.Voz = (function () {
  const synth = window.speechSynthesis;
  const CHAVE = 'trilhaDosSons.voz';   // onde guardamos a voz escolhida e a velocidade
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { /* sem preferências */ }
  const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) { /* segue */ } };

  let voz = null;        // a voz do navegador em uso
  let lista = [];        // vozes em português, da melhor para a pior
  let ativo = true;
  let atual = null;      // guarda a fala em andamento (senão o Chrome pode apagá-la da memória e ela para)
  const player = new Audio(); player.preload = 'auto'; // um só tocador para as gravações (no iPhone, ele é "destravado" no primeiro toque)
  let tocando = false;
  let geracao = 0;       // muda a cada parar(): falas antigas não continuam depois de um cancelamento
  const VELOCIDADES = [0.9, 1, 1.12];  // devagar, normal, rápida
  let velocidade = VELOCIDADES.includes(pref.vel) ? pref.vel : 1;

  /* ---------- Gravações ---------- */
  // js/data/falas.js (gerado por ferramentas/gerar_vozes.py): { nome, base, mapa: { "monte a palavra": "a1b2c3.mp3", ... } }
  let F = null, MAPA = {}, BASE = 'audio/falas/';
  const lerFalas = () => { if (F !== TS.FALAS) { F = TS.FALAS || {}; MAPA = F.mapa || {}; BASE = F.base || 'audio/falas/'; } };
  const temGravacoes = () => { lerFalas(); return Object.keys(MAPA).length > 0 && pref.gravadas !== false; };
  // Chave de busca: minúsculas, sem pontuação e sem espaços repetidos ("Monte a palavra!" -> "monte a palavra")
  const chave = (t) => String(t).toLowerCase().replace(/\.\.\.|…/g, ' ').replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim();
  /* Divide o texto em pedaços gravados, sempre pegando o MAIOR pedaço que existe.
     Devolve [{ arq, pausa }] (pausa maior depois de fim de frase) ou null se faltar algum pedaço. */
  function montar(texto) {
    if (!temGravacoes()) return null;
    const inteira = MAPA[chave(texto)];
    if (inteira) return [{ arq: inteira, pausa: 0 }];
    // palavras do texto e onde terminam as frases (ponto, exclamação, interrogação, vírgula, reticências)
    const tokens = [];
    String(texto).replace(/\.\.\.|…/g, ', ').split(/\s+/).forEach((w) => {
      const limpa = chave(w); if (!limpa) { if (tokens.length && /[.!?,;:]/.test(w)) tokens[tokens.length - 1].fim = true; return; }
      limpa.split(' ').forEach((p) => tokens.push({ p, fim: false }));
      if (/[.!?,;:]["”)]*$/.test(w)) tokens[tokens.length - 1].fim = true;
    });
    // Divisão em pedaços com o MENOR número de gravações (programação dinâmica): melhor[i] = menos pedaços até a palavra i
    const melhor = [0]; const de = [];
    for (let i = 1; i <= tokens.length; i++) {
      melhor[i] = Infinity;
      for (let j = Math.max(0, i - 14); j < i; j++) {
        if (melhor[j] + 1 < melhor[i] && MAPA[tokens.slice(j, i).map((t) => t.p).join(' ')]) { melhor[i] = melhor[j] + 1; de[i] = j; }
      }
    }
    if (!tokens.length || melhor[tokens.length] === Infinity) return null;
    const partes = [];
    for (let i = tokens.length; i > 0; i = de[i]) {
      const j = de[i];
      partes.unshift({ arq: MAPA[tokens.slice(j, i).map((t) => t.p).join(' ')], pausa: tokens[i - 1].fim ? 260 : 90 });
    }
    return partes;
  }
  // Toca uma lista de gravações em sequência. aoParte(i) avisa quando cada uma começa. Devolve Promise(true se tocou tudo).
  function tocarPartes(partes, minha, aoParte) {
    return new Promise((resolve) => {
      let i = 0;
      const prox = () => {
        if (minha !== geracao) { tocando = false; return resolve(true); }
        if (i >= partes.length) { tocando = false; return resolve(true); }
        const p = partes[i];
        let terminou = false;
        const fim = (ok) => {
          if (terminou) return; terminou = true;
          player.onended = player.onerror = null;
          if (!ok) { tocando = false; return resolve(i > 0); }  // arquivo não abriu: avisa para usar a voz do navegador
          i++; setTimeout(prox, p.pausa);
        };
        player.onended = () => fim(true);
        player.onerror = () => fim(false);
        player.src = BASE + p.arq;
        player.playbackRate = Math.min(1.25, Math.max(0.85, velocidade));
        if (aoParte) aoParte(i);
        tocando = true;
        const pr = player.play();
        if (pr && pr.catch) pr.catch(() => fim(false));
      };
      prox();
    });
  }

  /* ---------- Voz do navegador ---------- */
  // Nota de cada voz: quanto maior, melhor para o Bip
  function nota(v) {
    const lang = String(v.lang || '').replace('_', '-');
    let n = 0;
    if (/^pt-BR/i.test(lang)) n += 100; else if (/^pt/i.test(lang)) n += 40; else return -1;
    if (/Natural|Neural|Online/i.test(v.name)) n += 40;                                  // vozes neurais (Edge): as mais humanas
    if (/Thalita/i.test(v.name)) n += 34;                                                 // a mais nova da Microsoft
    if (/Francisca|Leila|Yara|Manuela|Brenda|Elza|Giovanna|Leticia/i.test(v.name)) n += 30; // femininas (Microsoft)
    if (/Luciana|Fernanda|Joana|Catarina|Vit[oó]ria|Camila|Maria|Helena|Raquel/i.test(v.name)) n += 25; // femininas (Apple, Windows)
    if (/Google/i.test(v.name)) n += 28;                                                   // Chrome: voz do Google (feminina)
    if (/Daniel|Ant[oô]nio|Felipe|Ricardo|Humberto|Donato|F[aá]bio|J[uú]lio|Nicolau|Val[eé]rio|Thiago|Macerio|male\b|masculin/i.test(v.name)) n -= 60; // masculinas
    if (v.localService) n += 2; // desempate: voz instalada começa mais rápido
    return n;
  }
  function escolher() {
    if (!synth) return;
    lista = synth.getVoices().filter((v) => nota(v) >= 0).sort((a, b) => nota(b) - nota(a));
    voz = (pref.nome && lista.find((v) => v.name === pref.nome)) || lista[0] || null;
  }
  if (synth) { escolher(); if (synth.addEventListener) synth.addEventListener('voiceschanged', escolher); else synth.onvoiceschanged = escolher; }

  // Nome curto: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)" -> "Francisca (natural)"
  const nomeCurto = (v) => (v ? v.name.replace(/^Microsoft\s+/i, '').replace(/\s*-\s*Portugu[eê]s.*$/i, '').replace(/\s*-\s*Portuguese.*$/i, '')
    .replace(/\s*Multilingual/i, '').replace(/\s*Online\s*\(Natural\)/i, ' (natural)').trim() : 'padrão do navegador');
  // Texto que vai para a voz: reticências viram vírgula (pausa curta) e espaços repetidos somem
  const paraFala = (t) => String(t).replace(/\s*(\.\.\.|…)\s*/g, ', ').replace(/,\s*([,.!?])/g, '$1').replace(/^[,\s]+/, '').replace(/\s+/g, ' ').trim();
  // Corta textos compridos em frases (o Chrome interrompe falas com mais de ~15 segundos)
  const frases = (t) => (t.length <= 180 ? [t] : t.match(/[^.!?]+[.!?]*\s*/g).map((x) => x.trim()).filter(Boolean));

  // Está falando alguma coisa agora? (voz do navegador ou gravação)
  const ocupada = () => !!((synth && (synth.speaking || synth.pending)) || tocando);
  // Espera a fala atual terminar (no máximo maxMs). Usado para uma fala não cortar a outra.
  function quandoCalar(maxMs = 3000) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const olhar = () => (!ocupada() || Date.now() - t0 > maxMs ? resolve() : setTimeout(olhar, 50));
      olhar();
    });
  }

  // Fala com a voz do navegador (usada quando falta gravação)
  function sintetizar(texto, opts, minha, fim) {
    if (!synth) { setTimeout(fim, opts.semVozMs ?? 300); return; }
    const rate = Math.min(1.3, Math.max(0.8, Math.max(0.9, opts.rate ?? 1) * velocidade));
    let dito = opts.dito || paraFala(texto);
    if (/^\p{L}{1,6}$/u.test(dito)) dito += '.'; // uma sílaba ou palavra sozinha: o ponto faz a voz falar inteira
    const partes = frases(dito);
    const falarParte = (i) => {
      if (minha !== geracao) return fim();
      if (i >= partes.length) return fim();
      const u = new SpeechSynthesisUtterance(partes[i]);
      u.lang = (voz && voz.lang) || 'pt-BR'; if (voz) u.voice = voz;
      u.rate = rate; u.pitch = opts.pitch ?? 1.0; u.volume = opts.volume ?? 1;
      let acabou = false, seguranca = null;
      const proxima = () => { if (!acabou) { acabou = true; clearTimeout(seguranca); falarParte(i + 1); } };
      // Segurança: alguns navegadores não avisam quando a fala termina (prazo largo para não cortar a fala)
      const prazo = (extra) => { clearTimeout(seguranca); seguranca = setTimeout(proxima, extra + partes[i].length * 160 / rate); };
      u.onstart = () => { prazo(2500); if (i === 0 && opts.onstart) opts.onstart(); };
      u.onend = proxima; u.onerror = proxima;
      if (opts.onboundary) u.onboundary = opts.onboundary;
      atual = u;
      prazo(8000);
      if (synth.paused) synth.resume(); // o Chrome às vezes fica "pausado" depois de trocar de aba
      synth.speak(u);
    };
    falarParte(0);
  }

  /* Fala um texto. Devolve uma Promise que termina quando a fala acaba (para usar com await).
     opts: rate, pitch, volume, onstart, onend, fila: true = espera a fala atual acabar em vez de cortá-la. */
  function falar(texto, opts = {}) {
    if (opts.fila) {
      const g = geracao;
      return quandoCalar(4000).then(() => (g === geracao ? falar(texto, { ...opts, fila: false }) : undefined));
    }
    return new Promise((resolve) => {
      const minha = ++geracao;
      let feito = false;
      const fim = () => { if (!feito) { feito = true; opts.onend && opts.onend(); resolve(); } };
      if (!ativo || !texto || !String(texto).trim()) { setTimeout(fim, opts.semVozMs ?? 300); return; }
      const cancelou = pararTudo();
      const partes = montar(texto);
      if (partes) {
        if (opts.onstart) opts.onstart();
        tocarPartes(partes, minha).then((ok) => { if (ok || minha !== geracao) fim(); else sintetizar(texto, opts, minha, fim); });
        return;
      }
      // Sem gravação: voz do navegador (depois de um cancel(), espera um instante, senão o Chrome pode ignorar a fala nova)
      if (cancelou) setTimeout(() => sintetizar(texto, opts, minha, fim), 80); else sintetizar(texto, opts, minha, fim);
    });
  }

  /* Fala várias partes (ex.: as sílabas "gá", "tô") e avisa quando cada uma começa (aoParte(i)),
     para o jogo acender a bolinha certa. Com gravações, cada sílaba é um arquivo: o aviso chega na hora exata.
     Na voz do navegador, as partes vão numa fala só (sílabas separadas por ponto; palavras por vírgula). */
  function falarSequencia(partes, aoParte, opts = {}) {
    const minha0 = geracao;
    const grav = temGravacoes() && partes.every((p) => MAPA[chave(p)]);
    if (grav && ativo) {
      return new Promise((resolve) => {
        const minha = ++geracao; void minha0;
        pararTudo();
        const lista2 = partes.map((p) => ({ arq: MAPA[chave(p)], pausa: opts.pausa ?? 320 }));
        tocarPartes(lista2, minha, aoParte).then(() => resolve());
      });
    }
    const sep = opts.sep || '... ';
    const sepFala = opts.sepFala || '. ';
    const texto = partes.join(sep);
    const ditas = partes.map(paraFala);
    const inicios = []; let pos = 0;
    ditas.forEach((p) => { inicios.push(pos); pos += p.length + sepFala.length; });
    let mostradas = 0; let relogio = null;
    const mostrar = (ate) => { while (mostradas <= ate && mostradas < partes.length) aoParte(mostradas++); };
    const porTempo = () => { // plano B: o navegador não informa a posição da fala, então seguimos o relógio
      clearInterval(relogio);
      relogio = setInterval(() => { mostrar(mostradas); if (mostradas >= partes.length) clearInterval(relogio); }, opts.intervalo || 480);
    };
    let recebeuPosicao = false;
    return falar(texto, {
      ...opts,
      dito: ditas.join(sepFala) + (sepFala.trim() === '.' ? '.' : ''),
      onstart: () => { mostrar(0); setTimeout(() => { if (!recebeuPosicao) porTempo(); }, 400); },
      onboundary: (e) => { recebeuPosicao = true; let k = 0; inicios.forEach((ini, i) => { if (e.charIndex >= ini) k = i; }); mostrar(k); },
      semVozMs: partes.length * 600,
    }).then(() => { clearInterval(relogio); mostrar(partes.length - 1); });
  }

  // Para a gravação e a voz. Devolve true se havia alguma fala para cancelar.
  function pararTudo() {
    let havia = false;
    if (tocando || !player.paused) { try { player.pause(); } catch (e) { /* segue */ } tocando = false; havia = true; }
    if (synth && (synth.speaking || synth.pending)) { synth.cancel(); havia = true; }
    return havia;
  }

  // O que mostrar na tela "Sons do jogo"
  function descricao() {
    lerFalas();
    if (temGravacoes()) return { gravada: true, nome: `Voz gravada: ${F.nome || 'neural'} (${Object.keys(MAPA).length} falas)`,
      dica: 'Voz gravada com voz neural: igual em todos os aparelhos.' };
    const n = nomeCurto(voz);
    return { gravada: false, nome: `Voz do navegador: ${n}`,
      dica: Object.keys(MAPA).length ? 'Gravações desligadas.' : 'Dica: rode ferramentas/gerar_vozes (veja o LEIA-ME) para a voz neural gravada.' };
  }

  return {
    falar,
    falarSequencia,
    parar: () => { geracao++; pararTudo(); },
    // No celular, a voz só funciona depois de um toque: o botão Jogar chama destravar()
    destravar: () => {
      if (synth && ativo) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'pt-BR'; synth.speak(u); }
      // "destrava" o tocador de gravações (iPhone): toca um silêncio curtinho
      try { player.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAVIAnZ2dnZ2dnZ2dnZ2dnZ2dnbGxsbGxsbGxsbGxsbGxsbGxxMTExMTExMTExMTExMTExNjY2NjY2NjY2NjY2NjY2NjY7Ozs7Ozs7Ozs7Ozs7Ozs7Oz/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQEUQAAAAAAAAFSti+n7wAAAAAAAAAAAAAAAAD/8xDEAAAAA0gAAAAATEFNRTMuMTAwVVVVVf/zEMQNAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxBoAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDEJwAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMQ0AAADSAAAAABVVVVVVVVVVVVVVVVV//MQxEEAAANIAAAAAFVVVVVVVVVVVVVVVVU='; player.volume = 0; const pr = player.play(); if (pr && pr.then) pr.then(() => { player.pause(); player.volume = 1; }).catch(() => { player.volume = 1; }); } catch (e) { /* segue */ }
    },
    falando: ocupada,
    quandoCalar,
    setAtivo: (v) => { ativo = v; if (!v) pararTudo(); },
    ativo: () => ativo,
    disponivel: () => !!synth || temGravacoes(),
    temGravacoes,
    descricao,
    nomeVoz: () => nomeCurto(voz),
    vozFeminina: () => !!voz && nota(voz) >= 120,
    // Tela Sons: trocar de voz (passa para a próxima da lista) e de velocidade
    quantasVozes: () => { lerFalas(); return lista.length + (Object.keys(MAPA).length ? 1 : 0); },
    proximaVoz() {
      lerFalas();
      // Com gravações: a primeira opção é a voz gravada; depois as vozes do navegador
      if (!lista.length) escolher();
      if (Object.keys(MAPA).length) {
        if (pref.gravadas !== false) { pref.gravadas = false; voz = lista[0] || voz; guardar(); return descricao().nome; }
        const i = lista.indexOf(voz);
        if (i >= lista.length - 1 || i < 0) { pref.gravadas = true; pref.nome = null; guardar(); return descricao().nome; }
        voz = lista[i + 1]; pref.nome = voz.name; guardar(); return descricao().nome;
      }
      if (!lista.length) return nomeCurto(null);
      const i = lista.indexOf(voz);
      voz = lista[(i + 1) % lista.length];
      pref.nome = voz.name; guardar();
      return nomeCurto(voz);
    },
    velocidade: () => velocidade,
    setVelocidade(v) { if (VELOCIDADES.includes(v)) { velocidade = v; pref.vel = v; guardar(); } },
    VELOCIDADES,
    montar, chave, // para testes e para a ferramenta que lista as falas
  };
})();

/* Efeitos sonoros (Kenney Interface Sounds / Music Jingles, CC0). */
TS.Som = (function () {
  const cache = {};
  let ativo = true;
  function tocar(k, vol = 0.6) {
    if (!ativo || !TS.ASSETS || !TS.ASSETS.snd[k]) return;
    try {
      cache[k] = cache[k] || new Audio(TS.ASSETS.snd[k]);
      const a = cache[k].cloneNode();
      a.volume = vol;
      a.play().catch(() => {});
    } catch (e) { /* sem áudio */ }
  }
  return { tocar, setAtivo: (v) => (ativo = v), ativo: () => ativo };
})();
