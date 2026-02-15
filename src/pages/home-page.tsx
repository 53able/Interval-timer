import { usePresetStore } from "@/stores/preset-store";
import { PresetCard } from "@/components/preset-card";

/** HomePage のプロパティ型 */
type HomePageProps = {
  /** タイマー開始時のコールバック（プリセットIDを受け取る） */
  readonly onStartTimer: (presetId: string) => void;
  /** プリセット編集時のコールバック（プリセットIDを受け取る） */
  readonly onEditPreset: (presetId: string) => void;
};

/**
 * ホーム画面コンポーネント
 *
 * プリセット一覧をカード形式で表示し、各カードからタイマー開始・編集・削除を行える。
 * オブジェクト指向UIの原則に基づき、プリセット（オブジェクト）を選択してからアクションを実行する。
 *
 * P5テーマ: 赤×黒の配色、タイトルの文字詰め、明度による階層化
 */
export const HomePage = ({
  onStartTimer,
  onEditPreset,
}: HomePageProps) => {
  const presets = usePresetStore((s) => s.presets);
  const removePreset = usePresetStore((s) => s.removePreset);

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a] p-4 text-white">
      <header className="mb-6 border-b border-red-900/30 pb-4">
        <h1 className="text-2xl font-black tracking-tighter">
          Interval Timer
        </h1>
      </header>
      <main className="flex flex-col gap-4">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onStart={onStartTimer}
            onEdit={onEditPreset}
            onDelete={removePreset}
          />
        ))}
      </main>
    </div>
  );
};
