// src/api/commentsApi.js
import { supabase } from "../lib/supabaseClient";

export async function postComment(tokenAddress, userWallet, content) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      token_address: tokenAddress.toLowerCase(),
      user_wallet: userWallet.toLowerCase(),
      content,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchComments(tokenAddress) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("token_address", tokenAddress.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
