import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Setting up database...');
  console.log('Supabase URL:', supabaseUrl);

  try {
    const sqlFilePath = path.join(__dirname, 'database-setup.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error executing SQL:', error);
      console.log('\nTrying alternative method using REST API...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error:', errorText);
        throw new Error('Failed to execute SQL via REST API');
      }

      console.log('Success via REST API!');
    } else {
      console.log('Success!');
      console.log('Data:', data);
    }

    console.log('\nVerifying tables...');
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('count');

    if (countriesError) {
      console.error('Error verifying countries table:', countriesError);
    } else {
      console.log('✓ Countries table exists');
    }

    const { data: collections, error: collectionsError } = await supabase
      .from('collection_results')
      .select('count');

    if (collectionsError) {
      console.error('Error verifying collection_results table:', collectionsError);
    } else {
      console.log('✓ Collection_results table exists');
    }

    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('count');

    if (bannersError) {
      console.error('Error verifying banners table:', bannersError);
    } else {
      console.log('✓ Banners table exists');
    }

    console.log('\nDatabase setup complete!');
  } catch (err) {
    console.error('Failed to setup database:', err);
    console.log('\n=== MANUAL SETUP REQUIRED ===');
    console.log('Please run the SQL in database-setup.sql manually in Supabase dashboard');
    console.log('Dashboard URL: https://supabase.com/dashboard');
    process.exit(1);
  }
}

setupDatabase();
