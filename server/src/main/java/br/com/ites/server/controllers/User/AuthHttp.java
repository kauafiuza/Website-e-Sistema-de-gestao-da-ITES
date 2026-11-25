package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.ClientInfo;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpHeaders;

final class AuthHttp {
    private AuthHttp() {}

    static ClientInfo client(HttpServletRequest request) {
        return new ClientInfo(request.getRemoteAddr(), request.getHeader(HttpHeaders.USER_AGENT));
    }
}
