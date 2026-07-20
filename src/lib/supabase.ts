import { createClient } from "@supabase/supabase-js";

// Try to get Supabase credentials from import.meta.env, falling back to localStorage
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem("VITE_SUPABASE_URL") || "";
if (supabaseUrl.endsWith("/rest/v1/")) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith("/rest/v1")) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_KEY || 
  localStorage.getItem("VITE_SUPABASE_ANON_KEY") || 
  "";

// Fallback to placeholder/dummy credentials to avoid module-load level runtime crashes on startup.
// If actual calls are made to these, they will fail, but the React app will load perfectly and allow the user to see the UI or load from /api/config.
const finalUrl = supabaseUrl || "https://placeholder-project-id.supabase.co";
const finalKey = supabaseKey || "placeholder-key";

export const supabase = createClient(finalUrl, finalKey);

// Helper to manually update configuration at runtime if needed
export function updateSupabaseClient(url: string, key: string) {
  if (url.endsWith("/rest/v1/")) {
    url = url.slice(0, -9);
  } else if (url.endsWith("/rest/v1")) {
    url = url.slice(0, -8);
  }
  localStorage.setItem("VITE_SUPABASE_URL", url);
  localStorage.setItem("VITE_SUPABASE_ANON_KEY", key);
  window.location.reload();
}
