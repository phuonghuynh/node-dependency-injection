# node-dependency-injection

fork of origin https://www.npmjs.com/package/node-dependency-injection with custom code

`npm i @hoaphat/node-dependency-injection`

### Additional features
- Cancel register same bean by `id`, graceful return nothing
- Added `container.clear()` to clear all beans+definitions+alias
- Added `container.bootstrap()` to allow eager load all beans
- Added `container.asyncBootstrap()` async version of func `bootstrap`
- Added `container.registerSyntheticAndSet(id, instance)` to do "remove-then-set" synthetic-instance
- Added `container.waitAndGet(id, opts)` to do "wait-for-async-bean" be ready
- Added `container.getOrDefault(id, defaults)` to do return default-value if no bean existing instead of throw error
