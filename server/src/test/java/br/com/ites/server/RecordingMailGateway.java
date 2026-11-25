package br.com.ites.server;

import br.com.ites.server.services.User.Auth.AuthMailGateway;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@TestConfiguration(proxyBeanMethods = false)
class RecordingMailGateway {
    @Bean
    @Primary
    Inbox authInbox() {
        return new Inbox();
    }

    static final class Inbox implements AuthMailGateway {
        record Message(String to, String subject, String html) {}

        private static final Pattern TOKEN = Pattern.compile("[?&]token=([^&\\\"]+)");
        private final List<Message> messages = new CopyOnWriteArrayList<>();

        @Override
        public void send(String to, String subject, String html) {
            messages.add(new Message(to, subject, html));
        }

        String token(String email, String subject) {
            Message message =
                    messages.stream()
                            .filter(m -> m.to.equals(email) && m.subject.equals(subject))
                            .reduce((a, b) -> b)
                            .orElseThrow();
            Matcher matcher = TOKEN.matcher(message.html);
            if (!matcher.find()) throw new AssertionError("No token in recorded mail");
            return matcher.group(1);
        }
    }
}
