import { Session } from "@/session/durableObject";
import { db } from "@/db";

export const getUserBySession = async (session: Session | null) => {
  if (!session?.userId) {
    return null;
  }

  return await db.user.findFirstOrThrow({
    where: { id: session?.userId },
  });
};

export const getUserByEmail = async (email: string | undefined) => {
  return await db.user.findFirstOrThrow({
    select: {
      id: true,
      email: true,
    },
    where: { email },
  });
};
