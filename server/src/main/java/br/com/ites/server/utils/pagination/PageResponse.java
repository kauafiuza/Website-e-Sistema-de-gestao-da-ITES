package br.com.ites.server.utils.pagination;

import java.util.List;
import java.util.function.Function;

/** Stable API contract for paginated collections. */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        long totalPages,
        boolean hasNext,
        boolean hasPrevious) {

    public PageResponse {
        items = List.copyOf(items);
    }

    public static <T> PageResponse<T> of(List<T> items, PageRequest request, long totalElements) {
        long totalPages = totalElements / request.size() + (totalElements % request.size() == 0 ? 0 : 1);
        return new PageResponse<>(items, request.page(), request.size(), totalElements, totalPages,
                request.page() + 1L < totalPages, request.page() > 0 && totalPages > 0);
    }

    public <R> PageResponse<R> map(Function<? super T, ? extends R> mapper) {
        List<R> mapped = items.stream().<R>map(mapper).toList();
        return new PageResponse<>(mapped, page, size, totalElements,
                totalPages, hasNext, hasPrevious);
    }
}
