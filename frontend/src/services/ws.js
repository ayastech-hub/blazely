//ws.js
// Lightweight WS wrapper with reconnect and subscribe interface
let ws = null;
let manualClose = false;
const listeners = new Map();

function baseUrl(){
  const env = import.meta.env.VITE_BACKEND_WS || import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const url = env.replace(/^http/, "ws");
  return url.endsWith("/") ? url + "ws" : url + "/ws";
}

function connect(){
  if(ws && ws.readyState === WebSocket.OPEN) return;
  const url = baseUrl();
  console.debug("[WS] connect ->", url);
  ws = new WebSocket(url);

  ws.onopen = ()=> emit("_open", {});
  ws.onmessage = (e)=>{
    try {
      const m = JSON.parse(e.data);
      if(m.event) emit(m.event, m.payload);
      else emit("message", m);
    } catch(err){ console.error("[WS] parseErr", err); }
  };
  ws.onclose = (ev)=>{
    emit("_close", ev);
    if(!manualClose){ setTimeout(connect, 700); console.warn("[WS] reconnecting..."); }
  };
  ws.onerror = (err)=> console.error("[WS] error", err);
}

export function subscribe(event, fn){
  if(!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
  connect();
  return ()=> {
    const arr = listeners.get(event) || [];
    listeners.set(event, arr.filter(f=> f !== fn));
  };
}

function emit(event, payload){
  const arr = listeners.get(event) || [];
  for(const fn of arr){
    try{ fn(payload); }catch(e){ console.error("[WS listener error]", e); }
  }
}

export function close(){
  manualClose = true;
  ws && ws.close();
  ws = null;
}
