// webflow_js/src/auth.js


export function initializeSupabase() {
  if (!window.supabase) {
    console.error('Supabase client not initialized');
    return false;
  }
  return true;
}

export async function getUserId() {
  if (!window.supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  const { data: { user } } = await window.supabase.auth.getUser();
  return user ? user.id : null;
}

export async function handleSignIn(email, password) {
  if (!window.supabase) {
    console.error('Supabase client not initialized');
    return { error: 'Client not initialized' };
  }

  try {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Sign-in error:', error.message);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Sign-in error:', error);
    return { error };
  }
}


export async function checkAuthStateAndUpdateUI() {
  const { data: { session } } = await window.supabase.auth.getSession();
  const authButton = document.getElementById('authButton');
  
  if (authButton) {
    authButton.textContent = session ? 'Sign Out' : 'Sign In / Up';
  }

  return !!session;  // returns true if logged in, false if not
}