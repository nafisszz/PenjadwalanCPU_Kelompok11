"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const MAX = 6, LIMIT = 99;
const COLORS = ['#E0B84F', '#8E9E4E', '#86C98B', '#F4F1E6', '#6FA58F', '#C77B3E'];
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const f2 = x => (Math.round(x * 100) / 100).toString().replace('.', ',');
const names = ids => ids.map(i => 'P' + (i + 1)).join(', ');
const go = sel => $(sel).scrollIntoView({ behavior: 'smooth' });

/* ---------- data algoritma ---------- */
const ALGOS = [
    {
        id: 'fcfs', n: 'FCFS', full: 'First Come First Served', pre: false, needs: null,
        d: 'Yang datang lebih dulu dilayani lebih dulu.',
        m: 'Antrean biasa: CPU melayani proses sesuai urutan kedatangan sampai selesai.',
        rule: 'AT terkecil dipilih lebih dulu.',
        good: 'Paling sederhana dan tidak ada proses yang terlewat.',
        bad: 'Proses pendek bisa menunggu lama di belakang proses panjang (convoy effect).',
        use: 'Memahami dasar penjadwalan dan beban kerja yang seragam.',
        ic: 'M4 7h16M4 12h12M4 17h8'
    },
    {
        id: 'sjf', n: 'SJF', full: 'Shortest Job First', pre: false, needs: null,
        d: 'Burst terpendek dijalankan lebih dulu.',
        m: 'Saat CPU bebas, dipilih proses siap dengan BT terkecil. Proses yang berjalan tidak disela.',
        rule: 'Di antara proses yang sudah tiba, BT terkecil dipilih.',
        good: 'Rata-rata waktu tunggu biasanya sangat kecil.',
        bad: 'Proses panjang bisa tertunda terus (starvation) dan BT harus diketahui di awal.',
        use: 'Kumpulan proses dengan durasi yang beragam.',
        ic: 'M5 19v-4M10 19v-8M15 19V7M20 19V4'
    },
    {
        id: 'srtf', n: 'SRTF', full: 'Shortest Remaining Time First', pre: true, needs: null,
        d: 'Sisa waktu terpendek boleh menyela proses berjalan.',
        m: 'Versi preemptive dari SJF. Setiap satuan waktu dicek ulang, proses dengan sisa BT terkecil yang berjalan.',
        rule: 'Setiap satuan waktu, proses dengan sisa BT terkecil yang berjalan.',
        good: 'Waktu tunggu rata-rata biasanya paling kecil.',
        bad: 'Banyak perpindahan proses dan proses panjang rawan starvation.',
        use: 'Mengejar waktu tunggu serendah mungkin.',
        ic: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16zM12 8v4l3 2'
    },
    {
        id: 'prn', n: 'Priority NP', full: 'Priority Non-Preemptive', pre: false, needs: 'priority',
        d: 'Prioritas tertinggi dipilih saat CPU bebas.',
        m: 'Angka prioritas lebih kecil berarti lebih penting. Proses yang sedang berjalan tidak diganggu.',
        rule: 'Angka priority terkecil (paling penting) dipilih saat CPU bebas.',
        good: 'Proses penting dilayani lebih dulu.',
        bad: 'Proses berprioritas rendah bisa menunggu sangat lama.',
        use: 'Ada proses yang jelas lebih penting, tetapi tidak boleh ada gangguan di tengah jalan.',
        ic: 'M6 21V4M6 4h11l-2 4l2 4H6'
    },
    {
        id: 'prp', n: 'Priority P', full: 'Priority Preemptive', pre: true, needs: 'priority',
        d: 'Prioritas lebih tinggi langsung menyela.',
        m: 'Setiap satuan waktu dicek ulang. Bila ada proses dengan prioritas lebih tinggi, CPU berpindah.',
        rule: 'Setiap satuan waktu, proses dengan angka priority terkecil yang berjalan.',
        good: 'Proses penting langsung mendapat CPU begitu tiba.',
        bad: 'Starvation lebih mungkin dan perpindahan proses lebih banyak.',
        use: 'Proses penting harus segera dilayani.',
        ic: 'M12 20V6M6 12l6-6l6 6'
    },
    {
        id: 'rr', n: 'Round Robin', full: 'Round Robin', pre: true, needs: 'quantum',
        d: 'Setiap proses mendapat jatah waktu bergiliran.',
        m: 'Preemptive berbasis quantum. Proses yang belum selesai kembali ke belakang antrean.',
        rule: 'Antrean FIFO, tiap giliran paling lama sebesar quantum.',
        good: 'Adil dan waktu respons baik untuk semua proses.',
        bad: 'Quantum terlalu kecil membuat banyak perpindahan, terlalu besar menjadi mirip FCFS.',
        use: 'Sistem interaktif yang butuh respons cepat untuk semua proses.',
        ic: 'M20 12a8 8 0 1 1-3-6.2M20 4v4h-4'
    }
];
const algo = id => ALGOS.find(a => a.id === id);
const PRESETS = {
    idle: { rows: [[0, 3, 2], [6, 4, 1], [7, 2, 3], [14, 3, 2]], note: 'Pada FCFS, CPU idle di t=3–6 dan t=12–14.' },
    six: { rows: [[0, 7, 3], [2, 4, 1], [4, 1, 4], [5, 4, 2], [20, 3, 1], [21, 2, 2]], note: 'Pada FCFS, CPU idle di t=16–20.' },
    plain: { rows: [[0, 5, 2], [1, 3, 1], [2, 8, 4], [3, 6, 3]], note: 'Semua proses datang berdekatan, tidak ada idle.' }
};
const toData = list => list.map(([at, bt, pr], i) => ({ id: i + 1, at, bt, pr: pr ?? 1 }));

let sel = 'fcfs', view = 'row', lastOut = null;
const rows = $('#rows');

/* ---------- animasi masuk (scroll reveal) dan angka ---------- */
const io = ('IntersectionObserver' in window) ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
        e.target.classList.add('in');
        e.target.querySelectorAll('.cnt').forEach(countUp);
        io.unobserve(e.target);
    }
}), { threshold: .12 }) : null;
function revealCheck() {
    $$('.rv:not(.in)').forEach(el => { if (io) io.observe(el); else { el.classList.add('in'); el.querySelectorAll('.cnt').forEach(countUp) } });
}
function countUp(el) {
    const to = +el.dataset.to;
    if (REDUCED) { el.textContent = to; return }
    const t0 = performance.now();
    const f = now => { const p = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f) };
    requestAnimationFrame(f);
}

/* ---------- kartu algoritma ---------- */
function buildCards() {
    $('#algoGrid').innerHTML = ALGOS.map((a, i) => `
  <article class="card rv" style="--d:${(i % 3) * .1}s" data-id="${a.id}" data-pre="${a.pre ? 'pre' : 'np'}">
   <button type="button" class="pick" aria-pressed="false">
    <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${a.ic}"/></svg>
    <span class="name">${a.n}</span>
    <span class="tag">${a.pre ? 'Preemptive' : 'Non-preemptive'}${a.needs === 'quantum' ? ' · pakai quantum' : ''}${a.needs === 'priority' ? ' · pakai priority' : ''}</span>
    <span class="desc">${a.d}</span>
   </button>
   <div class="more" hidden>
    <p>${a.m}</p>
    <p><b>Kelebihan:</b> ${a.good}</p>
    <p><b>Kekurangan:</b> ${a.bad}</p>
    <p><b>Cocok untuk:</b> ${a.use}</p>
   </div>
   <button type="button" class="learn" aria-expanded="false">Pelajari
    <span class="circ"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5h6M5.5 2.5L8 5L5.5 7.5"/></svg></span>
   </button>
  </article>`).join('');
    $('#algoSelect').innerHTML = ALGOS.map(a => `<option value="${a.id}">${a.full}</option>`).join('');
}
$('#algoGrid').addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    if (e.target.closest('.learn')) {
        const m = $('.more', card), b = $('.learn', card);
        m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden);
    } else if (e.target.closest('.pick')) { choose(card.dataset.id) }
});
$('#algoSelect').addEventListener('change', e => choose(e.target.value));
$('.filters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.filters .chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.f;
    $$('.card').forEach(c => c.hidden = !(f === 'all' || c.dataset.pre === f));
});
function choose(id) {
    sel = id;
    $$('.card').forEach(c => {
        const on = c.dataset.id === id;
        c.classList.toggle('on', on);
        $('.pick', c).setAttribute('aria-pressed', on);
    });
    $('#algoSelect').value = id;
    $('#qrow').hidden = algo(id).needs !== 'quantum';
    syncMode();
    if (!$('#hasil').hidden) run(false);
}
function syncMode() {
    const a = algo(sel);
    $('table.inp').classList.toggle('no-pr', a.needs !== 'priority');
    $('#prHint').hidden = a.needs !== 'priority';
    $('#algoInfo').textContent = `${a.full} · ${a.pre ? 'Preemptive' : 'Non-preemptive'}. ${a.d}`;
}

/* ---------- wizard ---------- */
const wz = { goal: null, cut: null, rec: null };
const REC = {
    order: { id: 'fcfs', why: 'Kamu mengutamakan urutan kedatangan, dan itu persis cara kerja FCFS.' },
    fair: { id: 'rr', why: 'CPU dibagi bergiliran lewat quantum, sehingga semua proses cepat mendapat giliran.' },
    'short-no': { id: 'sjf', why: 'Proses terpendek didahulukan tanpa menyela, jadi rata-rata waktu tunggu kecil dan alurnya mudah diikuti.' },
    'short-yes': { id: 'srtf', why: 'Proses dengan sisa waktu terpendek boleh menyela, sehingga waktu tunggu rata-rata biasanya paling kecil.' },
    'priority-no': { id: 'prn', why: 'Prioritas dipakai saat CPU bebas, tanpa menyela proses yang sedang berjalan.' },
    'priority-yes': { id: 'prp', why: 'Proses berprioritas lebih tinggi langsung mengambil CPU begitu tiba.' }
};
$('#wizard').addEventListener('click', e => {
    const b = e.target.closest('.chip[data-g]');
    if (b) {
        const g = b.dataset.g; wz[g] = b.dataset.v;
        $$(`.chip[data-g="${g}"]`).forEach(x => x.setAttribute('aria-pressed', x === b));
        if (g === 'goal' && (wz.goal === 'order' || wz.goal === 'fair')) {
            wz.cut = null; $$('.chip[data-g="cut"]').forEach(x => x.setAttribute('aria-pressed', 'false'));
        }
        updateWizard(); return;
    }
    if (e.target.closest('#wzUse')) { choose(wz.rec); go('#simulasi') }
});
function updateWizard() {
    const needCut = wz.goal === 'short' || wz.goal === 'priority';
    $('#q2wrap').hidden = !needCut;
    const key = !wz.goal ? null : needCut ? (wz.cut ? wz.goal + '-' + wz.cut : null) : wz.goal;
    $$('.card').forEach(c => c.classList.remove('rec'));
    const box = $('#wzResult');
    if (!key) { box.hidden = true; wz.rec = null; return }
    const r = REC[key]; wz.rec = r.id;
    box.hidden = false;
    box.innerHTML = `<div><span class="pill">Disarankan</span><p><b>${algo(r.id).full}.</b> ${r.why}</p></div><button type="button" class="btn btn-gold" id="wzUse">Pakai ${algo(r.id).n}</button>`;
    $(`.card[data-id="${r.id}"]`).classList.add('rec');
}

