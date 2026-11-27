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
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");

 function validWindow(x){return (!x.starts_at||new Date(x.starts_at).getTime()<=Date.now())&&(!x.ends_at||new Date(x.ends_at).getTime()>=Date.now());}
 function renderAdSlot(items,id){const el=document.getElementById(id);if(!el)return;el.innerHTML=items.map(a=>{const url=a.link_url&&/^https?:\/\//i.test(a.link_url)?a.link_url:"#plans";return '<a class="store-ad" href="'+esc(url)+'" '+(url!=="#plans"?'target="_blank" rel="noopener"':'')+'><img src="'+esc(a.image_path)+'" alt="'+esc(a.title||"إعلان MYHD")+'"><span><b>'+esc(a.title||"عرض خاص")+'</b><small>'+esc(a.description||"اكتشف العرض الآن")+'</small></span></a>';}).join("");el.hidden=!items.length;const wrap=id==="homeAdsList"?document.getElementById("homeAds"):null;if(wrap)wrap.hidden=!items.length;}
 async function load(){
  let result;
  try{result=await withTimeout(db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,image_path,description,features").eq("is_active",true).order("sort_order").order("created_at"),15000);}
  catch(e){showLoadError("تعذر الاتصال بقاعدة البيانات أو انتهت مهلة التحميل. تحقق من الإنترنت ثم أعد المحاولة.");return;}
  const {data,error}=result;
  if(error){console.error("MYHD subscriptions load error:",error);showLoadError("تعذر تحميل الباقات من قاعدة البيانات. يرجى إعادة المحاولة.");return;}
  if(!data?.length){grid.innerHTML='<div class="empty-state">لا توجد باقات منشورة حالياً.</div>';return;}

  let offerResult={data:[]},bannerResult={data:[]};
  try{[offerResult,bannerResult]=await withTimeout(Promise.all([db.from("offers").select("*").eq("is_active",true),db.from("banners").select("*").eq("is_active",true)]),8000);}
  catch(e){console.warn("MYHD optional offers/banners unavailable; rendering packages without them.",e);}
  const offerByPlan=new Map((offerResult.data||[]).filter(o=>o.subscription_id&&validWindow(o)).map(o=>[o.subscription_id,o]));
  const banners=(bannerResult.data||[]).filter(validWindow);
  renderAdSlot(banners.filter(a=>(a.placement||"home")==="home"),"homeAdsList");
  const planAds=banners.filter(a=>a.placement==="plans"),planAdEl=document.getElementById("planAds");
  if(planAdEl){planAdEl.innerHTML=planAds.map(a=>'<a class="store-ad" href="'+esc(a.link_url&&/^https?:\/\//i.test(a.link_url)?a.link_url:"#plans")+'"><img src="'+esc(a.image_path)+'" alt="'+esc(a.title||"إعلان")+'"><span><b>'+esc(a.title||"إعلان")+'</b><small>'+esc(a.description||"")+'</small></span></a>').join("");planAdEl.hidden=!planAds.length;}
  renderAdSlot(banners.filter(a=>a.placement==="footer"),"footerAds");
  grid.innerHTML=data.map(p=>{
   const vip=/vip/i.test((p.name||"")+" "+(p.category||""));const fallbackImage=vip?"/assets/myhd-vip-card.svg":"/assets/myhd-card.svg";const remoteImage=p.image_path&&/^https?:\/\//i.test(p.image_path)?p.image_path:fallbackImage;const image='<img class="plan-image" src="'+esc(remoteImage)+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.onerror=null;this.src=\''+fallbackImage+'\';">';
   const features=Array.isArray(p.features)?p.features.filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(""):"";
   const offer=offerByPlan.get(p.id);let finalPrice=Number(p.price||0);
   if(offer){finalPrice=offer.discount_type==="percent"?finalPrice*(1-Number(offer.discount_value)/100):finalPrice-Number(offer.discount_value);finalPrice=Math.max(0,finalPrice);}

   return `<article class="plan-card">${image}<div class="plan-content"><span class="eyebrow">${esc(p.category||"MYHD IPTV")}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="duration">${esc(duration(p))}</div>${features?`<ul>${features}</ul>`:""}${offer?`<div class="price"><span class="offer-tag">عرض خاص</span><del>${esc(p.price)} ${esc(p.currency||"")}</del><strong>${finalPrice.toFixed(2).replace(/\.00$/,"")} ${esc(p.currency||"")}</strong></div><small class="offer-description">${esc(offer.title)}</small>`:`<div class="price"><strong>${esc(p.price)} ${esc(p.currency||"")}</strong></div>`}<div class="quantity-picker"><label for="qty-${esc(p.id)}">عدد الأكواد</label><input class="quantity-input" id="qty-${esc(p.id)}" data-plan-id="${esc(p.id)}" type="number" min="0" step="1" inputmode="numeric" value="1" aria-label="عدد الأكواد من ${esc(p.name)}"><button type="button" class="add-to-cart-btn" data-plan-id="${esc(p.id)}">إضافة إلى السلة</button></div></div></article>`;
  }).join("");
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