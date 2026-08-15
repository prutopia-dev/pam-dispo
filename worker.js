// Worker : sert le site statique (public/) + une petite API pour les inscriptions
// aux permanences, stockée dans Workers KV.

const KV_KEY = 'permanences-data';
const MAX_NAME_LEN = 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/permanences') {
      return handleApi(request, env);
    }

    // Tout le reste : fichiers statiques (public/index.html, etc.)
    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env) {
  if (request.method === 'GET') {
    const data = (await env.PERMANENCES.get(KV_KEY, 'json')) || {};
    return jsonResponse(data);
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'JSON invalide' }, 400);
    }

    const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LEN) : '';
    const action = body.action;

    if (!slotId || !name) {
      return jsonResponse({ error: 'slotId et name sont requis' }, 400);
    }
    if (action !== 'add' && action !== 'remove') {
      return jsonResponse({ error: "action doit valoir 'add' ou 'remove'" }, 400);
    }

    const data = (await env.PERMANENCES.get(KV_KEY, 'json')) || {};
    const list = Array.isArray(data[slotId]) ? data[slotId] : [];

    if (action === 'add') {
      if (!list.includes(name)) list.push(name);
    } else {
      const idx = list.indexOf(name);
      if (idx > -1) list.splice(idx, 1);
    }

    if (list.length > 0) {
      data[slotId] = list;
    } else {
      delete data[slotId];
    }

    await env.PERMANENCES.put(KV_KEY, JSON.stringify(data));
    return jsonResponse(data);
  }

  return jsonResponse({ error: 'Méthode non supportée' }, 405);
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