/* ---------- tabel input ---------- */
function addRow(v = {}) {
    if (rows.children.length >= MAX) return null;
    const tr = document.createElement('tr');
    const cell = (c, val, x, label, ph) => `<td class="${x}" data-label="${label}"><input class="${c}" type="text" inputmode="numeric" autocomplete="off" placeholder="${ph}" value="${val ?? ''}"><small class="err"></small></td>`;
    tr.innerHTML = `<td class="pid"><i class="sw" aria-hidden="true"></i><span class="pn"></span></td>${cell('at', v.at, '', 'AT', '0')}${cell('bt', v.bt, '', 'BT', '1')}${cell('pr', v.pr ?? 1, 'pr-col', 'Priority', '1')}<td class="xc"><button type="button" class="x" aria-label="Hapus proses">×</button></td>`;
    $('.x', tr).addEventListener('click', () => {
        if (rows.children.length > 1) { tr.remove(); renumber(); markStale() }
    });
    rows.appendChild(tr); renumber();
    return tr;
}
function renumber() {
    [...rows.children].forEach((tr, i) => {
        $('.pn', tr).textContent = 'P' + (i + 1);
        $('.sw', tr).style.background = COLORS[i % 6];
        $('.at', tr).setAttribute('aria-label', 'AT P' + (i + 1));
        $('.bt', tr).setAttribute('aria-label', 'BT P' + (i + 1));
        $('.pr', tr).setAttribute('aria-label', 'Priority P' + (i + 1));
        $('.x', tr).setAttribute('aria-label', 'Hapus P' + (i + 1));
    });
    const n = rows.children.length;
    $('#cnt').textContent = n + ' dari ' + MAX + ' proses';
    $('#add').disabled = n >= MAX;
    $$('.x', rows).forEach(b => b.disabled = n <= 1);
    syncMode();
}
rows.addEventListener('input', e => {
    e.target.classList.remove('bad');
    const s = e.target.nextElementSibling; if (s) s.textContent = '';
    markStale();
});
rows.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); run(true) }
});
$('#quantum').addEventListener('input', markStale);
$('#quantum').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(true) } });
function markStale() { const s = $('#staleTag'); if (s && !$('#hasil').hidden) s.hidden = false }
function loadRows(list, q) {
    rows.innerHTML = '';
    list.forEach(([at, bt, pr]) => addRow({ at, bt, pr }));
    $('#quantum').value = q || 2;
    clearErr(); markStale();
}
function loadPreset(k) { loadRows(PRESETS[k].rows, 2); $('#presetNote').textContent = PRESETS[k].note }
$$('.presets .chip').forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.preset)));
$('#add').addEventListener('click', () => { const tr = addRow({ pr: 1 }); if (tr) $('.at', tr).focus() });
$('#reset').addEventListener('click', () => {
    rows.innerHTML = ''; addRow({ pr: 1 }); addRow({ pr: 1 });
    $('#hasil').hidden = true; $('#presetNote').textContent = ''; clearErr();
});
$('#heroContoh').addEventListener('click', () => { loadPreset('idle'); choose('fcfs'); nav('simulasi') });

/* menu mobile */
function closeMenu() { $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false') }
$('#burger').addEventListener('click', () => {
    const o = $('#menu').classList.toggle('open');
    $('#burger').setAttribute('aria-expanded', o);
});
document.addEventListener('click', e => { if (!e.target.closest('#menu') && !e.target.closest('#burger')) closeMenu() });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu() });

