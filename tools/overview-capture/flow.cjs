// Records the sign-in flow and the new-order flow in one session, frame by frame, with the page clock frozen.
const { chromium } = require('playwright'); const fs=require('fs');
const FPS=30, H=760, now=Date.now();
const W='0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const limit=Number(process.argv[2]||0); // stop early for a quick look
(async()=>{
  const b=await chromium.launch({args:['--run-all-compositor-stages-before-draw','--disable-checker-imaging','--disable-threaded-animation','--disable-threaded-scrolling','--disable-image-animation-resync']});
  const ctx=await b.newContext({viewport:{width:390,height:H},deviceScaleFactor:2,locale:'en-US'});
  await ctx.addInitScript(()=>{ window.__TICK=16; });
  await ctx.addInitScript({path:__dirname+'/demo-ui.js'});
  let release; const gate=new Promise(r=>release=r);
  await ctx.route('**/api/units**', async r=>{ if(r.request().method()==='GET') return r.fulfill({json:[]}); if(r.request().method()==='POST'){ await gate; return r.fulfill({json:{positionId:1,txHash:'0xabc',walletAddress:W}}); } return r.fulfill({json:{ok:true}}); });
  await ctx.route('**/api.coingecko.com/**', r=>r.fulfill({json:{'pax-gold':{usd:3530}}}));
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('dialog',d=>{errs.push('dialog '+d.message()); d.dismiss();});
  await page.clock.install({time:new Date(now)});
  await page.goto('http://localhost:5179/?anon'); await page.waitForTimeout(4500);
  await page.evaluate(()=>document.fonts.ready);
  let vt=await page.evaluate(()=>Date.now()); await page.clock.pauseAt(vt+50); vt+=50;
  const sync=(t)=>page.evaluate((t)=>{ const m=(window.__am=window.__am||new WeakMap()); for(const a of document.getAnimations()){ if(!m.has(a)){ m.set(a,t-(a.currentTime||0)); a.pause(); } a.currentTime=t-m.get(a); } },t);
  let clip='login', idx=0, total=0, retakes=0; const counts={};
  const setClip=(c)=>{ counts[clip]=idx; clip=c; idx=0; const d=`${__dirname}/film/${c}`; fs.rmSync(d,{recursive:true,force:true}); fs.mkdirSync(d,{recursive:true}); };
  setClip('login');
  const frames=async(n)=>{ for(let k=0;k<n;k++){ if(limit&&total>=limit) throw new Error('limit');
      const target=Math.round((total+1)*1000/FPS), prev=Math.round(total*1000/FPS);
      await page.clock.runFor(target-prev); vt+=target-prev; await sync(vt);
      let a=await page.screenshot(), c=await page.screenshot(), t=0;
      while(!a.equals(c)&&t<6){ a=c; c=await page.screenshot(); t++; retakes++; }
      fs.writeFileSync(`${__dirname}/film/${clip}/f${String(idx).padStart(4,'0')}.png`,c); idx++; total++; } };
  const D=(fn,...a)=>page.evaluate(([fn,a])=>window.__demo[fn](...a),[fn,a]);
  // show a tap mark on an app element, then click it a moment later
  const tapApp=async(sel,text,click=true)=>{ const p=await D('find',sel,text); if(!p) throw new Error('not found: '+sel+' '+text); await D('tap',p.x,p.y); await frames(5); if(click) await D('click'); };
  const tapSheet=async(sel)=>{ const p=await D('pos',sel); await D('tap',p.x,p.y); await frames(5); };
  const type=async(sel,text,per=2,fmt=x=>x)=>{ await D('act',sel); await frames(4); for(let i=1;i<=text.length;i++){ await D('set',sel,fmt(text.slice(0,i))); await frames(per); } };
  try{
    // ---- clip 1: sign in ----
    await frames(40);
    await page.evaluate(()=>{ window.__onLogin=()=>window.__demo.login(); });
    await tapApp('button','Begin');
    await frames(22);
    await type('#f-mail','demo@example.com',2);
    await frames(10);
    await tapSheet('#b-go'); await D('code','demo@example.com'); await frames(22);
    const code='482916'; for(let i=0;i<6;i++){ await D('digit',i,code[i]); await frames(i<5?5:8); }
    await D('codeOk'); await frames(16);
    await D('hide'); await frames(8);
    await page.evaluate(()=>window.__setAuth(true)); await frames(10); await D('close');
    await frames(80);
    // ---- clip 2: new order ----
    setClip('order');
    await frames(30);
    await tapApp('button','New mine'); await frames(60);
    await tapApp('button','A year of patient'); await frames(50);
    await tapApp('button','$500'); await frames(34);
    await tapApp('button','Buy Flow',false);
    await D('pay','$500.00','Flow · 12 months'); await frames(22);
    const grp=s=>s.replace(/(.{4})(?=.)/g,'$1 ');
    await type('#f-card','4242424242424242',2,grp);
    await type('#f-exp','1228',2,s=>s.length>2?s.slice(0,2)+' / '+s.slice(2):s);
    await type('#f-cvc','•••',2);
    await D('act',null); await frames(10);
    await tapSheet('#b-pay'); await D('btn','Processing'); await frames(24);
    await D('btn','Paid',true); await frames(20);
    await D('hide'); await frames(12);
    await D('find','button','Buy Flow'); await D('click'); await frames(4); await D('close');
    await frames(66);
    release(); await frames(170);
  }catch(e){ if(e.message!=='limit') { console.log('ERROR',e.message); } }
  counts[clip]=idx;
  console.log('frames',JSON.stringify(counts),'retakes',retakes,'errs',errs.slice(0,4));
  await b.close();
})();
