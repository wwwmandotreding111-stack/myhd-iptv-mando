(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),msg=$("adminMessage");
 if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.startsWith("PASTE_")||!cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_")){
  msg.textContent="لم يتم ربط قاعدة بيانات MYHD بعد."; $("adminLoginBtn").disabled=true;return;
 }
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function verify(){
  const {data:{session}}=await db.auth.getSession();if(!session){showLogin();return;}
  const {data,error}=await db.rpc("is_myhd_admin");
  if(error||data!==true){await db.auth.signOut();msg.textContent="هذا الحساب غير مخوّل للإدارة.";showLogin();return;}
  $("adminLogin").hidden=true;$("dashboard").hidden=false;await loadDashboard();
 }
 function showLogin(){$("adminLogin").hidden=false;$("dashboard").hidden=true;}
 $("adminLoginBtn").onclick=async()=>{msg.textContent="جارٍ التحقق...";const {error}=await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});if(error){msg.textContent=error.message;return;}await verify();};
 $("adminLogout").onclick=async()=>{await db.auth.signOut();showLogin();};
 $("newPlanBtn").onclick=()=>{ $("planForm").hidden=false;$("planForm").reset();$("planId").value="";};
 $("cancelPlan").onclick=()=>{$("planForm").hidden=true;};
 $("planForm").onsubmit=async e=>{
  e.preventDefault();const id=$("planId").value;
  const payload={name:$("planName").value.trim(),description:$("planDescription").value.trim(),price:Number($("planPrice").value),old_price:$("planOldPrice").value?Number($("planOldPrice").value):null,duration:$("planDuration").value.trim(),image_url:$("planImage").value.trim()||null,featured:$("planFeatured").checked,active:true};
  const result=id?await db.from("plans").update(payload).eq("id",id):await db.from("plans").insert(payload);
  if(result.error){$("dashboardMessage").textContent=result.error.message;return;}
  $("dashboardMessage").textContent="تم حفظ الباقة."; $("planForm").hidden=true;await loadDashboard();
 };
 async function loadDashboard(){
  const [p,o]=await Promise.all([db.from("plans").select("*").order("sort_order"),db.from("subscription_orders").select("id,customer_email,plan_name,status,created_at").order("created_at",{ascending:false}).limit(50)]);
  if(p.error||o.error){$("dashboardMessage").textContent=(p.error||o.error).message;return;}
  $("statPlans").textContent=p.data.length;$("statOrders").textContent=o.data.length;$("statPending").textContent=o.data.filter(x=>x.status==="pending").length;
  $("adminPlans").innerHTML=p.data.length?p.data.map(x=>`<article class="admin-item"><div><b>${esc(x.name)}</b><small>${esc(x.duration||"")} · ${esc(x.price)}</small></div><div class="item-actions"><button data-edit="${x.id}">تعديل</button><button class="danger" data-delete="${x.id}">حذف</button></div></article>`).join(""):"لم تتم إضافة باقات.";
  $("ordersList").innerHTML=o.data.length?o.data.map(x=>`<article class="admin-item"><div><b>${esc(x.plan_name)}</b><small>${esc(x.customer_email)} · ${new Date(x.created_at).toLocaleDateString("ar")}</small></div><span class="status">${esc(x.status)}</span></article>`).join(""):"لا توجد طلبات بعد.";
  $("adminPlans").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editPlan(p.data.find(x=>x.id===b.dataset.edit)));
  $("adminPlans").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deletePlan(b.dataset.delete));
 }
 function editPlan(p){$("planId").value=p.id;$("planName").value=p.name;$("planDescription").value=p.description||"";$("planPrice").value=p.price;$("planOldPrice").value=p.old_price??"";$("planDuration").value=p.duration||"";$("planImage").value=p.image_url||"";$("planFeatured").checked=!!p.featured;$("planForm").hidden=false;}
 async function deletePlan(id){if(!confirm("هل تريد حذف هذه الباقة؟"))return;const {error}=await db.from("plans").delete().eq("id",id);$("dashboardMessage").textContent=error?error.message:"تم حذف الباقة.";await loadDashboard();}
 verify();
})();