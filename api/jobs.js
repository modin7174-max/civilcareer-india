function send(res,status,body){res.status(status).json(body)}
function config(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Database is not configured.');return {url,key}}
async function supabase(path,options={}){const {url,key}=config();const response=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:'return=representation',...(options.headers||{})}});const text=await response.text();if(!response.ok)throw new Error(text||`Database error ${response.status}`);return text?JSON.parse(text):[]}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){const jobs=await supabase('jobs?select=*&published=eq.true&order=created_at.desc&limit=100');return send(res,200,{jobs})}
    if(req.method==='POST'){
      if(!process.env.OWNER_KEY||req.headers['x-owner-key']!==process.env.OWNER_KEY)return send(res,401,{error:'Incorrect owner key.'});
      const j=req.body||{};if(!j.source_url||!j.role)return send(res,400,{error:'Missing vacancy details.'});
      const allowed=['source_url','role','company','location','description','employment_type','salary','date_posted','valid_through','source'];const row={published:true};for(const k of allowed)if(j[k]!==undefined)row[k]=j[k]||null;
      const saved=await supabase('jobs',{method:'POST',body:JSON.stringify(row)});return send(res,201,{job:saved[0]});
    }
    return send(res,405,{error:'Method not allowed.'});
  }catch(error){return send(res,500,{error:error.message||'Unexpected server error.'})}
};