/* ---------- validasi ---------- */
function clearErr() {
    $$('#simulasi .err').forEach(e => e.textContent = '');
    $$('#simulasi input.bad').forEach(i => i.classList.remove('bad'));
}
function bad(inp, msg) { inp.classList.add('bad'); inp.nextElementSibling.textContent = msg }
function readData() {
    clearErr();
    let ok = true; const data = [];
    const needPr = algo(sel).needs === 'priority';
    [...rows.children].forEach((tr, i) => {
        const num = (inp, min, label, strict) => {
            const v = inp.value.trim();
            if (!strict) { return /^\d+$/.test(v) && +v >= min && +v <= LIMIT ? +v : 1 }
            if (v === '') { bad(inp, label + ' wajib diisi'); ok = false; return 0 }
            if (!/^\d+$/.test(v)) { bad(inp, 'Harus bilangan bulat'); ok = false; return 0 }
            if (+v < min) { bad(inp, 'Minimal ' + min); ok = false; return 0 }
            if (+v > LIMIT) { bad(inp, 'Maksimal ' + LIMIT); ok = false; return 0 }
            return +v;
        };
        data.push({ id: i + 1, at: num($('.at', tr), 0, 'AT', true), bt: num($('.bt', tr), 1, 'BT', true), pr: num($('.pr', tr), 1, 'Priority', needPr) });
    });
    let q = 2;
    const qi = $('#quantum'); qi.classList.remove('bad'); $('#qerr').textContent = '';
    const v = qi.value.trim();
    if (algo(sel).needs === 'quantum') {
        if (!/^\d+$/.test(v) || +v < 1 || +v > LIMIT) { qi.classList.add('bad'); $('#qerr').textContent = 'Bilangan bulat 1–' + LIMIT; ok = false } else q = +v;
    } else if (/^\d+$/.test(v) && +v >= 1) q = +v;
    if (!ok) { const first = $('#simulasi input.bad'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    return ok ? { data, q } : null;
}

/* ---------- simulasi ---------- */
function simulate(alg, P, q) {
    const n = P.length, rem = P.map(p => p.bt), start = Array(n).fill(null), ct = Array(n).fill(0);
    const tl = [], log = [];
    let t = 0, done = 0;
    const last = () => tl.length ? tl[tl.length - 1] : undefined;
    const idleStep = () => {
        if (last() !== null) {
            let m = Infinity;
            P.forEach((p, i) => { if (rem[i] > 0 && p.at > t) m = Math.min(m, p.at) });
            log.push({ t, type: 'idle', until: m, wait: P.map((p, i) => i).filter(i => rem[i] > 0 && P[i].at === m) });
        }
        tl.push(null); t++;
    };
    if (alg === 'rr') {
        const order = [...P.keys()].sort((a, b) => P[a].at - P[b].at || a - b);
        let qu = [], ptr = 0;
        const admit = () => { while (ptr < n && P[order[ptr]].at <= t) qu.push(order[ptr++]) };
        while (done < n) {
            admit();
            if (!qu.length) { idleStep(); continue }
            const snap = qu.slice(), i = qu.shift();
            if (start[i] === null) start[i] = t;
            const r = Math.min(q, rem[i]);
            log.push({ t, type: 'rr', p: i, queue: snap, slice: r, left: rem[i] - r });
            for (let k = 0; k < r; k++)tl.push(i);
            t += r; rem[i] -= r; admit();
            if (rem[i] > 0) qu.push(i); else { ct[i] = t; done++ }
        }
    } else {
        const val = i => alg === 'sjf' ? P[i].bt : alg === 'srtf' ? rem[i] : alg === 'fcfs' ? P[i].at : P[i].pr;
        const lab = { fcfs: 'AT', sjf: 'BT', srtf: 'sisa BT', prn: 'prioritas', prp: 'prioritas' }[alg];
        const cmp = (a, b) => val(a) - val(b) || P[a].at - P[b].at || a - b;
        const pre = alg === 'srtf' || alg === 'prp';
        let cur = -1;
        while (done < n) {
            const ready = [];
            P.forEach((p, i) => { if (p.at <= t && rem[i] > 0) ready.push(i) });
            let c = cur;
            if (c < 0 || pre) { c = -1; ready.forEach(i => { if (c < 0 || cmp(i, c) < 0) c = i }) }
            if (c < 0) { idleStep(); continue }
            if (last() !== c) {
                const prev = last();
                log.push({
                    t, type: 'run', p: c, lab,
                    cands: ready.map(i => ({ id: i, v: val(i) })),
                    ties: ready.filter(i => i !== c && val(i) === val(c)),
                    preempted: typeof prev === 'number' && rem[prev] > 0 ? { id: prev, left: rem[prev] } : null
                });
            }
            cur = c;
            if (start[c] === null) start[c] = t;
            tl.push(c); rem[c]--; t++;
            if (rem[c] === 0) { ct[c] = t; done++; cur = -1 }
        }
    }
    const segs = [];
    tl.forEach((v, i) => { const L = segs[segs.length - 1]; if (L && L.p === v) L.e = i + 1; else segs.push({ p: v, s: i, e: i + 1 }) });
    const res = P.map((p, i) => {
        const tat = ct[i] - p.at;
        return { ...p, start: start[i], ct: ct[i], tat, wt: tat - p.bt, rt: start[i] - p.at, slices: segs.filter(s => s.p === i) };
    });
    const total = tl.length, busy = tl.filter(v => v !== null).length;
    return { alg, res, segs, total, busy, idle: total - busy, log, q };
}
function avgOf(o) {
    const n = o.res.length, sum = k => o.res.reduce((a, r) => a + r[k], 0);
    return { n, sTat: sum('tat'), sWt: sum('wt'), sRt: sum('rt'), tat: sum('tat') / n, wt: sum('wt') / n, rt: sum('rt') / n, cpu: o.busy / o.total * 100, tp: n / o.total };
}

/* ---------- potongan tampilan yang dipakai ulang ---------- */
const td = (l, v) => `<td data-label="${l}">${v}</td>`;
function tableHTML(o) {
    const usePr = algo(o.alg).needs === 'priority', m = avgOf(o);
    let h = `<thead><tr><th>Proses</th><th>AT</th><th>BT</th>${usePr ? '<th>Priority</th>' : ''}<th>Mulai</th><th>CT</th><th>TAT<small>CT − AT</small></th><th>WT<small>TAT − BT</small></th><th>RT<small>Mulai − AT</small></th></tr></thead><tbody>`;
    o.res.forEach((r, i) => {
        h += `<tr><td><i class="sw" style="background:${COLORS[i % 6]};margin-right:8px"></i>P${r.id}</td>${td('AT', r.at)}${td('BT', r.bt)}${usePr ? td('Priority', r.pr) : ''}${td('Mulai', r.start)}${td('CT', r.ct)}${td('TAT', r.tat)}${td('WT', r.wt)}${td('RT', r.rt)}</tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="${usePr ? 6 : 5}">Rata-rata</td>${td('TAT', f2(m.tat))}${td('WT', f2(m.wt))}${td('RT', f2(m.rt))}</tr></tfoot>`;
    return h;
}
function formulaHTML(o) {
    const usePr = algo(o.alg).needs === 'priority';
    const frow = (k, full, sym, num, val) => `
  <div class="frow"><div class="fl2"><span class="fk">${k}<small>${full}</small></span><span class="fx">${sym}${num ? ` <em>= ${num}</em>` : ''}</span></div><b class="fv">${val}</b></div>`;
    return `<div class="pcards">${o.res.map((r, i) => `
  <article class="pc" style="--pc:${COLORS[i % 6]}">
   <header class="pc-h"><h4><i class="sw" style="background:${COLORS[i % 6]}"></i>P${r.id}</h4>
    <div class="mini"><span>AT <b>${r.at}</b></span><span>BT <b>${r.bt}</b></span>${usePr ? `<span>Prio <b>${r.pr}</b></span>` : ''}</div></header>
   <div class="runs"><span>Berjalan</span>${r.slices.map(s => `<span class="tchip">t=${s.s}–${s.e}</span>`).join('')}</div>
   ${frow('CT', 'Completion Time', 'Waktu selesai di Gantt Chart', '', r.ct)}
   ${frow('TAT', 'Turnaround Time', 'CT − AT', `${r.ct} − ${r.at}`, r.tat)}
   ${frow('WT', 'Waiting Time', 'TAT − BT', `${r.tat} − ${r.bt}`, r.wt)}
   ${frow('RT', 'Response Time', 'Mulai − AT', `${r.start} − ${r.at}`, r.rt)}
  </article>`).join('')}</div>`;
}
function decisionHTML(o) {
    const segEnd = t => { const s = o.segs.find(x => x.s <= t && t < x.e); return s ? s.e : t };
    const chip = (i, txt, win) => `<span class="cc${win ? ' win' : ''}">P${i + 1}${txt ? ' · ' + txt : ''}</span>`;
    const timeBox = (t, end, idle) => `<div class="tl-t${idle ? ' idle' : ''}"><b>t=${t}</b><small>→ ${end}</small></div>`;
    return `<ol class="tl">${o.log.map(e => {
        if (e.type === 'idle') {
            return `<li>${timeBox(e.t, segEnd(e.t), true)}<div class="tl-b"><div class="tl-h"><span class="tag-i">IDLE</span>CPU menganggur</div>
    <p class="tl-p">Tidak ada proses yang siap${e.until < Infinity ? `. CPU menunggu sampai t=${e.until}, saat ${names(e.wait)} tiba.` : '.'}</p></div></li>`;
        }
        if (e.type === 'rr') {
            return `<li>${timeBox(e.t, e.t + e.slice, false)}<div class="tl-b"><div class="tl-h"><i class="sw" style="background:${COLORS[e.p % 6]}"></i>${names([e.p])} dijalankan</div>
    <p class="tl-p">Diambil dari depan antrean, berjalan ${e.slice} satuan (quantum = ${o.q}). Sisa BT ${e.left}${e.left === 0 ? ', proses selesai.' : ', kembali ke belakang antrean.'}</p>
    <div class="cands"><span class="cl">Antrean</span>${e.queue.map((id, k) => chip(id, '', k === 0)).join('')}</div></div></li>`;
        }
        const multi = e.cands.length > 1;
        return `<li>${timeBox(e.t, segEnd(e.t), false)}<div class="tl-b"><div class="tl-h"><i class="sw" style="background:${COLORS[e.p % 6]}"></i>${names([e.p])} dijalankan</div>
   <p class="tl-p">${multi ? `Dipilih karena ${e.lab} terkecil di antara proses yang siap.` : `Hanya ${names([e.p])} yang siap.`}</p>
   ${multi ? `<div class="cands"><span class="cl">Kandidat</span>${e.cands.map(c => chip(c.id, `${e.lab} ${c.v}`, c.id === e.p)).join('')}</div>` : ''}
   ${e.ties.length ? `<p class="note-i">Seri dengan ${names(e.ties)}: dipilih yang AT-nya lebih kecil, lalu nomor lebih kecil.</p>` : ''}
   ${e.preempted ? `<p class="note-i">${names([e.preempted.id])} disela, sisa BT ${e.preempted.left}.</p>` : ''}</div></li>`;
    }).join('')}</ol>`;
}
function avgHTML(o) {
    const m = avgOf(o), n = m.n, col = k => o.res.map(r => r[k]).join(' + ');
    const mc = (title, val, formula, extra = '') => `<div class="mc"><span class="mt">${title}</span><b class="mv">${val}</b><span class="mf">${formula}</span>${extra}</div>`;
    return `<div class="mgrid">
  ${mc('Rata-rata TAT', f2(m.tat), `(${col('tat')}) ÷ ${n}<br><em>= ${m.sTat} ÷ ${n}</em>`)}
  ${mc('Rata-rata WT', f2(m.wt), `(${col('wt')}) ÷ ${n}<br><em>= ${m.sWt} ÷ ${n}</em>`)}
  ${mc('Rata-rata RT', f2(m.rt), `(${col('rt')}) ÷ ${n}<br><em>= ${m.sRt} ÷ ${n}</em>`)}
  ${mc('Waktu idle', o.idle, `Total ${o.total} − sibuk ${o.busy}<br><em>= ${o.idle} satuan waktu</em>`)}
  ${mc('CPU Utilization', f2(m.cpu) + '%', `${o.busy} ÷ ${o.total} × 100%`, `<div class="bar" aria-hidden="true"><i style="width:${m.cpu}%"></i></div>`)}
  ${mc('Throughput', f2(m.tp), `${n} proses ÷ ${o.total} satuan waktu`)}
 </div>`;
}
function miniGantt(o, u = 30) {
    const W = o.total * u;
    const marks = [...new Set([0, o.total, ...o.segs.flatMap(s => [s.s, s.e])])].sort((a, b) => a - b);
    const keep = []; let lastX = -99;
    marks.forEach(m => {
        const x = m * u;
        if (x - lastX >= 22 || m === o.total) {
            if (m === o.total && keep.length && x - lastX < 22) keep.pop();
            keep.push(m); lastX = x;
        }
    });
    return `<div class="mgs"><div class="mgi" style="width:${W}px">
  <div class="mg">${o.segs.map(s => {
        const w = (s.e - s.s) * u, lab = s.p === null ? 'IDLE' : 'P' + (s.p + 1);
        return `<div class="ms${s.p === null ? ' idle' : ''}" style="width:${w}px;${s.p === null ? '' : 'background:' + COLORS[s.p % 6]}" title="${lab}: t=${s.s}–${s.e}"><b>${lab}</b>${w >= 56 ? `<small>${s.s}–${s.e}</small>` : ''}</div>`;
    }).join('')}</div>
  <div class="mgx">${keep.map(m => `<span class="g-tick" style="left:${m * u}px">${m}</span>`).join('')}</div>
 </div></div>`;
}
const miniTable = o => `<div class="scroll"><table class="res">${tableHTML(o)}</table></div>`;

/* sel per satuan waktu (dipakai demo beranda dan simulator langkah) */
function unitsOf(o) { const u = Array(o.total).fill(null); o.segs.forEach(s => { for (let k = s.s; k < s.e; k++)u[k] = s.p }); return u }
function cellsHTML(o, upTo, head) {
    const n = o.total, u = unitsOf(o);
    const cells = u.map((p, k) => {
        const first = o.segs.some(s => s.s === k);
        const lab = first ? (p === null ? 'IDLE' : 'P' + (p + 1)) : '';
        return `<div class="dc${p === null ? ' idle' : ''}${k < upTo ? ' on' : ''}" data-k="${k}" style="--c:${p === null ? 'transparent' : COLORS[p % 6]}">${lab}</div>`;
    }).join('');
    const step = n > 20 ? 2 : 1; let ticks = '';
    for (let k = 0; k <= n; k += step)ticks += `<span style="left:${k / n * 100}%">${k}</span>`;
    return `<div class="dtw" style="--n:${n};--t:${head === null ? 0 : head}"><div class="dtrack">${cells}</div>${head !== null ? '<i class="dhead"></i>' : ''}</div><div class="dticks">${ticks}</div>`;
}

/* ---------- tampilan hasil ---------- */
function renderMeta(o) {
    const a = algo(o.alg);
    $('#meta').innerHTML =
        `<span class="pill">${a.full}</span>` +
        (a.needs === 'quantum' ? `<span class="pill">Quantum = ${o.q}</span>` : '') +
        `<span class="pill">Total waktu: ${o.total}</span><span class="pill">CPU idle: ${o.idle}</span>` +
        `<span class="pill stale" id="staleTag" hidden>Data berubah, klik Proses untuk memperbarui</span>`;
}
function renderGantt(o) {
    const total = o.total, small = window.innerWidth < 600, LAB = small ? 46 : 56;
    const avail = ($('#gscroll').clientWidth || 900) - LAB - 8;
    const u = Math.max(small ? 26 : 30, Math.min(64, Math.floor(avail / total)));
    const W = total * u;
    const marks = [...new Set([0, total, ...o.segs.flatMap(s => [s.s, s.e])])].sort((a, b) => a - b);
    const keep = []; let lastX = -99;
    marks.forEach(m => {
        const x = m * u;
        if (x - lastX >= 26 || m === total) {
            if (m === total && keep.length && x - lastX < 26) keep.pop();
            keep.push(m); lastX = x;
        }
    });
    const axis = `<div class="g-axis" style="width:${W}px">${keep.map(m => `<span class="g-tick" style="left:${m * u}px">${m}</span>`).join('')}</div>`;
    const block = (s, color, label) => {
        const w = (s.e - s.s) * u, d = s.e - s.s;
        return `<div class="g-seg${s.p === null ? ' idle' : ''}" tabindex="0" style="left:${s.s * u}px;width:${w}px;${s.p === null ? '' : 'background:' + color}" title="${label}: t=${s.s}–${s.e} (${d} satuan)"><span>${label}</span>${w >= 44 ? `<small>${d}</small>` : ''}</div>`;
    };
    let body;
    if (view === 'row') {
        const segs = o.segs.map(s => s.p === null ? block(s, '', 'IDLE') : block(s, COLORS[s.p % 6], 'P' + (s.p + 1))).join('');
        body = `<div class="g-row"><div class="g-lab">CPU</div><div class="g-track" style="width:${W}px;--u:${u}px">${segs}</div></div>`;
    } else {
        body = o.res.map((r, i) => {
            const runs = r.slices.map(s => block(s, COLORS[i % 6], 'P' + r.id)).join('');
            return `<div class="g-row lane"><div class="g-lab"><i class="sw" style="background:${COLORS[i % 6]}"></i>P${r.id}</div><div class="g-track" style="width:${W}px;--u:${u}px"><div class="g-wait" style="left:${r.at * u}px;width:${(r.ct - r.at) * u}px"></div>${runs}</div></div>`;
        }).join('');
    }
    $('#gantt').innerHTML = `<div class="g-inner" style="width:${LAB + W}px;--lab:${LAB}px">${body}${axis}</div>`;
    $('#legend').innerHTML =
        o.res.map((r, i) => `<span><i class="sw" style="background:${COLORS[i % 6]}"></i>P${r.id}</span>`).join('') +
        (view === 'row' ? `<span><i class="sw idle"></i>IDLE (CPU kosong)</span>` : `<span><i class="sw wait"></i>Menunggu (sudah tiba, belum berjalan)</span>`) +
        `<span>Angka kecil di blok = lama eksekusi</span>`;
    const gs = $('#gscroll');
    $('#gHint').hidden = !(gs.scrollWidth > gs.clientWidth + 2);
}
$$('.seg-toggle button').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    $$('.seg-toggle button').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (lastOut) renderGantt(lastOut);
}));
let rz; window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (lastOut && !$('#hasil').hidden) renderGantt(lastOut) }, 150);
});
function renderTable(o) { $('#resTable').innerHTML = tableHTML(o) }
function renderSteps(o) {
    $('#p1').innerHTML = `<p class="pintro">CT dibaca dari Gantt Chart, lalu TAT, WT, dan RT dihitung dari rumusnya.</p>` + formulaHTML(o);
    $('#p2').innerHTML = `<p class="pintro">Urutan keputusan CPU mulai dari t = 0. Chip emas menandai proses yang dipilih.</p>` + decisionHTML(o);
    $('#p3').innerHTML = `<p class="pintro">Ringkasan seluruh proses. Total waktu dihitung dari t = 0 sampai proses terakhir selesai, jadi idle di awal ikut dihitung.</p>` + avgHTML(o);
}
$('.tabs').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.tabs .chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    ['p1', 'p2', 'p3'].forEach(id => $('#' + id).hidden = id !== b.dataset.tab);
});
function renderStats(o) {
    const m = avgOf(o), n = m.n;
    $('#sTat').textContent = f2(m.tat); $('#cTat').textContent = `${m.sTat} ÷ ${n}`;
    $('#sWt').textContent = f2(m.wt); $('#cWt').textContent = `${m.sWt} ÷ ${n}`;
    $('#sRt').textContent = f2(m.rt); $('#cRt').textContent = `${m.sRt} ÷ ${n}`;
    $('#sCpu').textContent = f2(m.cpu) + '%'; $('#cCpu').textContent = `${o.busy} ÷ ${o.total}`;
    $('#sTp').textContent = f2(m.tp); $('#cTp').textContent = `${n} ÷ ${o.total}`;
}
function renderCompare(inp) {
    const list = ALGOS.map(a => { const o = simulate(a.id, inp.data, inp.q); return { a, m: avgOf(o), runs: o.segs.filter(s => s.p !== null).length } });
    const mn = k => Math.min(...list.map(r => r.m[k]));
    const cls = (r, k) => Math.abs(r.m[k] - mn(k)) < 1e-9 ? ' class="best"' : '';
    const minRuns = Math.min(...list.map(r => r.runs));
    $('#cmpTable').innerHTML = `<thead><tr><th>Algoritma</th><th>Rata-rata TAT</th><th>Rata-rata WT</th><th>Rata-rata RT</th><th>Segmen eksekusi</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>` +
        list.map(r => `<tr class="${r.a.id === sel ? 'cur' : ''}"><td>${r.a.full}${r.a.id === 'rr' ? ` (q = ${inp.q})` : ''}</td><td data-label="TAT"${cls(r, 'tat')}>${f2(r.m.tat)}</td><td data-label="WT"${cls(r, 'wt')}>${f2(r.m.wt)}</td><td data-label="RT"${cls(r, 'rt')}>${f2(r.m.rt)}</td><td data-label="Segmen"${r.runs === minRuns ? ' class="best"' : ''}>${r.runs}</td><td class="act">${r.a.id === sel ? '<span class="pill">Dipakai</span>' : `<button type="button" class="btn btn-out btn-sm" data-pick="${r.a.id}">Pakai</button>`}</td></tr>`).join('') + '</tbody>';
}
$('#cmpTable').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    choose(b.dataset.pick); go('#ganttBox');
});
function run(scroll = true) {
    const inp = readData(); if (!inp) return;
    const sec = $('#hasil');
    sec.hidden = false;
    const o = simulate(sel, inp.data, inp.q);
    lastOut = o;
    renderMeta(o); renderGantt(o); renderTable(o); renderSteps(o); renderStats(o); renderCompare(inp);
    sec.classList.remove('show'); void sec.offsetWidth; sec.classList.add('show');
    if (scroll) sec.scrollIntoView({ behavior: 'smooth' });
}
$('#run').addEventListener('click', () => run(true));

