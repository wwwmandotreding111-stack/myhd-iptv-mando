(() => {
 const cfg=window.MYHD_CONFIG||{},grid=document.getElementById("plansGrid");
 document.getElementById("year").textContent=new Date().getFullYear();
 const wa=document.getElementById("whatsappLink");
 if(cfg.WHATSAPP_NUMBER) wa.href="https://wa.me/"+String(cfg.WHATSAPP_NUMBER).replace(/\D/g,"");
 else wa.addEventListener("click",e=>{e.preventDefault();alert("سيتم تفعيل رقم واتساب الدعم قريباً.");});
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){grid.innerHTML='<div class="empty-state">تعذر الاتصال بقاعدة البيانات.</div>';return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");
 async function load(){
  const {data,error}=await db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,image_path,description,features").eq("is_active",true).order("sort_order").order("created_at");
  if(error){grid.innerHTML='<div class="empty-state">تعذر تحميل الباقات. يرجى المحاولة لاحقاً.</div>';return;}
  if(!data?.length){grid.innerHTML='<div class="empty-state">لا توجد باقات منشورة حالياً.</div>';return;}
  grid.innerHTML=data.map(p=>{
   const image=p.image_path&&/^https?:\/\//i.test(p.image_path)?`<img class="plan-image" src="${esc(p.image_path)}" alt="${esc(p.name)}">`:'<div class="plan-image plan-placeholder">MYHD IPTV</div>';
   const features=Array.isArray(p.features)?p.features.filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(""):"";
   return `<article class="plan-card">${image}<div class="plan-content"><span class="eyebrow">${esc(p.category||"MYHD IPTV")}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="duration">${esc(duration(p))}</div>${features?`<ul>${features}</ul>`:""}<div class="price"><strong>${esc(p.price)} ${esc(p.currency||"")}</strong></div><a class="btn btn-gold full" href="account.html?plan=${encodeURIComponent(p.id)}">اختيار هذه الباقة</a></div></article>`;
  }).join("");
 }
 db.from("site_visits").insert({page_path:location.pathname||"/"}).then(()=>{});
 load();
})();