"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const MAX = 6, LIMIT = 99;
const COLORS = ['#E0B84F', '#8E9E4E', '#86C98B', '#F4F1E6', '#6FA58F', '#C77B3E'];
const f2 = x => (Math.round(x * 100) / 100).toString().replace('.', ',');
const names = ids => ids.map(i => 'P' + (i + 1)).join(', ');
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const go = id => $(id).scrollIntoView({ behavior: 'smooth' });

/* ---------- data algoritma ---------- */
const ALGOS = [
    {
        id: 'fcfs', n: 'FCFS', full: 'First Come First Served', pre: false, needs: null,
        d: 'Yang datang lebih dulu dilayani lebih dulu.',
        m: 'Antrean biasa: CPU melayani proses sesuai urutan kedatangan sampai selesai.',
        rule: 'AT terkecil dipilih lebih dulu.',
        steps: ['Urutkan proses berdasarkan AT (bila seri, nomor proses lebih kecil lebih dulu).', 'Jalankan proses terdepan sampai selesai tanpa disela.', 'Bila belum ada proses yang tiba, CPU idle sampai proses berikutnya datang.', 'Ulangi sampai semua proses selesai.'],
        good: 'Paling sederhana dan tidak ada proses yang terlewat.',
        bad: 'Proses pendek bisa menunggu lama di belakang proses panjang (convoy effect).',
        use: 'Memahami dasar penjadwalan dan beban kerja yang seragam.',
        ic: 'M4 7h16M4 12h12M4 17h8'
    },
    {
        id: 'sjf', n: 'SJF', full: 'Shortest Job First', pre: false, needs: null,
        d: 'Burst terpendek dijalankan lebih dulu.',
        m: 'Saat CPU bebas, dipilih proses siap dengan BT terkecil. Proses yang berjalan tidak disela.',
        rule: 'Di antara proses yang sudah tiba, BT terkecil dipilih. Seri: AT lebih kecil, lalu nomor lebih kecil.',
        steps: ['Saat CPU bebas, kumpulkan proses yang sudah tiba (AT ≤ waktu sekarang).', 'Pilih proses dengan BT terkecil.', 'Jalankan sampai selesai tanpa disela, meski ada proses lebih pendek yang tiba.', 'Ulangi. Bila tidak ada proses siap, CPU idle.'],
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
        steps: ['Setiap satuan waktu, periksa semua proses yang sudah tiba dan belum selesai.', 'Pilih proses dengan sisa BT terkecil.', 'Bila proses baru tiba dengan sisa BT lebih kecil, proses yang berjalan disela.', 'Catat waktu mulai pertama tiap proses untuk RT, lalu ulangi sampai selesai.'],
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
        steps: ['Saat CPU bebas, kumpulkan proses yang sudah tiba.', 'Pilih proses dengan angka priority terkecil. Seri: AT lebih kecil, lalu nomor lebih kecil.', 'Jalankan sampai selesai, meski ada proses yang lebih penting tiba di tengah jalan.', 'Ulangi. Bila tidak ada proses siap, CPU idle.'],
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
        steps: ['Setiap satuan waktu, periksa semua proses yang sudah tiba dan belum selesai.', 'Pilih proses dengan angka priority terkecil.', 'Bila proses baru yang lebih penting tiba, proses yang berjalan disela dan sisa BT-nya disimpan.', 'Ulangi sampai semua selesai. CPU idle bila tidak ada proses siap.'],
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
        steps: ['Masukkan proses yang tiba ke antrean sesuai urutan kedatangan.', 'Ambil proses terdepan dan jalankan paling lama sebesar quantum.', 'Proses yang tiba selama jatah berjalan masuk antrean lebih dulu daripada proses yang baru dihentikan.', 'Bila belum selesai, proses kembali ke belakang antrean. Bila selesai, catat CT.', 'Bila antrean kosong sebelum semua selesai, CPU idle.'],
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
const SAMPLE = { rows: [[0, 7, 3], [2, 4, 1], [4, 1, 4], [5, 4, 2]], q: 2 };
const toData = list => list.map(([at, bt, pr], i) => ({ id: i + 1, at, bt, pr }));

let sel = 'fcfs', view = 'row', lastOut = null;
const rows = $('#rows');

/* ---------- kartu algoritma ---------- */
function buildCards() {
    $('#algoGrid').innerHTML = ALGOS.map(a => `
  <article class="card" data-id="${a.id}" data-pre="${a.pre ? 'pre' : 'np'}">
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
    $('#genAlgo').innerHTML = '<option value="rand">Acak</option>' + ALGOS.map(a => `<option value="${a.id}">${a.full}</option>`).join('');
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
    if (e.target.closest('#wzUse')) { choose(wz.rec); go('#input') }
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
function markStale() {
    const s = $('#staleTag'); if (s && !$('#hasil').hidden) s.hidden = false;
}
function loadRows(list, q) {
    rows.innerHTML = '';
    list.forEach(([at, bt, pr]) => addRow({ at, bt, pr }));
    $('#quantum').value = q || 2;
    clearErr(); markStale();
}
function loadPreset(k) {
    loadRows(PRESETS[k].rows, 2);
    $('#presetNote').textContent = PRESETS[k].note;
}
$$('.presets .chip').forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.preset)));
$('#add').addEventListener('click', () => {
    const tr = addRow({ pr: 1 });
    if (tr) $('.at', tr).focus();
});
$('#reset').addEventListener('click', () => {
    rows.innerHTML = ''; addRow({ pr: 1 }); addRow({ pr: 1 });
    $('#hasil').hidden = true; $('#presetNote').textContent = ''; clearErr();
});
$('#heroContoh').addEventListener('click', () => { loadPreset('idle'); go('#input') });

/* menu mobile */
function closeMenu() { $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false') }
$('#burger').addEventListener('click', () => {
    const o = $('#menu').classList.toggle('open');
    $('#burger').setAttribute('aria-expanded', o);
});
$$('#menu a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('click', e => { if (!e.target.closest('#menu') && !e.target.closest('#burger')) closeMenu() });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu() });

/* ---------- validasi ---------- */
function clearErr() {
    $$('.err').forEach(e => e.textContent = '');
    $$('.panel input.bad').forEach(i => i.classList.remove('bad'));
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
        data.push({
            id: i + 1,
            at: num($('.at', tr), 0, 'AT', true),
            bt: num($('.bt', tr), 1, 'BT', true),
            pr: num($('.pr', tr), 1, 'Priority', needPr)
        });
    });
    let q = 2;
    const qi = $('#quantum'); qi.classList.remove('bad'); $('#qerr').textContent = '';
    const v = qi.value.trim();
    if (algo(sel).needs === 'quantum') {
        if (!/^\d+$/.test(v) || +v < 1 || +v > LIMIT) { qi.classList.add('bad'); $('#qerr').textContent = 'Bilangan bulat 1–' + LIMIT; ok = false } else q = +v;
    } else if (/^\d+$/.test(v) && +v >= 1) q = +v;
    if (!ok) {
        const first = $('.panel input.bad');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    tl.forEach((v, i) => {
        const L = segs[segs.length - 1];
        if (L && L.p === v) L.e = i + 1; else segs.push({ p: v, s: i, e: i + 1 });
    });
    const res = P.map((p, i) => {
        const tat = ct[i] - p.at;
        return { ...p, start: start[i], ct: ct[i], tat, wt: tat - p.bt, rt: start[i] - p.at, slices: segs.filter(s => s.p === i) };
    });
    const total = tl.length, busy = tl.filter(v => v !== null).length;
    return { alg, res, segs, total, busy, idle: total - busy, log, q };
}
function avgOf(o) {
    const n = o.res.length, sum = k => o.res.reduce((a, r) => a + r[k], 0);
    return {
        n, sTat: sum('tat'), sWt: sum('wt'), sRt: sum('rt'),
        tat: sum('tat') / n, wt: sum('wt') / n, rt: sum('rt') / n,
        cpu: o.busy / o.total * 100, tp: n / o.total
    };
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
  <div class="frow">
   <div class="fl">
    <span class="fk">${k}<small>${full}</small></span>
    <span class="fx">${sym}${num ? ` <em>= ${num}</em>` : ''}</span>
   </div>
   <b class="fv">${val}</b>
  </div>`;
    return `<div class="pcards">${o.res.map((r, i) => `
  <article class="pc" style="--pc:${COLORS[i % 6]}">
   <header class="pc-h">
    <h4><i class="sw" style="background:${COLORS[i % 6]}"></i>P${r.id}</h4>
    <div class="mini">
     <span>AT <b>${r.at}</b></span><span>BT <b>${r.bt}</b></span>${usePr ? `<span>Prio <b>${r.pr}</b></span>` : ''}
    </div>
   </header>
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
            return `<li>${timeBox(e.t, segEnd(e.t), true)}<div class="tl-b">
    <div class="tl-h"><span class="tag-i">IDLE</span>CPU menganggur</div>
    <p class="tl-p">Tidak ada proses yang siap${e.until < Infinity ? `. CPU menunggu sampai t=${e.until}, saat ${names(e.wait)} tiba.` : '.'}</p>
   </div></li>`;
        }
        if (e.type === 'rr') {
            return `<li>${timeBox(e.t, e.t + e.slice, false)}<div class="tl-b">
    <div class="tl-h"><i class="sw" style="background:${COLORS[e.p % 6]}"></i>${names([e.p])} dijalankan</div>
    <p class="tl-p">Diambil dari depan antrean, berjalan ${e.slice} satuan (quantum = ${o.q}). Sisa BT ${e.left}${e.left === 0 ? ', proses selesai.' : ', kembali ke belakang antrean.'}</p>
    <div class="cands"><span class="cl">Antrean</span>${e.queue.map((id, k) => chip(id, '', k === 0)).join('')}</div>
   </div></li>`;
        }
        const multi = e.cands.length > 1;
        return `<li>${timeBox(e.t, segEnd(e.t), false)}<div class="tl-b">
   <div class="tl-h"><i class="sw" style="background:${COLORS[e.p % 6]}"></i>${names([e.p])} dijalankan</div>
   <p class="tl-p">${multi ? `Dipilih karena ${e.lab} terkecil di antara proses yang siap.` : `Hanya ${names([e.p])} yang siap.`}</p>
   ${multi ? `<div class="cands"><span class="cl">Kandidat</span>${e.cands.map(c => chip(c.id, `${e.lab} ${c.v}`, c.id === e.p)).join('')}</div>` : ''}
   ${e.ties.length ? `<p class="note-i">Seri dengan ${names(e.ties)}: dipilih yang AT-nya lebih kecil, lalu nomor lebih kecil.</p>` : ''}
   ${e.preempted ? `<p class="note-i">${names([e.preempted.id])} disela, sisa BT ${e.preempted.left}.</p>` : ''}
  </div></li>`;
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

/* ---------- tampilan hasil ---------- */
function renderMeta(o) {
    const a = algo(o.alg);
    $('#meta').innerHTML =
        `<span class="pill">${a.full}</span>` +
        (a.needs === 'quantum' ? `<span class="pill">Quantum = ${o.q}</span>` : '') +
        `<span class="pill">Total waktu: ${o.total}</span>` +
        `<span class="pill">CPU idle: ${o.idle}</span>` +
        `<span class="pill stale" id="staleTag" hidden>Data berubah, klik Proses untuk memperbarui</span>`;
}

function renderGantt(o) {
    const total = o.total;
    const small = window.innerWidth < 600;
    const LAB = small ? 46 : 56;
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
    const list = ALGOS.map(a => {
        const o = simulate(a.id, inp.data, inp.q), m = avgOf(o);
        return { a, m, runs: o.segs.filter(s => s.p !== null).length };
    });
    const mn = k => Math.min(...list.map(r => r.m[k]));
    const cls = (r, k) => Math.abs(r.m[k] - mn(k)) < 1e-9 ? ' class="best"' : '';
    const minRuns = Math.min(...list.map(r => r.runs));
    $('#cmpTable').innerHTML = `<thead><tr><th>Algoritma</th><th>Rata-rata TAT</th><th>Rata-rata WT</th><th>Rata-rata RT</th><th>Segmen eksekusi</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>` +
        list.map(r => `<tr class="${r.a.id === sel ? 'cur' : ''}"><td>${r.a.full}${r.a.id === 'rr' ? ` (q = ${inp.q})` : ''}</td><td data-label="TAT"${cls(r, 'tat')}>${f2(r.m.tat)}</td><td data-label="WT"${cls(r, 'wt')}>${f2(r.m.wt)}</td><td data-label="RT"${cls(r, 'rt')}>${f2(r.m.rt)}</td><td data-label="Segmen"${r.runs === minRuns ? ' class="best"' : ''}>${r.runs}</td><td class="act">${r.a.id === sel ? '<span class="pill">Dipakai</span>' : `<button type="button" class="btn btn-out btn-sm" data-pick="${r.a.id}">Pakai</button>`}</td></tr>`).join('') + '</tbody>';
}
$('#cmpTable').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    choose(b.dataset.pick);
    go('#ganttBox');
});

/* ---------- proses ---------- */
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
   MATERI PEMBELAJARAN
   ===================================================== */
function wireTabs(tabsSel, panelsSel, onShow) {
    $(tabsSel).addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        $$('.chip', $(tabsSel)).forEach(x => x.setAttribute('aria-pressed', x === b));
        $$(panelsSel + ' > [data-p]').forEach(p => p.hidden = p.dataset.p !== b.dataset.t);
        if (onShow) onShow(b.dataset.t);
    });
}

