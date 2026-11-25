package br.com.ites.server.utils.dtos.Web.Project;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public record ProjectPreviewDTO(
        String pageName, List<ProjectPreviewBlockDTO> blocks, JsonNode theme) {

    public static ProjectPreviewDTO from(
            String pageJson, String themeJson, ObjectMapper json) {
        JsonNode page = readTree(pageJson, json);
        JsonNode theme = readTree(themeJson, json);
        List<ProjectPreviewBlockDTO> blocks = new ArrayList<>();
        JsonNode blockNodes = page == null ? null : page.path("blocks");

        if (blockNodes.isArray()) {
            for (JsonNode block : blockNodes) {
                JsonNode id = block.get("id");
                JsonNode definitionId = block.get("definitionId");
                JsonNode props = block.get("props");
                if (id != null
                        && id.isTextual()
                        && definitionId != null
                        && definitionId.isTextual()
                        && props != null
                        && props.isObject()) {
                    blocks.add(
                            new ProjectPreviewBlockDTO(
                                    id.asText(), definitionId.asText(), props));
                }
            }
        }

        JsonNode pageName = page == null ? null : page.get("pageName");
        return new ProjectPreviewDTO(
                pageName != null && pageName.isTextual() ? pageName.asText() : "",
                List.copyOf(blocks),
                theme == null || theme.isNull() ? null : theme);
    }

    private static JsonNode readTree(String value, ObjectMapper json) {
        try {
            return value == null ? null : json.readTree(value);
        } catch (Exception exception) {
            return null;
        }
    }
}