/* =====================================================
   DEMO HIDUP DI BERANDA
   ===================================================== */
const DEMO = [['fcfs', 2], ['sjf', 2], ['srtf', 2], ['rr', 2]];
const DROWS = [[0, 3, 2], [1, 4, 1], [2, 2, 3], [11, 3, 2]];
let dIdx = 0, dTimer = null, dVisible = true;
function demoStart() {
    const el = $('#demo'); if (!el) return;
    clearTimeout(dTimer);
    const [alg, q] = DEMO[dIdx % DEMO.length], data = toData(DROWS), o = simulate(alg, data, q), u = unitsOf(o), m = avgOf(o);
    $('#dAlgo').textContent = algo(alg).full + (alg === 'rr' ? ` · q = ${q}` : '');
    const metTxt = `Rata-rata WT <b>${f2(m.wt)}</b> · TAT <b>${f2(m.tat)}</b> · RT <b>${f2(m.rt)}</b> · CPU <b>${f2(m.cpu)}%</b>`;
    if (REDUCED) {
        $('#dTrackWrap').innerHTML = cellsHTML(o, o.total, null);
        $('#dState').textContent = 'Selesai'; $('#dQ').innerHTML = ''; $('#dMet').innerHTML = metTxt;
        return;
    }
    $('#dTrackWrap').innerHTML = cellsHTML(o, 0, 0);
    $('#dMet').innerHTML = 'Menghitung…'; $('#dQ').innerHTML = '';
    let t = 0;
    const tick = () => {
        if (document.hidden || !dVisible || $('#pg-home').hidden) { dTimer = setTimeout(tick, 600); return }
        if (t < o.total) {
            const cell = $(`.dc[data-k="${t}"]`, el);
            if (cell) cell.classList.add('on', 'fresh');
            const w = $('.dtw', el); if (w) w.style.setProperty('--t', t + 1);
            const p = u[t];
            $('#dState').textContent = `t = ${t + 1} · ${p === null ? 'CPU idle' : 'CPU menjalankan P' + (p + 1)}`;
            const waiting = data.filter(d => d.at <= t && o.res[d.id - 1].ct > t && d.id - 1 !== p);
            $('#dQ').innerHTML = waiting.length ? waiting.map(d => `<span class="qchip"><i style="background:${COLORS[(d.id - 1) % 6]}"></i>P${d.id}</span>`).join('') : '<span class="qchip">kosong</span>';
            t++;
            dTimer = setTimeout(tick, 540);
        } else {
            $('#dState').textContent = `Selesai pada t = ${o.total}`;
            $('#dQ').innerHTML = '<span class="qchip">kosong</span>';
            $('#dMet').innerHTML = metTxt;
            dTimer = setTimeout(() => { dIdx++; demoStart() }, 2800);
        }
    };
    tick();
}
if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { dVisible = es[0].isIntersecting }, { threshold: .05 }).observe($('#beranda'));
}

/* =====================================================
   MEDIA BELAJAR
   ===================================================== */
