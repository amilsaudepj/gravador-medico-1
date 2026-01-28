import { NextRequest, NextResponse } from 'next/server';

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const dynamic = 'force-dynamic';

/**
 * Busca URLs dos criativos dos anúncios
 */
export async function GET(request: NextRequest) {
  try {
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const adIds = searchParams.get('adIds')?.split(',') || [];

    if (adIds.length === 0) {
      return NextResponse.json({});
    }

    const creativesMap: Record<string, string> = {};

    // Buscar criativos para cada ad_id
    await Promise.all(
      adIds.map(async (adId) => {
        try {
          const url = `https://graph.facebook.com/v19.0/${adId}?` + new URLSearchParams({
            access_token: ACCESS_TOKEN,
            fields: 'creative{effective_object_story_id,thumbnail_url,object_story_spec,image_url,video_id}'
          });

          const res = await fetch(url, { next: { revalidate: 3600 } });
          const data = await res.json();

          if (data.creative) {
            // Tentar pegar URL da thumbnail ou image
            const thumbnailUrl = data.creative.thumbnail_url;
            const imageUrl = data.creative.image_url;
            const videoId = data.creative.video_id;
            
            // Se for vídeo, tentar buscar URL do vídeo
            if (videoId) {
              creativesMap[adId] = `https://www.facebook.com/${videoId}`;
            } else if (thumbnailUrl) {
              creativesMap[adId] = thumbnailUrl;
            } else if (imageUrl) {
              creativesMap[adId] = imageUrl;
            } else if (data.creative.effective_object_story_id) {
              // Link para o post no Facebook/Instagram
              creativesMap[adId] = `https://www.facebook.com/${data.creative.effective_object_story_id}`;
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar criativo ${adId}:`, error);
        }
      })
    );

    return NextResponse.json(creativesMap);
  } catch (error) {
    console.error('Erro ao buscar URLs de criativos:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
