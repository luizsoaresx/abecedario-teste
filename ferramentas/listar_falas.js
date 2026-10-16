/* listar_falas.js — monta a lista de falas para gravar (ferramentas/falas.txt).
   Quem mexer nos textos do jogo pode rodar de novo:   node ferramentas/listar_falas.js
   (precisa do Node.js; quem só vai jogar NÃO precisa disto — o falas.txt já vem pronto.)

   O que entra na lista:
   1) todos os textos que o Bip fala nas telas (o que está dentro de falar(...), fala:, intro... nos arquivos js/);
      textos com partes que mudam (`Monte a palavra ${palavra}.`) entram em pedaços ("Monte a palavra");
   2) todas as palavras do jogo, todas as sílabas (do jeito que o Bip fala: "gá", "tô"), as letras, os números;
   3) no fim, o script sorteia milhares de rodadas de todas as fases e confere se cada fala pode ser montada
      com os pedaços da lista. Se faltar algum pedaço, ele avisa. */
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
global.window = global; window.TS = {}; global.navigator = {}; global.localStorage = { getItem: () => null, setItem() {} };
require(path.join(RAIZ, 'js/data/content.js'));
require(path.join(RAIZ, 'js/data/atividades.js'));
const C = TS.C, W = C.W;

const chave = (t) => String(t).toLowerCase().replace(/\.\.\.|…/g, ' ').replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim();
const lista = new Map(); // chave -> texto falado
const add = (t) => {
  t = String(t).replace(/\s+/g, ' ').replace(/^[\s,.;:…!?]+/, '').replace(/[\s,;:…]+$/, '').trim();
  if (!t || !/\p{L}|\d/u.test(t)) return;
  const k = chave(t); if (!k || lista.has(k)) return;
  lista.set(k, t);
};

// ---------- 1) textos das telas ----------
/* Lê código a partir da posição i e devolve onde o trecho termina.
   modo ')': i está num "(" -> devolve o ")" que fecha;  modo '}': dentro de ${...} -> devolve o "}" que fecha;
   modo ',': valor de uma propriedade/variável -> para na vírgula, ponto e vírgula, quebra de linha ou num fechamento sobrando. */
function fimDaExpressao(src, i, modo) {
  let n = 0;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === "'" || ch === '"') { j = fimDoTexto(src, j); continue; }
    if (ch === '`') { j = fimDoTemplate(src, j); continue; }
    if (ch === '(' || ch === '{' || ch === '[') n++;
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (modo === ')') { n--; if (n === 0) return j; }
      else { if (n === 0) return j; n--; }
    } else if (modo === ',' && n === 0 && (ch === ',' || ch === ';' || ch === '\n')) return j;
  }
  return src.length;
}
function fimDoTexto(src, j) { const q = src[j]; for (j++; j < src.length; j++) { if (src[j] === '\\') { j++; continue; } if (src[j] === q) return j; } return j; }
function fimDoTemplate(src, j) {
  for (j++; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === '`') return j;
    if (src[j] === '$' && src[j + 1] === '{') j = fimDaExpressao(src, j + 2, '}');
  }
  return j;
}
/* Todos os textos de uma expressão: textos entre aspas e os pedaços FIXOS dos templates
   (`Monte a palavra ${x}.` -> "Monte a palavra"); o que está dentro de ${...} é lido também. */
function pedacos(expr) {
  const out = [];
  for (let j = 0; j < expr.length; j++) {
    const ch = expr[j];
    if (ch === "'" || ch === '"') { const f = fimDoTexto(expr, j); out.push(expr.slice(j + 1, f)); j = f; }
    else if (ch === '`') {
      let atual = ''; let k = j + 1;
      for (; k < expr.length; k++) {
        if (expr[k] === '\\') { atual += expr[k + 1]; k++; continue; }
        if (expr[k] === '`') break;
        if (expr[k] === '$' && expr[k + 1] === '{') {
          out.push(atual); atual = '';
          const f = fimDaExpressao(expr, k + 2, '}');
          pedacos(expr.slice(k + 2, f)).forEach((x) => out.push(x));
          k = f; continue;
        }
        atual += expr[k];
      }
      out.push(atual); j = k;
    }
  }
  // frases separadas dentro de um mesmo texto ("Isso! Muito bem.") também viram pedaços
  return out.flatMap((t) => [t, ...t.split(/(?<=[.!?])\s+/)]);
}
const ARQS = [...fs.readdirSync(path.join(RAIZ, 'js/game')).map((f) => 'js/game/' + f), 'js/data/content.js', 'js/data/atividades.js'];
// Um pedaço de uma palavra só só entra se terminar com ! ou ? (ex.: "Isso!", "Legal!") — evita nomes de telas e rótulos
const serve = (p) => p.length < 220 && /\p{L}/u.test(p) && !/^(svg_|ico_|fig_|bibo_|bg_|#)/.test(p) && !/[{}✓"]|Arial|sans-serif/.test(p)
  && (/\s/.test(p.trim()) || /[!?]$/.test(p.trim()));
ARQS.forEach((a) => {
  const src = fs.readFileSync(path.join(RAIZ, a), 'utf8');
  const re = /\b(falar|falarSequencia|perguntar)\(|\b(fala|falaCurta|intro)\s*:\s*|\bconst (fala|frase|msg|dica|resp|extra|elogio|t)\s*=\s*/g; let m;
  while ((m = re.exec(src))) {
    const ini = m.index + m[0].length;
    const trecho = m[1] ? src.slice(ini, fimDaExpressao(src, ini - 1, ')')) : src.slice(ini, fimDaExpressao(src, ini, ','));
    pedacos(trecho).forEach((p) => { if (serve(p)) add(p); });
  }
  // listas fixas de frases (elogios, incentivos, introduções, mensagens de erro)
  ['ELOGIOS', 'INCENTIVOS'].forEach((nome) => { const r = new RegExp(`const ${nome} = \\[([^\\]]*)\\]`).exec(src); if (r) pedacos(r[1]).forEach(add); });
  [/const MSG = \{([\s\S]*?)\};/, /const INTRO = \{([\s\S]*?)\};/, /const msg = \{([\s\S]*?)\}\[erro\]/].forEach((r) => { const x = r.exec(src); if (x) pedacos(x[1]).filter(serve).forEach(add); });
  const mp = /\}\[erro\] \|\| '([^']*)'/.exec(src); if (mp) add(mp[1]);
});

