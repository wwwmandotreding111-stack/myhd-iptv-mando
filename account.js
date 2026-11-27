(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),form=$("checkoutForm"),CART_KEY="myhd_cart";
 const readCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []}};
 const saveCart=items=>localStorage.setItem(CART_KEY,JSON.stringify(items));
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$("orderMessage").textContent="تعذر الاتصال بالخدمة حالياً.";form.hidden=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let cart=[],plans=[];
 function renderCart(){
  const box=$("cartItems"),total=$("cartTotal");
  if(!cart.length){box.innerHTML='<p class="muted">السلة فارغة. ارجع إلى الباقات وأضف ما يناسبك.</p>';total.textContent="0";form.hidden=true;return;}
  form.hidden=false;
  box.innerHTML=cart.map((p,i)=>`<div class="cart-line"><div><b>${esc(p.name)}</b><small>${esc(duration(p))} · ${esc(p.price)} ${esc(p.currency||"")}</small></div><button type="button" class="remove-cart-item" data-index="${i}" aria-label="حذف الباقة">حذف</button></div>`).join("");
  const sum=cart.reduce((n,p)=>n+Number(p.price||0),0),currency=cart[0]?.currency||"";
  total.textContent=sum.toFixed(2).replace(/\.00$/,"")+" "+currency;
 }
 $("cartItems").addEventListener("click",e=>{
  const btn=e.target.closest(".remove-cart-item");if(!btn)return;
  const ids=readCart();ids.splice(Number(btn.dataset.index),1);saveCart(ids);cart.splice(Number(btn.dataset.index),1);renderCart();
 });
 async function loadCart(){
  let ids=readCart();
  const legacy=new URLSearchParams(location.search).get("plan");
  if(!ids.length&&legacy){ids=[legacy];saveCart(ids)}
  if(!ids.length){cart=[];renderCart();return;}
  const unique=[...new Set(ids)];
  const {data,error}=await db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,is_active").in("id",unique).eq("is_active",true);
  if(error||!data){$("cartItems").innerHTML='<p class="muted">تعذر تحميل السلة. حاول تحديث الصفحة.</p>';form.hidden=true;return;}
  const byId=new Map(data.map(p=>[p.id,p]));
  cart=ids.map(id=>byId.get(id)).filter(Boolean);
  if(cart.length!==ids.length){saveCart(cart.map(p=>p.id));}
  renderCart();
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),notes=$("orderNotes").value.trim();
  if(!cart.length||!name||!phone)return;
  const digits=String(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!digits){$("orderMessage").textContent="رقم واتساب الإدارة غير مضبوط بعد. يرجى المحاولة لاحقاً.";return;}
  const btn=$("sendOrderBtn");btn.disabled=true;$("orderMessage").textContent="جارٍ حفظ طلبك...";
  try{
   // One insert request saves one protected order row per selected package; no public SELECT permission is needed.
   const rows=cart.map(plan=>({subscription_id:plan.id,customer_id:null,customer_name:name,phone,notes:[`طلب سلة من ${cart.length} باقات`,notes].filter(Boolean).join(" — ")||null,status:"new"}));
   const {error}=await db.from("orders").insert(rows);
   if(error)throw error;
   const sum=cart.reduce((n,p)=>n+Number(p.price||0),0);
   const lines=cart.map((p,i)=>`${i+1}) ${p.name} — ${duration(p)||"حسب الباقة"} — ${p.price} ${p.currency||""}`);
   const message=["طلب اشتراك جديد - MYHD IPTV MANDO","الاسم: "+name,"رقم العميل: "+phone,"تفاصيل الباقات:",...lines,"المجموع: "+sum.toFixed(2).replace(/\.00$/,"")+" "+(cart[0]?.currency||""),notes?"ملاحظات: "+notes:""].filter(Boolean).join("\n");
   saveCart([]);$("orderMessage").textContent="تم حفظ طلبك بنجاح. سيتم فتح واتساب لإرسال التفاصيل.";
   location.href="https://wa.me/"+digits+"?text="+encodeURIComponent(message);
  }catch(error){
   console.error("MYHD order save failed:",error);
   $("orderMessage").textContent="تعذر حفظ الطلب حالياً. تأكد من اتصال الإنترنت وحاول مجدداً.";
   btn.disabled=false;
  }
 });
 loadCart();
})();