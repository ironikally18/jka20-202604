import { put } from '@vercel/blob';

function safe(s){
  return String(s||'').replace(/[^a-zA-Z0-9_\-]/g, '');
}

export default async function handler(req, res) {
  if(req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const token = req.headers['x-save-token'] || '';
  const expected = process.env.SAVE_TOKEN || '';
  if(!expected) {
    res.status(500).json({ error: 'SAVE_TOKEN is not set' });
    return;
  }
  if(String(token) !== String(expected)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const kind = safe(req.query.kind);
  const cat  = safe(req.query.cat);
  if(!kind || !cat) {
    res.status(400).json({ error: 'kind and cat required' });
    return;
  }

  const key = `cats/${kind}/${cat}.json`;

  try{
    const body = req.body;
    const json = (typeof body === 'string') ? body : JSON.stringify(body);

    await put(key, json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: 'save failed' });
  }
}
