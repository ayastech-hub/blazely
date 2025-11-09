//format.js
export function usd(n){ return n ? `$${Number(n).toLocaleString()}` : "$0"; }
export function short(a) { if(!a) return ""; return a.slice(0,6) + "..." + a.slice(-4); }
