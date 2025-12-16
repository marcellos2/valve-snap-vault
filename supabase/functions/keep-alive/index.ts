import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Simple query to keep the database active
    const { count, error } = await supabase
      .from('inspection_records')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log('Keep-alive ping with error:', error.message)
    } else {
      console.log('Keep-alive ping successful, records count:', count)
    }

    return new Response(
      JSON.stringify({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        records: count 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Keep-alive error:', errorMessage)
    return new Response(
      JSON.stringify({ status: 'error', message: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
