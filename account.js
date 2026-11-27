(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),msg=$("authMessage");
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){msg.textContent="تعذر الاتصال بقاعدة البيانات.";return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const planId=new URLSearchParams(location.search).get("plan");
 let selectedPlan=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function loadPlan(){
  if(!planId)return;
  const {data,error}=await db.from("subscriptions").select("id,name,price,currency,duration_months,duration_hours,is_active").eq("id",planId).eq("is_active",true).maybeSingle();
  if(error||!data){$("selectedPlan").textContent="تعذر العثور على الباقة المطلوبة.";return;}
  selectedPlan=data;
  $("selectedPlan").textContent=`${data.name} — ${data.price} ${data.currency||""}`;
  $("orderBox").hidden=false;
 }
 async function refresh(){
  const {data:{session}}=await db.auth.getSession();
  $("authForms").hidden=!!session;$("accountState").hidden=!session;
  if(session){$("welcome").textContent="أهلاً بك";$("accountInfo").textContent=session.user.email||"تم تسجيل الدخول.";}
 }
 $("loginBtn").onclick=async()=>{msg.textContent="جارٍ تسجيل الدخول...";const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});msg.textContent=error?error.message:"تم تسجيل الدخول.";if(!error)refresh();};
 $("signupBtn").onclick=async()=>{msg.textContent="جارٍ إنشاء الحساب...";const {error}=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value});msg.textContent=error?error.message:"تم إنشاء الحساب. افحص بريدك الإلكتروني إذا كان تأكيد البريد مفعّلاً.";};
 $("logoutBtn").onclick=async()=>{await db.auth.signOut();msg.textContent="تم تسجيل الخروج.";refresh();};
 $("sendOrderBtn").onclick=async()=>{
  const {data:{user}}=await db.auth.getUser();
  if(!user||!selectedPlan){$("orderMessage").textContent="سجّل الدخول واختر باقة صحيحة أولاً.";return;}
  const payload={subscription_id:selectedPlan.id,customer_id:user.id,customer_name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),notes:$("orderNotes").value.trim()||null,status:"new"};
  if(!payload.customer_name||!payload.phone){$("orderMessage").textContent="يرجى إدخال الاسم ورقم الهاتف.";return;}
  $("sendOrderBtn").disabled=true;$("orderMessage").textContent="جارٍ إرسال الطلب...";
  const {error}=await db.from("orders").insert(payload);
  $("sendOrderBtn").disabled=false;
  $("orderMessage").textContent=error?error.message:"تم إرسال طلبك بنجاح. سيتواصل معك فريق MYHD.";
 };
 db.auth.onAuthStateChange(()=>refresh());loadPlan();refresh();
})();