import { TimerPage } from "@/pages/timer-page";
import { useAppStore } from "@/stores/app-store";

/**
 * アプリケーションのルートコンポーネント
 *
 * タイマー画面を唯一のメイン画面として表示する。
 * プリセットの切り替えはボトムドロワーから行い、画面遷移は発生しない。
 * 選択中のプリセットIDは app-store で localStorage に永続化される。
 */
export const App = () => {
  const currentPresetId = useAppStore((s) => s.currentPresetId);
  const setCurrentPresetId = useAppStore((s) => s.setCurrentPresetId);

  return (
    <TimerPage
      key={currentPresetId}
      presetId={currentPresetId}
      onSwitchPreset={setCurrentPresetId}
    />
  );
};
