/* Ícones em linha e gráficos SVG simples (barras, linhas, rosca) — sempre com números visíveis. */
window.TS = window.TS || {};

TS.Ic = (function () {
  const P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.3 1.9 5 4.9"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    sair: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    lixo: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    alerta: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>',
    exclama: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    copiar: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/>',
    baixar: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    estrela: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9L12 3z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trilha: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a3 3 0 000-6h-2a3 3 0 010-6h6"/>',
    escola: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.4 4.2-6.5 8-6.5s7 2.1 8 6.5"/>',
    play: '<path d="M7 4l13 8-13 8V4z"/>',
    ativo: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    sinal: '<path d="M5 12.5a10 10 0 0114 0"/><path d="M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/><path d="M2 2l20 20"/>',
    voltar: '<path d="M15 18l-6-6 6-6"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    tarefa: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8.5 13l2.2 2.2L15.5 10.5"/>',
    celular: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    enviar: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4 18-7z"/>',
    dado: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
    cima: '<path d="M6 15l6-6 6 6"/>',
    baixo: '<path d="M6 9l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".6" fill="currentColor"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3M8.5 21h7"/>',
    banco: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    perfil: '<circle cx="12" cy="9" r="3.5"/><circle cx="12" cy="12" r="9.5"/><path d="M6 18.5c1.3-2.6 3.4-3.8 6-3.8s4.7 1.2 6 3.8"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    nuvem: '<path d="M7 18h10a4 4 0 00.6-7.95A6 6 0 006.2 9.3 4.4 4.4 0 007 18z"/>',
  };
  return (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
})();

