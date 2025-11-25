/**
 * IMPORTANT: This simulation engine has been disabled.
 * 
 * The simulation logic requires admin/service role access and should NOT run
 * in client-side code. It exposes the service role key to the browser.
 * 
 * To re-enable simulations:
 * 1. Create a Supabase Edge Function (e.g., 'run-simulation')
 * 2. Move this logic to the edge function where service role key is secure
 * 3. Schedule the edge function using pg_cron or external cron service
 * 4. Call the edge function via HTTP when needed
 * 
 * See: https://supabase.com/docs/guides/functions/schedule-functions
 */

export interface SimulationResult {
    trades: number;
    posts: number;
    messages: number;
    errors: string[];
}

export async function runDailySimulation(): Promise<SimulationResult> {
    console.warn('Simulation engine is disabled for security reasons. Move to Edge Function.');
    
    return {
        trades: 0,
        posts: 0,
        messages: 0,
        errors: ['Simulation disabled - move to Edge Function for security'],
    };
}
