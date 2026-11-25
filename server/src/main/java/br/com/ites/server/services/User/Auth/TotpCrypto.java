package br.com.ites.server.services.User.Auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

@Component
public class TotpCrypto {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKey key;

    public TotpCrypto(@Value("${auth.totp-encryption-key}") String encoded) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(encoded);
        } catch (IllegalArgumentException e) {
            bytes = new byte[0];
        }
        if (bytes.length != 32)
            throw new IllegalStateException(
                    "AUTH_TOTP_ENCRYPTION_KEY precisa ter 32 bytes em base64");
        key = new SecretKeySpec(bytes, "AES");
    }

    public String encrypt(byte[] secret, UUID userId) {
        byte[] iv = new byte[12];
        RANDOM.nextBytes(iv);
        try {
            Cipher cipher = cipher(Cipher.ENCRYPT_MODE, iv, userId);
            byte[] encrypted = cipher.doFinal(secret);
            return "v1:"
                    + Base64.getEncoder()
                            .encodeToString(
                                    ByteBuffer.allocate(iv.length + encrypted.length)
                                            .put(iv)
                                            .put(encrypted)
                                            .array());
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao cifrar segredo TOTP", e);
        }
    }

    public byte[] decrypt(String stored, UUID userId) {
        if (stored == null || !stored.startsWith("v1:"))
            throw new IllegalStateException("Formato de segredo TOTP inválido");
        try {
            byte[] data = Base64.getDecoder().decode(stored.substring(3));
            return cipher(Cipher.DECRYPT_MODE, Arrays.copyOfRange(data, 0, 12), userId)
                    .doFinal(data, 12, data.length - 12);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao decifrar segredo TOTP", e);
        }
    }

    private Cipher cipher(int mode, byte[] iv, UUID userId) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, key, new GCMParameterSpec(128, iv));
        cipher.updateAAD(userId.toString().getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
}
