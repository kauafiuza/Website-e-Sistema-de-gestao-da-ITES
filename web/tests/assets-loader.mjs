import { registerHooks } from "node:module"

// The node:test suite exercises document and project logic without a bundler.
// Imported block components can reference Vite-managed image files, which are
// irrelevant to these tests and are not executable Node modules.
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(new URL(url).pathname)) {
      return {
        format: "module",
        shortCircuit: true,
        source: 'export default "asset-stub";',
      }
    }

    return nextLoad(url, context)
  },
})
