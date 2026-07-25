const DEFAULT_LOCAL_API = "http://127.0.0.1:8000";

export const API_URL = (
    import.meta.env.VITE_API_URL
    ||
    DEFAULT_LOCAL_API
).replace(/\/+$/, "");

const TOKEN_KEY = "nativa_access_token";
const USER_KEY = "nativa_username";

const originalFetch = window.fetch.bind(window);


export function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );

}


export function getStoredUsername() {

    return localStorage.getItem(
        USER_KEY
    ) || "";

}


export function saveSession(
    token,
    username
) {

    localStorage.setItem(
        TOKEN_KEY,
        token
    );

    localStorage.setItem(
        USER_KEY,
        username || ""
    );

}


export function clearSession() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    localStorage.removeItem(
        USER_KEY
    );

}


function normalizeApiUrl(
    input
) {

    const url = String(
        input
    );

    return url
        .replace(
            /^http:\/\/127\.0\.0\.1:8000/,
            API_URL
        )
        .replace(
            /^http:\/\/localhost:8000/,
            API_URL
        );

}


function isApiUrl(
    url
) {

    return (
        url === API_URL
        ||
        url.startsWith(
            `${API_URL}/`
        )
    );

}


export function installApiFetchInterceptor() {

    if (
        window.__nativaApiInterceptorInstalled
    ) {

        return;

    }

    window.__nativaApiInterceptorInstalled = true;

    window.fetch = async (
        input,
        init = {}
    ) => {

        const sourceUrl = (
            typeof input === "string"
                ?
                input
                :
                input.url
        );

        const url = normalizeApiUrl(
            sourceUrl
        );

        const headers = new Headers(
            init.headers
            ||
            (
                typeof input !== "string"
                    ?
                    input.headers
                    :
                    undefined
            )
        );

        const token = getToken();

        const isLoginRequest = (
            url === `${API_URL}/auth/login`
        );

        if (
            token
            &&
            isApiUrl(url)
            &&
            !isLoginRequest
        ) {

            headers.set(
                "Authorization",
                `Bearer ${token}`
            );

        }

        const response = await originalFetch(
            url,
            {
                ...init,
                headers
            }
        );

        if (
            response.status === 401
            &&
            isApiUrl(url)
            &&
            !isLoginRequest
        ) {

            clearSession();

            window.dispatchEvent(
                new Event(
                    "nativa-auth-expired"
                )
            );

        }

        return response;

    };

}


export async function loginRequest(
    username,
    password
) {

    const response = await originalFetch(
        `${API_URL}/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })
        }
    );

    let data = {};

    try {

        data = await response.json();

    } catch {

        data = {};

    }

    if (
        !response.ok
        ||
        !data.access_token
    ) {

        throw new Error(
            data.error
            ||
            "No se pudo iniciar sesión"
        );

    }

    saveSession(
        data.access_token,
        data.username
    );

    return data;

}


export async function verifySession() {

    const token = getToken();

    if (!token) {

        return null;

    }

    const response = await originalFetch(
        `${API_URL}/auth/me`,
        {
            headers: {
                "Authorization":
                    `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {

        clearSession();

        return null;

    }

    return response.json();

}


export async function logoutRequest() {

    const token = getToken();

    try {

        if (token) {

            await originalFetch(
                `${API_URL}/auth/logout`,
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        }

    } finally {

        clearSession();

    }

}
