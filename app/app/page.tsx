import Home, { type ForgeAuthenticatedUser } from "../page";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function ForgeAppPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
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

  return (
    <Home
      initialEntryStage="app"
      initialLaunchMode={params.welcome === "new" ? "new" : "return"}
      authenticatedUser={authenticatedUser}
    />
  );
}
