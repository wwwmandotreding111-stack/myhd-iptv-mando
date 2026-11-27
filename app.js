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
   return `<article class="plan-card">${image}<div class="plan-content"><span class="eyebrow">${esc(p.category||"MYHD IPTV")}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="duration">${esc(duration(p))}</div>${features?`<ul>${features}</ul>`:""}<div class="price"><strong>${esc(p.price)} ${esc(p.currency||"")}</strong></div><div class="quantity-picker"><label for="qty-${esc(p.id)}">عدد الأكواد</label><input class="quantity-input" id="qty-${esc(p.id)}" data-plan-id="${esc(p.id)}" type="number" min="0" step="1" inputmode="numeric" value="1" aria-label="عدد الأكواد من ${esc(p.name)}"><button type="button" class="add-to-cart-btn" data-plan-id="${esc(p.id)}">إضافة إلى السلة</button></div></div></article>`;
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
 db.from("site_visits").insert({page_path:location.pathname||"/"}).then(()=>{});
 load();
})();