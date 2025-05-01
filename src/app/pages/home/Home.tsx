import { RequestInfo } from "@redwoodjs/sdk/worker";

export function Home({ ctx }: RequestInfo) {
  return (
    <div>
      <p>
        {ctx.user?.email
          ? `You are logged in as user ${ctx.user.email}`
          : "You are not logged in"}
      </p>
      <p>
        {ctx.user ? (
          <a href="/auth/signout">Sign out</a>
        ) : (
          <a href="/auth/signin">Sign in</a>
        )}
      </p>
    </div>
  );
}
