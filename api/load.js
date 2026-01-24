import { head, list } from '@vercel/blob';

function safe(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '');
}

async function fetchJsonFromPathname(pathname) {
  const meta = await head(pathname); // meta.url を取る
  const r = await fetch(meta.url, { cache: 'no-store' });
  const txt = await r.text();
  return txt;
}

export default async function handler(req, res) {
  const kind = safe(req.query.kind);
  const cat = safe(req.query.cat);
  if (!kind || !cat) {
    res.status(400).json({ error: 'kind and cat required' });
    return;
  }

  const exact = `cats/${kind}/${cat}.json`;
  const prefixFallback = `cats/${kind}/${cat}-`; // 既存の -xxxx.json を拾う

  try {
    // 1) まず固定名を試す
    try {
      const txt = await fetchJsonFromPathname(exact);
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.status(200).send(txt);
      return;
    } catch (_) {
      // 次へ（fallback）
    }

    // 2) 次にランダムサフィックス付き（既存救済）
    const listed = await list({ prefix: prefixFallback, limit: 100 });
    const blobs = (listed?.blobs || []).filter(b => b?.pathname);

    if (blobs.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    // uploadedAt が使えるなら最新を優先
    blobs.sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return String(b.pathname).localeCompare(String(a.pathname));
    });

    const best = blobs[0].pathname;
    const txt = await fetchJsonFromPathname(best);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(200).send(txt);
  } catch (e) {
    res.status(500).json({ error: 'load failed' });
  }
}
