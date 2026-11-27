(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),form=$("checkoutForm"),CART_KEY="myhd_cart";
 const readCart=()=>{try{const v=JSON.parse(localStorage.getItem(CART_KEY)||"[]");return Array.isArray(v)?v.filter(x=>typeof x==="string"&&x.length<100):[]}catch{return []}};
 const saveCart=items=>localStorage.setItem(CART_KEY,JSON.stringify(items));
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$("orderMessage").textContent="تعذر الاتصال بالخدمة حالياً. حاول لاحقاً.";form.hidden=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let cart=[],whatsappUrl="",appliedCoupon=null,discountTotal=0,subtotal=0,submitting=false;
 function renderCart(){
  const box=$("cartItems"),total=$("cartTotal"),clear=$("clearCartBtn");
  if(!cart.length){box.innerHTML='<div class="cart-empty"><span>🛒</span><b>سلتك فارغة حالياً</b><small>اختر الباقة والكمية المناسبة ثم أضفها إلى السلة.</small><a class="btn btn-gold" href="index.html#plans">تصفح الباقات</a></div>';total.textContent="0";form.hidden=true;if(clear)clear.hidden=true;$("couponBox").hidden=true;return;}
  form.hidden=false;if(clear)clear.hidden=false;$("couponBox").hidden=false;
  const grouped=new Map();cart.forEach(p=>{const old=grouped.get(p.id);grouped.set(p.id,{plan:p,qty:(old?.qty||0)+1});});
  box.innerHTML=[...grouped.values()].map(({plan:p,qty})=>`<div class="cart-line"><div class="cart-product"><b>${esc(p.name)}</b><small>${esc(duration(p))} · ${p.original_price!==undefined?'<del>'+esc(p.original_price)+' '+esc(p.currency||"")+'</del> ':''}<strong>${esc(p.price)} ${esc(p.currency||"")}</strong> × ${qty}</small><div class="cart-quantity"><button type="button" data-cart-action="minus" data-plan-id="${esc(p.id)}" aria-label="تقليل الكمية">−</button><b>${qty}</b><button type="button" data-cart-action="plus" data-plan-id="${esc(p.id)}" aria-label="زيادة الكمية">+</button><button type="button" class="cart-remove" data-cart-action="remove" data-plan-id="${esc(p.id)}">حذف</button></div></div><strong class="line-subtotal">${(Number(p.price||0)*qty).toFixed(2).replace(/\.00$/,"")} ${esc(p.currency||"")}</strong></div>`).join("");
  subtotal=cart.reduce((n,p)=>n+Number(p.price||0),0);
  const eligible=appliedCoupon?cart.filter(p=>!appliedCoupon.subscription_id||p.id===appliedCoupon.subscription_id):[];
  const eligibleSubtotal=eligible.reduce((n,p)=>n+Number(p.price||0),0);
  discountTotal=appliedCoupon?Math.min(eligibleSubtotal,appliedCoupon.discount_type==="percent"?eligibleSubtotal*Number(appliedCoupon.discount_value)/100:Number(appliedCoupon.discount_value)):0;
  const sum=Math.max(0,subtotal-discountTotal),currency=cart[0]?.currency||"";
  const currencies=[...new Set(cart.map(p=>p.currency||""))];
  total.textContent=sum.toFixed(2).replace(/\.00$/,"")+" "+(currencies.length===1?currency:"");
  $("mixedCurrencyWarning").hidden=currencies.length<2;
  const totals=$("couponTotals");
  if(totals){totals.hidden=!appliedCoupon;totals.innerHTML=appliedCoupon?'<span>المجموع قبل الخصم: '+subtotal.toFixed(2)+' '+esc(currency)+'</span><span>الخصم ('+esc(appliedCoupon.code)+'): −'+discountTotal.toFixed(2)+' '+esc(currency)+'</span><b>الإجمالي بعد الخصم: '+sum.toFixed(2)+' '+esc(currency)+'</b>':"";}
 }
 $("cartItems").addEventListener("click",e=>{
  const btn=e.target.closest("[data-cart-action]");if(!btn)return;
  const id=btn.dataset.planId,action=btn.dataset.cartAction,idx=cart.findIndex(p=>p.id===id);
  if(idx<0)return;
  if(action==="plus"){const count=cart.filter(p=>p.id===id).length;if(count<99)cart.push(cart[idx]);else return;}
  if(action==="minus"){cart.splice(idx,1);if(!cart.some(p=>p.id===id))appliedCoupon=null;}
  if(action==="remove"){cart=cart.filter(p=>p.id!==id);if(appliedCoupon?.subscription_id===id)appliedCoupon=null;}
  saveCart(cart.map(p=>p.id));renderCart();
 });
 $("clearCartBtn").addEventListener("click",()=>{if(!confirm("هل تريد حذف جميع الباقات من السلة؟"))return;cart=[];appliedCoupon=null;saveCart([]);renderCart();});
 async function loadCart(){
  const ids=readCart(),legacy=new URLSearchParams(location.search).get("plan");
  if(!ids.length&&legacy){ids.push(legacy);saveCart(ids);}
  if(!ids.length){cart=[];renderCart();return;}
  const unique=[...new Set(ids)];
  const {data,error}=await db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,is_active").in("id",unique).eq("is_active",true);
  if(error||!data){$("cartItems").innerHTML='<p class="muted">تعذر تحميل اختياراتك. حدّث الصفحة أو أعد المحاولة.</p>';form.hidden=true;return;}
  const {data:offers,error:offersError}=await db.from("offers").select("*").eq("is_active",true);
  if(offersError)console.warn("Offers could not be loaded:",offersError);
  const now=Date.now(),offerByPlan=new Map((offers||[]).filter(o=>o.subscription_id&&(!o.starts_at||new Date(o.starts_at).getTime()<=now)&&(!o.ends_at||new Date(o.ends_at).getTime()>=now)).map(o=>[o.subscription_id,o]));
  data.forEach(p=>{const offer=offerByPlan.get(p.id);if(offer){const original=Number(p.price||0);p.original_price=original;p.price=Math.max(0,offer.discount_type==="percent"?original*(1-Number(offer.discount_value)/100):original-Number(offer.discount_value));p.offer_title=offer.title;}});
  const byId=new Map(data.map(p=>[p.id,p]));cart=ids.map(id=>byId.get(id)).filter(Boolean);
  if(cart.length!==ids.length)saveCart(cart.map(p=>p.id));
  renderCart();
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(submitting)return;
  const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),notes=$("orderNotes").value.trim();
  if(!cart.length){$("orderMessage").textContent="السلة فارغة. أضف باقة قبل تأكيد الطلب.";return;}
  if(!name||!phone){$("orderMessage").textContent="يرجى إدخال الاسم ورقم الهاتف.";return;}
  if(!/^[+0-9()\-\s]{7,30}$/.test(phone)){$("orderMessage").textContent="تحقق من رقم الهاتف وأدخله مع رمز الدولة.";return;}
  const digits=String(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!digits){$("orderMessage").textContent="رقم واتساب الإدارة غير مضبوط حالياً.";return;}
  submitting=true;const btn=$("sendOrderBtn");btn.disabled=true;btn.textContent="جارٍ تأكيد الطلب...";$("orderMessage").textContent="جارٍ حفظ طلبك بأمان...";
  try{
   const rows=cart.map((plan,index)=>({subscription_id:plan.id,customer_id:null,customer_name:name,phone,notes:[`طلب ${cart.length} كود`,index===0&&appliedCoupon?`كود الخصم: ${appliedCoupon.code} · قيمة الخصم: ${discountTotal.toFixed(2)}`:null,notes].filter(Boolean).join(" — ")||null,status:"new",coupon_code:index===0&&appliedCoupon?appliedCoupon.code:null,discount_amount:index===0?discountTotal:0}));
   const {error}=await db.from("orders").insert(rows);if(error)throw error;
   const sum=Math.max(0,subtotal-discountTotal),grouped=new Map();cart.forEach(p=>{const old=grouped.get(p.id);grouped.set(p.id,{plan:p,qty:(old?.qty||0)+1});});
   const lines=[...grouped.values()].map(({plan:p,qty},i)=>`${i+1}) ${p.name} — ${duration(p)||"حسب الباقة"} — عدد الأكواد: ${qty} — ${(Number(p.price||0)*qty).toFixed(2).replace(/\.00$/,"")} ${p.currency||""}`);
   const message=["طلب اشتراك جديد - MYHD IPTV MANDO","الاسم: "+name,"رقم العميل: "+phone,"تفاصيل الأكواد:",...lines,"إجمالي عدد الأكواد: "+cart.length,"المجموع قبل الخصم: "+subtotal.toFixed(2).replace(/\.00$/,"")+" "+(cart[0]?.currency||""),appliedCoupon?"كود الخصم: "+appliedCoupon.code+" — قيمة الخصم: "+discountTotal.toFixed(2):"","الإجمالي بعد الخصم: "+sum.toFixed(2).replace(/\.00$/,"")+" "+(cart[0]?.currency||""),notes?"ملاحظات: "+notes:""].filter(Boolean).join("\n");
   whatsappUrl="https://wa.me/"+digits+"?text="+encodeURIComponent(message);saveCart([]);
   $("checkoutPanel").hidden=true;$("successPanel").hidden=false;$("successWhatsApp").href=whatsappUrl;
  }catch(error){console.error("MYHD order save failed:",error);$("orderMessage").textContent="لم نتمكن من حفظ الطلب. لم يتم إرساله؛ حاول مرة أخرى.";submitting=false;btn.disabled=false;btn.textContent="تأكيد الطلب";}
 });
 $("applyCouponBtn").onclick=async()=>{
  const code=$("couponInput").value.trim().toUpperCase(),status=$("couponMessage"),btn=$("applyCouponBtn");
  if(!code){status.textContent="اكتب كود الخصم أولاً.";return;}
  btn.disabled=true;status.textContent="جارٍ التحقق من الكود...";
  try{
   const {data,error}=await db.from("coupon_codes").select("*").eq("code",code).eq("is_active",true).maybeSingle();
   if(error||!data)throw new Error("invalid");
   const now=Date.now();
   if((data.starts_at&&new Date(data.starts_at).getTime()>now)||(data.ends_at&&new Date(data.ends_at).getTime()<now)||(data.max_uses!==null&&data.used_count>=data.max_uses))throw new Error("expired");
   if(data.discount_type==="percent"&&(Number(data.discount_value)<=0||Number(data.discount_value)>100))throw new Error("value");
   if(Number(data.discount_value)<=0)throw new Error("value");
   if(data.subscription_id&&!cart.some(p=>p.id===data.subscription_id))throw new Error("plan");
   appliedCoupon=data;status.textContent="تم تطبيق كود الخصم بنجاح.";renderCart();
  }catch(err){appliedCoupon=null;renderCart();status.textContent=err.message==="plan"?"هذا الكود مخصص لباقة غير موجودة في سلتك.":err.message==="expired"?"انتهت صلاحية كود الخصم أو عدد استخداماته.":err.message==="value"?"قيمة كود الخصم غير صالحة.":"كود الخصم غير صحيح أو غير متاح.";}
  finally{btn.disabled=false;}
 };
 $("couponInput").oninput=()=>{$("couponInput").value=$("couponInput").value.toUpperCase().replace(/[^A-Z0-9_-]/g,"");appliedCoupon=null;$("couponMessage").textContent="";renderCart();};
 loadCart();
})();