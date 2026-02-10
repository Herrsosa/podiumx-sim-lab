import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUNO_API_BASE = 'https://api.sunoapi.org/api/v1'
const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('SUNO_API_KEY configured:', !!SUNO_API_KEY)

        if (!SUNO_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'SUNO_API_KEY not configured in Supabase secrets' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { prompt, style, title, instrumental, vocalGender } = await req.json()
        console.log('Received request:', { title, style: style?.substring(0, 50) })

        if (!prompt || !style || !title) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: prompt, style, title' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call Suno API
        console.log('Calling Suno API...')
        const response = await fetch(`${SUNO_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUNO_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'V5',
                customMode: true,
                instrumental: instrumental || false,
                prompt,
                style,
                title,
                vocalGender: vocalGender || 'm',
            }),
        })

        const responseText = await response.text()
        console.log('Suno API response status:', response.status)
        console.log('Suno API response body:', responseText)

        if (!response.ok) {
            console.error('Suno API error:', responseText)
            return new Response(
                JSON.stringify({ error: `Suno API error: ${response.status} - ${responseText}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        let data
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON response from Suno API' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Try multiple possible field names for the task ID
        const taskId = data.taskId || data.task_id || data.id || data.data?.id || data.data?.taskId

        if (!taskId) {
            console.error('No taskId found in response:', JSON.stringify(data))
            return new Response(
                JSON.stringify({
                    error: 'No taskId in Suno API response',
                    rawResponse: data
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Successfully got taskId:', taskId)
        return new Response(
            JSON.stringify({ taskId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

