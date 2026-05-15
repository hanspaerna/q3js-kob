import NextAuth from "next-auth";

const ALLOWED_GROUPS = ["quakers", "admins"];

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        {
            id: "authelia",
            name: "Authelia",
            type: "oauth",
            clientId: process.env.AUTH_CLIENT_ID,
            clientSecret: process.env.AUTH_CLIENT_SECRET,
            authorization: {
                url: `${process.env.AUTH_ISSUER}/api/oidc/authorization`,
                params: { scope: "openid profile email groups offline_access" },
            },
            token: {
                url: `${process.env.AUTH_ISSUER}/api/oidc/token`,
                params: { client_secret: process.env.AUTH_CLIENT_SECRET },
            },
            userinfo: `${process.env.AUTH_ISSUER}/api/oidc/userinfo`,
            checks: ["state"],
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.preferred_username ?? profile.name,
                    email: profile.email,
                    groups: profile.groups ?? [],
                };
            },
        },
    ],
    callbacks: {
        signIn({ user }) {
            const groups = ((user as any).groups as string[]) ?? [];
            return groups.some((g) => ALLOWED_GROUPS.includes(g));
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (account && user) {
                token.groups = (user as any).groups;
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                return token;
            }

            // Return token if not expired
            if (Date.now() < (token.expiresAt as number) * 1000) {
                return token;
            }

            // Refresh the token
            try {
                const response = await fetch(`${process.env.AUTH_ISSUER}/api/oidc/token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "refresh_token",
                        refresh_token: token.refreshToken as string,
                        client_id: process.env.AUTH_CLIENT_ID!,
                        client_secret: process.env.AUTH_CLIENT_SECRET!,
                    }),
                });

                const tokens = await response.json();

                if (!response.ok) throw new Error("Token refresh failed");

                return {
                    ...token,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token ?? token.refreshToken,
                    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
                };
            } catch {
                return { ...token, error: "RefreshTokenError" };
            }
        },
        session({ session, token }) {
            if (token.groups) {
                session.user.groups = token.groups as string[];
            }
            if (token.error) {
                session.error = token.error as string;
            }
            return session;
        },
    },
});
