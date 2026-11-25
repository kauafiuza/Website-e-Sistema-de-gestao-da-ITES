package br.com.ites.server.services.Web.Publication;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public final class FormFieldSchema {
    public static final Set<String> DEFINITIONS = Set.of("form-classic", "contact-classic", "contact-panel", "waitlist-classic", "demo-request");
    private static final String LEGACY = """
            {"form-classic":[{"id":"name","label":"Seu nome","type":"text","required":true},{"id":"email","label":"E-mail","type":"email","required":true}],
             "contact-classic":[{"id":"name","label":"Seu nome","type":"text","required":true},{"id":"email","label":"E-mail","type":"email","required":true},{"id":"message","label":"Mensagem","type":"textarea","required":true}],
             "contact-panel":[{"id":"email","label":"E-mail","type":"email","required":true},{"id":"message","label":"Mensagem","type":"textarea","required":true}],
             "waitlist-classic":[{"id":"email","label":"E-mail","type":"email","required":true}],
             "demo-request":[{"id":"firstName","label":"Nome","type":"text","required":true},{"id":"lastName","label":"Sobrenome","type":"text","required":true},{"id":"email","label":"E-mail profissional","type":"email","required":true},{"id":"role","label":"Cargo","type":"text","required":false},{"id":"project","label":"O que você quer desenvolver?","type":"textarea","required":false}]}
            """;

    private FormFieldSchema() {}

    public static JsonNode fields(JsonNode block, ObjectMapper json) {
        String definition = block.path("definitionId").asText();
        if (!DEFINITIONS.contains(definition)) throw invalid();
        JsonNode configured = block.path("props").get("formFields");
        JsonNode result = configured == null ? json.readTree(LEGACY).path(definition) : configured;
        validate(result);
        return result;
    }

    public static void validateDocument(JsonNode document) {
        for (JsonNode page : document.path("pages")) {
            for (JsonNode block : page.path("blocks")) {
                if (DEFINITIONS.contains(block.path("definitionId").asText())) {
                    JsonNode configured = block.path("props").get("formFields");
                    if (configured != null) validate(configured);
                }
            }
        }
    }

    public static void validate(JsonNode fields) {
        if (!fields.isArray() || fields.isEmpty() || fields.size() > 20) throw invalid();
        Set<String> ids = new HashSet<>();
        for (JsonNode field : fields) {
            String id = field.path("id").asText();
            String label = field.path("label").asText();
            String type = field.path("type").asText();
            if (!field.isObject() || !id.matches("[a-zA-Z][a-zA-Z0-9_-]{0,63}") || !ids.add(id) || label.isBlank() || label.length() > 100 ||
                    !Set.of("text", "email", "textarea", "number", "select").contains(type) || !field.path("required").isBoolean()) throw invalid();
            JsonNode options = field.get("options");
            if (type.equals("select")) {
                if (options == null || !options.isArray() || options.isEmpty() || options.size() > 30) throw invalid();
                Set<String> optionIds = new HashSet<>();
                for (JsonNode option : options) {
                    String optionId = option.path("id").asText();
                    String optionLabel = option.path("label").asText();
                    if (!optionId.matches("[a-zA-Z][a-zA-Z0-9_-]{0,63}") || !optionIds.add(optionId) || optionLabel.isBlank() || optionLabel.length() > 100) throw invalid();
                }
            } else if (options != null && (!options.isArray() || !options.isEmpty())) throw invalid();
        }
    }

    public static void validateValues(JsonNode schema, Map<String, String> values) {
        if (values == null || values.isEmpty() || values.size() > 20) throw invalid();
        Set<String> allowed = new HashSet<>();
        for (JsonNode field : schema) {
            String id = field.path("id").asText();
            allowed.add(id);
            String value = values.get(id);
            if (field.path("required").asBoolean() && (value == null || value.isBlank())) throw invalid();
            if (value == null) continue;
            if (value.length() > (field.path("type").asText().equals("email") ? 254 : 4000)) throw invalid();
            if (value.isBlank()) continue;
            switch (field.path("type").asText()) {
                case "email" -> { if (!value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw invalid(); }
                case "number" -> { try { if (!Double.isFinite(Double.parseDouble(value))) throw invalid(); } catch (NumberFormatException error) { throw invalid(); } }
                case "select" -> {
                    boolean known = false;
                    for (JsonNode option : field.path("options")) if (value.equals(option.path("id").asText())) known = true;
                    if (!known) throw invalid();
                }
                default -> {}
            }
        }
        if (!allowed.containsAll(values.keySet())) throw invalid();
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campos do formulário inválidos");
    }
}
