/* escuta.js — o MICROFONE: a criança fala e o jogo reconhece o que ela disse.

   Usa o reconhecimento de fala do próprio navegador (Web Speech API — gratuito, sem instalar nada):
   - Google Chrome (computador e Android) e Microsoft Edge: funcionam muito bem (precisam de internet).
   - Safari (iPhone, iPad, Mac): funciona quando o Ditado/Siri está ligado no aparelho.
   - Firefox: não tem. Aí a atividade usa o "modo adulto confere": grava a voz da criança,
     toca de volta e um adulto toca no joinha (certo ou ainda não).
   O microfone só funciona em páginas https:// (ou http://localhost) — publique o jogo (veja o LEIA-ME)
   ou abra pelo arquivo ferramentas/abrir_jogo_windows.bat.

   Como o jogo decide se a criança acertou (função conferir):
   - o navegador devolve até 5 "palpites" do que ouviu (ex.: "carro", "caro", "o carro");
   - tudo vira letras minúsculas sem acento ("Maçã" -> "maca");
   - "palavra": aceita a palavra certa ou uma bem parecida (crianças pequenas trocam sons: "caro" por "carro");
   - "rima": aceita qualquer palavra que termine com o mesmo som (pato -> gato, sapato, mato);
   - "som": qualquer palavra que comece com o mesmo som (bola -> barco, bebê);
   - "silaba": que comece com aquela sílaba (BA -> banana, bala);
   - "letra": que comece com aquela letra ou com o som dela (M -> mesa, macaco). */
window.TS = window.TS || {};

