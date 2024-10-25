const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const db = supabase.createClient(supabaseUrl, supabaseAnonKey);

export default db;
