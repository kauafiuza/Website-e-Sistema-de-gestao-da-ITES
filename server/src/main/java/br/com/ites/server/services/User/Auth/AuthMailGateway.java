package br.com.ites.server.services.User.Auth;

public interface AuthMailGateway {
    void send(String to, String subject, String html);
}
