
import { env } from "cloudflare:workers";
import type { RouteMiddleware } from "@redwoodjs/sdk/router";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Auth, type AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import { getUserByEmail } from "@/functions/user";
import { AppContext } from "@/worker";
import { PrismaClient } from "@prisma/client";

import { db } from "@/db";

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
        // No return value needed (void)
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
          user?: { id: string; email: string, name: string, image: string, createdAt: Date, updatedAt: Date, emailVerified: Date, ownedOrganizations: string[] };
        };
        const user = await getUserByEmail(authData?.user?.email);
        
        if (authData?.user) {
          ctx.user = {
            id: authData.user.id,
            email: authData.user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: null,
            image: null,
            name: authData.user.name,
            ownedOrganizations: []
          };
          ctx.user.ownedOrganizations = user?.ownedOrganizations;
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
