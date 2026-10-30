import { describe, it, expect } from 'vitest';
import { msalConfig, loginRequest } from '../authConfig';

describe('MSAL Configuration Security Tests', () => {
  it('dovrebbe configurare cacheLocation esclusivamente come sessionStorage per prevenire token theft da XSS persistente', () => {
    // Requisito R6 / OWASP: i token non devono risiedere in localStorage per evitare
    // che payload XSS persistenti possano esfiltrare token di sessione permanenti
    expect(msalConfig.cache).toBeDefined();
    expect(msalConfig.cache.cacheLocation).toBe('sessionStorage');
    expect(msalConfig.cache.cacheLocation).not.toBe('localStorage');
  });

  it('dovrebbe disabilitare storeAuthStateInCookie per evitare duplicazione di token nei cookie', () => {
    expect(msalConfig.cache.storeAuthStateInCookie).toBe(false);
  });

  it('dovrebbe configurare authority verso endpoint Microsoft Online con Tenant ID valido', () => {
    expect(msalConfig.auth).toBeDefined();
    expect(msalConfig.auth.authority).toMatch(/^https:\/\/login\.microsoftonline\.com\/[a-zA-Z0-9-]+$/);
    expect(msalConfig.auth.clientId).toBeDefined();
    expect(msalConfig.auth.clientId.length).toBeGreaterThan(0);
  });

  it('dovrebbe configurare redirectUri e postLogoutRedirectUri non vuoti', () => {
    expect(msalConfig.auth.redirectUri).toBeDefined();
    expect(msalConfig.auth.postLogoutRedirectUri).toBeDefined();
  });

  it('dovrebbe disabilitare il logging PII per conformità GDPR e NIS 2', () => {
    expect(msalConfig.system).toBeDefined();
    expect(msalConfig.system.loggerOptions).toBeDefined();
    expect(msalConfig.system.loggerOptions.piiLoggingEnabled).toBe(false);
  });

  it('dovrebbe definire loginRequest con scope specifici per il Client ID', () => {
    expect(loginRequest).toBeDefined();
    expect(Array.isArray(loginRequest.scopes)).toBe(true);
    expect(loginRequest.scopes.length).toBeGreaterThan(0);
    expect(loginRequest.scopes[0]).toContain(msalConfig.auth.clientId);
  });
});