TS.Graf = (function () {
  const esc = (s) => TS.U.esc(s);

  /* Barras verticais. dados: [{rot, v (0..1 ou número), cor, sub}] */
  function barras(dados, o = {}) {
    const W = o.w || 560, H = o.h || 240, pl = 36, pb = 44, pt = 22;
    const max = o.max ?? Math.max(1, ...dados.map((d) => d.v));
    const bw = Math.min(64, ((W - pl) / dados.length) * 0.6);
    const passo = (W - pl) / dados.length;
    const fmt = o.fmt || ((v) => (o.pct ? Math.round(v * 100) + '%' : v));
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.titulo || 'gráfico de barras')}">`;
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const y = pt + (H - pb - pt) * (1 - f);
      s += `<line class="eixo" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" style="font-size:11px;fill:#9aa1b2">${o.pct ? Math.round(max * f * 100) + '%' : Math.round(max * f)}</text>`;
    });
    if (o.meta != null) { const y = pt + (H - pb - pt) * (1 - o.meta / max); s += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="#D23B57" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W}" y="${y - 5}" text-anchor="end" style="fill:#D23B57;font-size:11px">meta ${Math.round(o.meta * 100)}%</text>`; }
    dados.forEach((d, i) => {
      const h = ((H - pb - pt) * d.v) / max; const x = pl + passo * i + (passo - bw) / 2; const y = H - pb - h;
      s += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0, h)}" rx="6" fill="${d.cor || '#1E88D0'}"><title>${esc(d.rot)}: ${fmt(d.v)}</title></rect>`;
      s += `<text class="val" x="${x + bw / 2}" y="${y - 6}" text-anchor="middle">${d.vazio ? '—' : fmt(d.v)}</text>`;
      s += `<text x="${x + bw / 2}" y="${H - pb + 18}" text-anchor="middle">${esc(d.rot)}</text>`;
      if (d.sub) s += `<text x="${x + bw / 2}" y="${H - pb + 34}" text-anchor="middle" style="font-size:11px;fill:#9aa1b2;font-weight:600">${esc(d.sub)}</text>`;
    });
    return s + '</svg>';
  }

  /* Barras horizontais (ranking). */
  function barrasH(dados, o = {}) {
    const W = o.w || 520, lh = 38, pl = o.pl || 200, H = dados.length * lh + 6;
    const max = o.max ?? Math.max(1, ...dados.map((d) => d.v));
    const fmt = o.fmt || ((v) => Math.round(v * 100) + '%');
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.titulo || 'ranking')}">`;
    dados.forEach((d, i) => {
      const y = i * lh + 6; const w = ((W - pl - 56) * d.v) / max;
      s += `<text x="0" y="${y + 18}" style="font-size:12.5px">${esc(d.rot.length > 30 ? d.rot.slice(0, 29) + '…' : d.rot)}</text>`;
      if (d.sub) s += `<text x="0" y="${y + 32}" style="font-size:11px;fill:#9aa1b2;font-weight:600">${esc(d.sub)}</text>`;
      s += `<rect x="${pl}" y="${y + 6}" width="${W - pl - 56}" height="16" rx="8" fill="#f1f3f7"/>`;
      s += `<rect x="${pl}" y="${y + 6}" width="${Math.max(4, w)}" height="16" rx="8" fill="${d.cor || '#D23B57'}"><title>${esc(d.rot)}</title></rect>`;
      s += `<text class="val" x="${W}" y="${y + 19}" text-anchor="end">${d.vazio ? '—' : fmt(d.v)}</text>`;
    });
    return s + '</svg>';
  }

  /* Linhas. series: [{nome, cor, pontos:[{x: rótulo, y}]}] */
  function linhas(series, rotulos, o = {}) {
    const W = o.w || 640, H = o.h || 250, pl = 36, pb = 36, pt = 20, pr = 12;
    const max = o.max ?? Math.max(1, ...series.flatMap((s) => s.pontos.map((p) => p.y)));
    const n = rotulos.length; const dx = n > 1 ? (W - pl - pr) / (n - 1) : 0;
    const X = (i) => pl + (n > 1 ? i * dx : (W - pl - pr) / 2); const Y = (v) => pt + (H - pb - pt) * (1 - v / max);
    const fmt = o.fmt || ((v) => (o.pct ? Math.round(v * 100) + '%' : v));
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.titulo || 'gráfico de linhas')}">`;
    [0, 0.5, 1].forEach((f) => { const y = Y(max * f); s += `<line class="eixo" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" style="font-size:11px;fill:#9aa1b2">${o.pct ? Math.round(max * f * 100) + '%' : Math.round(max * f)}</text>`; });
    const passoRot = Math.ceil(n / 10);
    rotulos.forEach((r, i) => { if (i % passoRot === 0 || i === n - 1) s += `<text x="${X(i)}" y="${H - 12}" text-anchor="middle" style="font-size:11px">${esc(r)}</text>`; });
    series.forEach((se) => {
      const pts = se.pontos.map((p, i) => `${X(i)},${Y(p.y)}`).join(' ');
      if (se.area) s += `<polygon points="${X(0)},${Y(0)} ${pts} ${X(se.pontos.length - 1)},${Y(0)}" fill="${se.cor}" opacity=".08"/>`;
      s += `<polyline points="${pts}" fill="none" stroke="${se.cor}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
      se.pontos.forEach((p, i) => {
        s += `<circle cx="${X(i)}" cy="${Y(p.y)}" r="4.5" fill="#fff" stroke="${se.cor}" stroke-width="2.5"><title>${esc(rotulos[i])} — ${esc(se.nome)}: ${fmt(p.y)}</title></circle>`;
        if (n <= 12 || i === n - 1) s += `<text class="val" x="${X(i)}" y="${Y(p.y) - 10}" text-anchor="middle" style="fill:${se.cor}">${fmt(p.y)}</text>`;
      });
    });
    return s + '</svg>';
  }

  /* Rosca com legenda e números. */
  function rosca(dados, o = {}) {
    const total = dados.reduce((s, d) => s + d.v, 0) || 1;
    const R = 62, r = 40, C = 80;
    let a0 = -Math.PI / 2; let s = `<svg viewBox="0 0 160 160" width="${o.tam || 150}" height="${o.tam || 150}" role="img" aria-label="${esc(o.titulo || 'rosca')}">`;
    dados.forEach((d) => {
      if (!d.v) return;
      const a1 = a0 + (d.v / total) * Math.PI * 2 - 0.0001; const g = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a, rr) => `${C + Math.cos(a) * rr},${C + Math.sin(a) * rr}`;
      s += `<path d="M${p(a0, R)} A${R},${R} 0 ${g} 1 ${p(a1, R)} L${p(a1, r)} A${r},${r} 0 ${g} 0 ${p(a0, r)} Z" fill="${d.cor}"><title>${esc(d.rot)}: ${d.v}</title></path>`;
      a0 = a1 + 0.0001;
    });
    s += `<text x="80" y="78" text-anchor="middle" style="font:800 26px Nunito,sans-serif;fill:#1f2433">${o.centro ?? total}</text><text x="80" y="98" text-anchor="middle" style="font:700 11px Nunito,sans-serif;fill:#7a8196">${esc(o.rotCentro || 'total')}</text></svg>`;
    const leg = dados.map((d) => `<span><i style="background:${d.cor}"></i>${esc(d.rot)}<b>${d.v} <small style="color:#7a8196;font-weight:700">(${Math.round((d.v / total) * 100)}%)</small></b></span>`).join('');
    return `<div class="rosca-wrap">${s}<div class="rosca-leg">${leg}</div></div>`;
  }

  return { barras, barrasH, linhas, rosca };
})();
