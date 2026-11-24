import { check } from 'k6';

/**
 * Parses a response body as JSON without throwing.
 * Returns `null` when the body is empty or not valid JSON, so checks
 * fail cleanly instead of crashing the iteration (e.g. on a 5xx HTML page).
 */
export function safeJson(response) {
    try {
        return response.json();
    } catch (e) {
        return null;
    }
}

/**
 * Reads a (possibly nested) property from a response's JSON body safely.
 * Example: jsonField(r, 'products') or jsonField(r, 'user.name')
 */
export function jsonField(response, path) {
    const body = safeJson(response);

    if (body === null || body === undefined) {
        return undefined;
    }

    return path.split('.').reduce(
        (value, key) =>
            value !== null && value !== undefined ? value[key] : undefined,
        body
    );
}

export function validateStatus(response, expectedStatus = 200) {
    return check(response, {
        [`Status is ${expectedStatus}`]: (r) => r.status === expectedStatus
    });
}

export function validateJson(response) {
    return check(response, {
        'Response is valid JSON': (r) => safeJson(r) !== null
    });
}
