import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import { LiveNotificationLog } from "@/features/operations/LiveNotificationLog";
import { FollowupPage, MockNotificationsPage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser } from "@/lib/types";
import { LiveFollowupPage } from "./LiveFollowupPage";

type WorkspaceView = "followups" | "notifications";

export function RoleFollowupWorkspace({ user }: { user: AuthenticatedUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: WorkspaceView = searchParams.get("view") === "notifications" ? "notifications" : "followups";
  const useLiveData = import.meta.env.PROD || isLiveCashierApiEnabled();

  const workspaceSwitch = (
    <div role="group" aria-label="Follow-up and notification workspace" className="mb-5 flex flex-wrap gap-2">
      <Button type="button" variant={view === "followups" ? "primary" : "secondary"} aria-pressed={view === "followups"} onClick={() => selectView("followups")}>
        Follow-up
      </Button>
      <Button type="button" variant={view === "notifications" ? "primary" : "secondary"} aria-pressed={view === "notifications"} onClick={() => selectView("notifications")}>
        Notification log
      </Button>
    </div>
  );

  function selectView(nextView: WorkspaceView) {
    setSearchParams(nextView === "notifications" ? { view: nextView } : {});
  }

  return view === "followups"
    ? useLiveData
      ? <LiveFollowupPage user={user} workspaceSwitch={workspaceSwitch} />
      : <FollowupPage user={user} workspaceSwitch={workspaceSwitch} />
    : useLiveData
      ? <LiveNotificationLog user={user} workspaceSwitch={workspaceSwitch} />
      : <MockNotificationsPage user={user} workspaceSwitch={workspaceSwitch} />;
}