const GLOSS = [
    ['AT', 'Arrival Time', 'Waktu proses tiba di antrean siap. Proses baru bisa dijalankan setelah AT-nya tercapai.'],
    ['BT', 'Burst Time', 'Total waktu CPU yang dibutuhkan proses sampai selesai.'],
    ['CT', 'Completion Time', 'Waktu ketika proses selesai. Dibaca dari ujung kanan blok terakhir proses di Gantt Chart.'],
    ['TAT', 'Turnaround Time', 'Lama proses berada di sistem, dari tiba sampai selesai.'],
    ['WT', 'Waiting Time', 'Total waktu proses menunggu di antrean siap tanpa dijalankan.'],
    ['RT', 'Response Time', 'Jeda dari proses tiba sampai pertama kali mendapat CPU.'],
    ['Idle', 'CPU menganggur', 'Kondisi CPU tidak menjalankan apa pun karena belum ada proses yang tiba.'],
    ['Quantum', 'Jatah giliran', 'Waktu maksimal sekali giliran pada Round Robin.'],
    ['Preemptive', 'Boleh menyela', 'CPU boleh diambil dari proses yang sedang berjalan. Pada non-preemptive, proses selesai dulu.'],
    ['Throughput', 'Proses per waktu', 'Jumlah proses yang selesai dibagi total waktu.'],
    ['CPU Util.', 'Utilisasi CPU', 'Persentase waktu CPU benar-benar sibuk dari total waktu.'],
    ['Starvation', 'Kelaparan', 'Proses tertunda terus-menerus karena selalu kalah oleh proses lain.']
];
const FORMULAS = [
    ['Completion Time (CT)', 'CT = akhir blok terakhir', 'Lihat Gantt Chart, ambil waktu di ujung kanan blok terakhir milik proses itu. Pada algoritma preemptive, ambil blok paling akhir, bukan blok pertama.', 'Contoh: bila blok terakhir P2 berakhir di t=10, maka CT P2 = 10.'],
    ['Turnaround Time (TAT)', 'TAT = CT − AT', 'Lama proses berada di sistem sejak tiba sampai selesai.', 'Contoh: AT = 2, CT = 9, maka TAT = 9 − 2 = 7.'],
    ['Waiting Time (WT)', 'WT = TAT − BT', 'Waktu di sistem dikurangi waktu yang dipakai untuk benar-benar berjalan.', 'Contoh: TAT = 7, BT = 4, maka WT = 7 − 4 = 3.'],
    ['Response Time (RT)', 'RT = Mulai − AT', 'Mulai adalah waktu pertama kali proses mendapat CPU. Pada non-preemptive, RT sama dengan WT.', 'Contoh: AT = 2, mulai pertama t = 5, maka RT = 5 − 2 = 3.'],
    ['Rata-rata', 'Rata-rata = Σ nilai ÷ n', 'Jumlahkan nilai TAT, WT, atau RT semua proses, lalu bagi dengan banyak proses.', 'Contoh: WT = 0, 3, 5, 4, maka (0 + 3 + 5 + 4) ÷ 4 = 3.'],
    ['CPU Utilization', 'Util = sibuk ÷ total × 100%', 'Waktu sibuk sama dengan jumlah semua BT. Total waktu dihitung dari t = 0 sampai proses terakhir selesai, jadi idle ikut dihitung.', 'Contoh: sibuk 12, total 17, maka 12 ÷ 17 × 100% = 70,59%.'],
    ['Throughput', 'Throughput = n ÷ total', 'Jumlah proses yang selesai per satuan waktu.', 'Contoh: 4 proses, total 17, maka 4 ÷ 17 = 0,24.']
];
const SALAH = [
    ['CT dianggap sama dengan BT', 'CT adalah waktu absolut di garis waktu, bukan lama eksekusi. Proses dengan BT 3 yang mulai di t=6 punya CT 9.'],
    ['Lupa idle di awal', 'Bila proses pertama baru tiba di t=3, CPU idle dari t=0 sampai 3. Pada aplikasi ini idle tersebut ikut dihitung ke total waktu.'],
    ['WT dan RT dianggap selalu sama', 'Keduanya sama hanya pada algoritma non-preemptive. Pada preemptive, proses bisa disela sehingga WT lebih besar atau sama dengan RT.'],
    ['Salah urutan antrean Round Robin', 'Proses yang tiba tepat saat jatah berakhir masuk antrean lebih dulu daripada proses yang baru dihentikan.'],
    ['SJF memakai sisa BT', 'SJF memakai BT awal dan tidak menyela. Yang memakai sisa BT adalah SRTF.'],
    ['Arah angka priority terbalik', 'Pada aplikasi ini angka lebih kecil berarti lebih penting. Beberapa buku memakai kebalikannya, jadi selalu ikuti aturan di soal.'],
    ['Mengabaikan aturan seri', 'Bila dua proses sama nilainya, pilih yang AT-nya lebih kecil, lalu nomor proses yang lebih kecil. Hasil bisa berbeda bila seri dipilih sembarang.']
];

