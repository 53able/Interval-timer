import { memo } from "react";
import { X, PanelRightOpen } from "lucide-react";
import { usePresetStore } from "@/stores/preset-store";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  type Phase,
  PresetSchema,
  formatPhaseSummary,
} from "@/schemas/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/** PresetDrawer のプロパティ型 */
type PresetDrawerProps = {
  /** 現在ロード中のプリセットID */
  readonly currentPresetId: string;
  /** プリセット選択時のコールバック */
  readonly onSelectPreset: (presetId: string) => void;
  /** 現在画面に表示中のフェーズ配列（idle時はローカル編集値、実行時はストア値） */
  readonly currentPhases: readonly Phase[];
  /** 現在画面に表示中の総ラウンド数 */
  readonly currentTotalRounds: number;
  /** 現在画面に表示中の準備フェーズ秒数 */
  readonly currentPrepareSec: number;
};

/** P5モーション: ボタン共通のアニメーションクラス */
const MOTION_CLASS =
  "transition-all duration-200 hover:scale-105 active:scale-95" as const;

/**
 * 現在の表示設定からプリセットを生成する
 *
 * ステッパーで調整済みの phases / totalRounds / prepareSec を
 * プリセットスキーマに変換する。バリデーション失敗時は null を返す。
 */
const buildPresetFromSettings = (
  name: string,
  phases: readonly Phase[],
  totalRounds: number,
  prepareSec: number,
) => {
  const raw = {
    id: crypto.randomUUID(),
    name,
    totalRounds,
    prepareSec,
    phases: [...phases],
    createdAt: Date.now(),
  };
  const result = PresetSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * プリセットドロワーコンポーネント
 *
 * 右サイドドロワーでプリセット一覧を表示し、プリセット切り替え・登録・削除を行う。
 * ドロワーのUI状態（開閉、登録フォーム表示、入力値）は drawer-store で
 * localStorage に永続化される。
 *
 * **OOUI原則**: プリセット（オブジェクト）を一覧表示 → タップでアクション（選択/削除）
 *
 * **memo化**: 親（TimerPage）が running 中に毎秒再レンダリングされるが、
 * このコンポーネントの props は安定しているため不要な再レンダリングを防止する。
 */
export const PresetDrawer = memo(function PresetDrawer({
  currentPresetId,
  onSelectPreset,
  currentPhases,
  currentTotalRounds,
  currentPrepareSec,
}: PresetDrawerProps) {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);

  const isOpen = useDrawerStore((s) => s.isOpen);
  const setIsOpen = useDrawerStore((s) => s.setIsOpen);
  const isRegistering = useDrawerStore((s) => s.isRegistering);
  const setIsRegistering = useDrawerStore((s) => s.setIsRegistering);
  const newPresetName = useDrawerStore((s) => s.newPresetName);
  const setNewPresetName = useDrawerStore((s) => s.setNewPresetName);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);

  /** プリセットを選択してドロワーを閉じる */
  const handleSelectPreset = (presetId: string) => {
    onSelectPreset(presetId);
    closeDrawer();
  };

  /** 現在の設定をプリセットとして登録する */
  const handleRegister = () => {
    const trimmed = newPresetName.trim();
    if (trimmed.length === 0) return;

    const preset = buildPresetFromSettings(
      trimmed,
      currentPhases,
      currentTotalRounds,
      currentPrepareSec,
    );
    if (preset) {
      addPreset(preset);
      setIsRegistering(false);
      setNewPresetName("");
    }
  };

  /** 登録可能かどうか（画面にフェーズが表示されている場合のみ） */
  const canRegister = currentPhases.length > 0;

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
      {/* 右端サイドタブ: 縦書きで「PRESET」表示 */}
      <DrawerTrigger asChild>
        <button
          type="button"
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-red-900/30 bg-[#0a0a0a]/90 px-1.5 py-4 backdrop-blur-sm transition-colors hover:bg-neutral-900"
          aria-label="プリセット一覧を開く"
        >
          <PanelRightOpen className="size-4 text-neutral-400" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="border-red-900/30 bg-[#0a0a0a]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-black tracking-tighter text-white">
            プリセット
          </DrawerTitle>
          <DrawerDescription className="text-neutral-500">
            タップで切り替え
          </DrawerDescription>
        </DrawerHeader>

        {/* プリセット一覧（縦スクロール可能、サイドドロワーなので高さをフルに使う） */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
          {presets.map((preset) => {
            const isActive = preset.id === currentPresetId;
            return (
              <div
                key={preset.id}
                className="flex items-center gap-2"
              >
                {/* プリセット本体: タップで選択 */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex flex-1 flex-col rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98] ${
                    isActive
                      ? "border-red-600 bg-red-950/30"
                      : "border-red-900/20 bg-neutral-900 hover:border-red-800/40"
                  }`}
                >
                  <span className={`text-sm font-bold tracking-tight ${isActive ? "text-red-400" : "text-white"}`}>
                    {preset.name}
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    {formatPhaseSummary(preset)}
                  </span>
                </button>

                {/* 削除ボタン（現在選択中のプリセットは削除不可） */}
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => removePreset(preset.id)}
                    className="flex size-9 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-red-950/30 hover:text-red-400 active:scale-95"
                    aria-label={`${preset.name}を削除`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <DrawerFooter>
          {/* 登録フォーム（インライン展開） */}
          {isRegistering ? (
            <div className="flex flex-col gap-3">
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="プリセット名を入力"
                className="border-red-900/30 bg-neutral-900 text-white focus:border-red-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRegister();
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleRegister}
                  disabled={newPresetName.trim().length === 0}
                  className={`flex-1 bg-red-600 hover:bg-red-500 ${MOTION_CLASS}`}
                >
                  登録
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsRegistering(false);
                    setNewPresetName("");
                  }}
                  className={`flex-1 ${MOTION_CLASS}`}
                >
                  やめる
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsRegistering(true)}
              disabled={!canRegister}
              className={`bg-red-600 hover:bg-red-500 ${MOTION_CLASS}`}
            >
              現在の設定を登録
            </Button>
          )}

          <DrawerClose asChild>
            <Button variant="secondary" className={MOTION_CLASS}>
              閉じる
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
});
