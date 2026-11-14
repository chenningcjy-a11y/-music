import { parseLrc } from '../../utils/lrcParser';

export type LyricTranslationStyle =
  | 'literal'
  | 'natural'
  | 'poetic'
  | 'literary'
  | 'bilingual';

interface TranslateOptions {
  rawLyrics: string;
  trackTitle?: string;
  artistName?: string;
  targetLanguage?: string;
  style?: LyricTranslationStyle;
  providerId?: string;
  modelName?: string;
}

export async function translateLyricsWithAiEngine(
  opts: TranslateOptions
): Promise<{
  bilingualLyrics: string;
  translatedCount: number;
  skippedReason?: string;
}> {
  const res = await fetch('/api/lyrics/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawLyrics: opts.rawLyrics,
      trackTitle: opts.trackTitle,
      artistName: opts.artistName,
      targetLanguage: opts.targetLanguage || 'zh-CN',
      style: opts.style || 'poetic',
      providerId: opts.providerId,
      modelName: opts.modelName,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error || `AI 歌词翻译失败 (${res.status})`);
  }

  return payload as {
    bilingualLyrics: string;
    translatedCount: number;
    skippedReason?: string;
  };
}
