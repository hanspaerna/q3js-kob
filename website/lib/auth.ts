import NextAuth from "next-auth";

const ALLOWED_GROUPS = ["quakers", "admins", "quakemanagers"];

export const MANAGER_GROUPS = ["quakemanagers", "admins"];

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        {
            id: "authelia",
            name: "Authelia",
            type: "oidc",
            issuer: process.env.AUTH_ISSUER,
            clientId: process.env.AUTH_CLIENT_ID,
            clientSecret: process.env.AUTH_CLIENT_SECRET,
            authorization: { params: { scope: "openid profile email groups offline_access" } },
            client: { token_endpoint_auth_method: "client_secret_post" },
            checks: ["state"],
            async profile(profile, tokens) {
                // Fetch userinfo to get groups
                const res = await fetch(`${process.env.AUTH_ISSUER}/api/oidc/userinfo`, {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                const userinfo = await res.json();
                return {
                    id: profile.sub,
                    name: userinfo.preferred_username ?? userinfo.name,
                    email: userinfo.email,
                    groups: userinfo.groups ?? [],
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
                // Use expires_at if available, otherwise calculate from expires_in
                token.expiresAt = account.expires_at ??
                    (account.expires_in ? Math.floor(Date.now() / 1000) + account.expires_in : undefined);
                return token;
            }

            // Return token if not expired
            const now = Date.now();
            const expiresAt = token.expiresAt as number | undefined;
            if (expiresAt && now < expiresAt * 1000) {
                return token;
            }

            // Refresh the token
            console.log("[AUTH] Token refresh triggered", {
                expiresAt,
            });
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

                if (!response.ok) {
                    console.log("[AUTH] Token refresh failed", {
                        status: response.status,
                        error: tokens,
                    });
                    throw new Error("Token refresh failed");
                }

                console.log("[AUTH] Token refresh succeeded", {
                    newExpiresIn: tokens.expires_in,
                    newExpiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
                });

                return {
                    ...token,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token ?? token.refreshToken,
                    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
                };
            } catch (error) {
                console.log("[AUTH] Token refresh error", { error });
                // Clear sensitive data - user must re-login
                return {
                    error: "RefreshTokenError",
                };
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

export async function authWithManagerGroup() {
    const session = await auth();
    if (!session) return null;
    const groups = session.user?.groups ?? [];
    if (!MANAGER_GROUPS.some(g => groups.includes(g))) return null;
    return session;
}

export function hasManagerAccess(groups: string[] | undefined): boolean {
    if (!groups) return false;
    return MANAGER_GROUPS.some(g => groups.includes(g));
}
