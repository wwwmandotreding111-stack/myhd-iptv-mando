(() => {
  const cfg=window.MYHD_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY||!window.supabase)return;
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
  const makeId=()=>window.crypto?.randomUUID?crypto.randomUUID():("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)}));
  let visitorKey="";
  try{visitorKey=localStorage.getItem("myhd_visitor_key")||makeId();localStorage.setItem("myhd_visitor_key",visitorKey);}catch{visitorKey=makeId();}
  const ping=async()=>{
    try{
      await db.from("visitor_sessions").insert({session_id:makeId(),visitor_key:visitorKey,page_path:(location.pathname||"/").slice(0,300),last_seen:new Date().toISOString()});
    }catch(e){}
  };
  const visit=async()=>{try{await db.from("site_visits").insert({page_path:(location.pathname||"/").slice(0,300)});}catch(e){}};
  visit();ping();setInterval(ping,60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)ping();});
})();