import Home, { type ForgeAuthenticatedUser } from "../page";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function ForgeAppPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params.welcome === "new" ? "/app?welcome=new" : "/app";
  const user = await requireChatGPTUser(returnTo);
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
