import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

// Rate limiting setup
const ratelimit = new LRUCache<string, number>({
    max: 500,
    ttl: 60 * 1000, // 1 minute
});

const MAX_REQUESTS_PER_MINUTE = 5;

export async function POST(req: NextRequest) {
    try {
        const {
            text,
            voiceId: requestedVoiceId,
            stability = 0.5,
            similarity_boost = 0.75,
            style = 0,
            use_speaker_boost = true
        } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: '文字不得為空' }, { status: 400 });
        }

        if (text.length > 500) {
            return NextResponse.json({ error: '文字超過 500 字限制' }, { status: 400 });
        }

        /* 暫時關閉頻率限制
        const ip = req.headers.get('x-forwarded-for') || 'anonymous';
        const currentCount = ratelimit.get(ip) || 0;
    
        if (currentCount >= MAX_REQUESTS_PER_MINUTE) {
          return NextResponse.json(
            { error: '請求過於頻繁，請稍後再試（每分鐘限 5 次）' },
            { status: 429 }
          );
        }
        ratelimit.set(ip, currentCount + 1);
        */

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = requestedVoiceId || process.env.VOICE_ID;

        if (!apiKey || !voiceId) {
            console.error('Missing ElevenLabs API Key or Voice ID');
            return NextResponse.json({ error: '伺服器配置錯誤或未提供聲音 ID' }, { status: 500 });
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability,
                        similarity_boost,
                        style,
                        use_speaker_boost,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('ElevenLabs API error:', errorData);
            return NextResponse.json(
                { error: '語音生成失敗，請檢查 API 金鑰或餘額' },
                { status: response.status }
            );
        }

        // Stream the audio response back to the client
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
    }
}
