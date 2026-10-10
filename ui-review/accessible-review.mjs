// Shared behavior for generated review copies. Existing review assets stay intact.
export function accessibleReview(html) {
  const controller = `<script>
(() => {
  const seen = new Set();
  document.querySelectorAll('[id]').forEach(el => {
    const original = el.id;
    if (seen.has(original)) {
      let n = 2; while (seen.has(original + '-' + n)) n++;
      el.id = original + '-' + n;
      if(el.matches('section')) document.querySelectorAll('a[href]').forEach(link=>{if(link.getAttribute('href') === '#' + original)link.setAttribute('href','#'+el.id)});
      const scope = el.closest('svg');
      scope?.querySelectorAll('use').forEach(use => { if (use.getAttribute('href') === '#' + original) use.setAttribute('href', '#' + el.id) });
    }
    seen.add(el.id);
  });
  const slides = [...document.querySelectorAll('.slide')];
  if (!slides.length) return;
  const rail = document.querySelector('.rail'), bar = document.querySelector('.progress i');
  const counter = document.getElementById('counter') || document.getElementById('count');
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  let current = 0, frame = 0, previousFocus, oldOverflow;
  const popup = document.querySelector('.lightbox'), large = popup?.querySelector('img');
  const isolated = [];
  if (popup) { popup.hidden = true; popup.setAttribute('tabindex','-1'); }
  const dots = slides.map((slide, index) => {
    const link = document.createElement('a'); link.href = '#' + slide.id;
    link.textContent = slide.dataset.title || slide.dataset.label || 'Slide ' + (index + 1);
    link.title = link.textContent; return link;
  });
  rail?.replaceChildren(...dots);
  function sync() {
    frame = 0; current = 0;
    slides.forEach((slide, index) => { if (slide.getBoundingClientRect().top <= 120) current = index });
    dots.forEach((dot,index) => { dot.classList.toggle('active',index === current); if(index === current) dot.setAttribute('aria-current','location'); else dot.removeAttribute('aria-current') });
    if(counter) counter.textContent = String(current+1).padStart(2,'0') + ' / ' + String(slides.length).padStart(2,'0');
    if(bar) bar.style.width = (current+1)/slides.length*100 + '%';
  }
  const schedule = () => { if(!frame) frame = requestAnimationFrame(sync) };
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule);
  function go(index) { slides[Math.max(0,Math.min(slides.length-1,index))].scrollIntoView({behavior:reduced()?'instant':'smooth'}) }
  function hash() {
    let id; try { id = decodeURIComponent(location.hash.slice(1)) } catch { return }
    const target = document.getElementById(id);
    if(target && slides.includes(target)) target.scrollIntoView({behavior:'instant'});
    sync();
  }
  addEventListener('hashchange',hash);
  document.getElementById('prev')?.addEventListener('click',()=>go(current-1));
  document.getElementById('next')?.addEventListener('click',()=>go(current+1));
  function close() {
    if(!popup || popup.hidden) return;
    popup.hidden=true; popup.classList.remove('open'); large.removeAttribute('src');
    isolated.splice(0).forEach(([el,inert])=>{el.inert=inert}); document.body.style.overflow=oldOverflow;
    if(previousFocus?.isConnected) previousFocus.focus();
  }
  document.querySelectorAll('.zoom').forEach(button=>button.addEventListener('click',()=>{
    if(!popup || !large) return;
    previousFocus=button; oldOverflow=document.body.style.overflow;
    large.src=button.querySelector('img').src;large.alt=button.querySelector('img').alt;
    popup.hidden=false;popup.classList.add('open'); document.body.style.overflow='hidden';
    for(const el of document.body.children) if(el!==popup && !el.contains(popup)) { isolated.push([el,el.inert]);el.inert=true }
    popup.querySelector('button')?.focus();
  }));
  popup?.querySelector('button')?.addEventListener('click',close);
  popup?.addEventListener('click',e=>{if(e.target===popup)close()});
  addEventListener('keydown',e=>{
    if(popup && !popup.hidden) {
      if(e.key==='Escape'){e.preventDefault();close()}
      else if(e.key==='Tab'){e.preventDefault();popup.querySelector('button')?.focus()}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key))e.preventDefault();
      return;
    }
    if(e.target.closest('input,textarea,select,button,a,[contenteditable]') || e.ctrlKey || e.altKey || e.metaKey) return;
    if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();go(current+1)}
    if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(current-1)}
  });
  const root=document.documentElement, key=root.hasAttribute('data-mag-theme')?'magTheme':'theme';
  const theme=document.getElementById('theme') || document.getElementById('themeToggle');
  theme?.addEventListener('click',()=>{root.dataset[key]=root.dataset[key]==='dark'?'light':'dark';try{localStorage.setItem('ideaflow-accessible-review-theme',root.dataset[key])}catch{}});
  try{const saved=localStorage.getItem('ideaflow-accessible-review-theme');if(['light','dark'].includes(saved))root.dataset[key]=saved}catch{}
  hash();sync();
})();
</script>`
  // Replace the compact slideshow controller, preserving content and embedded images.
  html = html.replace(/<script>\s*const slides=\[[\s\S]*?<\/script>/g, '')
  return html.replace('</head>', `<style>.lightbox[hidden]{display:none!important}:where(button,a):focus-visible{outline:3px solid #8b5cf6;outline-offset:3px}.rail a{min-width:24px;min-height:24px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto;scroll-snap-type:none}*,*::before,*::after{animation:none!important;transition:none!important}}</style></head>`).replace('</body>',controller+'</body>')
}