// ---------- 2) palavras, sílabas, letras, números ----------
Object.values(W).forEach((w) => { add(w.f); w.s.forEach((s) => add(C.falaSilaba(s))); });
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l) => { add(`letra ${l}`); add(`a letra ${l}`); });
Object.values({ M: 'mmmmm', S: 'sssss', F: 'fffff', L: 'lllll', N: 'nnnnn', Z: 'zzzzz', V: 'vvvvv' }).forEach(add);
for (let n = 1; n <= 10; n++) add(String(n));
[15, 25, 40].forEach((n) => add(String(n))); // preços das cores do Bip
['rima com', 'não rima com', 'começa com o mesmo som de', 'não começa como', 'combina com', 'combina com a letra', 'começa como', 'começa com',
  'Você falou', 'Por exemplo:', 'A palavra é', 'Uma dica:', 'Agora fale você.', 'Hmm, eu ouvi', 'outra coisa', 'Fale bem alto:', 'Isso!', 'Isso mesmo!',
  'Vamos para a próxima!', 'São', 'pedacinhos', 'pedacinho', 'palavras', 'Parabéns! Você ganhou', 'estrelas', 'estrela', 'Junte', 'estrelas para liberar essa cor!',
  'Tem', 'novas', 'uma nova', 'A professora mandou', 'atividades novas', 'uma atividade nova',
  'E abriu uma fase nova!', 'Você ganhou uma figurinha nova para o seu álbum!', 'Sua professora vai ficar feliz!'].forEach(add);
// frases das fases (contar palavras, última palavra)
const src = fs.readFileSync(path.join(RAIZ, 'js/data/content.js'), 'utf8');
pedacos(/const FRASES = \{([\s\S]*?)\};/.exec(src)[1]).forEach(add);
pedacos(/const FRASES_FIM = \[([\s\S]*?)\];/.exec(src)[1]).filter((p) => p.includes(' ')).forEach(add);

// ---------- 3) conferência: cada fala das fases pode ser montada? ----------
const MAPA = {}; lista.forEach((t, k) => { MAPA[k] = k; });
function monta(texto) {
  if (MAPA[chave(texto)]) return true;
  const ps = chave(texto).split(' ');
  // melhor[i] = menor número de pedaços que cobre as palavras 0..i-1
  const melhor = [0]; const de = [];
  for (let i = 1; i <= ps.length; i++) {
    melhor[i] = Infinity;
    for (let j = Math.max(0, i - 14); j < i; j++) if (melhor[j] + 1 < melhor[i] && MAPA[ps.slice(j, i).join(' ')]) { melhor[i] = melhor[j] + 1; de[i] = j; }
  }
  if (melhor[ps.length] !== Infinity) return true;
  const i0 = melhor.findIndex((v, i) => v === Infinity && i > 0); return ps[i0 - 1];
}
const falta = new Map();
const conferir = (t, onde) => { if (t == null) return; const r = monta(t); if (r !== true) falta.set(r, `${onde}: "${t}"`); };
C.FASES.forEach((f) => { for (let i = 0; i < 400; i++) { const it = f.gen(); conferir(it.fala, f.id); if (it.falaCurta) conferir(it.falaCurta, f.id); (it.opcoes || []).forEach((o) => conferir(o.fala, f.id)); } });
Object.values(W).forEach((w) => { conferir(`Monte a palavra ${w.f}.`, 'montar'); conferir(`${w.f}. Quantos pedacinhos tem?`, 'sílabas'); conferir(`Muito bem! ${w.f}!`, 'elogio'); });
const ordenado = [...lista.values()];
const cab = '# Falas do Bip para gravar com voz neural (uma por linha). Gerado por ferramentas/listar_falas.js.\n' +
  '# Pode acrescentar falas à mão. Formato: texto   ou   chave|texto falado (quando a pronúncia precisa de ajuda).\n';
fs.writeFileSync(path.join(RAIZ, 'ferramentas/falas.txt'), cab + ordenado.join('\n') + '\n');
console.log(`${ordenado.length} falas em ferramentas/falas.txt`);
if (falta.size) { console.log(`\nFaltam ${falta.size} pedaços (exemplos):`); [...falta].slice(0, 40).forEach(([p, ex]) => console.log(`  ${p}  <- ${ex}`)); }
else console.log('Todas as falas das fases podem ser montadas com as gravações.');
