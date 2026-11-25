package br.com.ites.server.services.User.Auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "mailer.enabled", havingValue = "false", matchIfMissing = true)
public class DisabledMailGateway implements AuthMailGateway {
    @Override
    public void send(String to, String subject, String html) {}
}
