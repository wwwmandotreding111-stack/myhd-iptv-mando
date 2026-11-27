(() => {
 const cfg=window.MYHD_CONFIG||{}, grid=document.getElementById("plansGrid");
 document.getElementById("year").textContent=new Date().getFullYear();
 const wa=document.getElementById("whatsappLink");
 if(cfg.WHATSAPP_NUMBER) wa.href=`https://wa.me/${cfg.WHATSAPP_NUMBER}`;
 else wa.addEventListener("click",e=>{e.preventDefault();alert("سيتم تفعيل رقم واتساب من إعدادات الموقع.");});
 if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.startsWith("PASTE_")||!cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_")){
   grid.innerHTML='<div class="empty-state">الموقع جاهز للتصميم. بقي ربط قاعدة بيانات MYHD المستقلة وإضافة الباقات الأصلية.</div>';return;
 }
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){
  const {data,error}=await db.from("plans").select("id,name,description,price,old_price,duration,image_url,featured").eq("active",true).order("sort_order").order("created_at",{ascending:false});
  if(error){grid.innerHTML='<div class="empty-state">تعذر تحميل الباقات حالياً. تحقق من إعداد قاعدة البيانات.</div>';return;}
  if(!data?.length){grid.innerHTML='<div class="empty-state">لا توجد باقات منشورة حالياً. سيتم عرض الباقات بعد إضافتها من لوحة الإدارة.</div>';return;}
  grid.innerHTML=data.map(p=>`<article class="plan-card ${p.featured?"featured":""}">${p.image_url?`<img class="plan-image" src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="plan-image plan-placeholder">MYHD IPTV</div>'}<div class="plan-content">${p.featured?'<span class="popular">الأكثر تميزاً</span>':""}<h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="duration">${esc(p.duration||"")}</div><div class="price">${p.old_price?`<del>${esc(p.old_price)}</del>`:""}<strong>${esc(p.price)}</strong><small>السعر حسب العملة المحددة</small></div><a class="btn btn-gold full" href="account.html">اطلب هذه الباقة</a></div></article>`).join("");
 }
 load();
})();