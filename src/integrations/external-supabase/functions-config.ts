// As Edge Functions de login/callback do Google (google-photos-login,
// google-photos-callback, etc.) estão hospedadas no projeto antigo do
// Lovable Cloud, onde também estão os secrets GOOGLE_PHOTOS_CLIENT_ID/SECRET.
// O banco de dados novo (external-supabase/config.ts) não hospeda funções.
export const FUNCTIONS_SUPABASE_URL = "https://iacyuixhhgejwnjjkezz.supabase.co";

export const FUNCTIONS_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhY3l1aXhoaGdlanduamprZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzkwODksImV4cCI6MjA3NDc1NTA4OX0.R8LgPMebiWCK335OwlsOwkV2Y2rFQA62igjjEd5n_yI";
