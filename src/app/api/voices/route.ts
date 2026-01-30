import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: '伺服器配置錯誤 (API Key)' }, { status: 500 });
        }

        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: '獲取聲音清單失敗' },
                { status: response.status }
            );
        }

        // Filter and map voices to a simpler format
        // We can include both premade and generated voices
        const formattedVoices = data.voices.map((v: any) => ({
            id: v.voice_id,
            name: v.category === 'cloned' || v.category === 'generated'
                ? `${v.name} (我的克隆)`
                : `${v.name}${v.labels?.gender === 'female' ? ' (女聲)' : v.labels?.gender === 'male' ? ' (男聲)' : ''}`
        }));

        return NextResponse.json({ voices: formattedVoices });
    } catch (error) {
        console.error('Voices API Error:', error);
        return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
    }
}