const callout = (c, t, b) => `<div class="co ${c}"><b>${t}</b>${b}</div>`;
const TB = (h, r) => `<div class="scroll"><table class="inf"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${r.map(x => `<tr>${x.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const dataLine = (a, data, q) => data.map(p => `P${p.id} (AT ${p.at}, BT ${p.bt}${a.needs === 'priority' ? `, Prio ${p.pr}` : ''})`).join('; ') + (a.needs === 'quantum' ? `; quantum ${q}` : '');
function ex(alg, rowsArr, q, title, withTable) {
    const a = algo(alg), data = toData(rowsArr), o = simulate(alg, data, q), m = avgOf(o);
    return `<div class="exb"><div class="exh"><span class="pill">${title || a.full}</span></div><p class="note">${dataLine(a, data, q)}</p>${miniGantt(o)}<div class="mets"><span>Rata-rata TAT <b>${f2(m.tat)}</b></span><span>WT <b>${f2(m.wt)}</b></span><span>RT <b>${f2(m.rt)}</b></span><span>CPU <b>${f2(m.cpu)}%</b></span></div>${withTable ? miniTable(o) : ''}</div>`;
}
const tryBtn = (alg, rowsArr, q) => `<button type="button" class="btn btn-gold" data-try="${alg}" data-rows="${JSON.stringify(rowsArr).replace(/"/g, '&quot;')}" data-q="${q}">Coba di simulator</button>`;
function compareHTML(rowsArr, q) {
    const data = toData(rowsArr);
    const list = ALGOS.map(a => { const o = simulate(a.id, data, q); return { a, o, m: avgOf(o) } });
    const mn = k => Math.min(...list.map(r => r.m[k]));
    return TB(['Algoritma', 'Rata-rata TAT', 'Rata-rata WT', 'Rata-rata RT', 'Blok eksekusi'],
        list.map(r => [r.a.full + (r.a.id === 'rr' ? ` (q = ${q})` : ''), ...['tat', 'wt', 'rt'].map(k => { const v = f2(r.m[k]); return Math.abs(r.m[k] - mn(k)) < 1e-9 ? `<b class="best">${v}</b>` : v }), r.o.segs.filter(s => s.p !== null).length]));
}
const SAMPLE = [[0, 7, 3], [2, 4, 1], [4, 1, 4], [5, 4, 2]];

/* ----- isi modul ----- */
function mDasar() {
    return `
<p>Pada komputer dengan satu inti CPU, hanya satu proses yang benar-benar berjalan pada satu saat. Sistem operasi tampak menjalankan banyak program sekaligus karena CPU berpindah dari proses ke proses dengan sangat cepat. Aturan yang menentukan proses mana yang mendapat CPU, kapan, dan berapa lama disebut <b>penjadwalan CPU</b>.</p>
<h4>Mengapa penjadwalan diperlukan</h4>
<p>Tanpa multiprogramming, CPU menganggur setiap kali program menunggu I/O, misalnya membaca disk atau menunggu ketikan pengguna. Dengan multiprogramming, saat satu proses menunggu, CPU diberikan kepada proses lain. Penjadwalan menentukan seberapa baik kesempatan itu dimanfaatkan, dan seberapa adil dan cepat tiap proses merasakannya.</p>
<h4>Siklus CPU burst dan I/O burst</h4>
<p>Eksekusi proses berupa pergantian dua fase: <b>CPU burst</b> (menghitung) dan <b>I/O burst</b> (menunggu perangkat). Proses berakhir dengan sebuah CPU burst. Pengamatan pada banyak program menunjukkan banyak CPU burst pendek dan sedikit yang panjang. Karena itu algoritma yang mengutamakan burst pendek, seperti SJF, atau yang membagi waktu dengan quantum yang pas, seperti Round Robin, bekerja baik pada beban kerja nyata.</p>
<ul>
<li><b>Proses I/O-bound</b>: CPU burst pendek dan sering. Cepat melepas CPU, tetapi sangat peka terhadap waktu respons.</li>
<li><b>Proses CPU-bound</b>: CPU burst panjang dan jarang menunggu I/O. Mudah memonopoli CPU bila penjadwalnya tidak berhati-hati.</li>
</ul>
<h4>Status proses dan perpindahannya</h4>
${TB(['Perpindahan', 'Pemicu', 'Keterangan'], [
        ['New → Ready', 'Admitted', 'Proses selesai dibuat dan masuk antrean siap.'],
        ['Ready → Running', 'Scheduler dispatch', 'Scheduler memilih proses, dispatcher memberinya CPU.'],
        ['Running → Ready', 'Interrupt', 'Quantum habis atau ada proses lebih penting. Hanya pada sistem preemptive.'],
        ['Running → Waiting', 'Menunggu I/O atau event', 'Proses melepas CPU dengan sukarela.'],
        ['Waiting → Ready', 'I/O selesai', 'Proses kembali bersaing mendapat CPU. Dapat memicu preemption.'],
        ['Running → Terminated', 'Exit', 'Proses selesai dan melepas CPU.']])}
<h4>Tiga tingkat scheduler</h4>
<ul>
<li><b>Long-term scheduler (job scheduler)</b>: memilih program mana yang dimasukkan ke memori untuk menjadi proses. Mengatur derajat multiprogramming dan campuran proses CPU-bound dan I/O-bound.</li>
<li><b>Medium-term scheduler</b>: memindahkan proses sementara ke disk (swapping) saat memori penuh, lalu mengembalikannya.</li>
<li><b>Short-term scheduler (CPU scheduler)</b>: memilih proses dari antrean siap untuk diberi CPU. Dipanggil sangat sering (setiap beberapa milidetik), sehingga harus cepat. Inilah yang disimulasikan aplikasi ini.</li>
</ul>
<h4>Scheduler dan dispatcher</h4>
<p>Scheduler <b>memutuskan</b> proses mana yang berjalan. <b>Dispatcher</b> <b>melaksanakan</b> keputusan itu: melakukan context switch (menyimpan state proses lama dan memuat state proses baru), beralih ke mode user, lalu melompat ke instruksi yang tepat. Waktu yang dipakai disebut <b>dispatch latency</b>, dan itu murni overhead karena tidak ada proses pengguna yang maju selama itu.</p>
<h4>Kapan keputusan penjadwalan terjadi</h4>
<ol>
<li>Proses berpindah dari running ke waiting (menunggu I/O).</li>
<li>Proses berpindah dari running ke ready (interrupt, misalnya quantum habis).</li>
<li>Proses berpindah dari waiting ke ready (I/O selesai).</li>
<li>Proses berakhir.</li>
</ol>
<p>Bila keputusan hanya diambil pada keadaan 1 dan 4, sistemnya <b>non-preemptive</b>: CPU dilepas sendiri oleh proses. Bila keadaan 2 dan 3 juga memicu keputusan, sistemnya <b>preemptive</b>: CPU dapat direbut dari proses yang sedang berjalan.</p>
${callout('warn', 'Harga dari preemption', '<p>Merebut CPU di tengah jalan dapat terjadi saat proses sedang mengubah data bersama di kernel. Tanpa sinkronisasi yang benar, itu memicu race condition. Penjadwalan preemptive lebih responsif, tetapi menuntut desain kernel yang lebih hati-hati.</p>')}
<h4>Kriteria menilai sebuah algoritma</h4>
${TB(['Kriteria', 'Arah yang diinginkan', 'Arti'], [
            ['CPU utilization', 'Sebesar mungkin', 'Persentase waktu CPU benar-benar sibuk.'],
            ['Throughput', 'Sebesar mungkin', 'Jumlah proses selesai per satuan waktu.'],
            ['Turnaround time', 'Sekecil mungkin', 'Dari proses tiba sampai selesai.'],
            ['Waiting time', 'Sekecil mungkin', 'Total waktu di antrean siap.'],
            ['Response time', 'Sekecil mungkin', 'Dari tiba sampai pertama mendapat CPU.']])}
<p>Kriteria ini sering bertentangan. Algoritma yang unggul pada waktu tunggu rata-rata belum tentu adil bagi proses panjang. Memilih algoritma berarti memilih kompromi.</p>
${callout('tip', 'Asumsi model di aplikasi ini', '<ul><li>Satu CPU, tiap proses satu CPU burst tanpa I/O.</li><li>Waktu berupa bilangan bulat, dihitung dari t = 0.</li><li>Biaya context switch dianggap nol.</li><li>Aturan seri: AT lebih kecil, lalu nomor proses lebih kecil.</li></ul>')}`
}

function mMetrik() {
    return `
<p>Semua soal penjadwalan berujung pada lima nilai yang bisa dibaca dari Gantt Chart. Memahami arti tiap nilai membuat rumusnya tidak perlu dihafal, karena rumus itu hanya potongan garis waktu.</p>
<h4>Definisi</h4>
<ul>
<li><b>AT (Arrival Time)</b>: kapan proses tiba di antrean siap.</li>
<li><b>BT (Burst Time)</b>: total waktu CPU yang dibutuhkan.</li>
<li><b>CT (Completion Time)</b>: kapan proses selesai. Waktu absolut di garis waktu, dibaca dari ujung kanan blok terakhir proses itu.</li>
<li><b>Start</b>: kapan proses pertama kali mendapat CPU.</li>
</ul>
<h4>Tiga rumus turunan</h4>
<div class="fxb">TAT = CT − AT<small>Turnaround Time: lama proses berada di sistem</small></div>
<div class="fxb">WT = TAT − BT<small>Waiting Time: lama menunggu = waktu di sistem dikurangi waktu berjalan</small></div>
<div class="fxb">RT = Start − AT<small>Response Time: jeda sampai pertama kali dilayani</small></div>
<p>Garis waktu satu proses terbagi tiga: menunggu sebelum start, lalu berjalan, dan (pada preemptive) menunggu lagi setelah disela. WT mencakup <b>semua</b> bagian menunggu, sedangkan RT hanya bagian menunggu yang pertama. Dari situ mengalir dua sifat penting:</p>
<ul>
<li><b>RT ≤ WT</b> untuk setiap proses.</li>
<li>Pada algoritma <b>non-preemptive</b>, proses tidak pernah disela sehingga hanya ada satu fase menunggu, jadi <b>RT = WT</b>.</li>
</ul>
<h4>Contoh bernilai</h4>
<p><b>Non-preemptive.</b> AT = 2, BT = 4, start t = 5, CT = 9. Maka TAT = 9 − 2 = 7, WT = 7 − 4 = 3, RT = 5 − 2 = 3. Perhatikan WT = RT.</p>
<p><b>Preemptive.</b> AT = 3, BT = 4, start t = 5, disela, CT = 15. Maka TAT = 15 − 3 = 12, WT = 12 − 4 = 8, RT = 5 − 3 = 2. Perhatikan RT jauh lebih kecil dari WT karena sebagian besar waktu menunggu terjadi setelah proses sempat berjalan.</p>
<div class="kcalc">
 <h5>Kalkulator rumus</h5>
 <p class="note">Isi data satu proses, hasilnya muncul otomatis dan datanya diperiksa kewajarannya.</p>
 <div class="kgrid">
  <div class="field"><label for="kAT">AT</label><input id="kAT" type="text" inputmode="numeric" autocomplete="off" value="3"></div>
  <div class="field"><label for="kBT">BT</label><input id="kBT" type="text" inputmode="numeric" autocomplete="off" value="4"></div>
  <div class="field"><label for="kStart">Start</label><input id="kStart" type="text" inputmode="numeric" autocomplete="off" value="5"></div>
  <div class="field"><label for="kCT">CT</label><input id="kCT" type="text" inputmode="numeric" autocomplete="off" value="15"></div>
 </div>
 <div class="kres">
  <div class="kr"><span>TAT = CT − AT</span><b id="kTAT">–</b><em id="kTATf"></em></div>
  <div class="kr"><span>WT = TAT − BT</span><b id="kWT">–</b><em id="kWTf"></em></div>
  <div class="kr"><span>RT = Start − AT</span><b id="kRT">–</b><em id="kRTf"></em></div>
 </div>
 <p class="knote" id="kNote" aria-live="polite"></p>
</div>
<h4>Besaran untuk seluruh proses</h4>
<div class="fxb">Rata-rata X = (Σ X semua proses) ÷ n</div>
<div class="fxb">CPU Utilization = waktu sibuk ÷ total waktu × 100%<small>waktu sibuk = jumlah semua BT</small></div>
<div class="fxb">Throughput = n ÷ total waktu</div>
<p>Total waktu di sini dihitung dari <b>t = 0</b> sampai proses terakhir selesai, jadi idle di awal ikut dihitung. Sebagian buku menghitung dari kedatangan proses pertama, sehingga utilisasinya bisa lebih besar. Ikuti selalu aturan dari soal atau dosen.</p>
<h4>Identitas yang selalu benar</h4>
<ul>
<li><b>TAT = WT + BT</b> untuk tiap proses, sehingga <b>rata-rata TAT = rata-rata WT + rata-rata BT</b>. Jadi rata-rata TAT dan WT selalu bergerak bersama; algoritma yang memperkecil salah satunya memperkecil yang lain (BT tidak berubah).</li>
<li><b>CT ≥ AT + BT</b>. Proses tidak mungkin selesai lebih cepat dari ini, dan tepat sama bila langsung berjalan tanpa terputus.</li>
<li><b>TAT ≥ BT</b>, <b>WT ≥ 0</b>, <b>RT ≥ 0</b>.</li>
<li>Waktu sibuk = <b>Σ BT</b> dan tidak bergantung pada algoritma.</li>
</ul>
${callout('tip', 'Pemeriksaan cepat setelah menghitung', '<ol><li>Σ BT sama dengan jumlah panjang semua blok non-IDLE di Gantt Chart.</li><li>CT terbesar sama dengan total waktu.</li><li>Tidak ada WT atau RT negatif, dan RT ≤ WT.</li><li>Rata-rata TAT − rata-rata WT = rata-rata BT.</li></ol>')}`
}

function mGantt() {
    return `
<p>Gantt Chart adalah garis waktu yang menunjukkan siapa memakai CPU pada rentang waktu tertentu. Hampir semua soal penjadwalan selesai begitu Gantt Chart-nya benar, karena sisanya hanya membaca dan mengurangi.</p>
<h4>Cara membaca</h4>
<ul>
<li>Sumbu mendatar adalah waktu. Tiap blok berlabel proses menempati rentang <code>[mulai, selesai)</code>.</li>
<li>Blok <b>IDLE</b> berarti CPU kosong karena belum ada proses yang siap.</li>
<li><b>CT</b> sebuah proses adalah ujung kanan blok <b>terakhirnya</b>. Pada preemptive, proses bisa punya banyak blok.</li>
<li><b>Start</b> adalah ujung kiri blok <b>pertamanya</b>.</li>
</ul>
<h4>Prosedur membuat Gantt Chart</h4>
<ol>
<li><b>Tulis tabel data</b>: AT, BT, dan (bila perlu) Priority tiap proses. Siapkan kolom Sisa BT.</li>
<li><b>Tentukan aturan pilih</b> algoritmanya, dan apakah boleh menyela.</li>
<li><b>Mulai dari t = 0.</b> Kumpulkan proses yang sudah tiba dan belum selesai (himpunan siap).</li>
<li><b>Pilih satu</b> menurut aturan. Bila seri, pakai aturan seri. Bila himpunan siap kosong, CPU idle sampai kedatangan berikutnya.</li>
<li><b>Jalankan sampai ada kejadian</b>: non-preemptive sampai proses selesai; SRTF dan Priority preemptive sampai ada kedatangan baru atau proses selesai; Round Robin sampai quantum habis atau proses selesai.</li>
<li><b>Catat</b> start pertama dan CT bila selesai, kurangi sisa BT, lalu ulangi dari langkah 3.</li>
<li><b>Hitung</b> TAT, WT, RT, lalu lakukan pemeriksaan cepat.</li>
</ol>
<h4>Coba sendiri: simulator langkah demi langkah</h4>
<p>Pilih algoritma, lalu maju satu satuan waktu demi satu. Perhatikan kolom <b>Sisa BT</b> dan status tiap proses, serta alasan CPU memilih proses tertentu.</p>
<div class="stp" id="stp">
 <div class="stp-ctl">
  <select id="stAlgo" aria-label="Algoritma untuk simulator langkah">${ALGOS.map(a => `<option value="${a.id}">${a.full}</option>`).join('')}</select>
  <button type="button" class="chip" data-s="prev">‹ Mundur</button>
  <button type="button" class="chip" data-s="play" id="stPlay">Putar</button>
  <button type="button" class="chip" data-s="next">Maju ›</button>
  <button type="button" class="chip" data-s="reset">Ulang</button>
 </div>
 <div class="stp-info" id="stInfo"></div>
 <div id="stGantt"></div>
 <div class="scroll"><table class="inf stt" id="stTable"></table></div>
</div>
<h4>Contoh lengkap dengan keputusan CPU</h4>
<p>Berikut SRTF pada data yang sama. Tiap baris menjelaskan mengapa CPU memilih proses tertentu pada saat itu.</p>
${(() => { const o = simulate('srtf', toData([[0, 8, 1], [1, 4, 1], [2, 2, 1]]), 2); return `<div class="exb"><p class="note">P1 (AT 0, BT 8); P2 (AT 1, BT 4); P3 (AT 2, BT 2)</p>${miniGantt(o)}${decisionHTML(o)}</div>` })()}
${callout('warn', 'Kesalahan umum saat menggambar', '<ul><li>Lupa menggabungkan blok yang bersebelahan dengan proses sama (tidak salah, tetapi menyulitkan membaca).</li><li>Menghentikan proses SJF atau Priority non-preemptive di tengah jalan.</li><li>Tidak memperbarui sisa BT pada algoritma preemptive.</li><li>Lupa bahwa proses yang tiba tepat saat quantum habis masuk antrean lebih dulu.</li></ul>')}`
}

function mFcfs() {
    return `
<p><b>First Come First Served</b> adalah algoritma paling sederhana: proses dilayani sesuai urutan kedatangan, persis seperti antrean kasir. Ia <b>non-preemptive</b>, jadi proses yang sudah mulai berjalan sampai selesai.</p>
<h4>Aturan dan algoritma</h4>
<pre>urutkan proses menurut (AT, nomor proses)
t = 0
untuk setiap proses p dalam urutan itu:
    jika t &lt; p.AT:  t = p.AT      # CPU idle sampai p tiba
    p.start = t
    t = t + p.BT
    p.CT = t</pre>
<p>Cukup satu kali pengurutan lalu satu kali lewat, sehingga biayanya <code>O(n log n)</code>, dan hanya kasar pada tahap sorting. Itu sebabnya FCFS sangat murah diimplementasikan, cukup memakai antrean FIFO.</p>
<h4>Sifat-sifat</h4>
<ul>
<li><b>Tidak ada starvation.</b> Sebuah proses hanya didahului proses yang tiba lebih awal, jumlahnya terbatas.</li>
<li><b>WT = RT</b> untuk semua proses, karena non-preemptive.</li>
<li>Hasilnya <b>sangat bergantung pada urutan kedatangan</b>. Dengan proses yang sama, urutan tiba yang berbeda dapat mengubah rata-rata WT berkali lipat.</li>
<li>Tidak peduli panjang proses, sehingga tidak optimal untuk waktu tunggu rata-rata.</li>
</ul>
<h4>Convoy effect</h4>
<p>Bila satu proses CPU-bound panjang berada di depan banyak proses pendek, semuanya harus menunggu. Contoh tiga proses tiba bersamaan di t = 0 dengan BT 24, 3, dan 3:</p>
<div class="exgrid">
${ex('fcfs', [[0, 24], [0, 3], [0, 3]], 2, 'FCFS: P1 lebih dulu')}
${ex('sjf', [[0, 24], [0, 3], [0, 3]], 2, 'SJF: pendek lebih dulu')}
</div>
<p style="margin-top:18px">Pada FCFS, P1 menunggu 0, P2 menunggu 24, P3 menunggu 27, sehingga rata-rata WT = (0 + 24 + 27) ÷ 3 = 17. Bila yang pendek didahulukan (urutan P2, P3, P1), WT-nya 0, 3, 6 sehingga rata-ratanya hanya 3. Data dan CPU sama, perbedaannya hanya urutan.</p>
${callout('tip', 'Kapan FCFS cocok', '<p>Beban kerja yang panjang prosesnya seragam, sistem batch sederhana, atau sebagai pembanding dasar. Di sistem interaktif ia jarang dipakai sendirian.</p>')}
<p>${tryBtn('fcfs', [[0, 24, 1], [0, 3, 1], [0, 3, 1]], 2)}</p>`
}

function mSjf() {
    return `
<p>Gagasannya: mendahulukan pekerjaan terpendek membuat banyak proses selesai cepat, sehingga rata-rata waktu menunggu turun. Ada dua versi: <b>SJF</b> (non-preemptive) dan <b>SRTF</b> (preemptive).</p>
<h4>Aturan</h4>
${TB(['', 'SJF', 'SRTF'], [
        ['Dasar pilihan', 'BT awal terkecil', 'Sisa BT terkecil'],
        ['Kapan memilih', 'Saat CPU bebas', 'Setiap satuan waktu'],
        ['Menyela?', 'Tidak', 'Ya, bila ada yang sisa BT-nya lebih kecil'],
        ['Seri', 'AT lebih kecil, lalu nomor lebih kecil', 'Sama']])}
<h4>Contoh: SJF versus SRTF</h4>
<div class="exgrid">
${ex('sjf', [[0, 8, 1], [1, 4, 1], [2, 2, 1]], 2, 'SJF')}
${ex('srtf', [[0, 8, 1], [1, 4, 1], [2, 2, 1]], 2, 'SRTF')}
</div>
<p style="margin-top:18px">Pada SJF, P1 sudah berjalan di t = 0 dan tidak boleh disela walau P2 dan P3 jauh lebih pendek. Rata-rata WT-nya 5,00. Pada SRTF, P2 menyela di t = 1 (sisa BT 4 &lt; 7), lalu P3 menyela di t = 2 (sisa BT 2 &lt; 3). Rata-rata WT turun menjadi 2,67. Harganya: P1 menunggu paling lama dan diganggu dua kali.</p>
<h4>Mengapa SJF optimal (argumen pertukaran)</h4>
<p>Misalkan dua pekerjaan berurutan, A (BT = a) lalu B (BT = b), dengan a &gt; b, dimulai pada waktu s. Urutan A lalu B memberi WT A = s dan WT B = s + a, jumlahnya 2s + a. Bila ditukar menjadi B lalu A: WT B = s dan WT A = s + b, jumlahnya 2s + b, yang lebih kecil karena b &lt; a. Pekerjaan lain tidak terpengaruh, sebab keduanya tetap menghabiskan total waktu yang sama. Jadi setiap pasangan "panjang sebelum pendek" bisa diperbaiki, dan urutan terbaik adalah dari yang terpendek. Argumen ini berlaku bila <b>semua pekerjaan sudah tersedia bersamaan</b>. Pada AT yang berbeda, SJF belum tentu optimal, sedangkan SRTF tetap optimal untuk rata-rata WT (tanpa biaya perpindahan).</p>
<h4>Masalah praktis: panjang burst tidak diketahui</h4>
<p>Sistem operasi tidak tahu berapa lama CPU burst berikutnya, sehingga harus <b>memprediksinya</b> dari riwayat dengan rata-rata eksponensial:</p>
<div class="fxb">τ(n+1) = α · t(n) + (1 − α) · τ(n)<small>t(n) = burst aktual ke-n, τ(n) = prediksi ke-n, 0 ≤ α ≤ 1</small></div>
<p>Pada α = 0, riwayat terbaru diabaikan (prediksi tidak berubah). Pada α = 1, hanya burst terakhir yang dipakai. Nilai α = 0,5 memberi bobot sama antara masa lalu dan terkini. Contoh dengan τ(0) = 10:</p>
${TB(['n', 'Burst aktual t(n)', 'Prediksi τ(n)', 'Prediksi berikutnya τ(n+1)'], [[0, 6, 10, 8], [1, 4, 8, 6], [2, 6, 6, 6], [3, 4, 6, 5]])}
<h4>Kelemahan</h4>
<ul>
<li><b>Starvation</b>: proses panjang tertunda terus bila proses pendek berdatangan tanpa henti.</li>
<li>SRTF punya overhead perpindahan lebih besar, dan butuh prediksi burst yang akurat.</li>
<li>Rata-rata kecil tidak berarti adil bagi tiap proses.</li>
</ul>
<p>${tryBtn('srtf', [[0, 8, 1], [1, 4, 1], [2, 2, 1]], 2)}</p>`
}

function mPriority() {
    return `
<p>Pada penjadwalan prioritas, tiap proses diberi bilangan prioritas dan CPU diberikan kepada proses yang paling penting. SJF sebenarnya kasus khusus: prioritasnya ditentukan oleh panjang CPU burst yang diprediksi (lebih pendek = lebih penting).</p>
<h4>Konvensi angka</h4>
<p>Tidak ada kesepakatan universal. Di aplikasi ini, <b>angka lebih kecil berarti lebih penting</b>, sama seperti nilai <code>nice</code> di Unix (−20 paling diutamakan, 19 paling mengalah). Sebagian buku memakai arah sebaliknya, jadi selalu cek keterangan soal.</p>
<h4>Dua versi</h4>
<ul>
<li><b>Non-preemptive</b>: prioritas hanya diperiksa saat CPU bebas. Proses penting yang tiba di tengah jalan menunggu sampai proses berjalan selesai.</li>
<li><b>Preemptive</b>: setiap kedatangan diperiksa. Proses yang lebih penting langsung merebut CPU dan sisa BT proses lama disimpan.</li>
</ul>
<h4>Contoh</h4>
<div class="exgrid">
${ex('prn', [[0, 5, 3], [1, 3, 1], [2, 4, 2], [3, 2, 1]], 2, 'Priority non-preemptive')}
${ex('prp', [[0, 5, 3], [1, 3, 1], [2, 4, 2], [3, 2, 1]], 2, 'Priority preemptive')}
</div>
<p style="margin-top:18px">Pada versi non-preemptive, P1 yang berprioritas paling rendah tetap menuntaskan jatahnya karena sudah lebih dulu berjalan. Pada versi preemptive, P1 disela begitu P2 yang lebih penting tiba, sehingga waktu respons proses penting jadi lebih baik dan P1 menanggung penundaan.</p>
<h4>Prioritas statis dan dinamis</h4>
<ul>
<li><b>Statis</b>: ditetapkan sekali, misalnya berdasarkan jenis proses atau biaya. Sederhana tetapi kaku.</li>
<li><b>Dinamis</b>: berubah selama proses hidup, misalnya turun saat proses memakai banyak CPU atau naik saat lama menunggu.</li>
</ul>
<h4>Starvation dan aging</h4>
<p>Bila proses penting terus berdatangan, proses berprioritas rendah mungkin tidak pernah mendapat CPU. Solusinya <b>aging</b>: prioritas proses dinaikkan secara bertahap seiring lamanya menunggu, sehingga pada akhirnya ia pasti terpilih.</p>
<h4>Priority inversion</h4>
<p>Misalkan proses rendah (L) memegang sumber daya yang dibutuhkan proses tinggi (H). H harus menunggu L. Jika ada proses menengah (M) yang tidak butuh sumber daya itu, M dapat menyela L karena prioritasnya lebih tinggi dari L, sehingga L tidak sempat melepas sumber daya, dan H tertahan oleh M yang prioritasnya lebih rendah dari H. Urutan prioritas seakan terbalik. Solusi klasik adalah <b>priority inheritance</b>: selama L memegang sumber daya yang ditunggu H, L sementara mewarisi prioritas H. Masalah ini pernah terjadi pada misi Mars Pathfinder tahun 1997 dan diperbaiki dengan mengaktifkan priority inheritance dari jauh.</p>
<p>${tryBtn('prp', [[0, 5, 3], [1, 3, 1], [2, 4, 2], [3, 2, 1]], 2)}</p>`
}

function mRr() {
    return `
<p><b>Round Robin</b> dirancang untuk sistem time-sharing. Setiap proses mendapat jatah waktu tetap bernama <b>quantum</b>. Bila jatah habis dan proses belum selesai, ia disela dan dikirim ke belakang antrean. Tidak ada proses yang dibiarkan menunggu terlalu lama.</p>
<h4>Cara kerja</h4>
<ol>
<li>Proses yang tiba masuk ke antrean FIFO.</li>
<li>Ambil proses terdepan, jalankan paling lama sebesar quantum.</li>
<li>Bila selesai sebelum quantum habis, CPU langsung diberikan ke proses berikutnya.</li>
<li>Bila belum selesai, proses kembali ke belakang antrean.</li>
</ol>
${callout('warn', 'Aturan seri yang dipakai aplikasi', '<p>Proses yang tiba <b>selama</b> atau <b>tepat saat</b> jatah proses lain berakhir masuk antrean lebih dulu daripada proses yang baru dihentikan. Aturan ini tidak universal, sebagian buku menaruh proses yang disela lebih dulu, jadi cek aturan soal.</p>')}
<h4>Contoh: pengaruh quantum</h4>
<div class="exgrid">
${ex('rr', SAMPLE, 2, 'Round Robin, q = 2')}
${ex('rr', SAMPLE, 4, 'Round Robin, q = 4')}
</div>
<h4>Memilih quantum</h4>
<ul>
<li><b>Terlalu kecil</b>: banyak context switch. Dengan biaya perpindahan s dan quantum q, hanya sebagian waktu yang berguna.</li>
<li><b>Terlalu besar</b>: bila q lebih besar dari semua BT, tidak ada yang disela dan hasilnya sama dengan FCFS.</li>
<li><b>Aturan praktis</b>: sekitar 80% CPU burst sebaiknya lebih pendek dari quantum, supaya sebagian besar proses selesai dalam satu giliran.</li>
</ul>
<div class="fxb">Efisiensi ≈ q ÷ (q + s)<small>q = quantum, s = biaya context switch</small></div>
<p>Dengan q = 4 ms dan s = 1 ms, efisiensinya 4 ÷ 5 = 80%. Dengan q = 1 ms dan s = 1 ms, hanya 50%: separuh waktu terbuang untuk berpindah.</p>
<h4>Batas waktu respons</h4>
<p>Bila ada n proses di antrean dan tiap proses memakai penuh quantum, sebuah proses menunggu paling lama <b>(n − 1) × q</b> sebelum mendapat CPU lagi. Jadi n = 5 dan q = 4 ms memberi jeda terburuk 16 ms. Itulah jaminan keadilan Round Robin: tidak ada proses yang terlupakan.</p>
<h4>Kelebihan dan kekurangan</h4>
<ul>
<li>Waktu respons baik dan merata, tidak ada starvation.</li>
<li>Rata-rata TAT dan WT biasanya lebih besar dari SJF atau SRTF.</li>
<li>Kinerjanya sangat bergantung pada pemilihan quantum.</li>
</ul>
<p>${tryBtn('rr', SAMPLE, 2)}</p>`
}

function mIdle() {
    const data = toData(PRESETS.idle.rows), o = simulate('fcfs', data, 2), m = avgOf(o);
    return `
<p>CPU <b>idle</b> adalah keadaan ketika CPU tidak menjalankan proses apa pun karena belum ada proses di antrean siap, padahal masih ada proses yang akan tiba. Idle bukan kesalahan algoritma: tidak ada yang bisa dijalankan.</p>
<h4>Kapan idle terjadi</h4>
<ul>
<li><b>Di awal</b>: bila AT terkecil lebih dari 0, CPU idle dari t = 0 sampai proses pertama tiba.</li>
<li><b>Di tengah</b>: bila semua proses yang sudah tiba selesai sebelum proses berikutnya tiba.</li>
<li><b>Tidak pernah di akhir</b>: setelah proses terakhir selesai simulasi berhenti, sehingga tidak ada idle di akhir.</li>
</ul>
<h4>Contoh dengan dua jeda idle</h4>
<p class="note">${dataLine(algo('fcfs'), data, 2)}</p>
${miniGantt(o)}
${miniTable(o)}
<p>P1 selesai di t = 3 padahal P2 baru tiba di t = 6, jadi CPU idle di 3–6. P3 selesai di t = 12 dan P4 baru tiba di t = 14, jadi idle lagi di 12–14. Waktu sibuk sama dengan jumlah BT = ${o.busy}, total waktu = ${o.total}, sehingga waktu idle = ${o.idle}.</p>
<div class="fxb">CPU Utilization = ${o.busy} ÷ ${o.total} × 100% = ${f2(m.cpu)}%<small>tanpa idle, nilainya 100%</small></div>
<h4>Sifat penting: work-conserving</h4>
<p>FCFS, SJF, SRTF, Priority, dan Round Robin semuanya bersifat <b>work-conserving</b>: CPU hanya idle bila memang tidak ada proses siap. Konsekuensinya:</p>
<ul>
<li><b>Waktu selesai proses terakhir (total waktu) sama</b> untuk semua algoritma pada data yang sama.</li>
<li><b>CPU Utilization dan jumlah waktu idle juga sama</b>, tidak bisa diperbaiki dengan mengganti algoritma. Idle hanya bisa dikurangi bila prosesnya datang lebih rapat.</li>
<li><b>Idle tidak menambah WT proses mana pun</b>, sebab idle hanya terjadi saat tidak ada proses yang sedang menunggu.</li>
</ul>
${callout('tip', 'Dua konvensi menghitung', '<p>Aplikasi ini menghitung total waktu dari t = 0, sehingga idle di awal ikut dihitung. Sebagian buku menghitung dari kedatangan proses pertama. Pada kasus tanpa idle di awal keduanya sama, tetapi bila proses pertama tiba di t = 4, versi buku memberi utilisasi lebih besar.</p>')}
<p><button type="button" class="btn btn-gold" data-try="fcfs" data-rows="${JSON.stringify(PRESETS.idle.rows).replace(/"/g, '&quot;')}" data-q="2">Coba di simulator</button></p>`
}

function mBanding() {
    return `
<p>Tidak ada algoritma terbaik untuk semua keadaan. Tabel berikut adalah hasil nyata pada data contoh, dihitung langsung oleh simulator. Nilai terbaik tiap kolom berwarna emas.</p>
<p class="note">Data: ${dataLine(algo('rr'), toData(SAMPLE), 2)}.</p>
${compareHTML(SAMPLE, 2)}
<p>Perhatikan bahwa algoritma yang unggul di satu kolom jarang unggul di semua kolom. Biasanya SRTF terbaik untuk TAT dan WT, sedangkan Round Robin kuat pada RT.</p>
<h4>Matriks sifat</h4>
${TB(['Algoritma', 'Menyela', 'Perlu tahu BT', 'Risiko starvation', 'Kekuatan utama'], [
        ['FCFS', 'Tidak', 'Tidak', 'Tidak', 'Sederhana dan adil menurut kedatangan'],
        ['SJF', 'Tidak', 'Ya', 'Ya', 'WT rendah, optimal bila semua tersedia bersamaan'],
        ['SRTF', 'Ya', 'Ya', 'Ya', 'WT rata-rata terkecil'],
        ['Priority NP', 'Tidak', 'Tidak (butuh prioritas)', 'Ya', 'Mengutamakan proses penting'],
        ['Priority P', 'Ya', 'Tidak (butuh prioritas)', 'Ya', 'Proses penting langsung dilayani'],
        ['Round Robin', 'Ya (quantum)', 'Tidak', 'Tidak', 'Respons merata dan cepat']])}
<h4>Pohon keputusan</h4>
<ol>
<li>Apakah ada proses yang jelas lebih penting? Bila ya, <b>Priority</b>, dan tambahkan aging.</li>
<li>Apakah respons cepat dan merata yang utama (sistem interaktif)? <b>Round Robin</b> dengan quantum yang pas.</li>
<li>Apakah panjang proses diketahui atau dapat diprediksi dan yang dikejar rata-rata WT? <b>SJF</b> (tanpa menyela) atau <b>SRTF</b> (boleh menyela).</li>
<li>Selain itu, atau bila kesederhanaan lebih penting: <b>FCFS</b>.</li>
</ol>
${callout('tip', 'Peringatan', '<p>SRTF yang paling kecil rata-rata WT-nya bergantung pada asumsi tidak ada biaya context switch dan BT diketahui pasti. Di sistem nyata, kedua asumsi itu tidak terpenuhi, sehingga algoritma "paling optimal" belum tentu paling baik.</p>')}
<p>Aplikasi ini juga menyediakan tabel perbandingan otomatis di bawah hasil simulasi untuk data milikmu sendiri.</p>`}

function mLanjut() {
    return `
<p>Algoritma dasar jarang dipakai murni di sistem nyata. Berikut gagasan lanjutan yang sering dibahas pada mata kuliah sistem operasi.</p>
<h4>HRRN (Highest Response Ratio Next)</h4>
<p>Non-preemptive. Saat CPU bebas, dipilih proses dengan rasio terbesar:</p>
<div class="fxb">Rasio = (W + S) ÷ S<small>W = waktu menunggu sejauh ini, S = BT</small></div>
<p>Proses pendek punya S kecil sehingga rasionya besar, jadi tetap diuntungkan. Namun W terus bertambah, sehingga proses panjang akhirnya mendapat rasio tertinggi. Dengan begitu HRRN mencegah starvation tanpa perlu aging terpisah.</p>
<h4>Multilevel Queue</h4>
<p>Antrean siap dibagi menjadi beberapa antrean menurut jenis proses (misalnya sistem, interaktif, batch), masing-masing dengan algoritma sendiri. Antrean dijadwalkan dengan prioritas tetap atau pembagian waktu antar antrean. Kelemahannya: proses terkunci pada satu antrean.</p>
<h4>Multilevel Feedback Queue (MLFQ)</h4>
<p>Proses boleh berpindah antrean berdasarkan perilakunya, sehingga tidak perlu tahu BT di awal. Aturan khasnya:</p>
<ol>
<li>Proses di antrean berprioritas lebih tinggi dijalankan lebih dulu.</li>
<li>Proses di antrean yang sama dijadwalkan dengan Round Robin.</li>
<li>Proses baru masuk di antrean teratas.</li>
<li>Proses yang menghabiskan seluruh jatahnya turun satu tingkat. Proses yang melepas CPU sebelum jatah habis (khas proses interaktif) bertahan.</li>
<li>Secara berkala semua proses dinaikkan kembali ke atas (boost) agar tidak starvation dan agar proses yang berubah sifat dapat dinilai ulang.</li>
</ol>
<p>Efeknya, proses interaktif yang pendek tetap responsif, sedangkan proses CPU-bound turun ke antrean bawah dengan quantum lebih besar.</p>
<h4>Penjadwalan multiprosesor</h4>
<ul>
<li><b>Load balancing</b>: menjaga semua inti sama sibuknya, lewat <i>push migration</i> (inti sibuk mendorong tugas) atau <i>pull migration</i> (inti kosong menarik tugas).</li>
<li><b>Processor affinity</b>: lebih baik menjaga proses tetap di inti yang sama agar isi cache-nya masih berguna. Ini sering bertentangan dengan load balancing.</li>
</ul>
<h4>Real-time</h4>
<p>Pada sistem real-time, benar tidaknya hasil juga ditentukan oleh <b>tenggat (deadline)</b>.</p>
<ul>
<li><b>Rate Monotonic (RM)</b>: prioritas statis, periode lebih pendek berarti prioritas lebih tinggi.</li>
<li><b>Earliest Deadline First (EDF)</b>: prioritas dinamis, tugas dengan deadline terdekat dijalankan lebih dulu. Optimal di satu CPU: jika himpunan tugas bisa dijadwalkan oleh suatu algoritma, EDF juga bisa (utilisasi total ≤ 1 untuk tugas periodik dengan deadline sama dengan periode).</li>
</ul>
<div class="fxb">RM terjamin bila U ≤ n(2<sup>1/n</sup> − 1)<small>n = 2 → sekitar 0,828; n = 3 → sekitar 0,780; n besar → ln 2 ≈ 0,693</small></div>
<p>Ini batas yang cukup (bukan syarat perlu): himpunan tugas dengan utilisasi di atas batas masih mungkin bisa dijadwalkan, tetapi harus dibuktikan dengan analisis lain.</p>
<h4>Contoh di sistem nyata</h4>
<p>Linux memakai <b>Completely Fair Scheduler (CFS)</b> sejak versi 2.6.23, yang mencatat <i>virtual runtime</i> tiap proses dan selalu menjalankan proses dengan virtual runtime terkecil (disimpan di pohon red-black), dengan bobot dari nilai <code>nice</code>. Pada kernel yang lebih baru (6.6 ke atas) algoritmanya digantikan oleh <b>EEVDF</b>, yang masih berpegang pada gagasan pembagian CPU yang adil tetapi memperhatikan juga tenggat latensi. Windows memakai prioritas dinamis berlapis dengan quantum.</p>`}

function mRangkum() {
    const G = [['AT', 'Arrival Time', 'Waktu proses tiba di antrean siap.'], ['BT', 'Burst Time', 'Total waktu CPU yang dibutuhkan.'], ['CT', 'Completion Time', 'Waktu absolut proses selesai.'], ['TAT', 'Turnaround Time', 'CT − AT.'], ['WT', 'Waiting Time', 'TAT − BT.'], ['RT', 'Response Time', 'Start − AT.'], ['Quantum', 'Jatah giliran', 'Waktu maksimal sekali giliran pada Round Robin.'], ['Preemptive', 'Boleh menyela', 'CPU dapat direbut dari proses yang berjalan.'], ['Idle', 'CPU menganggur', 'Tidak ada proses siap, proses berikutnya belum tiba.'], ['Starvation', 'Kelaparan', 'Proses tertunda terus karena selalu kalah.'], ['Aging', 'Penuaan', 'Menaikkan prioritas proses yang lama menunggu.'], ['Convoy effect', 'Efek iring-iringan', 'Proses pendek menunggu di belakang proses panjang.']];
    return `
<h4>Cheat sheet algoritma</h4>
${TB(['Algoritma', 'Yang dipilih', 'Menyela', 'Seri'], [
        ['FCFS', 'AT terkecil', 'Tidak', 'Nomor proses lebih kecil'],
        ['SJF', 'BT terkecil dari yang siap', 'Tidak', 'AT lebih kecil, lalu nomor'],
        ['SRTF', 'Sisa BT terkecil, tiap satuan waktu', 'Ya', 'AT lebih kecil, lalu nomor'],
        ['Priority NP', 'Angka priority terkecil saat CPU bebas', 'Tidak', 'AT lebih kecil, lalu nomor'],
        ['Priority P', 'Angka priority terkecil, tiap satuan waktu', 'Ya', 'AT lebih kecil, lalu nomor'],
        ['Round Robin', 'Depan antrean, paling lama q', 'Ya (q habis)', 'Yang baru tiba masuk antrean dulu']])}
<h4>Rumus</h4>
<div class="fxb">TAT = CT − AT &nbsp;·&nbsp; WT = TAT − BT &nbsp;·&nbsp; RT = Start − AT</div>
<div class="fxb">Util = Σ BT ÷ total × 100% &nbsp;·&nbsp; Throughput = n ÷ total</div>
<h4>Jebakan yang paling sering terjadi</h4>
<ol>
<li><b>CT dianggap BT.</b> CT adalah waktu absolut. Proses dengan BT 3 yang mulai di t = 6 punya CT 9.</li>
<li><b>Lupa idle di awal.</b> Bila proses pertama baru tiba di t = 3, CPU idle di 0–3, dan itu ikut total waktu di aplikasi ini.</li>
<li><b>WT dan RT dianggap selalu sama.</b> Sama hanya pada non-preemptive.</li>
<li><b>Urutan antrean Round Robin salah</b> saat ada kedatangan tepat di akhir quantum.</li>
<li><b>SJF memakai sisa BT.</b> SJF memakai BT awal dan tidak menyela. Sisa BT milik SRTF.</li>
<li><b>Arah angka priority terbalik.</b> Ikuti aturan soal.</li>
<li><b>Mengabaikan aturan seri.</b> Hasil bisa berbeda bila seri dipilih sembarang.</li>
<li><b>Tidak memperbarui sisa BT</b> pada algoritma preemptive.</li>
</ol>
<h4>Daftar periksa sebelum menyerahkan jawaban</h4>
<ul>
<li>Σ BT sama dengan total panjang blok non-IDLE.</li>
<li>CT terbesar sama dengan total waktu.</li>
<li>Tidak ada WT atau RT negatif, dan RT ≤ WT.</li>
<li>Rata-rata TAT − rata-rata WT = rata-rata BT.</li>
<li>Pada non-preemptive, WT sama dengan RT.</li>
</ul>
<h4>Istilah</h4>
<div class="cards">${G.map(g => `<div class="tc"><span class="ab">${g[0]}</span><span class="nm">${g[1]}</span><p>${g[2]}</p></div>`).join('')}</div>
<p>Selesai membaca? Buka halaman simulasi dan coba data milikmu sendiri untuk memastikan hasil hitungan manual sama dengan hasil aplikasi.</p>
<p><a class="btn btn-gold" href="#simulasi">Ke Simulasi Proses</a></p>`}

const MODS = [
    { id: 'dasar', t: 'Dasar Penjadwalan CPU', s: 'Proses, burst, status, scheduler, dispatcher, dan kriteria penilaian.', h: mDasar },
    { id: 'metrik', t: 'Metrik dan Rumus', s: 'Arti AT, BT, CT, TAT, WT, RT, serta identitas yang selalu berlaku.', h: mMetrik, after: () => calcUpdate() },
    { id: 'gantt', t: 'Gantt Chart dan Prosedur', s: 'Cara membaca Gantt Chart dan langkah menyusunnya, dengan simulator langkah demi langkah.', h: mGantt, after: () => stInit() },
    { id: 'fcfs', t: 'FCFS', s: 'Antrean sederhana, sifat-sifatnya, dan convoy effect.', h: mFcfs },
    { id: 'sjf', t: 'SJF dan SRTF', s: 'Pekerjaan terpendek lebih dulu, bukti optimalitas, dan prediksi burst.', h: mSjf },
    { id: 'priority', t: 'Priority', s: 'Prioritas statis dan dinamis, starvation, aging, dan priority inversion.', h: mPriority },
    { id: 'rr', t: 'Round Robin', s: 'Quantum, aturan seri, overhead, dan batas waktu respons.', h: mRr },
    { id: 'idle', t: 'Idle dan Utilisasi', s: 'Kapan CPU idle, dampaknya, dan sifat work-conserving.', h: mIdle },
    { id: 'banding', t: 'Perbandingan Algoritma', s: 'Hasil nyata pada data yang sama, matriks sifat, dan cara memilih.', h: mBanding },
    { id: 'lanjut', t: 'Topik Lanjutan', s: 'HRRN, MLFQ, multiprosesor, real-time, dan penjadwal di sistem nyata.', h: mLanjut },
    { id: 'rangkum', t: 'Rangkuman dan Jebakan', s: 'Cheat sheet, kesalahan umum, daftar periksa, dan istilah.', h: mRangkum }
];

let curMod = 0, navBuilt = false;
function buildLearnNav() {
    $('#lnav').innerHTML = MODS.map((m, i) => `<button type="button" data-m="${m.id}"><span class="num">${i + 1}</span><span>${m.t}</span></button>`).join('');
    navBuilt = true;
}
function openLearn(id) {
    if (!navBuilt) buildLearnNav();
    let i = MODS.findIndex(m => m.id === id); if (i < 0) i = curMod;
    curMod = i;
    if (st.timer) { clearInterval(st.timer); st.timer = null }
    $$('#lnav button').forEach((b, j) => b.setAttribute('aria-current', j === i));
    const cur = $$('#lnav button')[i];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    const m = MODS[i], prev = MODS[i - 1], next = MODS[i + 1];
    const mod = $('#mod');
    mod.style.animation = 'none'; void mod.offsetWidth; mod.style.animation = '';
    mod.innerHTML = `<div class="rd">
  <div class="mprog"><span>Modul ${i + 1} dari ${MODS.length}</span><div class="bar"><i style="width:${(i + 1) / MODS.length * 100}%"></i></div></div>
  <h3 class="mt1">${m.t}</h3>
  <p class="mlead">${m.s}</p>
  ${m.h()}
  <div class="mnav">
   ${prev ? `<button type="button" class="btn btn-out" data-m="${prev.id}">‹ ${prev.t}</button>` : '<span></span>'}
   ${next ? `<button type="button" class="btn btn-gold" data-m="${next.id}">${next.t} ›</button>` : '<a class="btn btn-gold" href="#simulasi">Ke Simulasi Proses</a>'}
  </div></div>`;
    if (m.after) m.after();
    history.replaceState(null, '', '#belajar/' + m.id);
}
$('#pg-belajar').addEventListener('click', e => {
    const mb = e.target.closest('[data-m]');
    if (mb) { openLearn(mb.dataset.m); $('#learnTop').scrollIntoView({ behavior: 'smooth' }); return }
    const t = e.target.closest('[data-try]');
    if (t) {
        const rowsArr = JSON.parse(t.dataset.rows);
        loadRows(rowsArr, +t.dataset.q || 2);
        $('#presetNote').textContent = 'Contoh dari Media Belajar.';
        choose(t.dataset.try); nav('simulasi');
    }
});

/* kalkulator rumus */
function calcUpdate() {
    if (!$('#kAT')) return;
    const g = id => { const v = $(id).value.trim(); return /^\d+$/.test(v) ? +v : null };
    const at = g('#kAT'), bt = g('#kBT'), st0 = g('#kStart'), ct = g('#kCT');
    const msg = []; let tat = null, wt = null, rt = null;
    if (at !== null && ct !== null) { if (ct < at) msg.push('CT tidak boleh lebih kecil dari AT.'); else tat = ct - at }
    if (tat !== null && bt !== null) { if (tat < bt) msg.push('TAT lebih kecil dari BT, periksa lagi CT, AT, dan BT.'); else wt = tat - bt }
    if (st0 !== null && at !== null) { if (st0 < at) msg.push('Start tidak boleh sebelum AT.'); else rt = st0 - at }
    if (st0 !== null && bt !== null && ct !== null && ct < st0 + bt) msg.push('CT tidak mungkin lebih kecil dari Start + BT.');
    $('#kTAT').textContent = tat ?? '–'; $('#kTATf').textContent = tat !== null ? `${ct} − ${at}` : '';
    $('#kWT').textContent = wt ?? '–'; $('#kWTf').textContent = wt !== null ? `${tat} − ${bt}` : '';
    $('#kRT').textContent = rt ?? '–'; $('#kRTf').textContent = rt !== null ? `${st0} − ${at}` : '';
    $('#kNote').textContent = msg.join(' ');
}
$('#mod').addEventListener('input', e => { if (e.target.closest('.kgrid')) calcUpdate() });

/* simulator langkah demi langkah */
const st = { alg: 'srtf', t: 0, timer: null };
const STQ = 2;
function stInit() { st.t = 0; st.timer = null; $('#stAlgo').value = st.alg; stRender() }
function stRender() {
    const a = algo(st.alg), data = toData(SAMPLE), o = simulate(st.alg, data, STQ), u = unitsOf(o), t = Math.min(st.t, o.total);
    const done = pid => u.slice(0, t).filter(x => x === pid).length;
    const run = t < o.total ? u[t] : undefined;
    const arrived = data.filter(p => p.at === t).map(p => 'P' + p.id);
    let why = '';
    if (t >= o.total) why = `Semua proses selesai. Total waktu = ${o.total}.`;
    else if (run === null) why = 'CPU idle: belum ada proses yang siap.';
    else {
        const e = o.log.find(x => x.t === t && x.type !== 'idle');
        if (!e) why = `P${run + 1} melanjutkan proses yang sedang berjalan.`;
        else if (e.type === 'rr') why = `P${run + 1} diambil dari depan antrean dan berjalan ${e.slice} satuan (quantum ${STQ}).`;
        else why = `P${run + 1} dipilih: ${e.cands.length > 1 ? `${e.lab} terkecil dari proses yang siap (${e.cands.map(c => `P${c.id + 1} = ${c.v}`).join(', ')})` : 'satu-satunya proses yang siap'}.${e.preempted ? ` P${e.preempted.id + 1} disela.` : ''}`;
    }
    $('#stInfo').innerHTML = `<div class="stp-t"><span>Waktu</span><b>t = ${t}</b></div><div class="stp-d"><p><b>${t >= o.total ? 'Selesai' : run === null ? 'CPU idle' : 'CPU menjalankan P' + (run + 1)}</b></p><p class="note">${arrived.length ? `Tiba sekarang: ${arrived.join(', ')}. ` : ''}${why}</p></div>`;
    $('#stGantt').innerHTML = cellsHTML(o, t, t);
    $('#stTable').innerHTML = `<thead><tr><th>Proses</th><th>AT</th><th>BT</th>${a.needs === 'priority' ? '<th>Prio</th>' : ''}<th>Sisa BT</th><th>Status</th></tr></thead><tbody>${data.map((p, i) => {
        const d = done(i), rem = p.bt - d;
        let s;
        if (rem === 0) s = `Selesai (CT ${o.res[i].ct})`;
        else if (run === i) s = 'Berjalan';
        else if (p.at <= t) s = 'Menunggu';
        else s = 'Belum tiba';
        return `<tr class="${run === i ? 'st-run' : ''}"><td><i class="sw" style="background:${COLORS[i % 6]}"></i>P${p.id}</td><td>${p.at}</td><td>${p.bt}</td>${a.needs === 'priority' ? `<td>${p.pr}</td>` : ''}<td>${rem}</td><td>${s}</td></tr>`;
    }).join('')}</tbody>`;
    const pb = $('#stPlay'); if (pb) pb.textContent = st.timer ? 'Jeda' : 'Putar';
    return o.total;
}
function stStep(d) { const tot = stRender(); st.t = Math.max(0, Math.min(tot, st.t + d)); stRender() }
$('#mod').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const act = b.dataset.s;
    if (act === 'next') { stStep(1) }
    else if (act === 'prev') { stStep(-1) }
    else if (act === 'reset') { if (st.timer) { clearInterval(st.timer); st.timer = null } st.t = 0; stRender() }
    else if (act === 'play') {
        if (st.timer) { clearInterval(st.timer); st.timer = null; stRender(); return }
        const tot = stRender(); if (st.t >= tot) st.t = 0;
        st.timer = setInterval(() => {
            const total = stRender();
            if (st.t >= total) { clearInterval(st.timer); st.timer = null; stRender(); return }
            st.t++; stRender();
        }, 850);
        stRender();
    }
});
$('#mod').addEventListener('change', e => {
    if (e.target.id === 'stAlgo') { if (st.timer) { clearInterval(st.timer); st.timer = null } st.alg = e.target.value; st.t = 0; stRender() }
});

