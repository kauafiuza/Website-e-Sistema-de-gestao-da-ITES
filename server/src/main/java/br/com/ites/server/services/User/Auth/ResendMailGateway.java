package br.com.ites.server.services.User.Auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
@ConditionalOnProperty(name = "mailer.enabled", havingValue = "true")
public class ResendMailGateway implements AuthMailGateway {
    private final RestClient client = RestClient.create();
    private final String endpoint;
    private final String apiKey;
    private final String from;

    public ResendMailGateway(
            @Value("${mailer.api-url}") String url,
            @Value("${mailer.api-key}") String apiKey,
            @Value("${mailer.from-name}") String name,
            @Value("${mailer.from-address}") String address) {
        if (apiKey == null || apiKey.isBlank() || address == null || address.isBlank())
            throw new IllegalStateException(
                    "RESEND_API_KEY e MAIL_FROM_ADDRESS são obrigatórios quando"
                            + " MAILER_ENABLED=true");
        this.endpoint = url.replaceAll("/+$", "") + "/emails";
        this.apiKey = apiKey;
        this.from = name + " <" + address + ">";
    }

    @Override
    public void send(String to, String subject, String html) {
        client.post()
                .uri(endpoint)
                .header("Authorization", "Bearer " + apiKey)
                .body(
                        Map.of(
                                "from",
                                from,
                                "to",
                                new String[] {to},
                                "subject",
                                subject,
                                "html",
                                html))
                .retrieve()
                .toBodilessEntity();
    }
}
