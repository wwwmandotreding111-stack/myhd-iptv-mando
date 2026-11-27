(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),msg=$("adminMessage");
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){msg.textContent="تعذر الاتصال بقاعدة البيانات.";$("adminLoginBtn").disabled=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function verify(){
  const {data:{session}}=await db.auth.getSession();if(!session){showLogin();return;}
  const {data,error}=await db.rpc("is_admin");
  if(error||data!==true){await db.auth.signOut();msg.textContent="هذا الحساب غير مخوّل للإدارة.";showLogin();return;}
  $("adminLogin").hidden=true;$("dashboard").hidden=false;await loadDashboard();
 }
 function showLogin(){$("adminLogin").hidden=false;$("dashboard").hidden=true;}
 $("adminLoginBtn").onclick=async()=>{msg.textContent="جارٍ التحقق...";const {error}=await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});if(error){msg.textContent=error.message;return;}await verify();};
 $("adminLogout").onclick=async()=>{await db.auth.signOut();showLogin();};
 $("newPlanBtn").onclick=()=>{$("planForm").hidden=false;$("planForm").reset();$("planId").value="";$("planCurrency").value="USD";$("planActive").checked=true;};
 $("cancelPlan").onclick=()=>{$("planForm").hidden=true;};
 $("planForm").onsubmit=async e=>{
  e.preventDefault();const id=$("planId").value;
  const payload={name:$("planName").value.trim(),category:$("planCategory").value.trim()||"MY HD",price:Number($("planPrice").value),currency:$("planCurrency").value.trim().toUpperCase(),duration_months:$("planMonths").value?Number($("planMonths").value):null,duration_hours:$("planHours").value?Number($("planHours").value):null,image_path:$("planImage").value.trim()||null,description:$("planDescription").value.trim()||null,is_active:$("planActive").checked};
  const result=id?await db.from("subscriptions").update(payload).eq("id",id):await db.from("subscriptions").insert(payload);
  if(result.error){$("dashboardMessage").textContent=result.error.message;return;}
  $("dashboardMessage").textContent="تم حفظ الباقة."; $("planForm").hidden=true;await loadDashboard();
 };
 async function loadDashboard(){
  const [p,o]=await Promise.all([db.from("subscriptions").select("*").order("sort_order"),db.from("orders").select("id,customer_name,phone,status,created_at,subscription_id,notes").order("created_at",{ascending:false}).limit(50)]);
  if(p.error||o.error){$("dashboardMessage").textContent=(p.error||o.error).message;return;}
  $("statPlans").textContent=p.data.filter(x=>x.is_active).length;$("statOrders").textContent=o.data.length;$("statPending").textContent=o.data.filter(x=>x.status==="new").length;
  const plansById=Object.fromEntries(p.data.map(x=>[x.id,x.name]));
  $("adminPlans").innerHTML=p.data.length?p.data.map(x=>`<article class="admin-item"><div><b>${esc(x.name)}</b><small>${esc(x.category)} · ${esc(x.price)} ${esc(x.currency)} · ${x.is_active?"نشطة":"متوقفة"}</small></div><div class="item-actions"><button data-edit="${x.id}">تعديل</button><button class="danger" data-toggle="${x.id}">${x.is_active?"إيقاف":"تفعيل"}</button></div></article>`).join(""):"لم تتم إضافة باقات.";
  $("ordersList").innerHTML=o.data.length?o.data.map(x=>`<article class="admin-item"><div><b>${esc(x.customer_name)} — ${esc(plansById[x.subscription_id]||"باقة")}</b><small>${esc(x.phone)} · ${new Date(x.created_at).toLocaleDateString("ar")} · ${esc(x.notes||"")}</small></div><select data-status="${x.id}" aria-label="حالة الطلب"><option value="new" ${x.status==="new"?"selected":""}>جديد</option><option value="processing" ${x.status==="processing"?"selected":""}>قيد المعالجة</option><option value="completed" ${x.status==="completed"?"selected":""}>مكتمل</option><option value="cancelled" ${x.status==="cancelled"?"selected":""}>ملغي</option></select></article>`).join(""):"لا توجد طلبات بعد.";
  $("adminPlans").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editPlan(p.data.find(x=>x.id===b.dataset.edit)));
  $("adminPlans").querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>togglePlan(p.data.find(x=>x.id===b.dataset.toggle)));
  $("ordersList").querySelectorAll("[data-status]").forEach(s=>s.onchange=()=>updateOrder(s.dataset.status,s.value));
 }
 function editPlan(p){$("planId").value=p.id;$("planName").value=p.name;$("planCategory").value=p.category||"";$("planPrice").value=p.price;$("planCurrency").value=p.currency||"USD";$("planMonths").value=p.duration_months??"";$("planHours").value=p.duration_hours??"";$("planImage").value=p.image_path&&/^https?:\/\//i.test(p.image_path)?p.image_path:"";$("planDescription").value=p.description||"";$("planActive").checked=!!p.is_active;$("planForm").hidden=false;}
 async function togglePlan(p){const {error}=await db.from("subscriptions").update({is_active:!p.is_active}).eq("id",p.id);$("dashboardMessage").textContent=error?error.message:"تم تحديث حالة الباقة.";await loadDashboard();}
 async function updateOrder(id,status){const {error}=await db.from("orders").update({status}).eq("id",id);$("dashboardMessage").textContent=error?error.message:"تم تحديث حالة الطلب.";await loadDashboard();}
 verify();
})();