/**
 * Browser side of WebAuthn terminal login. Binary fields go to the API as base64url without padding.
 * Errors from navigator.credentials propagate unchanged; callers check e.name === 'NotAllowedError'.
 */
const enc = new TextEncoder();

const b64urlEncode = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

const WebAuthnService = {
  isSupported() {
    return !!window.PublicKeyCredential;
  },

  async isPlatformAvailable() {
    if (!this.isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  async create(challenge, kdUser, displayName, platformOnly) {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'BSG Merchant' },
        user: { id: enc.encode(kdUser), name: kdUser, displayName },
        challenge: enc.encode(challenge),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'discouraged',
          ...(platformOnly && { authenticatorAttachment: 'platform' }),
        },
        attestation: 'none',
        timeout: 60000,
      },
    });
    return {
      credential_id: b64urlEncode(credential.rawId),
      client_data_json: b64urlEncode(credential.response.clientDataJSON),
      attestation_object: b64urlEncode(credential.response.attestationObject),
    };
  },

  async sign(challenge, credentialId) {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: enc.encode(challenge),
        allowCredentials: [{ type: 'public-key', id: b64urlDecode(credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return {
      credential_id: b64urlEncode(credential.rawId),
      client_data_json: b64urlEncode(credential.response.clientDataJSON),
      authenticator_data: b64urlEncode(credential.response.authenticatorData),
      signature: b64urlEncode(credential.response.signature),
    };
  },
};

export default WebAuthnService;
