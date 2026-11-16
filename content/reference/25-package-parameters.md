# Package parameters

A package parameter is a named static value declared with `param`. A root build command binds public parameters through `Package.set`; unbound parameters use their defaults. The resolved request captures the complete typed values before source specialization.

```silk
pub param workers: i32 = 4 where workers > 0 && workers <= 64
pub param label: string = "service"
param queueDepth: i32 = workers * 8
```

## Declarations and types

`pub param name: T` may omit its default. Every compilation that reaches the parameter must then supply it. A private parameter requires a default and cannot be bound by a consumer. Parameters may be declared in source modules and in `build.silk`. They are read-only static values and cannot be introduced by a module-level `static if`.

Admitted types include integers, booleans, strings, nominal enums, options, arrays and records recursively containing admitted values. Bindings retain nominal enum identity, integer precision, record fields and every layer of nested `Option`. A float, pointer or other inadmissible value is rejected. Write `Option<T>` for an optional type.

## Binding values

In a task's graph construction, configure the package alias declared by the manifest:

```silk
let settings = run Package.make()
  |> Package.set("lib.silk", "workers", run Deferred<i32>.value(8))
let compilation = run Compilation.fromPackage(options)
  |> Compilation.package("renderer", move settings)
```

These operations import `Package` from `silk.build.package`, `Deferred` from `silk.build.step` and `Compilation` from `silk.build.graph`. The task's function supplies the required Effects. Use alias `self` for the root package. Module paths are relative to the package's source root, except the special package plan `build.silk`.

`Package.supplyPath` supplies a deferred path parameter and grants the package's plan access to it. This is the explicit way for a dependency plan to read outside its package. Such physical paths are tracked as build inputs without becoming source specialization identity.

## Defaults and validation

A default is a static expression of the declared type. It may read constants, call static functions and read other parameters' final values. An overridden default is not evaluated. Cycles between defaults are rejected.

A `where` predicate runs against final parameter values and must produce `bool`. A false predicate, incompatible binding, private binding or required value left unbound produces SEM0214. Source errors identify the declaration or expression that failed.

```silk
pub param port: u16
pub param verbose: bool = false
pub param retries: i32 = 3 where retries >= 0
```

A compilation of this module must bind `port`, even if it keeps the other defaults. Resolving the compilation checks these obligations before publishing its request.

## Compilation facts

Target, runtime, libc, CPU features and program-wide optimization are fixed source facts exposed by `silk.core.target` and `silk.core.compilation`. `Package.optimize` and `Package.debug` affect only backend code generation. They do not change source facts or parameter identity, and generic instances use their defining package's backend settings.

See **Tasks and build graphs** for graph construction and **Targets and compilation settings** for artifact options.
