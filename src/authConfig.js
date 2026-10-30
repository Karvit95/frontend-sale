import { LogLevel } from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || "89b12e43-1d18-43d5-b4a1-cb140eca77f5";
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || "f7237773-4b37-4214-b0e6-9d3322541036";

export const msalConfig = {
    auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin + "/",
        postLogoutRedirectUri: window.location.origin + "/",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                if (level === LogLevel.Error) {
                    console.error(message);
                }
            },
            logLevel: LogLevel.Error,
            piiLoggingEnabled: false,
        },
    },
};

export const loginRequest = {
    scopes: [`${CLIENT_ID}/.default`]
};
