export function safeHref(value: string) {
  return /^(https?:\/\/|mailto:|tel:|#|\/(?:[^/\\]|$))/.test(value)
    ? value
    : "#"
}

export function safeImageUrl(value: string) {
  return /^(https?:\/\/|\/(?:[^/\\]|$))/.test(value) ? value : ""
}
