// api.js
import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// Base axios instance
const api = axios.create({
  baseURL: BASE + "/api/v1",
  timeout: 8000,
});

// Example wrappers with graceful fallback
export async function getTrending() {
  try {
    const r = await api.get("/tokens/trending");
    return r.data;
  } catch (e) {
    console.warn("getTrending failed:", e.message);
    return null;
  }
}

export async function getToken(tokenAddress) {
  try {
    const r = await api.get(`/tokens/${tokenAddress}`);
    return r.data;
  } catch (e) {
    console.warn("getToken failed:", e.message);
    return null;
  }
}
// Create token - backend must implement
export async function createToken(payload) {
  try {
    const formData = new FormData();
    for (const key in payload) {
      if (payload[key] !== undefined && payload[key] !== null) {
        formData.append(key, payload[key]);
      }
    }

    const r = await api.post("/create-token", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return r.data;   // ✅ clean response
  } catch (e) {
    console.error("createToken failed:", e.message);
    throw e;
  }
}


// Post comment
export async function postComment(tokenAddress, payload) {
  try {
    const r = await api.post(`/tokens/${tokenAddress}/comment`, payload);
    return r.data;
  } catch (e) {
    console.error("postComment failed:", e.message);
    throw e;
  }
}

// Profile
export async function getProfile(wallet) {
  try {
    const r = await api.get(`/profile/${wallet}`);
    return r.data;
  } catch (e) {
    console.warn("getProfile failed", e.message);
    return null;
  }
}

// Fetch recent txs
export async function getTxs(limit = 50) {
  try {
    const r = await api.get(`/txs?limit=${limit}`);
    return r.data;
  } catch (e) {
    console.warn("getTxs failed:", e.message);
    return null;
  }
}

export default api;
