(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),form=$("checkoutForm"),CART_KEY="myhd_cart";
 const readCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []}};
 const saveCart=items=>localStorage.setItem(CART_KEY,JSON.stringify(items));
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$("orderMessage").textContent="تعذر الاتصال بالخدمة حالياً.";form.hidden=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let cart=[],plans=[],whatsappUrl="";
 function renderCart(){
  const box=$("cartItems"),total=$("cartTotal");
  if(!cart.length){box.innerHTML='<p class="muted">لم تختر أي كود بعد. ارجع إلى الباقات وحدد الكمية المطلوبة.</p>';total.textContent="0";form.hidden=true;return;}
  form.hidden=false;
  const grouped=new Map();cart.forEach(p=>grouped.set(p.id,{plan:p,qty:(grouped.get(p.id)?.qty||0)+1}));
  box.innerHTML=[...grouped.values()].map(({plan:p,qty})=>`<div class="cart-line"><div><b>${esc(p.name)}</b><small>${esc(duration(p))} · ${esc(p.price)} ${esc(p.currency||"")} × ${qty} كود</small></div><strong class="line-subtotal">${(Number(p.price||0)*qty).toFixed(2).replace(/\.00$/,"")} ${esc(p.currency||"")}</strong></div>`).join("");
  const sum=cart.reduce((n,p)=>n+Number(p.price||0),0),currency=cart[0]?.currency||"";
  total.textContent=sum.toFixed(2).replace(/\.00$/,"")+" "+currency;
 }
 async function loadCart(){
  let ids=readCart();const legacy=new URLSearchParams(location.search).get("plan");
  if(!ids.length&&legacy){ids=[legacy];saveCart(ids)}
  if(!ids.length){cart=[];renderCart();return;}
  const unique=[...new Set(ids)];
  const {data,error}=await db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,is_active").in("id",unique).eq("is_active",true);
  if(error||!data){$("cartItems").innerHTML='<p class="muted">تعذر تحميل اختياراتك. حاول تحديث الصفحة.</p>';form.hidden=true;return;}
  const byId=new Map(data.map(p=>[p.id,p]));cart=ids.map(id=>byId.get(id)).filter(Boolean);
  if(cart.length!==ids.length)saveCart(cart.map(p=>p.id));
  renderCart();
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),notes=$("orderNotes").value.trim();
  if(!cart.length||!name||!phone)return;
  const digits=String(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!digits){$("orderMessage").textContent="رقم واتساب الإدارة غير مضبوط حالياً.";return;}
  const btn=$("sendOrderBtn");btn.disabled=true;$("orderMessage").textContent="جارٍ حفظ طلبك...";
  try{
   const rows=cart.map(plan=>({subscription_id:plan.id,customer_id:null,customer_name:name,phone,notes:[`طلب ${cart.length} كود`,notes].filter(Boolean).join(" — ")||null,status:"new"}));
   const {error}=await db.from("orders").insert(rows);if(error)throw error;
   const sum=cart.reduce((n,p)=>n+Number(p.price||0),0),grouped=new Map();
   cart.forEach(p=>grouped.set(p.id,{plan:p,qty:(grouped.get(p.id)?.qty||0)+1}));
   const lines=[...grouped.values()].map(({plan:p,qty},i)=>`${i+1}) ${p.name} — ${duration(p)||"حسب الباقة"} — عدد الأكواد: ${qty} — ${(Number(p.price||0)*qty).toFixed(2).replace(/\.00$/,"")} ${p.currency||""}`);
   const message=["طلب اشتراك جديد - MYHD IPTV MANDO","الاسم: "+name,"رقم العميل: "+phone,"تفاصيل الأكواد:",...lines,"إجمالي عدد الأكواد: "+cart.length,"المجموع: "+sum.toFixed(2).replace(/\.00$/,"")+" "+(cart[0]?.currency||""),notes?"ملاحظات: "+notes:""].filter(Boolean).join("\n");
   whatsappUrl="https://wa.me/"+digits+"?text="+encodeURIComponent(message);saveCart([]);
   $("checkoutPanel").hidden=true;$("successPanel").hidden=false;
   $("successWhatsApp").href=whatsappUrl;
   $("orderMessage").textContent="";
  }catch(error){console.error("MYHD order save failed:",error);$("orderMessage").textContent="تعذر حفظ الطلب حالياً. تأكد من الإنترنت وحاول مجدداً.";btn.disabled=false;}
 });
 $("successWhatsApp").addEventListener("click",()=>{});
 loadCart();
})();