// Injected into the page for the recording only: tap marks, a sign-in sheet and a card sheet.
// These stand in for the Privy sign-in window and for a payment provider that is not connected yet.
(() => {
  const css = `
  .dm-tap{position:fixed;z-index:9999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;
    background:rgba(255,248,220,.20);border:1.5px solid rgba(255,248,220,.85);animation:dmTap .5s ease-out forwards}
  @keyframes dmTap{0%{transform:scale(.55);opacity:0}25%{opacity:1}100%{transform:scale(1.25);opacity:0}}
  .dm-back{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s ease}
  .dm-back.on{opacity:1}
  .dm-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9001;background:#161513;border-top:1px solid rgba(255,255,255,.14);
    border-radius:26px 26px 0 0;padding:14px 24px 36px;transform:translateY(105%);transition:transform .45s cubic-bezier(.2,.8,.2,1);color:var(--text)}
  .dm-sheet.on{transform:translateY(0)}
  .dm-grip{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.16);margin:0 auto 22px}
  .dm-top{display:flex;justify-content:space-between;align-items:center}
  .dm-label{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--text-dim)}
  .dm-tag{font:400 9px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);border:1px solid rgba(201,169,97,.45);border-radius:99px;padding:5px 9px 5px 11px}
  .dm-h{font:400 32px/1.05 'Old Standard TT',Georgia,serif;margin:12px 0 4px}
  .dm-sub{font-size:12px;color:var(--text-dim);margin-bottom:20px}
  .dm-field{height:54px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 16px;display:flex;align-items:center;
    font:400 15px/1 'IBM Plex Mono',monospace;background:rgba(255,255,255,.02);transition:border-color .25s ease}
  .dm-field.act{border-color:rgba(201,169,97,.7)}
  .dm-field .ph{color:rgba(255,255,255,.28)}
  .dm-field.act .v::after{content:'';display:inline-block;width:1.5px;height:17px;background:var(--gold);margin-left:2px;vertical-align:-3px}
  .dm-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .dm-btn{height:56px;border-radius:99px;background:var(--gold);color:#000;font-weight:500;letter-spacing:.025em;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:18px;font-size:16px;transition:background .3s ease}
  .dm-note{font-size:12px;line-height:1.5;color:var(--text-dim);margin-top:14px;text-align:center}
  .dm-code{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
  .dm-code div{height:58px;border:1px solid rgba(255,255,255,.14);border-radius:14px;display:flex;align-items:center;justify-content:center;font:400 22px/1 'IBM Plex Mono',monospace;transition:border-color .25s ease,color .25s ease}
  .dm-code div.f{border-color:rgba(201,169,97,.7)}
  .dm-code.ok div{border-color:var(--gold);color:var(--gold-bright)}
  .dm-step{transition:opacity .25s ease}
  .dm-step.off{opacity:0}
  .dm-ok{display:inline-block;width:18px;height:18px}
  `;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const D = (window.__demo = {});
  D.init = () => { if (!document.getElementById('dm-css')) { const s = el('style'); s.id = 'dm-css'; s.textContent = css; document.head.appendChild(s); } };
  D.find = (sel, text) => { const all = [...document.querySelectorAll(sel)]; const e = text ? all.find(x => x.textContent.trim().replace(/\s+/g, ' ').includes(text)) : all[0]; if (!e) return null; const r = e.getBoundingClientRect(); e.setAttribute('data-dm', '1'); D.last = e; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  D.tap = (x, y) => { D.init(); const t = el('div', 'dm-tap'); t.style.left = x + 'px'; t.style.top = y + 'px'; document.body.appendChild(t); };
  D.click = () => { if (D.last) D.last.click(); };
  D.sheet = (html) => { D.init(); D.close(true); D.back = el('div', 'dm-back'); D.sh = el('div', 'dm-sheet', '<div class="dm-grip"></div>' + html); document.body.append(D.back, D.sh); D.sh.getBoundingClientRect(); D.back.classList.add('on'); D.sh.classList.add('on'); };
  D.hide = () => { if (D.sh) { D.sh.classList.remove('on'); D.back.classList.remove('on'); } };
  D.close = () => { if (D.sh) { D.sh.remove(); D.back.remove(); D.sh = D.back = null; } document.querySelectorAll('.dm-tap').forEach(t => t.remove()); };
  D.q = (s) => D.sh.querySelector(s);
  D.set = (s, v) => { const f = D.q(s); f.innerHTML = '<span class="v">' + v + '</span>'; };
  D.act = (s) => { D.sh.querySelectorAll('.dm-field').forEach(f => f.classList.remove('act')); if (s) D.q(s).classList.add('act'); };
  D.pos = (s) => { const r = D.q(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const check = '<svg class="dm-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  D.login = () => D.sheet(`
    <div class="dm-step" id="s1">
      <div class="dm-label">Sign in</div>
      <div class="dm-h">Your email</div>
      <div class="dm-sub">We send a one-time code</div>
      <div class="dm-field" id="f-mail"><span class="ph">you@email.com</span></div>
      <div class="dm-btn" id="b-go">Continue</div>
      <div class="dm-note">A wallet is created for you at sign-in</div>
    </div>`);
  D.code = (mail) => { D.q('#s1').outerHTML = `
    <div class="dm-step" id="s2">
      <div class="dm-label">Check your email</div>
      <div class="dm-h">Enter the code</div>
      <div class="dm-sub">Sent to ${mail}</div>
      <div class="dm-code" id="code"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="dm-note">A wallet is created for you at sign-in</div>
    </div>`; };
  D.digit = (i, d) => { const c = D.q('#code').children[i]; c.textContent = d; c.classList.add('f'); };
  D.codeOk = () => D.q('#code').classList.add('ok');
  D.pay = (amount, what) => D.sheet(`
    <div class="dm-top"><div class="dm-label">Payment</div><div class="dm-tag">Demo</div></div>
    <div class="dm-h">${amount}</div>
    <div class="dm-sub">${what}</div>
    <div class="dm-field" id="f-card"><span class="ph">Card number</span></div>
    <div class="dm-row"><div class="dm-field" id="f-exp"><span class="ph">MM / YY</span></div><div class="dm-field" id="f-cvc"><span class="ph">CVC</span></div></div>
    <div class="dm-btn" id="b-pay">Pay ${amount}</div>`);
  D.btn = (html, ok) => { const b = D.q('#b-pay'); b.innerHTML = (ok ? check : '') + html; };
})();
