import { useState } from "react";
import { X } from "lucide-react";
import { usePresetStore } from "@/stores/preset-store";
import { useTimerStore } from "@/stores/timer-store";
import { PresetSchema } from "@/schemas/timer";
import { formatPhaseSummary } from "@/components/preset-card";
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
};

/** P5モーション: ボタン共通のアニメーションクラス */
const MOTION_CLASS =
  "transition-all duration-200 hover:scale-105 active:scale-95" as const;

/**
 * タイマーストアの現在の設定からプリセットを生成する
 *
 * ステッパーで調整済みの phases / totalRounds / prepareSec を
 * プリセットスキーマに変換する。バリデーション失敗時は null を返す。
 */
const buildPresetFromCurrentSettings = (name: string) => {
  const { phases, totalRounds, prepareSec } = useTimerStore.getState();
  const raw = {
    id: crypto.randomUUID(),
    name,
    totalRounds,
    prepareSec,
    phases,
    createdAt: Date.now(),
  };
  const result = PresetSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * プリセットドロワーコンポーネント
 *
 * ボトムドロワーでプリセット一覧を表示し、片手操作でプリセット切り替え・登録・削除を行う。
 *
 * **OOUI原則**: プリセット（オブジェクト）を一覧表示 → タップでアクション（選択/削除）
 * **片手操作**: ドロワーは画面下部から引き上げ、親指で全操作が完結する
 */
export const PresetDrawer = ({
  currentPresetId,
  onSelectPreset,
}: PresetDrawerProps) => {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);
  const phases = useTimerStore((s) => s.phases);

  const [isOpen, setIsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  /** ドロワーを閉じて登録フォームもリセットする */
  const closeDrawer = () => {
    setIsOpen(false);
    setIsRegistering(false);
    setNewPresetName("");
  };

  /** プリセットを選択してドロワーを閉じる */
  const handleSelectPreset = (presetId: string) => {
    onSelectPreset(presetId);
    closeDrawer();
  };

  /** 現在の設定をプリセットとして登録する */
  const handleRegister = () => {
    const trimmed = newPresetName.trim();
    if (trimmed.length === 0) return;

    const preset = buildPresetFromCurrentSettings(trimmed);
    if (preset) {
      addPreset(preset);
      setIsRegistering(false);
      setNewPresetName("");
    }
  };

  /** 登録可能かどうか（タイマーにフェーズがロードされている場合のみ） */
  const canRegister = phases.length > 0;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center gap-1 pb-3 pt-2"
          aria-label="プリセット一覧を開く"
        >
          {/* ドラッグハンドル（片手で引き上げる視覚的ヒント） */}
          <span className="h-1.5 w-12 rounded-full bg-neutral-600 transition-colors hover:bg-neutral-400" />
          <span className="text-[10px] tracking-widest text-neutral-600">
            プリセット
          </span>
        </button>
      </DrawerTrigger>

      <DrawerContent className="border-red-900/30 bg-[#0a0a0a]">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-black tracking-tighter text-white">
            プリセット
          </DrawerTitle>
          <DrawerDescription className="text-neutral-500">
            タップで切り替え
          </DrawerDescription>
        </DrawerHeader>

        {/* プリセット一覧（スクロール可能） */}
        <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto px-4">
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
};
