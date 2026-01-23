import { head, get } from '@vercel/blob';

function safe(s){
  return String(s||'').replace(/[^a-zA-Z0-9_\-]/g, '');
}

export default async function handler(req, res) {
  const kind = safe(req.query.kind);
  const cat  = safe(req.query.cat);
  if(!kind || !cat) {
    res.status(400).json({ error: 'kind and cat required' });
    return;
  }

  const key = `cats/${kind}/${cat}.json`;

  try{
    await head(key); // throws if not found
  }catch(e){
    res.status(404).json({ error: 'not found' });
    return;
  }

  try{
    const blob = await get(key);
    const r = await fetch(blob.url, { cache: 'no-store' });
    const txt = await r.text();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(200).send(txt);
  }catch(e){
    res.status(500).json({ error: 'load failed' });
  }
}
