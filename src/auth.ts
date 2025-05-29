import { env } from "cloudflare:workers";
import type { RouteMiddleware } from "rwsdk/router";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Auth, type AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import { db } from "@/db";
import { getUserByEmail } from "@/functions/user";
import { AppContext } from "@/worker";
import type { User } from "@prisma/client";
import type { Workspace } from "@prisma/client";
import { createWorkspace } from "./functions/workspace";
import { createDefaultProject } from "./functions/project";
import { sessions } from "./session/store";

// Extended user type that includes relations
type ExtendedUser = User & {
  ownedWorkspaces?: Workspace[];
};

export let auth: { handleRequest: (request: Request) => Promise<Response> };

export const createAuthOptions = (): AuthConfig => {
  return {
    adapter: PrismaAdapter(db), // Optional: for database sessions
    providers: [
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    ],
    session: {
      strategy: "jwt" as const,
    },
    events: {
      createUser: async ({ user }) => {
        console.log("User created:", user);

        // Only proceed if user.id is defined
        if (user.id) {
          // Check if user already has an workspace
          let workspace = await db.workspace.findFirst({
            where: {
              owner: {
                id: user.id
              }
            },
          });
          
          if (!workspace) {
            // Create workspace with proper relation to user's ownedWorkspaces
            workspace = await createWorkspace({ name: "My Workspace", ownerId: user.id });
            console.log("Workspace created:", workspace);
            
            const defaultProject = await createDefaultProject(user.id, workspace);
            console.log("Default project created:", defaultProject);
          } else {
            // Check if user already has any nodes
            const existingProjects = await db.project.findMany({
              where: {
                ownerId: user.id
              },
              take: 1
            });
            
            // If no nodes exist, create a default one
            if (existingProjects.length === 0) {
              const defaultProject = await createDefaultProject(user.id, workspace);
              console.log("Default project created:", defaultProject);
            }
          }

          // Create a default API key for the user
          try {
            const defaultApiKey = await db.apiKey.create({
              data: {
                userId: user.id,
                name: "Default API Key",
                key: crypto.randomUUID(),
              },
            });
            console.log("Default API key created:", defaultApiKey);
          } catch (error) {
            console.error("Failed to create default API key:", error);
          }
        }
      },
      async signOut(message) {
        if ('session' in message) {
          console.log("User signed out (session):", message.session);
        } else if ('token' in message) {
          console.log("User signed out (token):", message.token);
        }
        return;
      },
    },
    callbacks: {
      async signIn({ user }) {
        console.log("User signed in:", user);
        return true;
      },
      async session({ session, token }: { session: any; token: any }) {
        session.user.id = token.sub; // Add user ID to session
        return session;
      },
    },
    pages: {
      //signOut: '/',
      error: '/auth/error',
      verifyRequest: '/auth/verify-request',
    },
    basePath: "/auth", // Set a base path for all auth routes
    debug: true, // Set to false in production
    trustHost: true,
    secret: env.SECRET_KEY || '',
  };
};

export const createAuth = async () => {
  const authOptions = createAuthOptions();

  auth = {
    handleRequest: async (request: Request) => {
      try {
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/auth')) {
          return new Response(null, { status: 404 });
        }
        
        return await Auth(request, authOptions);
      } catch (error) {
        console.error("Auth error:", error);
        return new Response(JSON.stringify({ error: "Authentication error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
};

export const isAuthenticated = ({ request, ctx }: { request: Request, ctx: AppContext }) => {
  if (!ctx?.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/signin" },
    });
  }
  return;
}

export const authCallback = async ({ request }: { request: Request }) => {
  console.log("OAuth callback", request.url);
    
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  //const state = url.searchParams.get('state');
    
  if (!code) {
    console.error("No code provided in OAuth callback");
    return new Response("Authentication failed: No code provided", { status: 400 });
  }
  
  try {
    // Exchange the code for tokens with Hallway Auth
    console.log('Exchanging code for tokens with params:', {
      client_id: env.CLIENT_ID,
      code,
      redirect_uri: env.REDIRECT_URI
    });
      
    // Try with x-www-form-urlencoded format as many OAuth providers require this
    const formData = new URLSearchParams();
    formData.append('client_id', env.CLIENT_ID);
    formData.append('code', code);
    formData.append('redirect_uri', env.REDIRECT_URI);
    formData.append('grant_type', 'authorization_code');
      
    const tokenResponse = await fetch(`${env.SERVER_URI}/oauth2/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return new Response("Authentication failed: Token exchange error: " + errorData, { status: 400 });
    }
  
    const tokenData = await tokenResponse.json();
    console.log("Token data received", tokenData);
  
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    return new Response("Authentication failed: " + error, { status: 400 });
  }
};

export const authMiddleware =
  (): RouteMiddleware =>
  async ({ request, ctx }) => {
    const url = new URL(request.url);

    // Skip auth middleware for auth-specific routes
    if (url.pathname.startsWith('/auth')) {
      console.log('Auth route detected', url.pathname);
      const response = await auth.handleRequest(request);
      return response;
    }

    // Skip middleware for static files or dev endpoints (optional)
    // if (
    //   url.pathname.startsWith('/favicon') ||
    //   url.pathname.startsWith('/assets')
    //   // url.pathname === '/'
    // ) {
    //   return;
    // }

    // For non-auth routes, check if user is authenticated
    try {
      const sessionCheckUrl = new URL('/auth/session', url.origin);
      const sessionRequest = new Request(sessionCheckUrl.toString(), {
        method: 'GET',
        headers: request.headers,
      });

      const authResponse = await auth.handleRequest(sessionRequest);

      if (authResponse.status !== 200) {
        console.log('Auth check failed with status:', authResponse.status);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/auth/signin?callbackUrl=${encodeURIComponent(url.pathname)}`,
          },
        });
      }

      try {
        const authData = (await authResponse.json()) as {
          user?: { id: string; email: string, name: string, image: string, createdAt: Date, updatedAt: Date, emailVerified: Date, ownedWorkspaces: string[] };
        };
        // console.log(authData)
        const user = await getUserByEmail(authData?.user?.email);
        
        // Force signout if auth system has user but database doesn't
        if (authData?.user && !user) {
          console.log('User exists in auth system but not in database, forcing signout');
          // Clear the session directly and redirect to home
          const headers = new Headers();
          await sessions?.remove(request, headers);
          
          // Also clear auth cookies manually
          headers.append('Set-Cookie', '__Secure-authjs.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httponly;');
          headers.append('Set-Cookie', 'authjs.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; httponly;');
          headers.set('Location', '/');
          
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        if (authData?.user) {
          // Cast to ExtendedUser type to include ownedWorkspaces
          ctx.user = {
            id: authData.user.id,
            email: authData.user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: null,
            image: authData.user.image,
            name: authData.user.name,
            ownedWorkspaces: user?.ownedWorkspaces || []
          } as ExtendedUser;
          ctx.session = {
            userId: authData.user.id,
            createdAt: Date.now(),
          };
        }
      } catch (e) {
        console.error('Error parsing auth response:', e);
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }
  };
