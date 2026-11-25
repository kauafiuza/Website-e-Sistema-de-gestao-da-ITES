package br.com.ites.server.services.User.Auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

/** Agenda mensagens durante a transação e as envia somente após o commit. */
@Service
public class AuthMailer {
    private static final Logger log = LoggerFactory.getLogger(AuthMailer.class);

    record Mail(String to, String subject, String title, String body, String label, String url) {}

    private final ApplicationEventPublisher events;
    private final AuthMailGateway gateway;
    private final String baseUrl;

    public AuthMailer(
            ApplicationEventPublisher events,
            AuthMailGateway gateway,
            @Value("${app.base-url}") String baseUrl) {
        this.events = events;
        this.gateway = gateway;
        this.baseUrl = baseUrl;
    }

    public void signup(String email, String token) {
        send(
                email,
                "Confirme seu e-mail",
                "Crie sua conta",
                "Confirme este endereço para concluir seu cadastro no ITES.",
                "Confirmar cadastro",
                link("/cadastro/confirmar", token));
    }

    public void organizationInvitation(String email, String organizationName, String token) {
        send(
                email,
                "Convite para uma organização",
                "Você foi convidado para " + organizationName,
                "Entre ou crie sua conta com este endereço para aceitar o convite.",
                "Aceitar convite",
                link("/convite/aceitar", token));
    }

    public void accountExists(String email) {
        send(
                email,
                "Você já tem uma conta",
                "Conta existente",
                "Recebemos um pedido de cadastro para este endereço. Se foi você, entre ou recupere"
                        + " sua senha.",
                "Entrar",
                baseUrl + "/entrar");
    }

    public void reset(String email, String token) {
        send(
                email,
                "Redefina sua senha",
                "Redefinir senha",
                "Use este link de uso único para criar uma nova senha. Ele expira em 30 minutos.",
                "Redefinir senha",
                link("/redefinir-senha", token));
    }

    public void emailChange(String email, String token) {
        send(
                email,
                "Confirme seu novo e-mail",
                "Confirmar e-mail",
                "Confirme este endereço para usá-lo na sua conta.",
                "Confirmar e-mail",
                link("/conta/email/confirmar", token));
    }

    public void notice(String email, String subject, String body) {
        send(email, subject, subject, body, null, null);
    }

    private void send(
            String email, String subject, String title, String body, String label, String url) {
        events.publishEvent(new Mail(email, subject, title, body, label, url));
    }

    private String link(String path, String token) {
        return UriComponentsBuilder.fromUriString(baseUrl)
                .path(path)
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    /** Evita enviar mensagens para alterações que sofreram rollback. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void deliver(Mail mail) {
        try {
            String title = HtmlUtils.htmlEscape(mail.title());
            String body = HtmlUtils.htmlEscape(mail.body());
            String action =
                    mail.url() == null
                            ? ""
                            : "<p><a href=\""
                                    + HtmlUtils.htmlEscape(mail.url())
                                    + "\">"
                                    + HtmlUtils.htmlEscape(mail.label())
                                    + "</a></p>";
            String html =
                    "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\"><body><h1>"
                            + title
                            + "</h1><p>"
                            + body
                            + "</p>"
                            + action
                            + "<p>Se você não solicitou esta ação, ignore esta"
                            + " mensagem.</p></body></html>";
            gateway.send(mail.to(), mail.subject(), html);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail transacional de autenticação", e);
        }
    }
}