/* =====================================================
   NAVIGASI HALAMAN
   ===================================================== */
function nav(name) {
    if (location.hash === '#' + name) route(false); else location.hash = name;
}
function route(first) {
    const raw = location.hash.replace('#', '') || 'beranda';
    const parts = raw.split('/'), name = parts[0], sub = parts[1];
    const page = name === 'belajar' ? 'belajar' : 'home';
    $('#pg-home').hidden = page !== 'home';
    $('#pg-belajar').hidden = page !== 'belajar';
    const cur = page === 'belajar' ? 'belajar' : (['beranda', 'algoritma', 'simulasi'].includes(name) ? name : 'beranda');
    $$('#menu a[data-r]').forEach(a => a.setAttribute('aria-current', a.dataset.r === cur ? 'page' : 'false'));
    if (page === 'belajar') openLearn(sub);
    closeMenu();
    revealCheck();
    const el = page === 'home' && /^[a-z-]+$/.test(name) ? document.getElementById(name) : null;
    if (el && !el.hidden) { requestAnimationFrame(() => el.scrollIntoView({ behavior: first ? 'auto' : 'smooth' })) }
    else window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', () => route(false));

/* penanda menu saat menggulir di halaman utama */
if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => {
        es.forEach(e => {
            if (e.isIntersecting && !$('#pg-home').hidden) {
                $$('#menu a[data-r]').forEach(a => a.setAttribute('aria-current', a.dataset.r === e.target.id ? 'page' : 'false'));
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['beranda', 'algoritma', 'simulasi'].forEach(id => spy.observe(document.getElementById(id)));
}

/* ---------- awal ---------- */
buildCards();
loadPreset('idle');
choose('fcfs');
route(true);
demoStart();