let learnAlgo = 'fcfs';
function renderLearnAlgo() {
    const a = algo(learnAlgo), data = toData(SAMPLE.rows);
    const o = simulate(a.id, data, SAMPLE.q);
    $$('#laChips .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.la === learnAlgo));
    $('#laBody').innerHTML = `
  <div class="la-head"><h3>${a.full}</h3><span class="tag">${a.pre ? 'Preemptive' : 'Non-preemptive'}</span></div>
  <p class="la-rule"><b>Aturan pemilihan:</b> ${a.rule}</p>
  <h4>Langkah kerja</h4>
  <ol class="steps">${a.steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol>
  <h4>Contoh kasus</h4>
  <p class="note sample-data">${data.map(p => `P${p.id} (AT ${p.at}, BT ${p.bt}${a.needs === 'priority' ? `, Prio ${p.pr}` : ''})`).join('; ')}${a.needs === 'quantum' ? `; quantum ${SAMPLE.q}` : ''}.</p>
  ${miniGantt(o)}
  ${miniTable(o)}
  <div class="pcg">
   <div class="tc"><h5>Kelebihan</h5><p>${a.good}</p></div>
   <div class="tc"><h5>Kekurangan</h5><p>${a.bad}</p></div>
   <div class="tc"><h5>Cocok untuk</h5><p>${a.use}</p></div>
  </div>
  <div class="ex-actions"><button type="button" class="btn btn-gold" data-try="${a.id}">Coba di simulator</button></div>`;
}
function idleHTML() {
    const data = toData(PRESETS.idle.rows), o = simulate('fcfs', data, 2), m = avgOf(o);
    const idles = o.segs.map((s, i) => ({ s, i })).filter(x => x.s.p === null);
    return `
  <p class="lead">CPU idle terjadi saat tidak ada proses yang siap, padahal masih ada proses yang belum tiba. Contoh ini memakai FCFS.</p>
  <p class="note sample-data">${data.map(p => `P${p.id} (AT ${p.at}, BT ${p.bt})`).join('; ')}.</p>
  ${miniGantt(o)}
  <h4>Kenapa CPU idle?</h4>
  <ul class="idl">${idles.map(({ s, i }) => {
        const prev = i > 0 ? o.segs[i - 1].p : null;
        const next = o.res.filter(r => r.at === s.e).map(r => r.id - 1);
        return `<li><b>t=${s.s}–${s.e}</b> · ${prev !== null ? `${names([prev])} sudah selesai pada t=${s.s}` : 'belum ada proses yang tiba'}, sedangkan ${next.length ? `${names(next)} baru tiba pada t=${s.e}` : 'proses berikutnya belum tiba'}. CPU menunggu.</li>`;
    }).join('')}</ul>
  ${miniTable(o)}
  <h4>Dampak ke CPU Utilization</h4>
  <p class="lead">Total waktu = ${o.total}, waktu sibuk = jumlah BT = ${o.busy}, waktu idle = ${o.idle}. CPU Utilization = ${o.busy} ÷ ${o.total} × 100% = <b>${f2(m.cpu)}%</b>. Tanpa idle nilainya 100%.</p>
  <div class="ex-actions"><button type="button" class="btn btn-gold" data-idle-try="1">Coba di simulator</button></div>`;
}
function buildLearn() {
    const P = n => $(`#learnPanels [data-p="${n}"]`);
    P('istilah').innerHTML = `<p class="lead">Istilah yang akan sering muncul di soal penjadwalan CPU.</p>
  <div class="cards">${GLOSS.map(g => `<div class="tc"><span class="ab">${g[0]}</span><span class="nm">${g[1]}</span><p>${g[2]}</p></div>`).join('')}</div>`;
    P('rumus').innerHTML = `<p class="lead">Tujuh rumus yang dipakai di seluruh aplikasi. Contoh pada kartu memakai satu proses dengan AT = 2, BT = 4, mulai di t = 5, dan selesai di t = 9.</p>
  <div class="cards">${FORMULAS.map(f => `<div class="fm"><span class="ft">${f[0]}</span><span class="fe">${f[1]}</span><p>${f[2]}</p><p class="ex">${f[3]}</p></div>`).join('')}</div>
  <div class="kcalc">
   <h4>Kalkulator rumus</h4>
   <p class="note">Isi data satu proses, hasilnya muncul otomatis.</p>
   <div class="kgrid">
    <div class="field"><label for="kAT">AT</label><input id="kAT" type="text" inputmode="numeric" autocomplete="off" value="2"></div>
    <div class="field"><label for="kBT">BT</label><input id="kBT" type="text" inputmode="numeric" autocomplete="off" value="4"></div>
    <div class="field"><label for="kStart">Mulai pertama</label><input id="kStart" type="text" inputmode="numeric" autocomplete="off" value="5"></div>
    <div class="field"><label for="kCT">CT</label><input id="kCT" type="text" inputmode="numeric" autocomplete="off" value="9"></div>
   </div>
   <div class="kres">
    <div class="kr"><span>TAT = CT − AT</span><b id="kTAT">–</b><em id="kTATf"></em></div>
    <div class="kr"><span>WT = TAT − BT</span><b id="kWT">–</b><em id="kWTf"></em></div>
    <div class="kr"><span>RT = Mulai − AT</span><b id="kRT">–</b><em id="kRTf"></em></div>
   </div>
   <p class="knote" id="kNote" aria-live="polite"></p>
  </div>`;
    P('algo').innerHTML = `<p class="lead">Pilih algoritma untuk melihat aturan, langkah kerja, dan contoh kasus yang dihitung langsung oleh simulator.</p>
  <div class="achips" id="laChips">${ALGOS.map(a => `<button type="button" class="chip" data-la="${a.id}" aria-pressed="${a.id === learnAlgo}">${a.n}</button>`).join('')}</div>
  <div id="laBody"></div>`;
    renderLearnAlgo();
    P('idle').innerHTML = idleHTML();
    P('salah').innerHTML = `<p class="lead">Kesalahan yang paling sering membuat hasil hitungan berbeda dari jawaban yang benar.</p>
  <div class="cards">${SALAH.map((s, i) => `<div class="tc"><span class="ab">${i + 1}</span><span class="nm">${s[0]}</span><p>${s[1]}</p></div>`).join('')}</div>`;
    calcUpdate();
}
function calcUpdate() {
    const g = id => { const v = $(id).value.trim(); return /^\d+$/.test(v) ? +v : null };
    const at = g('#kAT'), bt = g('#kBT'), st = g('#kStart'), ct = g('#kCT');
    const msg = [];
    let tat = null, wt = null, rt = null;
    if (at !== null && ct !== null) { if (ct < at) msg.push('CT tidak boleh lebih kecil dari AT.'); else tat = ct - at }
    if (tat !== null && bt !== null) { if (tat < bt) msg.push('TAT lebih kecil dari BT, periksa lagi CT, AT, dan BT.'); else wt = tat - bt }
    if (st !== null && at !== null) { if (st < at) msg.push('Mulai tidak boleh sebelum AT.'); else rt = st - at }
    if (st !== null && bt !== null && ct !== null && ct < st + bt) msg.push('CT tidak mungkin lebih kecil dari Mulai + BT.');
    $('#kTAT').textContent = tat ?? '–'; $('#kTATf').textContent = tat !== null ? `${ct} − ${at}` : '';
    $('#kWT').textContent = wt ?? '–'; $('#kWTf').textContent = wt !== null ? `${tat} − ${bt}` : '';
    $('#kRT').textContent = rt ?? '–'; $('#kRTf').textContent = rt !== null ? `${st} − ${at}` : '';
    $('#kNote').textContent = msg.join(' ');
}
$('#learnPanels').addEventListener('input', e => { if (e.target.closest('.kgrid')) calcUpdate() });
$('#learnPanels').addEventListener('click', e => {
    const la = e.target.closest('[data-la]');
    if (la) { learnAlgo = la.dataset.la; renderLearnAlgo(); return }
    const t = e.target.closest('[data-try]');
    if (t) { loadRows(SAMPLE.rows, SAMPLE.q); $('#presetNote').textContent = 'Contoh dari materi Belajar.'; choose(t.dataset.try); go('#input'); return }
    if (e.target.closest('[data-idle-try]')) { loadPreset('idle'); choose('fcfs'); go('#input') }
});
wireTabs('#learnTabs', '#learnPanels');

/* =====================================================
   KUIS KONSEP
   ===================================================== */
const QUIZ = [
    {
        q: 'Rumus Turnaround Time (TAT) yang benar adalah ...', o: ['CT − AT', 'CT − BT', 'AT + BT', 'WT − BT'], a: 0,
        e: 'TAT adalah lama proses berada di sistem, dari tiba (AT) sampai selesai (CT), jadi TAT = CT − AT.'
    },
    {
        q: 'Waiting Time (WT) dihitung dengan ...', o: ['TAT − BT', 'TAT + BT', 'CT − AT', 'BT − AT'], a: 0,
        e: 'Waktu di sistem (TAT) dikurangi waktu yang benar-benar dipakai berjalan (BT) menyisakan waktu menunggu.'
    },
    {
        q: 'Response Time (RT) adalah ...', o: ['Selisih saat pertama kali dijalankan dan AT', 'Selisih CT dan AT', 'Total waktu menunggu', 'Lama proses berjalan di CPU'], a: 0,
        e: 'RT = waktu pertama kali mendapat CPU − AT. Hanya memperhitungkan jeda sampai proses mulai, bukan sampai selesai.'
    },
    {
        q: 'Proses memiliki AT = 2, BT = 4, dan selesai pada t = 10. Berapa TAT dan WT-nya?', o: ['TAT = 8, WT = 4', 'TAT = 10, WT = 6', 'TAT = 8, WT = 6', 'TAT = 6, WT = 2'], a: 0,
        e: 'TAT = 10 − 2 = 8. WT = TAT − BT = 8 − 4 = 4.'
    },
    {
        q: 'Kapan CPU berada dalam kondisi idle?', o: ['Saat tidak ada proses yang siap, sementara proses berikutnya belum tiba', 'Saat proses memiliki BT paling kecil', 'Saat quantum Round Robin habis', 'Saat dua proses memiliki AT yang sama'], a: 0,
        e: 'Idle terjadi bila antrean siap kosong tetapi masih ada proses yang AT-nya belum tercapai.'
    },
    {
        q: 'Algoritma non-preemptive yang memilih proses dengan BT terkecil adalah ...', o: ['SJF', 'SRTF', 'Round Robin', 'Priority Preemptive'], a: 0,
        e: 'SJF memilih BT terkecil saat CPU bebas dan tidak menyela. SRTF juga memilih yang terkecil, tetapi boleh menyela.'
    },
    {
        q: 'SRTF adalah versi preemptive dari ...', o: ['SJF', 'FCFS', 'Round Robin', 'Priority Non-Preemptive'], a: 0,
        e: 'SRTF memakai sisa BT dan dicek ulang tiap satuan waktu, sedangkan SJF memakai BT awal dan tidak menyela.'
    },
    {
        q: 'Convoy effect, yaitu proses pendek menunggu lama di belakang proses panjang, paling khas pada ...', o: ['FCFS', 'SRTF', 'Round Robin', 'Priority Preemptive'], a: 0,
        e: 'FCFS tidak memperhatikan panjang proses. Satu proses panjang di depan membuat semua yang di belakangnya menunggu.'
    },
    {
        q: 'Pada Round Robin, apa yang terjadi bila quantum lebih besar dari semua BT?', o: ['Perilakunya menjadi mirip FCFS', 'Perilakunya menjadi mirip SRTF', 'Semua proses mengalami starvation', 'CPU selalu idle'], a: 0,
        e: 'Tidak ada proses yang kehabisan jatah sebelum selesai, sehingga proses dilayani berurutan seperti FCFS.'
    },
    {
        q: 'Pada aplikasi ini ada proses ber-Priority 1 dan proses ber-Priority 3. Mana yang dipilih lebih dulu?', o: ['Priority 1, karena angka kecil berarti lebih penting', 'Priority 3, karena angka besar berarti lebih penting', 'Keduanya bergantian', 'Yang BT-nya lebih besar'], a: 0,
        e: 'Konvensi aplikasi ini: angka lebih kecil berarti prioritas lebih tinggi. Beberapa buku memakai kebalikannya, jadi ikuti aturan di soal.'
    },
    {
        q: 'Starvation adalah kondisi ketika ...', o: ['Proses tertunda terus karena selalu kalah oleh proses lain', 'CPU menganggur karena tidak ada proses', 'Proses selesai lebih cepat dari BT-nya', 'Quantum terlalu kecil'], a: 0,
        e: 'Contohnya proses berprioritas rendah pada Priority, atau proses panjang pada SJF dan SRTF, yang terus didahului proses lain.'
    },
    {
        q: 'CPU sibuk selama 12 satuan waktu dari total 16 satuan waktu. Berapa CPU Utilization-nya?', o: ['75%', '60%', '80%', '25%'], a: 0,
        e: 'CPU Utilization = sibuk ÷ total × 100% = 12 ÷ 16 × 100% = 75%.'
    },
    {
        q: 'Throughput didefinisikan sebagai ...', o: ['Jumlah proses selesai per satuan waktu', 'Rata-rata waktu tunggu', 'Persentase waktu CPU sibuk', 'Total BT semua proses'], a: 0,
        e: 'Throughput = jumlah proses yang selesai ÷ total waktu.'
    },
    {
        q: 'Dengan mengabaikan biaya perpindahan proses, algoritma mana yang terbukti memberi rata-rata waktu tunggu paling kecil?', o: ['SRTF', 'FCFS', 'Round Robin', 'Priority Non-Preemptive'], a: 0,
        e: 'SRTF selalu menjalankan proses dengan sisa waktu terpendek, sehingga secara teori optimal untuk rata-rata waktu tunggu.'
    },
    {
        q: 'Pada Round Robin, sebuah proses baru tiba tepat saat jatah proses lain berakhir. Aturan yang dipakai aplikasi ini?', o: ['Proses baru masuk antrean lebih dulu daripada proses yang baru dihentikan', 'Proses yang baru dihentikan masuk antrean lebih dulu', 'Proses baru menunggu sampai antrean kosong', 'Proses baru langsung menyela dan dijalankan'], a: 0,
        e: 'Proses yang tiba selama jatah berjalan didahulukan masuk antrean, baru proses yang belum selesai kembali ke belakang.'
    }
];
let qz = null;
function startQuiz() {
    const list = shuffle(QUIZ).slice(0, 10).map(x => ({ q: x.q, e: x.e, o: shuffle(x.o.map((t, i) => ({ t, ok: i === x.a }))) }));
    qz = { list, i: 0, score: 0, picked: null, wrong: [] };
    renderQuiz();
}
function renderQuiz() {
    const box = $('#quiz'), n = qz.list.length;
    if (qz.i >= n) {
        const pct = qz.score / n;
        const msg = pct >= .9 ? 'Luar biasa, konsepmu sudah kuat.' : pct >= .7 ? 'Bagus. Tinjau soal yang salah di bawah, lalu coba lagi.' : pct >= .5 ? 'Cukup. Buka tab Belajar untuk mengulang bagian yang masih ragu.' : 'Jangan khawatir. Baca materi Belajar dulu, lalu ulangi kuisnya.';
        box.innerHTML = `<div class="qscore"><span class="pill">Kuis selesai</span><div class="big">${qz.score}/${n}</div><p>${msg}</p>
   <div class="btns"><button type="button" class="btn btn-gold" data-qa="again">Ulangi Kuis</button><button type="button" class="btn btn-out" data-qa="hitung">Lanjut ke Soal Hitung</button></div></div>
   ${qz.wrong.length ? `<h4>Soal yang perlu ditinjau</h4><div class="rev">${qz.wrong.map(w => `<div class="tc"><p><b>${w.q}</b></p><p>Jawaban benar: ${w.c}</p><p>${w.e}</p></div>`).join('')}</div>` : ''}`;
        return;
    }
    const it = qz.list[qz.i];
    box.innerHTML = `
  <div class="qtop"><span class="pill">Soal ${qz.i + 1} dari ${n}</span><span class="qs">Skor: <b>${qz.score}</b></span></div>
  <div class="bar" aria-hidden="true"><i style="width:${qz.i / n * 100}%"></i></div>
  <h3 class="qq" id="qq" tabindex="-1">${it.q}</h3>
  <div class="qopts" role="group" aria-labelledby="qq">${it.o.map((o, k) => `<button type="button" class="qo" data-k="${k}"><span class="ql">${'ABCD'[k]}</span><span>${o.t}</span></button>`).join('')}</div>
  <div class="qfb" id="qfb" hidden></div>`;
    $('#qq').focus({ preventScroll: true });
}
$('#quiz').addEventListener('click', e => {
    const act = e.target.closest('[data-qa]');
    if (act) {
        if (act.dataset.qa === 'again') startQuiz();
        else {
            $$('#practiceTabs .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.t === 'hitung'));
            $$('#practicePanels > [data-p]').forEach(p => p.hidden = p.dataset.p !== 'hitung');
            if (!prob) newProblem();
        }
        return;
    }
    if (e.target.closest('#qNext')) { qz.i++; qz.picked = null; renderQuiz(); return }
    const o = e.target.closest('.qo');
    if (!o || qz.picked !== null) return;
    const it = qz.list[qz.i], k = +o.dataset.k;
    qz.picked = k;
    const right = it.o.findIndex(x => x.ok);
    $$('.qo').forEach((b, j) => { b.disabled = true; if (j === right) b.classList.add('ok'); else if (j === k) b.classList.add('no') });
    if (k === right) qz.score++; else qz.wrong.push({ q: it.q, c: it.o[right].t, e: it.e });
    const fb = $('#qfb'); fb.hidden = false;
    fb.innerHTML = `<b>${k === right ? 'Benar.' : 'Belum tepat.'}</b><p>${it.e}</p><button type="button" class="btn btn-gold qnext" id="qNext">${qz.i === qz.list.length - 1 ? 'Lihat Skor' : 'Soal Berikutnya'}</button>`;
    $('#qNext').focus();
});

/* =====================================================
   SOAL HITUNG
   ===================================================== */
let prob = null;
function makeProblem(algId, n, idleMode) {
    let cand = null;
    for (let tries = 0; tries < 80; tries++) {
        const data = [];
        let at = idleMode === 'no' ? 0 : rnd(0, 2);
        const gapAt = n > 1 ? rnd(1, n - 1) : 0;
        for (let i = 0; i < n; i++) {
            if (i > 0) at += rnd(0, 3);
            if (i === gapAt && idleMode !== 'no') at += rnd(4, 7);
            data.push({ id: i + 1, at, bt: rnd(1, 7), pr: rnd(1, 4) });
        }
        const q = rnd(2, 3);
        const out = simulate(algId, data, q);
        cand = { alg: algId, data, q, out };
        if (idleMode === 'yes' && out.idle === 0) continue;
        if (idleMode === 'no' && out.idle > 0) continue;
        return cand;
    }
    return cand;
}
function newProblem() {
    const a = $('#genAlgo').value, n = +$('#genN').value, idleMode = $('#genIdle').value;
    const algId = a === 'rand' ? ALGOS[rnd(0, ALGOS.length - 1)].id : a;
    prob = makeProblem(algId, n, idleMode);
    renderProblem();
}
function renderProblem() {
    const a = algo(prob.alg), usePr = a.needs === 'priority', o = prob.out;
    const K = ['ct', 'tat', 'wt', 'rt'];
    $('#prob').innerHTML = `
  <div class="pmeta">
   <span class="pill">${a.full}</span>
   ${a.needs === 'quantum' ? `<span class="pill">Quantum = ${prob.q}</span>` : ''}
   <span class="pill">${prob.data.length} proses</span>
  </div>
  <p class="note">Hitung sendiri dengan aturan seri aplikasi ini (AT lebih kecil, lalu nomor proses lebih kecil). Isi semua kolom, lalu klik Periksa Jawaban.${usePr ? ' Priority: angka kecil berarti lebih penting.' : ''}</p>
  <div class="scroll"><table class="ptab">
   <thead><tr><th>Proses</th><th>AT</th><th>BT</th>${usePr ? '<th>Priority</th>' : ''}<th>CT</th><th>TAT</th><th>WT</th><th>RT</th></tr></thead>
   <tbody>${prob.data.map((p, i) => `<tr>
    <td class="pid"><i class="sw" style="background:${COLORS[i % 6]}"></i>P${p.id}</td>
    <td class="gv g1" data-label="AT">${p.at}</td><td class="gv g2" data-label="BT">${p.bt}</td>${usePr ? `<td class="gv g3" data-label="Priority">${p.pr}</td>` : ''}
    ${K.map((k, j) => `<td class="a${j + 1}" data-label="${k.toUpperCase()}"><input data-k="${k}" data-i="${i}" type="text" inputmode="numeric" autocomplete="off" aria-label="${k.toUpperCase()} P${p.id}"></td>`).join('')}
   </tr>`).join('')}</tbody>
  </table></div>
  <div class="field avgf"><label for="pAvg">Rata-rata WT <small>(2 desimal, boleh koma)</small></label><input id="pAvg" type="text" inputmode="decimal" autocomplete="off" placeholder="contoh: 3,25"></div>
  <div class="actions">
   <button type="button" class="btn btn-gold" data-pa="check">Periksa Jawaban</button>
   <button type="button" class="btn btn-out" data-pa="show">Lihat Pembahasan</button>
   <button type="button" class="btn btn-out" data-pa="new">Soal Baru</button>
   <button type="button" class="btn btn-out" data-pa="sim">Kerjakan di Simulator</button>
  </div>
  <div class="pfb" id="pfb" aria-live="polite" hidden></div>
  <div id="psol" hidden></div>`;
}
function checkProblem() {
    const res = prob.out.res;
    let ok = 0, total = 0, empty = 0; const wrongRows = new Set();
    $$('#prob input[data-k]').forEach(inp => {
        const v = inp.value.trim(), exp = res[+inp.dataset.i][inp.dataset.k];
        total++; inp.classList.remove('good', 'bad');
        if (v === '') { empty++; inp.classList.add('bad'); wrongRows.add(+inp.dataset.i); return }
        if (/^-?\d+$/.test(v) && +v === exp) { ok++; inp.classList.add('good') }
        else { inp.classList.add('bad'); wrongRows.add(+inp.dataset.i) }
    });
    const avgIn = $('#pAvg'), m = avgOf(prob.out), v = avgIn.value.trim().replace(',', '.');
    total++; avgIn.classList.remove('good', 'bad');
    if (v === '') { empty++; avgIn.classList.add('bad') }
    else if (/^\d+(\.\d+)?$/.test(v) && Math.abs(parseFloat(v) - m.wt) < 0.011) { ok++; avgIn.classList.add('good') }
    else avgIn.classList.add('bad');
    const fb = $('#pfb'); fb.hidden = false;
    const perfect = ok === total;
    fb.innerHTML = `<b>${perfect ? 'Semua benar. Kerja bagus!' : `Benar ${ok} dari ${total} isian.`}</b>` +
        (perfect ? `<p>Coba soal baru dengan algoritma atau kondisi idle yang berbeda.</p>` :
            `<p>${empty ? `${empty} isian masih kosong. ` : ''}${wrongRows.size ? `Periksa kembali proses ${[...wrongRows].map(i => 'P' + (i + 1)).join(', ')}. ` : ''}Kolom hijau sudah benar, kolom merah perlu dicek ulang. Buka Lihat Pembahasan bila ingin melihat langkahnya.</p>`);
}
function showSolution() {
    const o = prob.out, box = $('#psol');
    box.hidden = false;
    box.innerHTML = `<div class="sol"><h4>Pembahasan</h4>
  ${miniGantt(o)}
  ${miniTable(o)}
  <details style="margin-top:18px"><summary>Rumus per proses</summary><div style="margin-top:14px">${formulaHTML(o)}</div></details>
  <details><summary>Keputusan CPU langkah demi langkah</summary><div style="margin-top:14px">${decisionHTML(o)}</div></details></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('#prob').addEventListener('click', e => {
    const b = e.target.closest('[data-pa]'); if (!b) return;
    const act = b.dataset.pa;
    if (act === 'check') checkProblem();
    else if (act === 'show') showSolution();
    else if (act === 'new') newProblem();
    else if (act === 'sim') {
        loadRows(prob.data.map(p => [p.at, p.bt, p.pr]), prob.q);
        $('#presetNote').textContent = 'Soal dari bagian Latihan.';
        choose(prob.alg); go('#input');
    }
});
$('#prob').addEventListener('input', e => { e.target.classList.remove('good', 'bad') });
$('#genBtn').addEventListener('click', newProblem);
wireTabs('#practiceTabs', '#practicePanels', t => { if (t === 'hitung' && !prob) newProblem() });

/* ---------- awal ---------- */
buildCards();
loadPreset('idle');
choose('fcfs');
buildLearn();
startQuiz();