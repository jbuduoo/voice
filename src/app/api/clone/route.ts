import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const name = formData.get('name') as string;
        const file = formData.get('file') as Blob;
        const description = formData.get('description') as string;

        if (!file || !name) {
            return NextResponse.json({ error: '名稱與錄音檔為必填' }, { status: 400 });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;

        // Debugging logs
        console.log('Clone API called');
        console.log('API Key Presence:', !!apiKey);
        if (apiKey) console.log('API Key Length:', apiKey.length);

        if (!apiKey) {
            console.error('Missing ElevenLabs API Key in environment');
            return NextResponse.json({ error: '伺服器配置錯誤 (API Key)' }, { status: 500 });
        }

        // Prepare ElevenLabs API request
        const elevenLabsFormData = new FormData();
        elevenLabsFormData.append('name', name);
        elevenLabsFormData.append('files', file, 'recording.webm');
        if (description) {
            elevenLabsFormData.append('description', description);
        }

        // ElevenLabs requires labels to be JSON string if provided
        elevenLabsFormData.append('labels', JSON.stringify({ source: 'MyVoiceClone-Native' }));

        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: elevenLabsFormData,
        });

        const data = await response.json();

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Clone Error:', response.status, errorText);
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(
                    { error: errorJson.detail?.message || '克隆語音失敗' },
                    { status: response.status }
                );
            } catch {
                return NextResponse.json(
                    { error: `API 錯誤 (${response.status}): ${errorText.substring(0, 100)}` },
                    { status: response.status }
                );
            }
        }

        return NextResponse.json({
            success: true,
            voice_id: data.voice_id,
            name: name
        });
    } catch (error) {
        console.error('Clone API Error:', error);
        return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
    }
}
