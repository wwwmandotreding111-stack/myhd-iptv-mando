(() => {
 const cfg=window.MYHD_CONFIG||{},$=id=>document.getElementById(id),form=$("checkoutForm");
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$("orderMessage").textContent="تعذر الاتصال بالخدمة حالياً.";form.hidden=true;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
 const planId=new URLSearchParams(location.search).get("plan");let plan=null;
 const duration=p=>p.duration_hours?(`${p.duration_hours} ساعة`):(p.duration_months?(`${p.duration_months} شهر`):"");
 async function loadPlan(){
  if(!planId){$("selectedPlanName").textContent="لم تختر باقة";form.hidden=true;return;}
  const {data,error}=await db.from("subscriptions").select("id,name,category,duration_months,duration_hours,price,currency,is_active").eq("id",planId).eq("is_active",true).maybeSingle();
  if(error||!data){$("selectedPlanName").textContent="الباقة غير متاحة حالياً";form.hidden=true;return;}
  plan=data;$("selectedPlanName").textContent=data.name;$("selectedPlanDetails").textContent=[duration(data),data.price+" "+(data.currency||"")].filter(Boolean).join(" · ");
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),notes=$("orderNotes").value.trim();
  if(!plan||!name||!phone)return;
  const digits=String(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!digits){$("orderMessage").textContent="رقم واتساب الإدارة غير مضبوط بعد. يرجى المحاولة لاحقاً.";return;}
  const btn=$("sendOrderBtn");btn.disabled=true;$("orderMessage").textContent="جارٍ حفظ طلبك...";
  try{
   // Do not request returned rows: anonymous customers are intentionally allowed to INSERT orders but not SELECT them.
   const {error}=await db.from("orders").insert({subscription_id:plan.id,customer_id:null,customer_name:name,phone,notes:notes||null,status:"new"});
   if(error)throw error;
   const message=[
    "طلب اشتراك جديد - MYHD IPTV MANDO",
    "الاسم: "+name,
    "رقم العميل: "+phone,
    "الباقة: "+plan.name,
    "المدة: "+(duration(plan)||"حسب الباقة"),
    "السعر: "+plan.price+" "+(plan.currency||""),
    notes?"ملاحظات: "+notes:""
   ].filter(Boolean).join("\n");
   $("orderMessage").textContent="تم حفظ الطلب. سيتم فتح واتساب لإرساله إليك.";
   location.href="https://wa.me/"+digits+"?text="+encodeURIComponent(message);
  }catch(error){
   console.error("MYHD order save failed:",error);
   $("orderMessage").textContent="تعذر حفظ الطلب حالياً. تأكد من اتصال الإنترنت وحاول مجدداً.";
   btn.disabled=false;
  }
 });
 loadPlan();
})();