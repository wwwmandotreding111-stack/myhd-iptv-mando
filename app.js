(() => {
 const cfg=window.MYHD_CONFIG||{},grid=document.getElementById("plansGrid"),CART_KEY="myhd_cart";
 document.getElementById("year").textContent=new Date().getFullYear();
 const wa=document.getElementById("whatsappLink");
 if(cfg.WHATSAPP_NUMBER) wa.href="https://wa.me/"+String(cfg.WHATSAPP_NUMBER).replace(/\D/g,"");
 else wa.addEventListener("click",e=>{e.preventDefault();alert("سيتم تفعيل رقم واتساب الدعم قريباً.");});
 const readCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []}};
 const saveCart=items=>localStorage.setItem(CART_KEY,JSON.stringify(items));
 const counts=()=>readCart().reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
 function updateCart(){
  const items=readCart(),count=items.length,el=document.getElementById("cartCount"),bar=document.getElementById("floatingCart"),qty=document.getElementById("floatingCartCount"),sum=document.getElementById("floatingCartHint");
  if(el)el.textContent=count;if(qty)qty.textContent=count;
  if(bar){bar.hidden=!count;if(sum)sum.textContent=count?("تم اختيار "+count+" كود"+(count===1?"":"")+". اضغط لإكمال الطلب"):"";}
  
 }
 updateCart();
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){grid.innerHTML='<div class="empty-state">تعذر الاتصال بقاعدة البيانات.</div>';return;}
 if(!window.supabase || !window.supabase.createClient){grid.innerHTML='<div class="empty-state">تعذر تحميل مكتبة الاتصال. حدّث الصفحة أو أعد المحاولة.</div><button class="retry-plans" type="button">إعادة المحاولة</button>';grid.querySelector(".retry-plans")?.addEventListener("click",()=>location.reload());return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const withTimeout=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),ms))]);
 const showLoadError=message=>{grid.innerHTML='<div class="empty-state">'+message+'</div><button class="retry-plans" type="button">إعادة تحميل الباقات</button>';grid.querySelector(".retry-plans")?.addEventListener("click",()=>{grid.innerHTML='<div class="loading">جارٍ إعادة تحميل الباقات...</div>';load().catch(()=>showLoadError("تعذر الاتصال حالياً. تحقق من الإنترنت ثم أعد المحاولة."));});};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const duration=p=>{
  if(p.duration_hours)return p.duration_hours+" ساعة";
  const n=Number(p.duration_months||0);
  if(!n)return "";
  if(n===1)return "شهر";
  if(n===2)return "شهرين";
  if(n>=3&&n<=10)return n+" أشهر";
  return n+" شهراً";
 };

 function validWindow(x){return (!x.starts_at||new Date(x.starts_at).getTime()<=Date.now())&&(!x.ends_at||new Date(x.ends_at).getTime()>=Date.now());}
 function renderAdSlot(items,id){const el=document.getElementById(id);if(!el)return;el.innerHTML=items.map(a=>{const url=a.link_url&&/^https?:\/\//i.test(a.link_url)?a.link_url:"#plans";return '<a class="store-ad" href="'+esc(url)+'" '+(url!=="#plans"?'target="_blank" rel="noopener"':'')+'><img src="'+esc(a.image_path)+'" alt="'+esc(a.title||"إعلان MYHD")+'"><span><b>'+esc(a.title||"عرض خاص")+'</b><small>'+esc(a.description||"اكتشف العرض الآن")+'</small></span></a>';}).join("");el.hidden=!items.length;const wrap=id==="homeAdsList"?document.getElementById("homeAds"):null;if(wrap)wrap.hidden=!items.length;}
 async function load(){
  let result;
  try{result=await withTimeout(db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,image_path,description,features").eq("is_active",true).order("sort_order").order("created_at"),12000);}
  catch(e){console.warn("MYHD SDK query failed:",e);result={error:e};}
  if(result?.error){
   try{
    const url=cfg.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/subscriptions?select=id,name,category,duration_months,duration_hours,price,currency,image_path,description,features,is_active,sort_order,created_at&is_active=eq.true&order=sort_order.asc,created_at.asc";
    const response=await withTimeout(fetch(url,{headers:{apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:"Bearer "+cfg.SUPABASE_PUBLISHABLE_KEY,Accept:"application/json"}}),12000);
    if(!response.ok)throw new Error("REST "+response.status);
    result={data:await response.json(),error:null};
   }catch(f){console.error("MYHD direct REST fallback failed:",f);showLoadError("تعذر الاتصال بقاعدة البيانات حالياً. تحقق من الإنترنت ثم أعد المحاولة.");return;}
  }
  const {data,error}=result;
  if(error||!Array.isArray(data)){console.error("MYHD subscriptions load error:",error);showLoadError("تعذر قراءة بيانات الباقات. يرجى إعادة المحاولة.");return;}
  if(!data?.length){grid.innerHTML='<div class="empty-state">لا توجد باقات منشورة حالياً.</div>';return;}

  let offerResult={data:[]},bannerResult={data:[]};
  try{[offerResult,bannerResult]=await withTimeout(Promise.all([db.from("offers").select("*").eq("is_active",true),db.from("banners").select("*").eq("is_active",true)]),8000);}
  catch(e){console.warn("MYHD optional offers/banners unavailable; rendering packages without them.",e);}
  const offerByPlan=new Map((offerResult.data||[]).filter(o=>o.subscription_id&&validWindow(o)).map(o=>[o.subscription_id,o]));
  const banners=(bannerResult.data||[]).filter(validWindow);
  const heroAd=banners.find(a=>(a.placement||"home")==="home");
  const heroScreen=document.querySelector(".hero-art .screen");
  if(heroScreen&&heroAd){
   const adUrl=heroAd.link_url&&/^https?:\/\//i.test(heroAd.link_url)?heroAd.link_url:"#plans";
   heroScreen.innerHTML='<a class="hero-ad-card" href="'+esc(adUrl)+'" '+(adUrl!=="#plans"?'target="_blank" rel="noopener"':'')+'><img src="'+esc(heroAd.image_path)+'" alt="'+esc(heroAd.title||"إعلان MYHD")+'"><span class="hero-ad-caption"><b>'+esc(heroAd.title||"إعلان MYHD")+'</b>'+(heroAd.description?'<small>'+esc(heroAd.description)+'</small>':'')+'</span></a>';
   heroScreen.classList.add("has-hero-ad");heroScreen.closest(".hero-art")?.classList.add("has-hero-ad");
  }else if(heroScreen){heroScreen.classList.remove("has-hero-ad");heroScreen.closest(".hero-art")?.classList.remove("has-hero-ad");}
  const homeAdsWrap=document.getElementById("homeAds");if(homeAdsWrap)homeAdsWrap.hidden=true;
  const planAds=banners.filter(a=>a.placement==="plans"),planAdEl=document.getElementById("planAds");
  if(planAdEl){planAdEl.innerHTML=planAds.map(a=>'<a class="store-ad" href="'+esc(a.link_url&&/^https?:\/\//i.test(a.link_url)?a.link_url:"#plans")+'"><img src="'+esc(a.image_path)+'" alt="'+esc(a.title||"إعلان")+'"><span><b>'+esc(a.title||"إعلان")+'</b><small>'+esc(a.description||"")+'</small></span></a>').join("");planAdEl.hidden=!planAds.length;}
  renderAdSlot(banners.filter(a=>a.placement==="footer"),"footerAds");
  grid.innerHTML=data.map(p=>{
   const vip=/vip/i.test((p.name||"")+" "+(p.category||""));const fallbackImage=vip?"/assets/myhd-vip-card.svg":"/assets/myhd-card.svg";const remoteImage=p.image_path&&/^https?:\/\//i.test(p.image_path)?p.image_path:fallbackImage;const image='<img class="plan-image" src="'+esc(remoteImage)+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.onerror=null;this.src=\''+fallbackImage+'\';">';
   const features=Array.isArray(p.features)?p.features.filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(""):"";
   const offer=offerByPlan.get(p.id);let finalPrice=Number(p.price||0);
   if(offer){finalPrice=Math.max(0,finalPrice-Number(offer.discount_value||0));}

   const isTrial=Number(p.price||0)===0&&Number(p.duration_hours)===24;
   const cleanPlanName=(p.name||"MY HD").replace(/\s*[-–—|:]?\s*\d+\s*(?:شهرًا|شهراً|أشهر|شهرين|شهر|months?|mos?)\s*$/i,"").trim();
   const planDuration=duration(p);
   const title=cleanPlanName+(planDuration?" - "+planDuration:"");
   return `<article class="plan-card ${vip?"plan-card-vip":""} ${offer?"has-active-offer":""}">${offer?`<div class="discount-ribbon ${vip?"discount-ribbon-vip":"discount-ribbon-basic"}"><span class="discount-spark">✦</span><span>خصم</span><strong>${Number(offer.discount_value||0).toFixed(2).replace(/\.00$/,"")}</strong><small>عرض خاص</small></div>`:""}<div class="plan-art">${image}<span class="plan-art-label">${vip?"✦ VIP مميز":"▣ اشتراك أساسي"}</span></div><div class="plan-content"><h3>${esc(title)}</h3>${p.description?`<p>${esc(p.description)}</p>`:""}${features?`<ul class="plan-features">${features}</ul>`:""}${offer?`<div class="price"><span class="offer-tag">عرض خاص</span><del>${esc(p.price)} ${esc(p.currency||"")}</del><strong>${finalPrice.toFixed(2).replace(/\.00$/,"")} ${esc(p.currency||"")}</strong></div><small class="offer-description">${esc(offer.title||"عرض لفترة محدودة")} · السعر بعد الخصم</small><div class="offer-countdown" data-offer-ends="${esc(offer.ends_at||"")}"><span>ينتهي العرض خلال</span><strong>--:--:--</strong></div>`:`<div class="price"><strong>${esc(p.price)} ${esc(p.currency||"")}</strong></div>`}<div class="quantity-picker"><label for="qty-${esc(p.id)}">عدد الأكواد</label><input class="quantity-input" id="qty-${esc(p.id)}" data-plan-id="${esc(p.id)}" type="number" min="0" step="1" inputmode="numeric" value="1" aria-label="عدد الأكواد من ${esc(title)}"><button type="button" class="add-to-cart-btn" data-plan-id="${esc(p.id)}">أضف للسلة</button><button type="button" class="plan-whatsapp-btn" data-whatsapp-plan="${esc(p.id)}">${isTrial?"اطلب تجربة مجانية 24 ساعة":"اطلب الآن عبر واتساب"}</button></div></div></article>`;
  }).join("");
  if(window.__myhdOfferCountdownTimer)clearInterval(window.__myhdOfferCountdownTimer);
  const updateOfferCountdowns=()=>{let expired=false;grid.querySelectorAll("[data-offer-ends]").forEach(el=>{const left=new Date(el.dataset.offerEnds).getTime()-Date.now();if(!Number.isFinite(left)||left<=0){el.innerHTML="<span>انتهى العرض</span>";expired=true;return;}const days=Math.floor(left/86400000),hours=Math.floor(left%86400000/3600000),minutes=Math.floor(left%3600000/60000),seconds=Math.floor(left%60000/1000);const pad=n=>String(n).padStart(2,"0");el.innerHTML="<span>ينتهي العرض خلال</span><strong>"+(days?days+" يوم ":"")+pad(hours)+":"+pad(minutes)+":"+pad(seconds)+"</strong>";});if(expired)setTimeout(()=>location.reload(),1200);};
  updateOfferCountdowns();window.__myhdOfferCountdownTimer=setInterval(updateOfferCountdowns,1000);
  grid.querySelectorAll("[data-whatsapp-plan]").forEach(btn=>btn.addEventListener("click",()=>{
   const id=btn.dataset.whatsappPlan,plan=data.find(p=>p.id===id),input=grid.querySelector('.quantity-input[data-plan-id="'+id+'"]');
   const quantity=Math.max(1,Math.min(99,Math.floor(Number(input?.value)||1)));
   const phone=String(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
   if(!phone){alert("رقم واتساب الدعم غير مضبوط حالياً.");return;}
   const trial=Number(plan?.price||0)===0&&Number(plan?.duration_hours)===24;
   const offer=offerByPlan.get(id);let amount=Number(plan?.price||0);
   if(offer){amount=Math.max(0,amount-Number(offer.discount_value||0));}
   const priceText=(Number.isInteger(amount)?String(amount):amount.toFixed(2))+" "+(plan?.currency||"");
   const cleanPlanName=(plan?.name||"MYHD IPTV").replace(/\s*[-–—|:]?\s*\d+\s*(?:شهرًا|شهراً|أشهر|شهرين|شهر|months?|mos?)\s*$/i,"").trim();
   const planTitle=cleanPlanName+(duration(plan)?" - "+duration(plan):"");
   const message=trial
    ?"السلام عليكم، أرغب في طلب تجربة مجانية لمدة 24 ساعة لخدمة "+(plan?.name||"MY HD")+"."
    :"مرحباً، أنا مهتم بباقة "+planTitle+"، بسعر "+priceText+", والكمية "+quantity+" اشتراك. كيف يمكنني إتمام الطلب؟";
   window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener");
  }));
  grid.querySelectorAll(".add-to-cart-btn").forEach(btn=>btn.addEventListener("click",()=>{
   const id=btn.dataset.planId,input=grid.querySelector('.quantity-input[data-plan-id="'+id+'"]');
   const quantity=Math.max(0,Math.min(999,Math.floor(Number(input?.value)||0)));
   if(!quantity){alert("يرجى تحديد عدد الأكواد أولاً.");input?.focus();return;}
   const items=readCart();
   for(let i=0;i<quantity;i++)items.push(id);
   saveCart(items);updateCart();
   btn.textContent="تمت الإضافة ✓";
   setTimeout(()=>{btn.textContent="إضافة إلى السلة"},1300);
  }));
  updateCart();
 }

 load().catch(e=>{console.error("MYHD unexpected load error:",e);showLoadError("حدث خطأ غير متوقع أثناء تحميل الباقات. أعد المحاولة.");});
})();