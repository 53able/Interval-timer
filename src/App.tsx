import { useState } from "react";
import { HomePage } from "@/pages/home-page";
import { TimerPage } from "@/pages/timer-page";

/**
 * アプリケーションのルート（画面遷移先）を表す判別共用体
 *
 * 外部ルーティングライブラリは使用せず、状態ベースで画面を切り替える。
 * - `home`: プリセット一覧（ホーム画面）
 * - `timer`: タイマー実行画面（presetId を保持）
 * - `editor`: プリセット編集画面（presetId が null なら新規作成）
 */
export type Route =
  | { readonly page: "home" }
  | { readonly page: "timer"; readonly presetId: string }
  | { readonly page: "editor"; readonly presetId: string | null };

/**
 * アプリケーションのルートコンポーネント
 *
 * `currentRoute` の状態に応じてページコンポーネントを切り替える。
 * 各ページから受け取るコールバックで画面遷移を行う。
 */
export const App = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>({ page: "home" });

  switch (currentRoute.page) {
    case "home":
      return (
        <HomePage
          onStartTimer={(presetId) =>
            setCurrentRoute({ page: "timer", presetId })
          }
          onEditPreset={(presetId) =>
            setCurrentRoute({ page: "editor", presetId })
          }
          onCreatePreset={() =>
            setCurrentRoute({ page: "editor", presetId: null })
          }
        />
      );

    case "timer":
      return (
        <TimerPage
          presetId={currentRoute.presetId}
          onGoHome={() => setCurrentRoute({ page: "home" })}
        />
      );

    case "editor":
      // T7 で実装予定。仮のプレースホルダーを表示。
      return (
        <div className="flex min-h-svh items-center justify-center bg-neutral-950 text-white">
          <p>Editor: {currentRoute.presetId ?? "new"}</p>
        </div>
      );
  }
};
