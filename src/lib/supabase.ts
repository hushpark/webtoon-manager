import { createClient } from '@supabase/supabase-js';

// 🎯 API Keys 메뉴에서 복사한 주소와 anon key를 여기에 직접 넣어주세요.
const supabaseUrl = 'https://hatiediksxugptftfalc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdGllZGlrc3h1Z3B0ZnRmYWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTQ1OTUsImV4cCI6MjEwNDEzMDU5NX0.Hb9D-GpjhBSb5zIVC-pHpf3Y36khSrWgO7vJOjFN09c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
