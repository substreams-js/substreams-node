import { DEFAULT_AUTH } from "./index.js";

export interface Token {
    token: string;
    expires_at: number;
}

export async function authentication_token(api_key: string, url = DEFAULT_AUTH) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({api_key})
    })
    return response.json() as Promise<Token>;
}

export async function parseAuthorization(authorization: string, url?: string) {
    // StreamingFast
    if ( authorization.includes("server_") ) {
        const { token } = await authentication_token(authorization, url);
        return token;
    // Pinax
    } else if ( authorization.length == 32 ) {
        const { token } = await authentication_token(authorization, url);
        return token;
    }
    return authorization;
}