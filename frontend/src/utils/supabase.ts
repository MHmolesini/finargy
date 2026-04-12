import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sntthqpdvirstblxsmzl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudHRocXBkdmlyc3RibHhzbXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDc4MjUsImV4cCI6MjA5MTU4MzgyNX0.8unc0koyTz523G4VJS1-BHWXqPhm6IJNHZkkBlRqW4E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para invocar la Edge Function de mercado
export const fetchMarketData = async (type: string = 'stocks') => {
  const { data, error } = await supabase.functions.invoke(`market-data?type=${type}`, {
    method: 'GET'
  });

  if (error) throw error;
  return data;
};
