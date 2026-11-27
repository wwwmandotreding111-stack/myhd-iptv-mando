(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),msg=$("adminMessage"),dashMsg=$("dashboardMessage");
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){msg.textContent="تعذر الاتصال بقاعدة البيانات.";$("adminLoginBtn").disabled=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 let cache={plans:[],orders:[],visits:[],visitors:[],coupons:[],offers:[],ads:[],customers:[],activity:[]};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=d=>d?new Date(d).toLocaleString("ar",{dateStyle:"short",timeStyle:"short"}):"—";
 const localIso=v=>v?new Date(v).toISOString():null;
 const showMessage=(s,bad=false)=>{dashMsg.textContent=s;dashMsg.style.color=bad?"#f39b9b":"var(--gold2)";};
 async function log(action,details=""){try{await db.from("admin_activity").insert({admin_id:(await db.auth.getUser()).data.user?.id||null,action,details});}catch(e){}}
 function switchTab(name){document.querySelectorAll(".admin-nav").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".admin-tab").forEach(s=>s.classList.toggle("active",s.id==="tab-"+name));if(name==="visitors")renderVisitors();}
 async function verify(){
  const {data:{session}}=await db.auth.getSession();if(!session){showLogin();return;}
  const {data,error}=await db.rpc("is_admin");
  if(error||data!==true){await db.auth.signOut();msg.textContent="هذا الحساب غير مخوّل للإدارة.";showLogin();return;}
  $("adminLogin").hidden=true;$("dashboard").hidden=false;$("adminLogout").hidden=false;await loadDashboard();
 }
 function showLogin(){$("adminLogin").hidden=false;$("dashboard").hidden=true;$("adminLogout").hidden=true;}
 $("adminLoginBtn").onclick=async()=>{msg.textContent="جارٍ التحقق...";const {error}=await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});if(error){msg.textContent="تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.";return;}await verify();};
 $("adminLogout").onclick=async()=>{await db.auth.signOut();showLogin();};
 $("refreshDashboard").onclick=loadDashboard;$("refreshVisitors").onclick=loadDashboard;
 document.querySelectorAll(".admin-nav").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>switchTab(b.dataset.go));
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 function setSelectOptions(){
  const opts=cache.plans.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");
  $("couponPlan").innerHTML='<option value="">كل الباقات</option>'+opts;
  $("offerPlan").innerHTML='<option value="">اختر الباقة</option>'+opts;
 }
 async function loadDashboard(){
  showMessage("جارٍ تحديث بيانات المتجر...");
  const [p,o,v,s,c,f,b,u,a]=await Promise.all([
   db.from("subscriptions").select("*").order("sort_order").order("created_at",{ascending:false}),
   db.from("orders").select("*").order("created_at",{ascending:false}).limit(300),
   db.from("site_visits").select("id, page_path, visited_at").order("visited_at",{ascending:false}).limit(5000),
   db.from("visitor_sessions").select("*").order("last_seen",{ascending:false}).limit(300),
   db.from("coupon_codes").select("*").order("created_at",{ascending:false}),
   db.from("offers").select("*").order("created_at",{ascending:false}),
   db.from("banners").select("*").order("sort_order").order("created_at",{ascending:false}),
   db.from("user_profiles").select("id,full_name,created_at").order("created_at",{ascending:false}).limit(200),
   db.from("admin_activity").select("*").order("created_at",{ascending:false}).limit(100)
  ]);
  const failed=[p,o,v,s,c,f,b].find(x=>x.error);
  if(failed){showMessage("تعذر تحميل بعض البيانات: "+failed.error.message,true);return;}
  cache={plans:p.data||[],orders:o.data||[],visits:v.data||[],visitors:s.data||[],coupons:c.data||[],offers:f.data||[],ads:b.data||[],customers:u.data||[],activity:a.data||[]};
  setSelectOptions();renderStats();renderPlans();renderOrders();renderCustomers();renderCoupons();renderOffers();renderAds();renderVisitors();renderActivity();renderRecentOrders();
  showMessage("تم تحديث البيانات بنجاح.");
 }
 function renderStats(){
  const now=Date.now(),today=new Date();today.setHours(0,0,0,0);const online=cache.visitors.filter(x=>new Date(x.last_seen).getTime()>now-5*60*1000);
  const todays=cache.visits.filter(x=>new Date(x.visited_at).getTime()>=today.getTime()).length;
  $("statVisits").textContent=cache.visits.length;$("statToday").textContent=todays;$("statOnline").textContent=online.length;$("statOrders").textContent=cache.orders.length;
  $("statPending").textContent=cache.orders.filter(x=>x.status==="new").length;$("statPlans").textContent=cache.plans.filter(x=>x.is_active).length;
  $("newOrderBadge").textContent=cache.orders.filter(x=>x.status==="new").length;
 }
 function renderPlans(){
  $("adminPlans").innerHTML=cache.plans.length?cache.plans.map(p=>'<article class="admin-item"><div><b>'+esc(p.name)+'</b><small>'+esc(p.category)+' · '+esc(p.price)+' '+esc(p.currency)+' · '+(p.is_active?"نشطة":"متوقفة")+'</small></div><div class="item-actions"><button data-edit-plan="'+p.id+'">تعديل</button><button data-toggle-plan="'+p.id+'" class="danger">'+(p.is_active?"إيقاف":"تفعيل")+'</button></div></article>').join(""):'<p class="muted">لم تتم إضافة باقات بعد.</p>';
  $("adminPlans").querySelectorAll("[data-edit-plan]").forEach(b=>b.onclick=()=>editPlan(cache.plans.find(p=>p.id===b.dataset.editPlan)));
  $("adminPlans").querySelectorAll("[data-toggle-plan]").forEach(b=>b.onclick=()=>togglePlan(cache.plans.find(p=>p.id===b.dataset.togglePlan)));
 }
 $("newPlanBtn").onclick=()=>{$("planForm").hidden=false;$("planForm").reset();$("planId").value="";$("planCurrency").value="USD";$("planActive").checked=true;$("planFormTitle").textContent="إضافة باقة جديدة";};
 $("cancelPlan").onclick=()=>$("planForm").hidden=true;
 function editPlan(p){$("planId").value=p.id;$("planName").value=p.name;$("planCategory").value=p.category||"";$("planPrice").value=p.price;$("planCurrency").value=p.currency||"USD";$("planMonths").value=p.duration_months??"";$("planHours").value=p.duration_hours??"";$("planImage").value=p.image_path&&/^https?:\/\//i.test(p.image_path)?p.image_path:"";$("planDescription").value=p.description||"";$("planActive").checked=!!p.is_active;$("planFormTitle").textContent="تعديل الباقة";$("planForm").hidden=false;switchTab("plans");}
 $("planForm").onsubmit=async e=>{e.preventDefault();const id=$("planId").value,payload={name:$("planName").value.trim(),category:$("planCategory").value.trim()||"MY HD",price:Number($("planPrice").value),currency:$("planCurrency").value.trim().toUpperCase(),duration_months:$("planMonths").value?Number($("planMonths").value):null,duration_hours:$("planHours").value?Number($("planHours").value):null,image_path:$("planImage").value.trim()||null,description:$("planDescription").value.trim()||null,is_active:$("planActive").checked};if(!id)payload.code="MYHD-"+Date.now();const r=id?await db.from("subscriptions").update(payload).eq("id",id):await db.from("subscriptions").insert(payload);if(r.error){showMessage(r.error.message,true);return;}await log(id?"تعديل باقة":"إضافة باقة",payload.name);$("planForm").hidden=true;showMessage("تم حفظ الباقة.");await loadDashboard();};
 async function togglePlan(p){const {error}=await db.from("subscriptions").update({is_active:!p.is_active}).eq("id",p.id);if(error){showMessage(error.message,true);return;}await log("تغيير حالة باقة",p.name);await loadDashboard();}
 function renderOrders(){
  const q=($("orderSearch").value||"").toLowerCase(),status=$("orderFilter").value,rows=cache.orders.filter(o=>(status==="all"||o.status===status)&&[o.customer_name,o.phone,o.notes].some(x=>String(x||"").toLowerCase().includes(q)));
  $("ordersList").innerHTML=rows.length?rows.map(o=>{const p=cache.plans.find(x=>x.id===o.subscription_id);return '<article class="admin-item order-item"><div class="order-main"><b>'+esc(o.customer_name||"زبون")+' · '+esc(p?.name||"باقة")+'</b><small>'+esc(o.phone||"—")+' · '+fmt(o.created_at)+'</small><small>'+esc(o.notes||"")+'</small></div><div class="order-tools"><select data-order-status="'+o.id+'"><option value="new" '+(o.status==="new"?"selected":"")+'>جديد</option><option value="processing" '+(o.status==="processing"?"selected":"")+'>قيد المعالجة</option><option value="completed" '+(o.status==="completed"?"selected":"")+'>مكتمل</option><option value="cancelled" '+(o.status==="cancelled"?"selected":"")+'>ملغي</option></select><button class="mini-danger" data-order-delete="'+o.id+'">حذف</button></div></article>';}).join(""):'<p class="muted">لا توجد طلبات مطابقة.</p>';
  $("ordersList").querySelectorAll("[data-order-status]").forEach(s=>s.onchange=()=>updateOrder(s.dataset.orderStatus,s.value));
  $("ordersList").querySelectorAll("[data-order-delete]").forEach(b=>b.onclick=()=>deleteOrder(b.dataset.orderDelete));
 }
 $("orderSearch").oninput=renderOrders;$("orderFilter").onchange=renderOrders;
 async function updateOrder(id,status){const {error}=await db.from("orders").update({status}).eq("id",id);if(error){showMessage(error.message,true);return;}await log("تحديث حالة طلب",id+" → "+status);await loadDashboard();}
 async function deleteOrder(id){if(!confirm("هل تريد حذف هذا الطلب نهائياً؟"))return;const {error}=await db.from("orders").delete().eq("id",id);if(error){showMessage(error.message,true);return;}await log("حذف طلب",id);await loadDashboard();}
 function renderRecentOrders(){const rows=cache.orders.slice(0,5);$("recentOrders").innerHTML=rows.length?rows.map(o=>'<article class="admin-item"><div><b>'+esc(o.customer_name||"زبون")+'</b><small>'+esc(o.phone||"")+' · '+fmt(o.created_at)+'</small></div><span class="status-pill '+esc(o.status)+'">'+statusName(o.status)+'</span></article>').join(""):'<p class="muted">لا توجد طلبات بعد.</p>';}
 function statusName(s){return ({new:"جديد",processing:"قيد المعالجة",completed:"مكتمل",cancelled:"ملغي"})[s]||s;}
 function renderCustomers(){$("customersList").innerHTML=cache.customers.length?cache.customers.map(c=>'<article class="admin-item"><div><b>'+esc(c.full_name||"زبون")+'</b><small>تاريخ إنشاء الحساب: '+fmt(c.created_at)+'</small></div></article>').join(""):'<p class="muted">لا توجد حسابات زبائن مسجلة بعد. يمكن للزوار التسوق دون حساب.</p>';}
 function renderVisitors(){
  const now=Date.now(),online=cache.visitors.filter(v=>new Date(v.last_seen).getTime()>now-300000),today=new Date();today.setHours(0,0,0,0);const week=Date.now()-7*86400000;
  $("onlineCount").textContent=online.length;$("todayCount").textContent=cache.visits.filter(v=>new Date(v.visited_at).getTime()>=today.getTime()).length;$("weekCount").textContent=cache.visits.filter(v=>new Date(v.visited_at).getTime()>=week).length;
  $("onlineList").innerHTML=online.length?online.map(v=>'<article class="admin-item"><div><b><span class="live-dot"></span> زائر متصل</b><small>'+esc(v.page_path)+' · آخر نشاط '+fmt(v.last_seen)+'</small></div></article>').join(""):'<p class="muted">لا يوجد زوار نشطون خلال آخر 5 دقائق حالياً.</p>';
  $("visitsList").innerHTML=cache.visits.slice(0,30).map(v=>'<article class="admin-item"><div><b>'+esc(v.page_path||"/")+'</b><small>'+fmt(v.visited_at)+'</small></div></article>').join("")||'<p class="muted">لا توجد زيارات مسجلة بعد.</p>';
 }
 $("refreshVisitors").onclick=loadDashboard;
 $("newCouponBtn").onclick=()=>{$("couponForm").hidden=false;$("couponForm").reset();$("couponActive").checked=true;};
 $("cancelCoupon").onclick=()=>$("couponForm").hidden=true;
 $("couponCode").oninput=()=>{$("couponCode").value=$("couponCode").value.toUpperCase().replace(/[^A-Z0-9_-]/g,"");};
 $("couponForm").onsubmit=async e=>{e.preventDefault();const val=Number($("couponValue").value),type=$("couponType").value;if(type==="percent"&&val>100){showMessage("النسبة لا يمكن أن تتجاوز 100%.",true);return;}const payload={code:$("couponCode").value.trim().toUpperCase(),discount_type:type,discount_value:val,subscription_id:$("couponPlan").value||null,max_uses:$("couponMax").value?Number($("couponMax").value):null,ends_at:localIso($("couponEnd").value),is_active:$("couponActive").checked};const {error}=await db.from("coupon_codes").insert(payload);if(error){showMessage(error.message,true);return;}await log("إنشاء كود خصم",payload.code);$("couponForm").hidden=true;showMessage("تم إنشاء كود الخصم.");await loadDashboard();};
 function renderCoupons(){$("couponsList").innerHTML=cache.coupons.length?cache.coupons.map(c=>'<article class="admin-item"><div><b class="coupon-code">'+esc(c.code)+'</b><small>'+esc(c.discount_type==="percent"?c.discount_value+"% خصم":c.discount_value+" مبلغ خصم")+' · الاستخدامات '+esc(c.used_count)+' / '+esc(c.max_uses??"∞")+' · '+(c.is_active?"فعال":"متوقف")+'</small></div><div class="item-actions"><button data-coupon-toggle="'+c.id+'">'+(c.is_active?"إيقاف":"تفعيل")+'</button><button class="danger" data-coupon-delete="'+c.id+'">حذف</button></div></article>').join(""):'<p class="muted">لم تنشئ أكواد خصم بعد.</p>';
  $("couponsList").querySelectorAll("[data-coupon-toggle]").forEach(b=>b.onclick=async()=>{const c=cache.coupons.find(x=>x.id===b.dataset.couponToggle);const {error}=await db.from("coupon_codes").update({is_active:!c.is_active}).eq("id",c.id);if(error){showMessage(error.message,true);return;}await log("تغيير كود خصم",c.code);await loadDashboard();});
  $("couponsList").querySelectorAll("[data-coupon-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("حذف كود الخصم؟"))return;const c=cache.coupons.find(x=>x.id===b.dataset.couponDelete);const {error}=await db.from("coupon_codes").delete().eq("id",c.id);if(error){showMessage(error.message,true);return;}await log("حذف كود خصم",c.code);await loadDashboard();});
 }
 $("newOfferBtn").onclick=()=>{$("offerForm").hidden=false;$("offerForm").reset();$("offerActive").checked=true;};
 $("cancelOffer").onclick=()=>$("offerForm").hidden=true;
 $("offerForm").onsubmit=async e=>{e.preventDefault();const payload={title:$("offerTitle").value.trim(),subscription_id:$("offerPlan").value||null,discount_type:$("offerType").value,discount_value:Number($("offerValue").value),ends_at:localIso($("offerEnd").value),description:$("offerDescription").value.trim()||null,is_active:$("offerActive").checked};if(!payload.subscription_id){showMessage("اختر الباقة التي تريد تطبيق العرض عليها.",true);return;}const {error}=await db.from("offers").insert(payload);if(error){showMessage(error.message,true);return;}await log("إنشاء عرض",payload.title);$("offerForm").hidden=true;showMessage("تم نشر العرض.");await loadDashboard();};
 function renderOffers(){$("offersList").innerHTML=cache.offers.length?cache.offers.map(o=>{const p=cache.plans.find(x=>x.id===o.subscription_id);return '<article class="admin-item"><div><b>'+esc(o.title)+'</b><small>'+esc(p?.name||"كل الباقات")+' · '+esc(o.discount_value)+(o.discount_type==="percent"?"%":"")+' · '+(o.is_active?"منشور":"متوقف")+'</small></div><div class="item-actions"><button data-offer-toggle="'+o.id+'">'+(o.is_active?"إيقاف":"تفعيل")+'</button><button class="danger" data-offer-delete="'+o.id+'">حذف</button></div></article>';}).join(""):'<p class="muted">لا توجد عروض منشورة بعد.</p>';
  $("offersList").querySelectorAll("[data-offer-toggle]").forEach(b=>b.onclick=async()=>{const o=cache.offers.find(x=>x.id===b.dataset.offerToggle);const {error}=await db.from("offers").update({is_active:!o.is_active}).eq("id",o.id);if(error){showMessage(error.message,true);return;}await log("تغيير حالة عرض",o.title);await loadDashboard();});
  $("offersList").querySelectorAll("[data-offer-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("حذف هذا العرض؟"))return;const o=cache.offers.find(x=>x.id===b.dataset.offerDelete);const {error}=await db.from("offers").delete().eq("id",o.id);if(error){showMessage(error.message,true);return;}await log("حذف عرض",o.title);await loadDashboard();});
 }
 $("newAdBtn").onclick=()=>{$("adForm").hidden=false;$("adForm").reset();$("adActive").checked=true;$("adPreview").textContent="معاينة الصورة ستظهر هنا";$("adPreview").style.backgroundImage="";};
 $("cancelAd").onclick=()=>$("adForm").hidden=true;
 $("adImage").onchange=()=>{const file=$("adImage").files[0];if(!file)return;if(file.size>5*1024*1024){showMessage("حجم الصورة أكبر من 5 ميغابايت.",true);$("adImage").value="";return;}const url=URL.createObjectURL(file);$("adPreview").style.backgroundImage='url("'+url+'")';$("adPreview").textContent="";};
 $("adForm").onsubmit=async e=>{e.preventDefault();const file=$("adImage").files[0];if(!file){showMessage("اختر صورة الإعلان أولاً.",true);return;}if(file.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type)){showMessage("الصورة يجب أن تكون JPG أو PNG أو WEBP وبحجم لا يتجاوز 5MB.",true);return;}
  showMessage("جارٍ رفع صورة الإعلان...");const path=Date.now()+"-"+Math.random().toString(36).slice(2)+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"-");const up=await db.storage.from("myhd-ads").upload(path,file,{contentType:file.type,upsert:false});if(up.error){showMessage("فشل رفع الصورة: "+up.error.message,true);return;}const image=db.storage.from("myhd-ads").getPublicUrl(path).data.publicUrl;
  const payload={title:$("adTitle").value.trim(),placement:$("adPlacement").value,image_path:image,link_url:$("adLink").value.trim()||null,description:$("adDescription").value.trim()||null,ends_at:localIso($("adEnd").value),is_active:$("adActive").checked};
  const {error}=await db.from("banners").insert(payload);if(error){showMessage(error.message,true);return;}await log("إضافة إعلان",payload.title);$("adForm").hidden=true;showMessage("تم رفع الصورة ونشر الإعلان.");await loadDashboard();
 };
 function renderAds(){$("adsList").innerHTML=cache.ads.length?cache.ads.map(a=>'<article class="admin-item ad-item"><img src="'+esc(a.image_path||"")+'" alt=""><div class="ad-copy"><b>'+esc(a.title||"إعلان")+'</b><small>'+esc(a.placement||"home")+' · '+(a.is_active?"نشط":"متوقف")+' · '+(a.ends_at?"ينتهي "+fmt(a.ends_at):"دون تاريخ انتهاء")+'</small></div><div class="item-actions"><button data-ad-toggle="'+a.id+'">'+(a.is_active?"إيقاف":"تفعيل")+'</button><button class="danger" data-ad-delete="'+a.id+'">حذف</button></div></article>').join(""):'<p class="muted">لا توجد إعلانات بعد. أضف إعلانك الأول وارفع صورته.</p>';
  $("adsList").querySelectorAll("[data-ad-toggle]").forEach(b=>b.onclick=async()=>{const a=cache.ads.find(x=>x.id===b.dataset.adToggle);const {error}=await db.from("banners").update({is_active:!a.is_active}).eq("id",a.id);if(error){showMessage(error.message,true);return;}await log("تغيير حالة إعلان",a.title);await loadDashboard();});
  $("adsList").querySelectorAll("[data-ad-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("حذف الإعلان؟"))return;const a=cache.ads.find(x=>x.id===b.dataset.adDelete);const {error}=await db.from("banners").delete().eq("id",a.id);if(error){showMessage(error.message,true);return;}await log("حذف إعلان",a.title);await loadDashboard();});
 }
 function renderActivity(){$("activityList").innerHTML=cache.activity.length?cache.activity.map(x=>'<article class="admin-item"><div><b>'+esc(x.action)+'</b><small>'+esc(x.details||"")+' · '+fmt(x.created_at)+'</small></div></article>').join(""):'<p class="muted">سيظهر هنا سجل التعديلات والإجراءات التي تنفذها الإدارة.</p>';}
 $("exportOrders").onclick=()=>{const rows=[["الاسم","الهاتف","الحالة","التاريخ","ملاحظات"],...cache.orders.map(o=>[o.customer_name,o.phone,statusName(o.status),fmt(o.created_at),o.notes||""])];const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="myhd-orders.csv";a.click();URL.revokeObjectURL(a.href);};
 verify();
})();