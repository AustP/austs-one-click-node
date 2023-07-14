// @ts-nocheck
const crypto = { ...(window.cryptoWrapper || {}) };

if (crypto) {
  crypto.createCipheriv = (...args) => {
    let cipher = window.cryptoWrapper.createCipheriv(...args);
    cipher.final = (...args) => window.cryptoWrapper._cipher_final(...args);
    cipher.update = (...args) => window.cryptoWrapper._cipher_update(...args);
    return cipher;
  };

  crypto.createDecipheriv = (...args) => {
    let decipher = window.cryptoWrapper.createDecipheriv(...args);
    decipher.final = (...args) => window.cryptoWrapper._decipher_final(...args);
    decipher.update = (...args) =>
      window.cryptoWrapper._decipher_update(...args);
    return decipher;
  };

  crypto.createHmac = (...args) => {
    let hmac = window.cryptoWrapper.createHmac(...args);
    hmac.digest = (...args) => window.cryptoWrapper._hmac_digest(...args);
    hmac.update = (...args) => {
      hmac = window.cryptoWrapper._hmac_update(...args);
      hmac.digest = (...args) => window.cryptoWrapper._hmac_digest(...args);
      return hmac;
    };
    return hmac;
  };
}

export default crypto;
