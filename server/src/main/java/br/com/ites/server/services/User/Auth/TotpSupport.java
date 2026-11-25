package br.com.ites.server.services.User.Auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class TotpSupport {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
    private static final char[] RECOVERY = "abcdefghjkmnpqrstuvwxyz23456789".toCharArray();

    private TotpSupport() {}

    public static byte[] newSecret() {
        byte[] bytes = new byte[20];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    public static String base32(byte[] data) {
        StringBuilder out = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 255);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32[(buffer >>> (bits - 5)) & 31]);
                bits -= 5;
            }
        }
        if (bits > 0) out.append(BASE32[(buffer << (5 - bits)) & 31]);
        return out.toString();
    }

    public static String uri(String email, String secret) {
        String issuer = "ITES";
        return "otpauth://totp/"
                + enc(issuer)
                + ":"
                + enc(email)
                + "?secret="
                + secret
                + "&issuer="
                + enc(issuer)
                + "&algorithm=SHA1&digits=6&period=30";
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public static String code(byte[] secret, long step) {
        byte[] counter = new byte[8];
        for (int i = 7; i >= 0; i--) {
            counter[i] = (byte) step;
            step >>>= 8;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));
            byte[] hash = mac.doFinal(counter);
            int offset = hash[19] & 15;
            int value =
                    ((hash[offset] & 127) << 24)
                            | ((hash[offset + 1] & 255) << 16)
                            | ((hash[offset + 2] & 255) << 8)
                            | (hash[offset + 3] & 255);
            return "%06d".formatted(value % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static long verify(byte[] secret, String code, Instant now, Long lastStep) {
        if (code == null || !code.matches("[0-9]{6}")) return -1;
        long current = now.getEpochSecond() / 30;
        for (long step = current - 1; step <= current + 1; step++) {
            if (lastStep != null && step <= lastStep) continue;
            if (MessageDigest.isEqual(
                    code.getBytes(StandardCharsets.US_ASCII),
                    code(secret, step).getBytes(StandardCharsets.US_ASCII))) return step;
        }
        return -1;
    }

    public static List<String> recoveryCodes() {
        List<String> codes = new ArrayList<>();
        while (codes.size() < 10) {
            StringBuilder code = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                if (i == 4) code.append('-');
                code.append(RECOVERY[RANDOM.nextInt(RECOVERY.length)]);
            }
            if (!codes.contains(code.toString())) codes.add(code.toString());
        }
        return codes;
    }

    public static String normalizeRecovery(String code) {
        return code == null ? "" : code.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
