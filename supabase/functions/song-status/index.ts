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
        if (!SUNO_API_KEY) {
            throw new Error('SUNO_API_KEY not configured')
        }

        const { taskId } = await req.json()

        if (!taskId) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: taskId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call Suno API to get status
        const response = await fetch(`${SUNO_API_BASE}/music/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Suno API error:', errorText)
            throw new Error(`Suno API error: ${response.status}`)
        }

        const data = await response.json()

        // Map Suno response to our format
        const result: {
            status: string
            progress?: number
            song?: {
                title: string
                audio_url: string
                stream_audio_url: string
                lyrics: string
                style: string
                duration: number
                image_url?: string
            }
        } = {
            status: data.status,
            progress: data.progress,
        }

        // If completed, include song data
        if (data.status === 'completed' || data.status === 'complete') {
            result.status = 'completed'
            result.song = {
                title: data.title || data.data?.title,
                audio_url: data.audioUrl || data.audio_url || data.data?.audio_url,
                stream_audio_url: data.streamAudioUrl || data.stream_audio_url || data.data?.stream_audio_url,
                lyrics: data.lyrics || data.data?.lyrics || '',
                style: data.style || data.data?.style || '',
                duration: data.duration || data.data?.duration || 60,
                image_url: data.imageUrl || data.image_url || data.data?.image_url,
            }
        }

        return new Response(
            JSON.stringify(result),
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
    