import React, { useEffect, useState } from 'react';
import { Check, Languages, Loader2, Search, Sparkles, X } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { TrackColorPalette, TrackMetadata } from '../../types/music';
import { formatTime } from '../../utils/constants';
import {
  LyricTargetLanguage,
  OnlineLyricResult,
  parseLrc,
  searchOnlineLyrics,
  translateLyricsToBilingual,
} from '../../utils/lrcParser';

interface LyricsSearchModalProps {
  open: boolean;
  track: TrackMetadata | null;
  palette: TrackColorPalette;
  onClose: () => void;
  onApplyLyrics: (rawLrc: string) => void;
}

export const LyricsSearchModal: React.FC<LyricsSearchModalProps> = ({
  open,
  track,
  palette,
  onClose,
  onApplyLyrics,
}) => {
  const { updatePersonalization, showToast } = useMusic();

  const [titleQuery, setTitleQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [includeTranslation, setIncludeTranslation] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<LyricTargetLanguage>('zh-CN');
  const [loading, setLoading] = useState(false);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  const [failedTranslationId, setFailedTranslationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OnlineLyricResult[]>([]);

  useEffect(() => {
    if (open && track) {
      setTitleQuery(track.title.replace(/\(.*\)|\[.*\]/g, '').trim());
      setArtistQuery(
        track.artist === '未知艺术家' || track.artist === 'Lumina Acoustic Ensemble'
          ? ''
          : track.artist
      );
      setResults([]);
      setError(null);
      setTranslatingId(null);
      setFailedTranslationId(null);
    }
  }, [open, track]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titleQuery.trim() && !artistQuery.trim()) return;
    setLoading(true);
    setError(null);
    setFailedTranslationId(null);
    try {
      const list = await searchOnlineLyrics(titleQuery, artistQuery);
      setResults(list);
      if (list.length === 0) {
        setError('未检索到匹配的在线歌词，请尝试简化歌名或手动导入 .lrc 文件。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '在线检索失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResult = async (
    item: OnlineLyricResult,
    raw: string,
    forceOriginal = false
  ) => {
    const parsedCheck = parseLrc(raw);
    const alreadyBilingual = item.hasNativeTranslation || parsedCheck.hasTranslations;

    if (!includeTranslation || forceOriginal || alreadyBilingual) {
      if (alreadyBilingual) {
        updatePersonalization({ showBilingualLyrics: true });
        showToast('已匹配并应用双语同步歌词');
      }
      onApplyLyrics(raw);
      onClose();
      return;
    }

    setTranslatingId(item.id);
    setError(null);
    setFailedTranslationId(null);
    try {
      const res = await translateLyricsToBilingual(
        raw,
        item.trackName,
        item.artistName,
        targetLanguage
      );
      updatePersonalization({ showBilingualLyrics: true });
      onApplyLyrics(res.bilingualLyrics);
      if (res.translatedCount > 0) {
        showToast(`已完成 ${res.translatedCount} 行诗意双语译制并同步时间轴`);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '自动翻译失败';
      setError(`${msg}（可点击“仅应用原版”先使用原版歌词）`);
      setFailedTranslationId(item.id);
    } finally {
      setTranslatingId(null);
    }
  };

  if (!open || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] bg-[#1b0711]/95 backdrop-blur-2xl border border-white/14 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">智能在线歌词匹配 (多源双语)</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="p-5 border-b border-white/10 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">歌曲名称</label>
              <input
                type="text"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                placeholder="输入歌名..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/8 border border-white/12 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/35"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">艺术家 (可选)</label>
              <input
                type="text"
                value={artistQuery}
                onChange={(e) => setArtistQuery(e.target.value)}
                placeholder="输入歌手..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/8 border border-white/12 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/35"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-2 text-xs text-white/85 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTranslation}
                  onChange={(e) => setIncludeTranslation(e.target.checked)}
                  className="accent-rose-500 w-4 h-4 rounded"
                />
                <Sparkles className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span>自动附带诗意翻译</span>
              </label>

              {includeTranslation && (
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as LyricTargetLanguage)}
                  aria-label="翻译目标语言"
                  className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-xs text-white/90 focus:outline-none"
                >
                  <option value="zh-CN" className="bg-[#1b0711]">简体中文 (诗意)</option>
                  <option value="zh-TW" className="bg-[#1b0711]">繁體中文 (詩意)</option>
                  <option value="en" className="bg-[#1b0711]">English</option>
                  <option value="ja" className="bg-[#1b0711]">日本語</option>
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || translatingId !== null}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              搜索 LRC 歌词
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto lumina-scroll p-4 space-y-2.5">
          {error && (
            <p className="text-xs text-rose-300/90 text-center py-3 px-2">{error}</p>
          )}

          {results.map((item) => {
            const raw = item.syncedLyrics || item.plainLyrics;
            if (!raw) return null;
            const isSynced = Boolean(item.syncedLyrics);
            const isTranslating = translatingId === item.id;
            const showOriginalFallback = failedTranslationId === item.id;
            const hasNativeTrans = Boolean(item.hasNativeTranslation);

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {item.trackName}
                  </p>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    {item.artistName}
                    {item.albumName ? ` · ${item.albumName}` : ''}
                    {item.duration ? ` · ${formatTime(item.duration)}` : ''}
                    {item.source ? ` · ${item.source}` : ''}
                    {' · '}
                    <span className={isSynced ? 'text-emerald-300' : 'text-white/50'}>
                      {isSynced ? '带时间轴 LRC' : '纯文本'}
                    </span>
                    {hasNativeTrans && (
                      <span className="text-rose-300"> · 自带双语译文</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {showOriginalFallback && (
                    <button
                      type="button"
                      onClick={() => handleApplyResult(item, raw, true)}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/18 text-xs font-medium text-white/85 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      仅应用原版
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={translatingId !== null}
                    onClick={() => handleApplyResult(item, raw, false)}
                    className="px-3.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>诗意译制中...</span>
                      </>
                    ) : hasNativeTrans ? (
                      <>
                        <Languages className="w-3.5 h-3.5" />
                        <span>应用双语</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{includeTranslation ? '诗意双语' : '应用'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
