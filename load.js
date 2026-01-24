import { head, get, list } from '@vercel/blob';

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

  const keyExact = `cats/${kind}/${cat}.json`;
  const prefixFallback = `cats/${kind}/${cat}-`; // 既存の -xxxx.json を拾う

  try{
    // 1) まず「固定名」を試す
    try{
      await head(keyExact);
      const blob = await get(keyExact);
      const r = await fetch(blob.url, { cache: 'no-store' });
      const txt = await r.text();
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.status(200).send(txt);
      return;
    }catch(_){
      // 次へ（fallback）
    }

    // 2) 次に「ランダムサフィックス付き」を探す（既存救済）
    const listed = await list({ prefix: prefixFallback, limit: 100 });
    const items = (listed?.blobs || []).filter(b => b && b.pathname);

    if(items.length === 0){
      res.status(404).json({ error: 'not found' });
      return;
    }

    // updatedAt があれば最新、無ければ名前順
    items.sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      if(tb !== ta) return tb - ta;
      return String(b.pathname).localeCompare(String(a.pathname));
    });

    const best = items[0];
    const blob = await get(best.pathname);
    const r = await fetch(blob.url, { cache: 'no-store' });
    const txt = await r.text();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(200).send(txt);
  }catch(e){
    // ここに来たら本当の例外（FUNCTION_INVOCATION_FAILED になり得る）なので必ずJSON返す
    res.status(500).json({ error: 'load failed' });
  }
}
