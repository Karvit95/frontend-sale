export const msalConfig = {
    auth: {
        clientId: "89b12e43-1d18-43d5-b4a1-cb140eca77f5", 
        authority: "https://login.microsoftonline.com/f7237773-4b37-4214-b0e6-9d3322541036",
        redirectUri: "http://localhost:5173/", 
    },
    cache: {
        cacheLocation: "sessionStorage", 
        storeAuthStateInCookie: false,
    }
};

export const loginRequest = {
    // Inserisci lo stesso scope usato per generare il token in Postman
    scopes: ["89b12e43-1d18-43d5-b4a1-cb140eca77f5/.default"] 
};