package com.q3js.filter;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.ConfigProvider;
import org.jboss.logging.Logger;

import java.util.Optional;
import java.util.Set;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class EventsAuthFilter implements ContainerRequestFilter {
    private static final Logger LOG = Logger.getLogger(EventsAuthFilter.class);
    private static final String EVENTS_PATH = "/api/events";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "DELETE", "PATCH");
    private static final String CONFIG_KEY = "q3js.events.api-token";

    @Override
    public void filter(ContainerRequestContext requestContext) {
        // Only apply to mutating HTTP methods (POST, PUT, DELETE, PATCH)
        // Non-mutating methods (GET, HEAD, OPTIONS) are allowed without auth
        String method = requestContext.getMethod();
        if (!MUTATING_METHODS.contains(method.toUpperCase())) {
            return;
        }

        // Get configured token at runtime
        Optional<String> apiToken = ConfigProvider.getConfig()
            .getOptionalValue(CONFIG_KEY, String.class);

        // If no token is configured, reject the request
        if (apiToken.isEmpty() || apiToken.get().isBlank()) {
            LOG.error("Rejected /api/events request: API_TOKEN not configured");
            requestContext.abortWith(
                Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\":\"API authentication not configured\"}")
                    .build()
            );
            return;
        }

        // Get Authorization header
        String authHeader = requestContext.getHeaderString("Authorization");

        if (authHeader == null || authHeader.isBlank()) {
            LOG.warn("Rejected /api/events request: Missing Authorization header");
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Missing Authorization header\"}")
                    .build()
            );
            return;
        }

        // Extract token from "Bearer <token>" format
        String token;
        if (authHeader.startsWith(BEARER_PREFIX)) {
            token = authHeader.substring(BEARER_PREFIX.length()).trim();
        } else {
            LOG.warn("Rejected /api/events request: Invalid Authorization header format");
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Invalid Authorization header format. Use: Bearer <token>\"}")
                    .build()
            );
            return;
        }

        // Validate token
        if (!token.equals(apiToken.get())) {
            LOG.warn("Rejected /api/events request: Invalid token");
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Invalid API token\"}")
                    .build()
            );
            return;
        }

        LOG.debug("Authorized request");
    }
}
