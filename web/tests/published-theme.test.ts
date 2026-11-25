import assert from "node:assert/strict"
import { test } from "node:test"
import { parsePublishedThemePreference, publishedThemeStorageKey, resolvePublishedThemeMode } from "../src/pages/publications/lib/published-theme"

test("a published site follows the system unless it has its own preference", () => {
  assert.equal(resolvePublishedThemeMode(parsePublishedThemePreference(null), true), "dark")
  assert.equal(resolvePublishedThemeMode(parsePublishedThemePreference(null), false), "light")
  assert.equal(resolvePublishedThemeMode(parsePublishedThemePreference("light"), true), "light")
  assert.equal(resolvePublishedThemeMode(parsePublishedThemePreference("dark"), false), "dark")
  assert.notEqual(publishedThemeStorageKey("site-a"), publishedThemeStorageKey("site-b"))
})
