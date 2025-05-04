"use client"
import { RequestInfo } from "@redwoodjs/sdk/worker";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "@/app/components/ui/sidebar";

export function Home({ ctx }: RequestInfo) {
  return (
    <SidebarProvider>
      <Sidebar ctx={ctx} />
      <div className="space-y-4 p-4">
        <h1 className="text-4xl">
          Welcome to your new Redwood app with @auth/core!
        </h1>
        <ul className="list-disc space-y-2 pl-4 max-w-md">
          <li>This starter includes authentication via @auth/core</li>
          <li>Tailwind</li>
          <li>Shadcn/ui components</li>
          <li>Vite</li>
          <li>Database (Prisma via D1)</li>
          <li>Storage (via R2)</li>
        </ul>
        <p className="max-w-md pb-2">
          You are currently {ctx.user ? "logged in" : "logged out"}
        </p>
        

        <p className="max-w-md pb-2">
          <a href="https://x.com/johndevor">X</a>&nbsp;•&nbsp;
          <a href="https://github.com/johndevor/redwoodsdk-oauth-starter">GitHub</a>
        </p>
        
      </div>
    </SidebarProvider>
  );
}
