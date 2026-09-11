function send(res,status,body){res.status(status).json(body)}
function config(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Database is not configured.');return {url,key}}
async function supabase(path,options={}){const {url,key}=config();const response=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:'return=representation',...(options.headers||{})}});const text=await response.text();if(!response.ok)throw new Error(text||`Database error ${response.status}`);return text?JSON.parse(text):[]}
function owner(req){return Boolean(process.env.OWNER_KEY&&req.headers['x-owner-key']===process.env.OWNER_KEY)}
const allowed=['source_url','role','company','location','description','employment_type','salary','date_posted','valid_through','source','sector','discipline','experience_level','work_mode','deadline','published'];
function pick(input){const row={};for(const k of allowed)if(input[k]!==undefined)row[k]=input[k]===''?null:input[k];return row}
module.exports=async function handler(req,res){
 try{
  if(req.method==='GET'){const jobs=await supabase('jobs?select=*&published=eq.true&order=created_at.desc&limit=250');return send(res,200,{jobs})}
  if(req.method==='POST'){
   if(!owner(req))return send(res,401,{error:'Incorrect owner key.'});
   const row=pick(req.body||{});if(!row.source_url||!row.role)return send(res,400,{error:'Source link and role are required.'});if(!row.sector)row.sector='Private';row.published=true;
   const saved=await supabase('jobs',{method:'POST',body:JSON.stringify(row)});return send(res,201,{job:saved[0]});
  }
  if(req.method==='PATCH'){
   if(!owner(req))return send(res,401,{error:'Incorrect owner key.'});
   const id=String(req.body?.id||'');if(!id)return send(res,400,{error:'Job ID is required.'});const row=pick(req.body||{});delete row.source_url;if(!Object.keys(row).length)return send(res,400,{error:'No changes supplied.'});
   const saved=await supabase(`jobs?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(row)});return send(res,200,{job:saved[0]});
  }
  if(req.method==='DELETE'){
   if(!owner(req))return send(res,401,{error:'Incorrect owner key.'});const id=String(req.body?.id||'');if(!id)return send(res,400,{error:'Job ID is required.'});await supabase(`jobs?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});return send(res,200,{deleted:true});
  }
  return send(res,405,{error:'Method not allowed.'});
 }catch(error){return send(res,500,{error:error.message||'Unexpected server error.'})}
};
