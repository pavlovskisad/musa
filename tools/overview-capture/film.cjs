// Deterministic capture: the page's clock is frozen and stepped one frame at a time,
// and every CSS animation is paused and positioned by hand, so the frame rate of the
// result does not depend on how fast screenshots are taken.
const { chromium } = require('playwright'); const fs=require('fs');
const FPS=30, DAY=86400000, now=Date.now(), P=113.49;
const W='0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const mk=(id,tier,paid,disc,daysAgo,pos,claimed)=>({id,tier,pricePaid:paid,faceValue:paid*(1+disc),gramsTotal:paid*(1+disc)/P,goldPriceAtPurchase:P,purchasedAt:now-daysAgo*DAY,exitedAt:null,positionId:pos,gramsClaimed:claimed,walletAddress:W});
const units=[mk('flow01','flow',500,0.021,190,1,0.9),mk('vein01','vein',1000,0.044,216,2,0.35),mk('sprk01','spark',200,0.011,95,3,0.2)];
const scene=process.argv[2], secs=Number(process.argv[3]||8), H=Number(process.argv[4]||760);
(async()=>{
  const b=await chromium.launch({args:['--run-all-compositor-stages-before-draw','--disable-checker-imaging','--disable-threaded-animation','--disable-threaded-scrolling','--disable-image-animation-resync']});
  const ctx=await b.newContext({viewport:{width:390,height:H},deviceScaleFactor:2,locale:'en-US'});
  await ctx.addInitScript(([u,scr])=>{ window.__TICK=16; try{ localStorage.setItem('musa_user_id','demo'); localStorage.setItem('musa_units_demo',u); if(!sessionStorage.getItem('musa_screen')) sessionStorage.setItem('musa_screen',scr); }catch(e){} },[JSON.stringify(units), scene==='profile'?'profile':'home']);
  await ctx.route('**/api/units**', r=> r.request().method()==='GET' ? r.fulfill({json:units}) : r.fulfill({json:{ok:true}}));
  await ctx.route('**/api.coingecko.com/**', r=>r.fulfill({json:{'pax-gold':{usd:3530}}}));
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.clock.install({time:new Date(now)});
  await page.goto('http://localhost:5179/'); await page.waitForTimeout(3500);
  await page.evaluate(()=>document.fonts.ready);
  if(scene==='detail'){ await page.locator('button:has-text("Vein")').first().click(); await page.waitForTimeout(1500); }
  if(scene==='profile'){ await page.waitForTimeout(1500); }
  let vt=await page.evaluate(()=>Date.now()); await page.clock.pauseAt(vt+50); vt+=50;
  const sync=(t)=>page.evaluate((t)=>{ const m=(window.__am=window.__am||new WeakMap()); for(const a of document.getAnimations()){ if(!m.has(a)){ m.set(a,t-(a.currentTime||0)); a.pause(); } a.currentTime=t-m.get(a); } },t);
  const dir=`${__dirname}/film/${scene}`; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
  const n=Math.round(secs*FPS), t0=Date.now(); let retakes=0;
  for(let i=0;i<n;i++){
    const target=Math.round((i+1)*1000/FPS), prev=Math.round(i*1000/FPS);
    await page.clock.runFor(target-prev); vt+=target-prev; await sync(vt);
    // the state is frozen, so two identical captures in a row mean every layer has painted
    let a=await page.screenshot(), b=await page.screenshot(), tries=0;
    while(!a.equals(b) && tries<6){ a=b; b=await page.screenshot(); tries++; retakes++; }
    fs.writeFileSync(`${dir}/f${String(i).padStart(4,'0')}.png`, b);
  }
  console.log(scene,'frames',n,'took',((Date.now()-t0)/1000).toFixed(0)+'s','retakes',retakes,'errs',errs.slice(0,3));
  await b.close();
})();
