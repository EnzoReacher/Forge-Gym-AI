import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { getChatGPTUser } from "../chatgpt-auth";

export type ActiveAccount = typeof users.$inferSelect;

type AccountAccessProblem = {
  problem: {
    status: 401 | 403;
    error: string;
  };
};

export type AccountAccess =
  | { account: ActiveAccount }
  | AccountAccessProblem;

export async function getCurrentActiveAccount(): Promise<AccountAccess> {
  const identity = await getChatGPTUser();
  if (!identity) {
    return {
      problem: {
        status: 401,
        error: "Authentication required.",
      },
    };
  }

  const email = identity.email.trim().toLowerCase();
  if (!email || email.length > 254) {
    return {
      problem: {
        status: 401,
        error: "Invalid authenticated identity.",
      },
    };
  }

  const db = await getDb();
  let account = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!account) {
    await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        identityName: identity.fullName,
      })
      .onConflictDoNothing({ target: users.email });

    account = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  if (!account || account.status !== "active") {
    return {
      problem: {
        status: 403,
        error: "Account access is unavailable.",
      },
    };
  }

  if (identity.fullName && identity.fullName !== account.identityName) {
    await db
      .update(users)
      .set({
        identityName: identity.fullName,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, account.id));

    account = {
      ...account,
      identityName: identity.fullName,
    };
  }

  return { account };
}
