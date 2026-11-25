export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}
export function validEmail(value: string) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) &&
    value.trim().length <= 254
  )
}
export function passwordError(
  password: string,
  email = "",
  names: string[] = []
) {
  if ([...password].length < 8) return "Use pelo menos 8 caracteres."
  if (new TextEncoder().encode(password).length > 72)
    return "Use no máximo 72 bytes na senha."
  if (new Set(password).size === 1) return "Evite repetir o mesmo caractere."
  const lower = password.toLocaleLowerCase()
  const personal = [email.split("@")[0], ...names].filter(
    (value) => value && value.length >= 3
  )
  if (personal.some((value) => lower.includes(value.toLocaleLowerCase())))
    return "Não inclua seu nome ou e-mail na senha."
  return null
}
export function errorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.startsWith("Não foi possível concluir")
  )
    return error.message
  return fallback
}
