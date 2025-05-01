import { defineApp, ErrorResponse } from "@redwoodjs/sdk/worker";
import { route, render, prefix } from "@redwoodjs/sdk/router";
import { Document } from "@/app/Document";
import { Home } from "@/app/pages/home/Home";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { db, setupDb } from "./db";
import type { User } from "@prisma/client";
import { env } from "cloudflare:workers";
export { SessionDurableObject } from "./session/durableObject";

import { createAuth, authMiddleware } from "@/auth";

export type AppContext = {
  session: Session | null;
  user: User | null;
};




export default defineApp([
  setCommonHeaders(),
  async ({ ctx, request, headers }) => {
    await setupDb(env);
    setupSessionStore(env);
    await createAuth();
  },
  authMiddleware(),
  render(Document, [
    route("/", [Home]),
    route("/protected", [
      ({ ctx }) => {
        if (!ctx.user) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/auth/signin" },
          });
        }
      },
      Home,
    ]),
    prefix("/user", userRoutes),
  ]),
]);
