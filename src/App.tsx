import { useState } from "react";
import { TimerPage } from "@/pages/timer-page";
import { usePresetStore } from "@/stores/preset-store";

/**
 * 初期プリセットIDを決定する
 *
 * プリセットストアの最初のプリセットIDを返す。
 * プリセットが存在しない場合は空文字列を返す（通常は到達しない）。
 */
const resolveInitialPresetId = (): string => {
  const firstPreset = usePresetStore.getState().presets[0];
  return firstPreset?.id ?? "";
};

/**
 * アプリケーションのルートコンポーネント
 *
 * タイマー画面を唯一のメイン画面として表示する。
 * プリセットの切り替えはボトムドロワーから行い、画面遷移は発生しない。
 */
export const App = () => {
  const [currentPresetId, setCurrentPresetId] = useState(resolveInitialPresetId);

  return (
    <TimerPage
      key={currentPresetId}
      presetId={currentPresetId}
      onSwitchPreset={setCurrentPresetId}
    />
  );
};
