import { readFile, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const out = resolve(import.meta.dirname, 'idea-flow-visual-audit-2026.html')

const img = async path => {
  const full = resolve(root, path)
  const ext = extname(full).slice(1).replace('jpg', 'jpeg')
  return `data:image/${ext};base64,${(await readFile(full)).toString('base64')}`
}

const images = {
  currentMobile: await img('ui-review/current/mobile-dashboard.png'),
  currentStrategy: await img('ui-review/current/mobile-strategy.png'),
  currentControls: await img('ui-review/current/mobile-controls.png'),
  currentModal: await img('ui-review/current/mobile-add-idea.png'),
  currentCalm: await img('ui-review/current/mobile-calm-command.png'),
  currentLight: await img('ui-review/current/mobile-calm-light.png'),
  currentDesktop: await img('ui-review/current/desktop-current.png'),
  meridian: await img('ui-review/assets/meridian-2026.png'),
  aurora: await img('ui-review/assets/aurora-2026.png'),
  atlas: await img('ui-review/assets/atlas-2026.png'),
  ledger: await img('ui-review/assets/ledger-2026.png'),
  signal: await img('ui-review/assets/signal-2026.png'),
}

const benchmarks = [
  ['Productboard','Customer evidence connected to prioritisation; audience-specific roadmaps.','https://www.productboard.com/product-roadmap/'],
  ['Aha!','Deep suite hierarchy, idea-to-roadmap continuity, mature enterprise framing.','https://www.aha.io/suite-overview'],
  ['Canny','Extremely clear feedback → roadmap → changelog loop with low-friction public views.','https://canny.io/features'],
  ['Jira Product Discovery','Explicit scoring, flexible list/matrix/board views, delivery context kept visible.','https://www.atlassian.com/software/jira/product-discovery'],
  ['airfocus','Modular workspaces and custom views without losing a consistent object model.','https://airfocus.com/product/'],
  ['Craft.io','Lifecycle navigation, framework-led prioritisation, composed enterprise dashboards.','https://craft.io/'],
  ['ProdPad','Now–Next–Later clarity and an evidence-rich idea canvas that explains the why.','https://www.prodpad.com/'],
  ['ProductPlan','Boardroom-ready roadmaps and stakeholder-specific views with visual restraint.','https://www.productplan.com/'],
  ['Tempo Roadmaps','Roadmap storytelling, multiple views from one dataset, presentation-ready polish.','https://www.tempo.io/products/roadmaps'],
  ['IdeaScale','Stage-based innovation funnels, reporting confidence, enterprise trust cues.','https://ideascale.com/'],
  ['Brightidea','Strong programme hierarchy, portfolio scale, visible status and outcome tracking.','https://www.brightidea.com/index.html'],
  ['Linear','Exceptional information density, minimal chrome, fast states, precise typography.','https://linear.app/features'],
  ['Notion','Editorial calm, progressive disclosure, flexible databases without visual noise.','https://www.notion.com/en-gb/help/guides/using-notion-for-product-roadmaps'],
  ['Miro','Spatial overview, collaboration cues, direct manipulation and confident empty space.','https://miro.com/product-development/'],
  ['Fibery','Relational product context, custom views, clear connections across strategy and work.','https://fibery.com/product-management'],
  ['Asana','Approachable colour, legible ownership/status patterns, polished motion and onboarding.','https://asana.com/teams/product-managers'],
  ['ClickUp','High customisability, persistent view controls and compact operational dashboards.','https://clickup.com/product-planning'],
  ['Airtable','Data-rich interfaces made approachable through strong view, field and filter systems.','https://www.airtable.com/solutions/product'],
]

const benchHtml = benchmarks.map(([name, note, url], i) => `
  <a class="bench" href="${url}" target="_blank" rel="noreferrer">
    <span>${String(i + 1).padStart(2,'0')}</span><strong>${name}</strong><p>${note}</p><b>↗</b>
  </a>`).join('')

const themeData = [
  {
    id:'meridian', n:'01', name:'Meridian', subtitle:'Calm enterprise trust', image:images.meridian,
    mood:'Measured, credible and reassuring — the strongest fit for an HR initiative portfolio that must feel dependable before it feels fashionable.',
    palette:[['#123B38','Evergreen'],['#F5F7F3','Porcelain'],['#FFFFFF','Surface'],['#6AA89F','Sage'],['#D5A84C','Brass'],['#19302E','Ink']],
    type:'SF Pro / Geist · humanist rhythm · tabular scores', radius:'14px cards · 12px controls', depth:'1px sage rules · 0–8px ambient shadow',
    components:['Brass primary action; teal outline secondary','Quiet score chips and status pills','Flat white cards with strong typographic grouping','Line icons at one consistent 1.75px weight'],
    better:'Removes nested glass layers, clarifies action hierarchy, and turns the current Calm Command direction into a cohesive enterprise system rather than a colour treatment.',
    pick:'Recommended primary system'
  },
  {
    id:'aurora', n:'02', name:'Aurora', subtitle:'Luminous product intelligence', image:images.aurora,
    mood:'Focused, dimensional and contemporary — expressive enough to feel premium, disciplined enough for prolonged operational use.',
    palette:[['#0B1024','Midnight'],['#151D3A','Ink blue'],['#222B52','Panel'],['#8B7CFF','Violet'],['#55E3D0','Aqua'],['#F7F9FF','Text']],
    type:'Geist / Inter · geometric precision · compact hierarchy', radius:'16px shells · 12px controls', depth:'Selective blur · solid cards · directional glow',
    components:['Gradient reserved for the primary action','Frosted shell and modal; opaque content cards','Luminous score bars and status dots','High-contrast fields with restrained hairlines'],
    better:'Keeps the appeal of Luminous Glass while removing decorative haze behind data, reducing shadow stacking and improving long-session legibility.',
    pick:'Recommended alternate / dark system'
  },
  {
    id:'atlas', n:'03', name:'Atlas', subtitle:'Cobalt precision', image:images.atlas,
    mood:'Structured, analytical and highly legible — the most conventional enterprise SaaS direction and the easiest to scale across dense workflows.',
    palette:[['#102A43','Navy'],['#2563EB','Cobalt'],['#EEF5FF','Ice'],['#FFFFFF','Surface'],['#0891B2','Cyan'],['#F3B53F','Amber']],
    type:'IBM Plex Sans / Inter · tabular figures · crisp data hierarchy', radius:'12px cards · 10px fields', depth:'Near-flat surfaces · sparse 4px shadows',
    components:['Cobalt primary; amber only for recommendation','Compact progress bars and explicit ranks','Rectilinear segmented controls','Tighter desktop density with touch-safe mobile spacing'],
    better:'Normalises the mixed status palette, makes ranking data faster to scan and creates the clearest bridge from mobile utility to enterprise desktop operations.',
    pick:'Safest enterprise scale-up'
  },
  {
    id:'ledger', n:'04', name:'Ledger', subtitle:'Editorial strategy', image:images.ledger,
    mood:'Considered, strategic and human — a distinctive alternative for stakeholders who want the product to feel like a decision brief, not another task manager.',
    palette:[['#F5F0E6','Paper'],['#E9E0D0','Parchment'],['#22211F','Carbon'],['#294D3F','Forest'],['#C9583B','Vermilion'],['#C6943D','Ochre']],
    type:'Editorial serif display + neutral UI sans · small caps sections', radius:'10px cards · 8px controls', depth:'Fine warm rules · almost no shadow',
    components:['Forest primary actions; ochre recommendation','Document-like spacing and dividers','Serif section hierarchy, sans operational copy','Warm paper surfaces with strict contrast'],
    better:'Creates hierarchy through typography instead of containers, reduces “card inside card” repetition and gives strategy pages a more authored, executive quality.',
    pick:'Most differentiated brand direction'
  },
  {
    id:'signal', n:'05', name:'Signal', subtitle:'Graphite performance', image:images.signal,
    mood:'Fast, decisive and operational — designed for power users who live in prioritisation data and need immediate status recognition.',
    palette:[['#111416','Graphite'],['#1B2023','Raised'],['#242B2E','Panel'],['#B9F34A','Signal lime'],['#3ED7E5','Cyan'],['#FF7A68','Coral']],
    type:'Inter + Geist Mono · tabular data · condensed labels', radius:'8–12px', depth:'Crisp separators · no broad shadow',
    components:['Lime only for primary and active states','Cyan information; coral risk','Compact technical icon set','Dense cards with reliable 44px interaction rows'],
    better:'Makes score, status and action semantics unmistakable, eliminates decorative gradients and supports a future keyboard/command-driven desktop mode.',
    pick:'Best for expert / operations mode'
  },
]

const themeSections = themeData.map((t, i) => `
<section class="slide theme-slide" id="${t.id}" data-title="${t.name}">
  <div class="theme-head">
    <div><span class="eyebrow">Theme ${t.n}</span><h2>${t.name}</h2><p>${t.subtitle}</p></div>
    <span class="recommend">${t.pick}</span>
  </div>
  <div class="theme-grid">
    <figure class="mockup"><img src="${t.image}" alt="${t.name} high-fidelity mobile and desktop IdeaFlow mockup board"><figcaption>Dashboard · Strategy · Groups · Add idea · Desktop</figcaption></figure>
    <aside class="theme-notes">
      <p class="lead">${t.mood}</p>
      <div class="swatches">${t.palette.map(([c,n])=>`<span><i style="--sw:${c}"></i><b>${n}</b><small>${c}</small></span>`).join('')}</div>
      <dl><div><dt>Typography</dt><dd>${t.type}</dd></div><div><dt>Radius</dt><dd>${t.radius}</dd></div><div><dt>Depth</dt><dd>${t.depth}</dd></div></dl>
      <ul>${t.components.map(x=>`<li>${x}</li>`).join('')}</ul>
      <div class="why"><strong>Why it is better</strong><p>${t.better}</p></div>
    </aside>
  </div>
</section>`).join('')

const html = `<!doctype html>
<html lang="en" data-mag-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark light"><title>IdeaFlow — Visual Audit & Theme Directions 2026</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-snap-type:y mandatory}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background-color .25s,color .25s;overflow-x:hidden}
:root{--bg:#090d16;--surface:#111826;--surface2:#171f30;--text:#f3f6fb;--muted:#95a2b7;--line:#283247;--accent:#8f80ff;--mint:#65e7d2;--warm:#e4b85a;--shadow:0 28px 80px #0007;--radius:22px}
html[data-mag-theme="light"]{--bg:#f3f4f1;--surface:#fff;--surface2:#e9ece8;--text:#16201f;--muted:#63716f;--line:#d3d9d5;--accent:#5d50d7;--mint:#2f887e;--warm:#a67819;--shadow:0 28px 80px #263b3020}
a{color:inherit}.slide{position:relative;min-height:100svh;padding:clamp(74px,8vw,110px) clamp(24px,7vw,112px) 90px;scroll-snap-align:start;border-bottom:1px solid var(--line);overflow:hidden}.slide>*{position:relative;z-index:1}.slide:before{content:"";position:absolute;inset:-20%;background:radial-gradient(circle at 82% 18%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 31%),radial-gradient(circle at 8% 80%,color-mix(in srgb,var(--mint) 9%,transparent),transparent 27%);pointer-events:none}.eyebrow{display:block;color:var(--mint);font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase}h1,h2,h3,p{margin-top:0}h1{max-width:980px;margin:.2em 0;font-size:clamp(52px,8vw,118px);line-height:.88;letter-spacing:-.065em}h2{margin:.08em 0;font-size:clamp(42px,6vw,82px);line-height:.95;letter-spacing:-.055em}h3{font-size:18px;letter-spacing:-.02em}.lede{max-width:760px;color:var(--muted);font-size:clamp(18px,2vw,27px);line-height:1.35}.gradient-text{background:linear-gradient(90deg,var(--text),var(--accent),var(--mint));-webkit-background-clip:text;color:transparent}.cover{display:flex;align-items:flex-end}.cover-grid{width:100%;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.55fr);gap:8vw;align-items:end}.cover-meta{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden}.cover-meta div{padding:22px;background:var(--surface)}.cover-meta b{display:block;font-size:28px}.cover-meta span{color:var(--muted);font-size:12px}.mark{display:grid;place-items:center;width:58px;height:58px;margin-bottom:28px;border-radius:18px;background:linear-gradient(145deg,#8e7cff,#5c4ccf 55%,#4ad9c2);box-shadow:0 18px 40px #6757e855;font-size:28px}.cover-kicker{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.chip{padding:8px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:color-mix(in srgb,var(--surface) 80%,transparent);font-size:12px}.topbar{position:fixed;inset:0 0 auto;z-index:100;display:flex;align-items:center;gap:14px;height:58px;padding:0 max(16px,env(safe-area-inset-left));border-bottom:1px solid color-mix(in srgb,var(--line) 75%,transparent);background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(20px) saturate(150%)}.topbar strong{font-size:13px}.topbar .progress{height:2px;flex:1;background:var(--line);overflow:hidden}.topbar .progress i{display:block;width:0;height:100%;background:linear-gradient(90deg,var(--accent),var(--mint));transition:.25s}.icon-btn{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--line);border-radius:12px;color:var(--text);background:var(--surface);cursor:pointer}.rail{position:fixed;z-index:90;left:16px;top:50%;transform:translateY(-50%);display:grid;gap:7px}.rail a{width:7px;height:7px;border-radius:99px;background:var(--line);text-indent:-999px;overflow:hidden;transition:.2s}.rail a.active{height:28px;background:var(--accent)}.pager{position:fixed;z-index:100;right:18px;bottom:18px;display:flex;gap:8px}.pager button{height:42px;padding:0 16px;border:1px solid var(--line);border-radius:13px;color:var(--text);background:color-mix(in srgb,var(--surface) 86%,transparent);backdrop-filter:blur(16px);font-weight:700;cursor:pointer}.section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.7fr);gap:8vw;align-items:end;margin-bottom:36px}.section-head>p{margin:0;color:var(--muted);font-size:17px}.verdict-grid,.audit-grid,.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{padding:22px;border:1px solid var(--line);border-radius:var(--radius);background:color-mix(in srgb,var(--surface) 90%,transparent);box-shadow:0 10px 30px #0001}.card .num{display:block;margin-bottom:28px;color:var(--accent);font:700 12px ui-monospace,SFMono-Regular,monospace}.card h3{margin-bottom:8px}.card p,.card li{color:var(--muted)}.score{display:flex;align-items:center;gap:14px}.score b{font-size:54px;line-height:1;color:var(--warm)}.score span{max-width:170px;color:var(--muted)}.screen-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.screen-strip figure,.compare figure{margin:0;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--surface)}.screen-strip img{width:100%;height:300px;object-fit:cover;display:block}.screen-strip figcaption,.compare figcaption,.mockup figcaption{padding:10px 13px;color:var(--muted);font-size:11px}.audit-list{display:grid;gap:10px}.audit-row{display:grid;grid-template-columns:36px 160px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}.audit-row span{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--surface2);color:var(--accent);font-weight:800}.audit-row strong{font-size:13px}.audit-row p{margin:0;color:var(--muted);font-size:13px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}.compare img{width:100%;height:360px;object-fit:cover;display:block}.mobile-callout{padding:22px;border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 20%,var(--surface)),color-mix(in srgb,var(--mint) 12%,var(--surface)));border:1px solid var(--line)}.mobile-callout strong{display:block;font-size:20px}.mobile-callout p{margin:6px 0 0;color:var(--muted)}.benchmark-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.bench{position:relative;display:grid;grid-template-columns:30px 1fr auto;gap:7px 10px;min-height:118px;padding:15px;border:1px solid var(--line);border-radius:16px;background:var(--surface);text-decoration:none;transition:.18s}.bench:hover{transform:translateY(-2px);border-color:var(--accent)}.bench>span{color:var(--muted);font:700 10px ui-monospace,SFMono-Regular,monospace}.bench strong{font-size:13px}.bench p{grid-column:2/4;margin:0;color:var(--muted);font-size:11px;line-height:1.4}.bench b{color:var(--accent)}.pattern-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.pattern-row span{padding:8px 11px;border-radius:999px;background:var(--surface2);color:var(--muted);font-size:11px}.theme-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}.theme-head h2{font-size:clamp(52px,6vw,86px)}.theme-head p{margin:0;color:var(--muted);font-size:20px}.recommend{padding:9px 12px;border:1px solid var(--line);border-radius:999px;color:var(--mint);font:700 10px ui-monospace,SFMono-Regular,monospace;text-transform:uppercase;letter-spacing:.08em}.theme-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(300px,.65fr);gap:22px;align-items:start}.mockup{margin:0;border:1px solid var(--line);border-radius:24px;overflow:hidden;background:var(--surface);box-shadow:var(--shadow)}.mockup img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}.theme-notes{display:grid;gap:16px}.theme-notes .lead{color:var(--muted);font-size:16px}.swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.swatches span{min-width:0}.swatches i{display:block;height:34px;border:1px solid #ffffff20;border-radius:9px;background:var(--sw)}.swatches b,.swatches small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.swatches b{margin-top:5px;font-size:10px}.swatches small{color:var(--muted);font:9px ui-monospace,SFMono-Regular,monospace}.theme-notes dl{display:grid;gap:1px;margin:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--line)}.theme-notes dl div{padding:10px 12px;background:var(--surface)}.theme-notes dt{color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.12em}.theme-notes dd{margin:2px 0 0;font-size:11px}.theme-notes ul{margin:0;padding-left:18px;color:var(--muted);font-size:12px}.theme-notes li+li{margin-top:6px}.why{padding:15px;border-radius:15px;background:var(--surface2);border-left:3px solid var(--accent)}.why strong{font-size:12px}.why p{margin:5px 0 0;color:var(--muted);font-size:12px}.decision{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:24px}.pair{padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,color-mix(in srgb,#123b38 40%,var(--surface)),color-mix(in srgb,#8b7cff 22%,var(--surface)));box-shadow:var(--shadow)}.pair h3{font-size:34px}.pair p{color:var(--muted)}.roadmap{display:grid;gap:1px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--line)}.roadmap div{padding:18px;background:var(--surface)}.roadmap span{color:var(--accent);font:700 10px ui-monospace,SFMono-Regular,monospace}.roadmap strong{display:block;margin:4px 0}.roadmap p{margin:0;color:var(--muted);font-size:12px}.source-note{margin-top:18px;color:var(--muted);font-size:11px}.closing{display:flex;align-items:center}.closing h2{max-width:900px}.closing p{max-width:650px;color:var(--muted);font-size:18px}.mini-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:28px}.mini-nav a{padding:9px 12px;border:1px solid var(--line);border-radius:12px;text-decoration:none;font-size:12px;background:var(--surface)}
@media(max-width:980px){.slide{padding:76px 24px 84px}.rail{display:none}.cover-grid,.section-head,.theme-grid,.decision{grid-template-columns:1fr}.verdict-grid,.audit-grid,.principles,.benchmark-grid{grid-template-columns:repeat(2,1fr)}.screen-strip{grid-template-columns:repeat(2,1fr)}.theme-notes{grid-template-columns:1fr 1fr}.theme-notes .lead,.theme-notes .why{grid-column:1/-1}}
@media(max-width:640px){html{scroll-snap-type:none}.topbar strong{display:none}.slide{min-height:auto;padding:76px 15px 84px}.cover{min-height:100svh}.cover-grid{gap:38px}.cover-meta{grid-template-columns:1fr 1fr}.verdict-grid,.audit-grid,.principles,.benchmark-grid,.compare{grid-template-columns:1fr}.screen-strip{grid-template-columns:1fr 1fr}.screen-strip img{height:230px}.audit-row{grid-template-columns:32px 1fr}.audit-row p{grid-column:2}.theme-head{align-items:start;flex-direction:column}.theme-grid{gap:14px}.mockup img{aspect-ratio:auto;min-height:260px;object-fit:cover}.theme-notes{grid-template-columns:1fr}.theme-notes .lead,.theme-notes .why{grid-column:auto}.recommend{align-self:flex-start}.pager{right:10px;bottom:10px}.pager button{height:40px;padding:0 13px}.compare img{height:260px}.benchmark-grid{gap:7px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.bench{transition:none}}
</style>
</head>
<body>
<header class="topbar"><strong>IdeaFlow · Visual audit 2026</strong><div class="progress"><i></i></div><span id="counter">01 / 13</span><button class="icon-btn" id="themeToggle" aria-label="Toggle magazine colour mode">◐</button></header>
<nav class="rail" aria-label="Slide navigation"></nav><div class="pager"><button id="prev">← Previous</button><button id="next">Next →</button></div>

<main>
<section class="slide cover" id="cover" data-title="Cover"><div class="cover-grid"><div><div class="mark">◇</div><span class="eyebrow">Mobile-first product design review · 12 August 2026</span><h1><span class="gradient-text">IdeaFlow</span><br>Visual System Study</h1><p class="lede">A current-state audit, 18-product benchmark, and five high-fidelity directions for a more coherent, premium HR initiative tracker.</p><div class="cover-kicker"><span class="chip">Production v1.4.0 reviewed</span><span class="chip">390 × 844 mobile focus</span><span class="chip">Light + dark states</span><span class="chip">Stakeholder-ready concepts</span></div></div><div class="cover-meta"><div><b>18</b><span>official product benchmarks</span></div><div><b>5</b><span>complete visual systems</span></div><div><b>7</b><span>current screens / states audited</span></div><div><b>1</b><span>recommended switchable pair</span></div></div></div></section>

<section class="slide" id="verdict" data-title="Executive verdict"><div class="section-head"><div><span class="eyebrow">Step 1 · Current UI analysis</span><h2>Better shell.<br>Now refine the system.</h2></div><p>The latest mobile work solved the most visible usability failures. The next quality jump comes from reducing nested emphasis, tightening semantic colour, and giving mobile and desktop their own density models.</p></div><div class="verdict-grid"><article class="card"><span class="num">01 · Strongest gain</span><h3>The top row is finally mobile-native</h3><p>Brand, add and overflow now fit one safe-area-aware row. Secondary controls move into a bottom sheet, removing the previous two-row command cluster.</p></article><article class="card"><span class="num">02 · Core issue</span><h3>Everything still wants to be a card</h3><p>Header, switcher, recommendation, column, item and navigation surfaces all compete through radius, borders and depth. The result is cohesive, but visually over-contained.</p></article><article class="card"><span class="num">03 · Strategic gap</span><h3>Mobile and desktop share too much chrome</h3><p>The mobile tab bar is now appropriate. On desktop, the same bottom navigation and card grammar consume space that a side rail, denser tables and richer comparison tools could use.</p></article></div><div class="score" style="margin-top:28px"><b>7.4</b><span>Current visual professionalism after the v1.4.0 mobile-shell improvements.</span></div></section>

<section class="slide" id="evidence" data-title="Live UI evidence"><div class="section-head"><div><span class="eyebrow">Observed production states</span><h2>What is working now</h2></div><p>Captured from the live application in a 390 × 844 iframe and at desktop width. These are the baseline—not the earlier pre-redesign screens.</p></div><div class="screen-strip"><figure><img src="${images.currentMobile}" alt="Current Luminous Glass mobile dashboard"><figcaption>Luminous Glass · mobile dashboard</figcaption></figure><figure><img src="${images.currentStrategy}" alt="Current mobile strategy ranking"><figcaption>Strategy · ranked active ideas</figcaption></figure><figure><img src="${images.currentControls}" alt="Current mobile app controls bottom sheet"><figcaption>Overflow · workspace and app controls</figcaption></figure><figure><img src="${images.currentModal}" alt="Current add idea modal"><figcaption>Add idea · long-form modal</figcaption></figure></div><div class="mobile-callout" style="margin-top:16px"><strong>Mobile shell verdict: structurally sound.</strong><p>68px top row, 44px actions, a borderless edge-to-edge tab bar, 16px form inputs and safe-area awareness are the right foundations. Preserve these in every direction.</p></div></section>

<section class="slide" id="audit" data-title="Detailed audit"><div class="section-head"><div><span class="eyebrow">Visual system audit</span><h2>Strengths and friction</h2></div><p>The app is already coherent enough to benefit from refinement rather than wholesale restructuring. The findings below separate brand-system problems from interaction and density problems.</p></div><div class="audit-list">
<div class="audit-row"><span>✓</span><strong>Layout structure</strong><p>Clear five-part workflow and a strong Build Next narrative. Mobile stacking is sensible; desktop needs a purpose-built navigation and density mode.</p></div>
<div class="audit-row"><span>!</span><strong>Colour system</strong><p>Both themes have useful tokens, but green actions, violet selection, teal edges, orange age/status and emoji colour create competing semantic channels.</p></div>
<div class="audit-row"><span>!</span><strong>Typography</strong><p>Good system-font legibility, yet too many labels sit between 9–14px at similar bold weights. Uppercase micro-labels and tiny score chips work harder than necessary.</p></div>
<div class="audit-row"><span>✓</span><strong>Buttons</strong><p>Mobile targets are now 44px and the top-level actions are simplified. Primary emphasis still shifts between green, theme accent and warm accent depending on context.</p></div>
<div class="audit-row"><span>!</span><strong>Cards & depth</strong><p>The left accent edge is useful. Repeated rounded shells, borders and shadows create nested-card fatigue—especially Glass on desktop and long mobile lists.</p></div>
<div class="audit-row"><span>!</span><strong>Icons</strong><p>The custom line icon family is cleaner, but it coexists with emoji for status, time and category. Emoji rendering changes by platform and weakens enterprise consistency.</p></div>
<div class="audit-row"><span>!</span><strong>Forms & modals</strong><p>Inputs are iOS-safe and comfortably sized. The long add form extends well below the fold without a persistent save/cancel action region or progressive sections.</p></div>
<div class="audit-row"><span>!</span><strong>States</strong><p>Active and hover states are visible; focus treatment is strongest on fields and less systematic on custom controls. Colour carries too much of the active-state burden.</p></div>
<div class="audit-row"><span>⚙</span><strong>System consistency</strong><p>Two overlapping mobile media blocks currently resolve through cascade order. It works, but increases regression risk and makes future spacing changes harder to reason about.</p></div>
</div></section>

<section class="slide" id="responsive" data-title="Mobile and desktop"><div class="section-head"><div><span class="eyebrow">Responsive behaviour</span><h2>One product.<br>Two density models.</h2></div><p>Premium responsive SaaS does not merely shrink the desktop. It preserves the same object model while changing navigation, batch actions, information disclosure and comparison density.</p></div><div class="compare"><figure><img src="${images.currentCalm}" alt="Current Calm Command mobile dashboard"><figcaption>Mobile · correct command row, but repeated container styling and tall cards lengthen scanning.</figcaption></figure><figure><img src="${images.currentDesktop}" alt="Current desktop dashboard"><figcaption>Desktop · attractive board, but mobile bottom tabs and wide floating chrome underuse the canvas.</figcaption></figure></div><div class="principles" style="margin-top:14px"><article class="card"><h3>Mobile</h3><p>Thumb zones, sticky contextual actions, progressive disclosure, 44px targets, one-column prioritisation.</p></article><article class="card"><h3>Desktop</h3><p>Left rail, denser comparison views, persistent filters, keyboard shortcuts, multi-select actions.</p></article><article class="card"><h3>Shared</h3><p>Same scoring language, tokens, icon family, object states, copy hierarchy and trustworthy motion.</p></article></div></section>

<section class="slide" id="benchmarks" data-title="Competitive benchmark"><div class="section-head"><div><span class="eyebrow">Step 2 · Competitive benchmarking</span><h2>18 products.<br>Eight premium patterns.</h2></div><p>Official product pages were reviewed for current positioning, view systems and interaction priorities. Visual observations are design analysis rather than vendor claims.</p></div><div class="benchmark-grid">${benchHtml}</div><div class="pattern-row"><span>One dominant action</span><span>Audience-specific views</span><span>Progressive disclosure</span><span>Quiet, semantic colour</span><span>Dense but aligned tables</span><span>Persistent filters</span><span>Purpose-built dark mode</span><span>Micro-interactions that confirm state</span></div><p class="source-note">Sources accessed 12 August 2026. Open any benchmark card for the supporting official page.</p></section>

${themeSections}

<section class="slide" id="decision" data-title="Recommendation"><div class="section-head"><div><span class="eyebrow">Recommendation</span><h2>Choose a pair,<br>not a compromise.</h2></div><p>One visual system should carry everyday trust; the second can offer a more expressive dark workspace without changing the product’s interaction grammar.</p></div><div class="decision"><div class="pair"><span class="eyebrow">Recommended switchable system</span><h3>Meridian by day.<br>Aurora by night.</h3><p>Meridian is the strongest default for HR and leadership audiences: calm, legible and credible. Aurora preserves the current product’s luminous identity for users who prefer a richer dark environment. Keep component geometry, spacing, icons and semantic states shared; switch only surface, colour and depth tokens.</p><div class="cover-kicker"><span class="chip">Shared 8pt spacing</span><span class="chip">Shared icon family</span><span class="chip">Shared status semantics</span><span class="chip">Theme-specific surfaces</span></div></div><div class="roadmap"><div><span>PHASE 01</span><strong>Unify foundations</strong><p>Remove duplicate mobile rules; define spacing, type, radius, motion and semantic-colour tokens.</p></div><div><span>PHASE 02</span><strong>Rebuild the core shell</strong><p>Keep the mobile header/tab pattern. Introduce a desktop side rail and persistent filter bar.</p></div><div><span>PHASE 03</span><strong>Refine high-use flows</strong><p>Compact cards, sticky modal actions, clearer batch selection, richer Groups overview.</p></div><div><span>PHASE 04</span><strong>Validate</strong><p>Test 320/390/430px iOS sizes, keyboard focus, contrast, reduced motion and long-content states.</p></div></div></div></section>

<section class="slide closing" id="close" data-title="Close"><div><span class="eyebrow">End of study</span><h2>The product no longer needs more decoration. It needs <span class="gradient-text">stronger editorial control.</span></h2><p>Preserve the improved mobile shell. Reduce nested emphasis. Make colour semantic. Let typography and spacing carry more of the hierarchy. Then scale the same object model into a true desktop workspace.</p><div class="mini-nav"><a href="#meridian">Review Meridian</a><a href="#aurora">Review Aurora</a><a href="#benchmarks">Open benchmarks</a><a href="#cover">Back to cover</a></div></div></section>
</main>
<script>
const slides=[...document.querySelectorAll('.slide')],rail=document.querySelector('.rail'),bar=document.querySelector('.progress i'),counter=document.querySelector('#counter');
slides.forEach((s,i)=>{const a=document.createElement('a');a.href='#'+s.id;a.textContent=s.dataset.title;a.title=s.dataset.title;rail.appendChild(a)});const dots=[...rail.children];let current=0;
function sync(){const mid=scrollY+innerHeight*.48;let best=0;slides.forEach((s,i)=>{if(s.offsetTop<=mid)best=i});current=best;dots.forEach((d,i)=>d.classList.toggle('active',i===current));counter.textContent=String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');bar.style.width=((current+1)/slides.length*100)+'%'}
addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync);sync();
function go(n){slides[Math.max(0,Math.min(slides.length-1,n))].scrollIntoView({behavior:'smooth'})}document.querySelector('#prev').onclick=()=>go(current-1);document.querySelector('#next').onclick=()=>go(current+1);addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight','PageDown'].includes(e.key))go(current+1);if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key))go(current-1)});
const rootEl=document.documentElement,toggle=document.querySelector('#themeToggle');toggle.onclick=()=>{const next=rootEl.dataset.magTheme==='dark'?'light':'dark';rootEl.dataset.magTheme=next;localStorage.setItem('ideaflow-audit-theme',next)};const saved=localStorage.getItem('ideaflow-audit-theme');if(saved)rootEl.dataset.magTheme=saved;else if(matchMedia('(prefers-color-scheme:light)').matches)rootEl.dataset.magTheme='light';
</script>
</body></html>`

await writeFile(out, html)
console.log(out)
