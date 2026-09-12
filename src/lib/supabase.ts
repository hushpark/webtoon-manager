import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmboamnuoajpishhqrty.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm9hbW51b2FqcGlzaGhxcnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzA2MDYsImV4cCI6MjEwMjI0NjYwNn0.qGO0BsiAzHUnd4Z8gmffxoB-ZIMc26XAlhYgBVwCz7s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
