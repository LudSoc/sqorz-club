// Crawl annuaire FFC (clubs BMX : nom officiel + ville + id) — usage unique, /tmp only.
const fs = require('fs');
const path = require('path');
const OUT = '/tmp/opencode/ffc-clubs.json';
const CACHE = '/tmp/opencode/ffc-cache.json';

const REGIONS = [
  'auvergne-rhone-alpes', 'bourgogne-franche-comte', 'bretagne', 'centre-val-de-loire',
  'corse', 'grand-est', 'hauts-de-france', 'ile-de-france', 'normandie',
  'nouvelle-aquitaine', 'occitanie', 'pays-de-la-loire', 'provence-alpes-cote-dazur',
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* premier run */ }

async function getPage(region, page) {
  const key = `${region}|${page}`;
  if (cache[key]) return cache[key];
  const url = `https://velo.ffc.fr/wp-json/sn/cpt/clubs?region=${region}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const data = await res.json();
  cache[key] = data;
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  await sleep(250);
  return data;
}

(async () => {
  const clubs = [];
  for (const region of REGIONS) {
    let page = 1, maxPages = 1;
    for (;;) {
      let data;
      try { data = await getPage(region, page); }
      catch (e) { console.error(`  ! ${region} p${page} : ${e.message}`); break; }
      if (page === 1) maxPages = Math.min(data.max_num_pages || 1, 40);
      const items = (data.committees || []).flatMap(c => (c.items || []).map(it => ({ ...it, _committee: c.title })));
      if (!items.length) break;
      for (const it of items) {
        const ed = it.extra_data || {};
        const discs = (ed.disciplines || []).map(d => d.slug);
        if (!discs.includes('bmx')) continue;
        const addr = String(ed.address || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const m = addr.match(/(\d{5})\s+(.+?)\s*$/);
        clubs.push({
          title: it.post_title, city: m ? m[2].trim() : null, cp: m ? m[1] : null,
          address: addr, id_ffc: ed.id_ffc || null, region,
          disciplines: discs,
        });
      }
      console.log(`${region} p${page}/${maxPages} : ${items.length} items (${clubs.length} BMX au total)`);
      if (page >= maxPages) break;
      page++;
    }
  }
  // dédup par id_ffc (un club peut apparaître 2 fois : ex. comité + région)
  const seen = new Map();
  for (const c of clubs) {
    const k = c.id_ffc || c.title;
    if (!seen.has(k)) seen.set(k, c);
  }
  const out = [...seen.values()];
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`\n${out.length} clubs BMX uniques → ${OUT}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
