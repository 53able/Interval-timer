import { useState } from "react";
import { usePresetStore } from "@/stores/preset-store";
import { PresetSchema } from "@/schemas/timer";
import type { Phase } from "@/schemas/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** EditorPage のプロパティ型 */
type EditorPageProps = {
  /** 編集対象のプリセットID */
  readonly presetId: string;
  /** ホーム画面に戻るコールバック */
  readonly onGoHome: () => void;
};

/** フェーズの初期値を生成する */
const createDefaultPhase = (): Phase => ({
  id: crypto.randomUUID(),
  type: "work",
  label: "WORK",
  durationSec: 20,
  color: "#4CAF50",
});

/**
 * プリセット編集画面コンポーネント
 *
 * 既存プリセットの編集に特化。
 * フォームは制御コンポーネント（useState）で管理し、保存時にZodバリデーションを実行する。
 */
export const EditorPage = ({ presetId, onGoHome }: EditorPageProps) => {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);

  const existingPreset = presets.find((p) => p.id === presetId);

  const [name, setName] = useState(existingPreset?.name ?? "");
  const [totalRounds, setTotalRounds] = useState(
    existingPreset?.totalRounds ?? 1,
  );
  const [prepareSec, setPrepareSec] = useState(
    existingPreset?.prepareSec ?? 10,
  );
  const [phases, setPhases] = useState<Phase[]>(
    existingPreset?.phases ?? [],
  );

  /** フェーズを追加する */
  const handleAddPhase = () => {
    setPhases((prev) => [...prev, createDefaultPhase()]);
  };

  /** 指定IDのフェーズを削除する */
  const handleRemovePhase = (phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
  };

  /** プリセットを保存してホームに戻る */
  const handleSave = () => {
    const preset = {
      id: existingPreset?.id ?? crypto.randomUUID(),
      name,
      totalRounds,
      prepareSec,
      phases,
      createdAt: existingPreset?.createdAt ?? Date.now(),
    };

    const result = PresetSchema.safeParse(preset);
    if (!result.success) {
      return;
    }

    addPreset(result.data);
    onGoHome();
  };

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a] p-4 text-white">
      <header className="mb-6 border-b border-red-900/30 pb-4">
        <h1 className="text-2xl font-black tracking-tighter">
          プリセット編集
        </h1>
      </header>

      <main className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="preset-name" className="text-sm text-neutral-400">プリセット名</Label>
          <Input
            id="preset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: My Workout"
            className="border-red-900/30 bg-neutral-900 focus:border-red-600"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="total-rounds" className="text-sm text-neutral-400">ラウンド数</Label>
          <Input
            id="total-rounds"
            type="number"
            min={1}
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            className="border-red-900/30 bg-neutral-900 font-mono focus:border-red-600"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="prepare-sec" className="text-sm text-neutral-400">準備時間（秒）</Label>
          <Input
            id="prepare-sec"
            type="number"
            min={0}
            value={prepareSec}
            onChange={(e) => setPrepareSec(Number(e.target.value))}
            className="border-red-900/30 bg-neutral-900 font-mono focus:border-red-600"
          />
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">フェーズ</h2>
            <Button
              onClick={handleAddPhase}
              className="bg-red-600 transition-all duration-200 hover:scale-105 hover:bg-red-500 active:scale-95"
            >
              フェーズ追加
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {phases.map((phase) => (
              <div
                key={phase.id}
                data-testid="phase-item"
                className="flex items-center justify-between rounded-md border border-red-900/30 bg-neutral-900 p-3 transition-colors hover:border-red-800/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-4 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                  <span className="font-bold">{phase.label}</span>
                  <span className="font-mono text-neutral-500">
                    {phase.durationSec}秒
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemovePhase(phase.id)}
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            className="bg-red-600 transition-all duration-200 hover:scale-105 hover:bg-red-500 active:scale-95"
          >
            保存
          </Button>
          <Button
            variant="secondary"
            onClick={onGoHome}
            className="transition-all duration-200 hover:scale-105 active:scale-95"
          >
            キャンセル
          </Button>
        </div>
      </main>
    </div>
  );
};
