import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking database connection...');
  console.log('URL:', supabaseUrl);

  try {
    console.log('\n1. Checking countries table...');
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .limit(1);

    if (countriesError) {
      console.log('❌ Countries table error:', countriesError.message);
      console.log('   Code:', countriesError.code);
      console.log('   Details:', countriesError.details);
      console.log('   Hint:', countriesError.hint);
    } else {
      console.log('✓ Countries table exists');
      console.log('  Data:', countries);
    }

    console.log('\n2. Checking collection_results table...');
    const { data: collections, error: collectionsError } = await supabase
      .from('collection_results')
      .select('*')
      .limit(1);

    if (collectionsError) {
      console.log('❌ Collection_results table error:', collectionsError.message);
    } else {
      console.log('✓ Collection_results table exists');
      console.log('  Data:', collections);
    }

    console.log('\n3. Checking banners table...');
    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('*')
      .limit(1);

    if (bannersError) {
      console.log('❌ Banners table error:', bannersError.message);
    } else {
      console.log('✓ Banners table exists');
      console.log('  Data:', banners);
    }

    console.log('\n4. Checking inspection_results table...');
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspection_results')
      .select('*')
      .limit(1);

    if (inspectionsError) {
      console.log('❌ Inspection_results table error:', inspectionsError.message);
    } else {
      console.log('✓ Inspection_results table exists');
      console.log('  Data:', inspections);
    }

    console.log('\n=== Database Check Complete ===');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkDatabase();
