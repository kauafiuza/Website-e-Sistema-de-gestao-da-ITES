package br.com.ites.server.services.Web.Project;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Contratos de persistência gerados a partir dos manifests usados pelo editor. */
@Component
public final class BlockContractCatalog {
    private static final int MAX_TEXT_LENGTH = 20_000;
    private static final int MAX_ARRAY_ITEMS = 1_000;

    private final Map<String, JsonNode> definitions;

    public BlockContractCatalog(ObjectMapper json) {
        try (InputStream input = new ClassPathResource("block-contracts.json").getInputStream()) {
            JsonNode catalog = json.readTree(input);
            Map<String, JsonNode> loaded = new HashMap<>();
            for (JsonNode definition : catalog.path("definitions"))
                loaded.put(definition.path("id").asText(), definition);
            definitions = Map.copyOf(loaded);
        } catch (Exception exception) {
            throw new IllegalStateException("Catálogo de contratos de blocos indisponível", exception);
        }
    }

    public boolean knows(String definitionId) {
        return definitions.containsKey(definitionId);
    }

    public String category(String definitionId) {
        JsonNode definition = definitions.get(definitionId);
        return definition == null ? null : definition.path("category").asText();
    }

    public void validate(JsonNode block) {
        String definitionId = block.path("definitionId").asText();
        JsonNode definition = definitions.get(definitionId);
        if (definition == null) return;
        validateObject(block.path("props"), definition.path("defaults"));
    }

    private static void validateObject(JsonNode value, JsonNode defaults) {
        if (!value.isObject()) throw invalid();
        Iterator<Map.Entry<String, JsonNode>> fields = value.properties().iterator();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            JsonNode defaultValue = defaults.get(field.getKey());
            validateKnownRule(field.getKey(), field.getValue());
            validateValue(field.getValue(), defaultValue);
        }
    }

    private static void validateKnownRule(String key, JsonNode value) {
        if (key.equals("layoutMaxWidth") && (!value.isNumber() || value.doubleValue() < 320 || value.doubleValue() > 2400))
            throw invalid();
        if (key.equals("layoutGutter") && (!value.isNumber() || value.doubleValue() < 0 || value.doubleValue() > 128))
            throw invalid();
        if (key.equals("backgroundGradientAngle") && (!value.isNumber() || value.doubleValue() < 0 || value.doubleValue() > 360))
            throw invalid();
        if (Set.of("backgroundColor", "backgroundGradientFrom", "backgroundGradientVia", "backgroundGradientTo",
                "buttonColor", "buttonTextColor", "accentColor").contains(key)
                && (!value.isTextual() || !value.asText().matches("#[0-9a-fA-F]{6}"))) throw invalid();
        if (key.equals("buttonTarget") && !Set.of("_self", "_blank").contains(value.asText())) throw invalid();
        if (key.equals("articleLayout") && !Set.of("list", "grid").contains(value.asText())) throw invalid();
        if (key.equals("alignment") && !Set.of("left", "center").contains(value.asText())) throw invalid();
        if (key.equals("appearance") && !Set.of("default", "tinted").contains(value.asText())) throw invalid();
        if (key.equals("scrollBehavior") && !Set.of("normal", "sticky").contains(value.asText())) throw invalid();
        if (key.equals("layoutWidth") && !Set.of("full", "wide", "standard", "narrow", "custom").contains(value.asText())) throw invalid();
        if (key.equals("blockAnimation") && !Set.of("none", "fade-up", "fade-in", "slide-left", "slide-right").contains(value.asText())) throw invalid();
        if (key.equals("backgroundMode") && !Set.of("theme", "solid", "gradient").contains(value.asText())) throw invalid();
        if (key.equals("buttonStyle") && !Set.of("theme", "solid", "soft", "outline", "ghost").contains(value.asText())) throw invalid();
        if (key.equals("items") && (!value.isArray() || value.size() > 50)) throw invalid();
    }

    private static void validateValue(JsonNode value, JsonNode defaultValue) {
        if (defaultValue == null) {
            validateOpaque(value, 1);
        } else if (defaultValue.isTextual()) {
            if (!value.isTextual() || value.asText().length() > MAX_TEXT_LENGTH) throw invalid();
        } else if (defaultValue.isBoolean()) {
            if (!value.isBoolean()) throw invalid();
        } else if (defaultValue.isNumber()) {
            if (!value.isNumber() || !Double.isFinite(value.doubleValue())) throw invalid();
        } else if (defaultValue.isObject()) {
            validateObject(value, defaultValue);
        } else if (defaultValue.isArray()) {
            if (!value.isArray() || value.size() > MAX_ARRAY_ITEMS) throw invalid();
            JsonNode itemShape = defaultValue.isEmpty() ? null : defaultValue.get(0);
            for (JsonNode item : value) validateValue(item, itemShape);
        } else if (!value.isNull()) {
            throw invalid();
        }
    }

    private static void validateOpaque(JsonNode value, int depth) {
        if (depth > 64) throw invalid();
        if (value.isTextual() && value.asText().length() > MAX_TEXT_LENGTH) throw invalid();
        if (value.isArray()) {
            if (value.size() > MAX_ARRAY_ITEMS) throw invalid();
            for (JsonNode item : value) validateOpaque(item, depth + 1);
        } else if (value.isObject()) {
            value.properties().forEach(field -> validateOpaque(field.getValue(), depth + 1));
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Propriedades do bloco inválidas");
    }
}
