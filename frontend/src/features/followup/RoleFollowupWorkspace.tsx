import { ViewTabs } from "@/components/ui/ViewTabs";
import { useSearchParams } from "react-router-dom";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import { LiveNotificationLog } from "@/features/operations/LiveNotificationLog";
import { FollowupPage, MockNotificationsPage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser } from "@/lib/types";
import { LiveFollowupPage } from "./LiveFollowupPage";

type WorkspaceView = "followups" | "notifications";

export function RoleFollowupWorkspace({ user }: { user: AuthenticatedUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: WorkspaceView = searchParams.get("view") === "notifications" ? "notifications" : "followups";
  const useLiveData = isLiveCashierApiEnabled();

  const workspaceSwitch = (
    <ViewTabs
      label="Follow-up and notification workspace"
      items={[
        { key: "followups", label: "Follow-up", selected: view === "followups", onSelect: () => selectView("followups") },
        { key: "notifications", label: "Notification log", selected: view === "notifications", onSelect: () => selectView("notifications") },
      ]}
    />
  );

  function selectView(nextView: WorkspaceView) {
    setSearchParams(nextView === "notifications" ? { view: nextView } : {});
  }

  // Each view fades in when its tab is chosen (the tab strip itself slides).
  return <div key={view} className="animate-screen-in motion-reduce:animate-none">{view === "followups"
    ? useLiveData
      ? <LiveFollowupPage user={user} workspaceSwitch={workspaceSwitch} />
      : <FollowupPage user={user} workspaceSwitch={workspaceSwitch} />
    : useLiveData
      ? <LiveNotificationLog user={user} workspaceSwitch={workspaceSwitch} />
      : <MockNotificationsPage user={user} workspaceSwitch={workspaceSwitch} />}</div>;
}