TS.Escuta = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;

  // Dá para reconhecer a fala neste navegador?
  const disponivel = () => !!SR;
  const podeGravar = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  /* ouvir(): liga o microfone e devolve uma Promise com { textos: [...] } ou { erro: 'codigo' }.
     erros: sem_suporte, sem_fala (não ouviu nada), sem_microfone, bloqueado (permissão negada), rede, erro.
     o.aoParcial(texto): chamado enquanto a criança fala (para mostrar "Ouvi: ...").  o.tempo: máximo em ms. */
  function ouvir(o = {}) {
    return new Promise((resolve) => {
      if (!SR) return resolve({ erro: 'sem_suporte' });
      parar();
      let r;
      try { r = new SR(); } catch (e) { return resolve({ erro: 'sem_suporte' }); }
      rec = r;
      r.lang = 'pt-BR';            // português do Brasil
      r.continuous = false;        // uma fala só (para sozinho quando a criança fica em silêncio)
      r.interimResults = true;     // mostra o que está ouvindo enquanto a criança fala
      r.maxAlternatives = 5;       // até 5 palpites do que foi dito
      const textos = []; let parcial = ''; let acabou = false;
      const resultado = () => (textos.length ? { textos } : parcial ? { textos: [parcial] } : { erro: 'sem_fala' });
      const fim = (res) => {
        if (acabou) return; acabou = true;
        clearTimeout(relogio);
        try { r.abort(); } catch (e) { /* já parou */ }
        if (rec === r) rec = null;
        resolve(res);
      };
      const relogio = setTimeout(() => { try { r.stop(); } catch (e) { /* segue */ } setTimeout(() => fim(resultado()), 1500); }, o.tempo || 8000);
      r.onstart = () => o.aoComecar && o.aoComecar();
      r.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) { for (let j = 0; j < res.length; j++) textos.push(res[j].transcript); }
          else { parcial = res[0].transcript; if (o.aoParcial) o.aoParcial(parcial); }
        }
        if (textos.length) fim({ textos });
      };
      r.onerror = (ev) => {
        const mapa = { 'no-speech': 'sem_fala', 'audio-capture': 'sem_microfone', 'not-allowed': 'bloqueado', 'service-not-allowed': 'bloqueado',
          network: 'rede', aborted: 'cancelado', 'language-not-supported': 'sem_suporte' };
        fim({ erro: mapa[ev.error] || 'erro', detalhe: ev.error });
      };
      r.onend = () => setTimeout(() => fim(resultado()), 250);
      try { r.start(); } catch (e) { fim({ erro: 'erro', detalhe: String(e) }); }
    });
  }
  function parar() { if (rec) { try { rec.abort(); } catch (e) { /* segue */ } rec = null; } pararGravacao(); }

  /* Modo "adulto confere": grava alguns segundos da voz da criança para tocar de volta.
     Devolve { url } (endereço do áudio gravado) ou { erro }. */
  let gravador = null, fluxo = null;
  async function gravar(tempo = 4000) {
    if (!podeGravar()) return { erro: 'sem_suporte' };
    try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return { erro: e && e.name === 'NotAllowedError' ? 'bloqueado' : 'sem_microfone' }; }
    return new Promise((resolve) => {
      const pedacos = [];
      try { gravador = new MediaRecorder(fluxo); } catch (e) { pararGravacao(); return resolve({ erro: 'sem_suporte' }); }
      gravador.ondataavailable = (ev) => ev.data && ev.data.size && pedacos.push(ev.data);
      gravador.onstop = () => {
        const tipo = (pedacos[0] && pedacos[0].type) || 'audio/webm';
        pararGravacao();
        resolve(pedacos.length ? { url: URL.createObjectURL(new Blob(pedacos, { type: tipo })) } : { erro: 'sem_fala' });
      };
      gravador.start();
      setTimeout(() => { if (gravador && gravador.state === 'recording') gravador.stop(); }, tempo);
    });
  }
  function pararGravacao() {
    if (gravador && gravador.state === 'recording') { try { gravador.stop(); } catch (e) { /* segue */ } return; }
    gravador = null;
    if (fluxo) { fluxo.getTracks().forEach((t) => t.stop()); fluxo = null; }
  }

  /* ---------- Conferir o que a criança falou ---------- */
  // "Maçã!" -> "maca"; "O carro." -> "o carro"
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Quantas letras é preciso mudar para uma palavra virar a outra (distância de Levenshtein)
  function distancia(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  const parecido = (a, b) => 1 - distancia(a, b) / Math.max(a.length, b.length, 1);
  // Palavrinhas que não contam como resposta ("é...", "o", "um")
  const VAZIAS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'e', 'de', 'do', 'da', 'eu', 'que', 'ah', 'eh', 'hum', 'ai', 'ne', 'tipo', 'isso', 'esse', 'essa']);
  // Como a palavra soa no começo: "cenoura" e "sapo" começam com o mesmo som (s); "gelo" e "janela" também (j)
  function fon(t) {
    return t.replace(/^h/, '').replace(/^c([ei])/, 's$1').replace(/^g([ei])/, 'j$1').replace(/^qu([ei])/, 'k$1').replace(/^gu([ei])/, 'g$1')
      .replace(/^q/, 'k').replace(/^c/, 'k').replace(/^ss/, 's').replace(/^x/, 'ch').replace(/^w/, 'v').replace(/^y/, 'i');
  }
  const somInicial = (t) => { const f = fon(t); return /^(ch|lh|nh)/.test(f) ? f.slice(0, 2) : f[0]; };
  const SOM_DA_LETRA = { C: 'k', G: 'g', Q: 'k', K: 'k', H: null };

  /* conferir(textos, regra) -> { ok, ouvido, mesma }
     regra: { tipo: 'palavra', palavra } | { tipo: 'rima', palavra, rima } | { tipo: 'som', palavra }
          | { tipo: 'silaba', silaba } | { tipo: 'letra', letra }
     ouvido: o que mostrar para a criança ("Ouvi: ..."); mesma: falou a própria palavra-modelo (na rima e no som). */
  function conferir(textos, regra) {
    const alts = (textos || []).map(norm).filter(Boolean);
    const ouvido = alts[0] || '';
    const palavras = [...new Set(alts.flatMap((a) => a.split(' ')))].filter(Boolean);
    const modelo = norm(regra.palavra || '');
    const candidatas = palavras.filter((t) => t.length >= 2 && !VAZIAS.has(t) && t !== modelo);
    const mesma = !!modelo && palavras.includes(modelo);
    if (regra.tipo === 'palavra') {
      // também junta as partes ("ele fante" -> "elefante"), porque às vezes o navegador separa a palavra
      const tokens = palavras.concat(alts.map((a) => a.replace(/ /g, '')));
      const alvos = [modelo, ...(regra.variantes || []).map(norm)];
      const bate = (t) => alvos.some((v) => t === v || (v.length >= 5 && parecido(t, v) >= 0.79) || (v.length >= 8 && parecido(t, v) >= 0.74));
      const exata = tokens.find((t) => alvos.includes(t));
      const achou = exata || tokens.find(bate);
      return { ok: !!achou, ouvido: achou || ouvido };
    }
    let achou = null;
    if (regra.tipo === 'rima') achou = candidatas.find((t) => t.length > regra.rima.length - 1 && t.endsWith(norm(regra.rima)));
    if (regra.tipo === 'som') achou = candidatas.find((t) => somInicial(t) === somInicial(modelo));
    if (regra.tipo === 'silaba') { const s = fon(norm(regra.silaba)); achou = candidatas.find((t) => fon(t).startsWith(s) && t.length > s.length); }
    if (regra.tipo === 'letra') {
      const l = String(regra.letra).toUpperCase(); const som = SOM_DA_LETRA[l] !== undefined ? SOM_DA_LETRA[l] : l.toLowerCase();
      achou = candidatas.find((t) => t[0] === l.toLowerCase() || (som && somInicial(t) === som));
    }
    return { ok: !!achou, ouvido: achou || ouvido, mesma: !achou && mesma };
  }

  return { disponivel, podeGravar, ouvir, parar, gravar, pararGravacao, conferir, norm, distancia, somInicial };
})();
