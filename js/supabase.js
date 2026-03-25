// Supabase Configuration
const SUPABASE_URL = 'https://cjwstuvzrybqczbbtxuj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N0dXZ6cnlicWN6YmJ0eHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTA2ODUsImV4cCI6MjA4OTk4NjY4NX0.5UXP1mx1JaXHI2JMVgvD3atnxLmqaTtq-mtlel7fPyA';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helper
async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function isAdmin() {
  const user = await getCurrentUser();
  return user && user.email && user.email.startsWith('admin@');
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = '/login.html';
}