import Home, {
  type CoachStyle,
  type ForgeAuthenticatedUser,
  type ForgeSetup,
  type TrainingDays,
  type TrainingGoal,
} from "../page";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function ForgeAppPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; goal?: string; days?: string; coach?: string }>;
}) {
  const params = await searchParams;
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="account-loading account-error" role="alert">
        <strong>FORGE</strong>
        <span>Your secure session is unavailable. No account data was opened.</span>
        <a href="/signout-with-chatgpt?return_to=%2F">Restart secure sign-in</a>
      </main>
    );
  }

  const authenticatedUser: ForgeAuthenticatedUser = {
    displayName: user.displayName,
    email: user.email,
  };
  const trainingGoals: TrainingGoal[] = ["Strength", "Muscle", "Hybrid"];
  const trainingDays: TrainingDays[] = ["3 days", "4 days", "5 days"];
  const coachStyles: CoachStyle[] = ["Protective", "Balanced", "Relentless"];
  const initialSetup: ForgeSetup | null =
    trainingGoals.includes(params.goal as TrainingGoal) &&
    trainingDays.includes(params.days as TrainingDays) &&
    coachStyles.includes(params.coach as CoachStyle)
      ? {
          trainingGoal: params.goal as TrainingGoal,
          trainingDays: params.days as TrainingDays,
          coachStyle: params.coach as CoachStyle,
        }
      : null;

  return (
    <Home
      initialEntryStage="app"
      initialLaunchMode={params.welcome === "new" ? "new" : "return"}
      authenticatedUser={authenticatedUser}
      initialSetup={initialSetup}
    />
  );
}
