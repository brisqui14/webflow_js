// src/auth.js

export function initializeSupabase() {
  if (!window.SUPABASE_CONFIG) {
    console.error('Supabase configuration not found');
    return;
  }
  
  window.supabase = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
}

export async function getUserId() {
  if (!window.supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  const { data: { user } } = await window.supabase.auth.getUser();
  return user ? user.id : null;
}

export async function checkAuthStateAndUpdateUI() {
  const { data: { session } } = await window.supabase.auth.getSession();
  const authButton = document.getElementById('authButton');
  
  if (authButton) {
    authButton.textContent = session ? 'Sign Out' : 'Sign In / Up';
  }

  return !!session;  // returns true if logged in, false if not
}