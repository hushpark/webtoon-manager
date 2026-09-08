import { createClient } from '@supabase/supabase-js';

// 🎯 API Keys 메뉴에서 복사한 주소와 anon key를 여기에 직접 넣어주세요.
const supabaseUrl = 'https://fmboamnuoajpishhqrty.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm9hbW51b2FqcGlzaGhxcnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzA2MDYsImV4cCI6MjEwMjI0NjYwNn0.qGO0BsiAzHUnd4Z8gmffxoB-ZIMc26XAlhYgBVwCz7s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
