/* Arte vetorial original do projeto: mascote "Bip", figuras extras e ícones.
   Tudo em SVG gerado por código, para ficar nítido em qualquer resolução. */
window.TS = window.TS || {};

TS.Art = (function () {
  const INK = '#2B2D42';

  // Paletas do mascote (personalização em Recompensas)
  const CORES = {
    laranja: { corpo: '#FF9F43', borda: '#E07B1F', barriga: '#FFE3C2' },
    azul:    { corpo: '#4DA3FF', borda: '#2B7BD6', barriga: '#DDF0FF' },
    verde:   { corpo: '#3CCB7F', borda: '#23A160', barriga: '#DFF8EA' },
    roxo:    { corpo: '#9B7BFF', borda: '#7657E6', barriga: '#EEE8FF' },
    rosa:    { corpo: '#FF7EB6', borda: '#E0558F', barriga: '#FFE6F1' },
  };

  function olhos(expr) {
    if (expr === 'comemorando') {
      // olhos fechados de alegria (arcos)
      return `<path d="M62 100 q14 -16 28 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>
              <path d="M110 100 q14 -16 28 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    const dy = expr === 'pensando' ? -6 : 0;
    const dx = expr === 'pensando' ? 5 : 0;
    const wink = expr === 'incentivando';
    const eye = (cx) => `<ellipse cx="${cx}" cy="100" rx="17" ry="20" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <circle cx="${cx + dx}" cy="${102 + dy}" r="9" fill="${INK}"/>
      <circle cx="${cx + dx + 3}" cy="${98 + dy}" r="3.2" fill="#fff"/>`;
    const right = wink
      ? `<path d="M110 102 q14 -12 28 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`
      : eye(124);
    let brows = '';
    if (expr === 'preocupado') {
      brows = `<path d="M60 76 l24 -8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
               <path d="M140 76 l-24 -8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (expr === 'pensando') {
      brows = `<path d="M62 74 q12 -8 24 -2" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
               <path d="M114 68 q12 -6 24 2" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    return eye(76) + right + brows;
  }

  function boca(expr) {
    switch (expr) {
      case 'falando':
        return `<ellipse cx="100" cy="134" rx="13" ry="11" fill="#8C2F39" stroke="${INK}" stroke-width="3"/>
                <ellipse cx="100" cy="139" rx="7" ry="4" fill="#FF7A8A"/>`;
      case 'comemorando':
        return `<path d="M76 124 q24 34 48 0 z" fill="#8C2F39" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
                <path d="M88 138 q12 8 24 0 q-12 -6 -24 0z" fill="#FF7A8A"/>`;
      case 'pensando':
        return `<path d="M88 136 q10 -5 22 2" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      case 'preocupado':
        return `<path d="M84 140 q16 -12 32 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      case 'incentivando':
        return `<path d="M80 126 q20 24 40 0 z" fill="#8C2F39" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
      default: // feliz
        return `<path d="M80 128 q20 20 40 0" stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
    }
  }

  function bracos(expr, c) {
    const arm = (d) => `<path d="${d}" stroke="${c.borda}" stroke-width="16" fill="none" stroke-linecap="round"/>
                        <path d="${d}" stroke="${c.corpo}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    switch (expr) {
      case 'comemorando':
        return arm('M40 128 q-22 -30 -18 -62') + arm('M160 128 q22 -30 18 -62');
      case 'pensando':
        return arm('M40 150 q-14 16 -4 30') + arm('M156 150 q-14 -8 -40 -8');
      case 'incentivando':
        // braço direito levantado com "joinha"
        return arm('M40 150 q-14 16 -4 30') + arm('M160 140 q26 -10 26 -44') +
          `<circle cx="186" cy="92" r="11" fill="${c.corpo}" stroke="${c.borda}" stroke-width="4"/>
           <rect x="181" y="68" width="10" height="20" rx="5" fill="${c.corpo}" stroke="${c.borda}" stroke-width="4"/>`;
      case 'preocupado':
        return arm('M44 146 q-6 18 10 26') + arm('M156 146 q6 18 -10 26');
      default:
        return arm('M40 150 q-16 14 -8 32') + arm('M160 150 q16 14 8 32');
    }
  }

  // Mascote original "Bip": bichinho redondo de orelhas grandes (bom de ouvir sons!)
  function mascote(expr = 'feliz', cor = 'laranja') {
    const c = CORES[cor] || CORES.laranja;
    const extra = expr === 'pensando'
      ? `<g transform="translate(160 26)"><circle r="18" fill="#fff" stroke="${INK}" stroke-width="3"/>
         <text x="0" y="8" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial" font-weight="bold" font-size="24" fill="${INK}">?</text></g>`
      : expr === 'comemorando'
      ? `<g><circle cx="20" cy="30" r="6" fill="#FFC93C"/><rect x="170" y="20" width="10" height="10" fill="#FF6FA5" transform="rotate(20 175 25)"/>
         <circle cx="186" cy="60" r="5" fill="#4DA3FF"/><rect x="12" y="62" width="9" height="9" fill="#3CCB7F" transform="rotate(-25 16 66)"/></g>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="400" height="440">
      <ellipse cx="100" cy="208" rx="62" ry="9" fill="#000" opacity=".12"/>
      <!-- orelhas -->
      <circle cx="34" cy="80" r="30" fill="${c.corpo}" stroke="${c.borda}" stroke-width="5"/>
      <circle cx="34" cy="80" r="16" fill="#FFB3C7"/>
      <circle cx="166" cy="80" r="30" fill="${c.corpo}" stroke="${c.borda}" stroke-width="5"/>
      <circle cx="166" cy="80" r="16" fill="#FFB3C7"/>
      <!-- pés -->
      <ellipse cx="72" cy="198" rx="22" ry="12" fill="${c.borda}"/>
      <ellipse cx="128" cy="198" rx="22" ry="12" fill="${c.borda}"/>
      <!-- corpo -->
      <ellipse cx="100" cy="124" rx="72" ry="76" fill="${c.corpo}" stroke="${c.borda}" stroke-width="5"/>
      <ellipse cx="100" cy="160" rx="42" ry="32" fill="${c.barriga}"/>
      <!-- topete em forma de nota musical -->
      <path d="M104 52 v-34 q14 4 22 14" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse cx="96" cy="52" rx="11" ry="8" fill="${INK}" transform="rotate(-20 96 52)"/>
      <!-- bochechas -->
      <ellipse cx="56" cy="128" rx="11" ry="7" fill="#FF7A8A" opacity=".55"/>
      <ellipse cx="144" cy="128" rx="11" ry="7" fill="#FF7A8A" opacity=".55"/>
      ${olhos(expr)}
      ${boca(expr)}
      ${bracos(expr, c)}
      ${extra}
    </svg>`;
  }

  // Figuras extras no mesmo estilo "redondo com contorno" do Animal Pack Redux (Kenney)
  const FIGURAS = {
    gato: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <path d="M38 78 L46 14 L92 50 Z" fill="#F4A340" stroke="#8A5413" stroke-width="7" stroke-linejoin="round"/>
      <path d="M162 78 L154 14 L108 50 Z" fill="#F4A340" stroke="#8A5413" stroke-width="7" stroke-linejoin="round"/>
      <path d="M52 62 L55 32 L76 50 Z" fill="#FFC6D3"/><path d="M148 62 L145 32 L124 50 Z" fill="#FFC6D3"/>
      <circle cx="100" cy="112" r="80" fill="#F4A340" stroke="#8A5413" stroke-width="7"/>
      <path d="M100 34 v26 M80 38 l6 22 M120 38 l-6 22" stroke="#D97E1C" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="100" cy="146" rx="46" ry="34" fill="#FFF3E0"/>
      <circle cx="68" cy="104" r="15" fill="#fff"/><circle cx="132" cy="104" r="15" fill="#fff"/>
      <ellipse cx="70" cy="106" rx="7" ry="11" fill="#2B2D42"/><ellipse cx="130" cy="106" rx="7" ry="11" fill="#2B2D42"/>
      <path d="M90 128 h20 l-10 11 z" fill="#FF7A8A" stroke="#8A5413" stroke-width="3" stroke-linejoin="round"/>
      <path d="M100 139 q-8 12 -18 6 M100 139 q8 12 18 6" stroke="#8A5413" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M40 128 h30 M42 142 l28 -6 M160 128 h-30 M158 142 l-28 -6" stroke="#8A5413" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
    rato: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <circle cx="44" cy="58" r="40" fill="#B9BCC6" stroke="#5A5E6B" stroke-width="7"/>
      <circle cx="156" cy="58" r="40" fill="#B9BCC6" stroke="#5A5E6B" stroke-width="7"/>
      <circle cx="44" cy="58" r="24" fill="#FFC6D3"/><circle cx="156" cy="58" r="24" fill="#FFC6D3"/>
      <circle cx="100" cy="114" r="76" fill="#B9BCC6" stroke="#5A5E6B" stroke-width="7"/>
      <ellipse cx="100" cy="148" rx="44" ry="30" fill="#E6E7EC"/>
      <circle cx="72" cy="106" r="11" fill="#2B2D42"/><circle cx="128" cy="106" r="11" fill="#2B2D42"/>
      <circle cx="75" cy="102" r="3.5" fill="#fff"/><circle cx="131" cy="102" r="3.5" fill="#fff"/>
      <circle cx="100" cy="134" r="11" fill="#FF7A8A" stroke="#5A5E6B" stroke-width="3"/>
      <path d="M92 150 q8 8 16 0" stroke="#5A5E6B" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="92" y="150" width="7" height="9" fill="#fff" stroke="#5A5E6B" stroke-width="2"/>
      <rect x="101" y="150" width="7" height="9" fill="#fff" stroke="#5A5E6B" stroke-width="2"/>
      <path d="M40 132 h36 M44 146 l32 -8 M160 132 h-36 M156 146 l-32 -8" stroke="#5A5E6B" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
    bola: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs><clipPath id="c"><circle cx="100" cy="100" r="86"/></clipPath></defs>
      <g clip-path="url(#c)">
        <rect width="200" height="200" fill="#fff"/>
        <path d="M100 100 L100 0 L200 0 L200 40 Z" fill="#FF5A5F"/>
        <path d="M100 100 L200 40 L200 150 Z" fill="#FFC93C"/>
        <path d="M100 100 L200 150 L150 200 L60 200 Z" fill="#3CCB7F"/>
        <path d="M100 100 L60 200 L0 200 L0 110 Z" fill="#4DA3FF"/>
        <path d="M100 100 L0 110 L0 0 L40 0 Z" fill="#9B7BFF"/>
        <circle cx="100" cy="100" r="18" fill="#fff"/>
        <ellipse cx="62" cy="54" rx="26" ry="14" fill="#fff" opacity=".45" transform="rotate(-35 62 54)"/>
      </g>
      <circle cx="100" cy="100" r="86" fill="none" stroke="#2B2D42" stroke-width="7"/>
    </svg>`,
    tambor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" width="220" height="200">
      <path d="M30 70 v80 q80 50 160 0 v-80" fill="#FF5A5F" stroke="#9E2A2F" stroke-width="7" stroke-linejoin="round"/>
      <path d="M30 80 l40 70 M70 88 l40 76 M110 90 l40 74 M150 88 l40 62" stroke="#FFC93C" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="110" cy="70" rx="80" ry="30" fill="#FFF3E0" stroke="#9E2A2F" stroke-width="7"/>
      <path d="M52 20 l44 44" stroke="#8A5413" stroke-width="10" stroke-linecap="round"/><circle cx="98" cy="66" r="10" fill="#8A5413"/>
      <path d="M170 18 l-40 46" stroke="#8A5413" stroke-width="10" stroke-linecap="round"/><circle cx="128" cy="66" r="10" fill="#8A5413"/>
    </svg>`,
    palmas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <g stroke="#B5651D" stroke-width="6" stroke-linejoin="round" fill="#FFCB9A">
        <path d="M60 170 q-30 -40 -10 -90 l20 -40 q8 -12 16 0 l-6 40 l30 -60 q10 -10 18 2 l-20 64 l36 -50 q10 -8 16 4 l-30 64"/>
        <path d="M150 170 q30 -40 12 -90 l-18 -40 q-8 -12 -16 0 l4 42"/>
      </g>
      <path d="M22 60 l-14 -8 M26 40 l-8 -14 M178 60 l14 -8 M174 40 l8 -14" stroke="#FFC93C" stroke-width="7" stroke-linecap="round"/>
    </svg>`,
  };

  const ICONES = {
    joinha: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">
      <path d="M14 46 h16 v42 h-16 z" fill="#fff"/>
      <path d="M36 46 l16 -30 q8 -10 14 0 q3 8 -2 20 l-3 8 h22 q10 2 8 12 l-6 28 q-2 8 -10 8 h-39 z" fill="#fff"/>
    </svg>`,
    alto: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">
      <path d="M14 38 h18 l24 -20 v64 l-24 -20 h-18 z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
      <path d="M66 36 q10 14 0 28 M76 26 q18 24 0 48" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    </svg>`,
    // Microfone branco (atividade de falar)
    microfone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">
      <rect x="35" y="10" width="30" height="50" rx="15" fill="#fff"/>
      <path d="M24 46 q0 26 26 26 q26 0 26 -26" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M50 72 v14 M36 88 h28" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
    logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <circle cx="32" cy="32" r="30" fill="#FF9F43"/>
      <circle cx="12" cy="24" r="9" fill="#FF9F43" stroke="#E07B1F" stroke-width="3"/><circle cx="52" cy="24" r="9" fill="#FF9F43" stroke="#E07B1F" stroke-width="3"/>
      <circle cx="32" cy="34" r="22" fill="#FF9F43" stroke="#E07B1F" stroke-width="3"/>
      <circle cx="25" cy="32" r="4" fill="#2B2D42"/><circle cx="39" cy="32" r="4" fill="#2B2D42"/>
      <path d="M25 42 q7 6 14 0" stroke="#2B2D42" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M33 13 v-9 q5 1 7 4" stroke="#2B2D42" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>`,
  };

  function uri(svg) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  return { mascote, FIGURAS, ICONES, CORES, uri };
})();
