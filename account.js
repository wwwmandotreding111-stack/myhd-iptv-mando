(() => {
 const cfg=window.MYHD_CONFIG||{},msg=document.getElementById("authMessage");
 if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.startsWith("PASTE_")||!cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_")){
  msg.textContent="لم يتم ربط قاعدة بيانات MYHD بعد.";document.getElementById("loginBtn").disabled=true;document.getElementById("signupBtn").disabled=true;return;
 }
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const $=id=>document.getElementById(id);
 async function refresh(){
  const {data:{session}}=await db.auth.getSession();
  $("authForms").hidden=!!session;$("accountState").hidden=!session;
  if(session){$("welcome").textContent="أهلاً بك";$("accountInfo").textContent=session.user.email||"تم تسجيل الدخول.";}
 }
 $("loginBtn").onclick=async()=>{msg.textContent="جارٍ تسجيل الدخول...";const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});msg.textContent=error?error.message:"تم تسجيل الدخول.";if(!error)refresh();};
 $("signupBtn").onclick=async()=>{msg.textContent="جارٍ إنشاء الحساب...";const {error}=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value});msg.textContent=error?error.message:"تم إنشاء الحساب. افحص بريدك الإلكتروني إذا كان تأكيد البريد مفعّلاً.";};
 $("logoutBtn").onclick=async()=>{await db.auth.signOut();msg.textContent="تم تسجيل الخروج.";refresh();};
 db.auth.onAuthStateChange(()=>refresh());refresh();
})();