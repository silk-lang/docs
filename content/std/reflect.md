Finite aggregate metadata available only during static evaluation.

## Details

Reflection retains nominal owner and visible declaration order. Descriptors have no runtime
representation and disappear before runtime TIR is published.

Import as `Reflect` with `import silk.reflect { Reflect }`.

Public declarations: 7.

::Anchor{id="namedKind"}

## `namedKind`

```silk
pub const namedKind: u8
```

Source-declared named aggregate kind returned by `typeKind`.

::Anchor{id="positionalKind"}

## `positionalKind`

```silk
pub const positionalKind: u8
```

Source-declared positional aggregate kind returned by `typeKind`.

::Anchor{id="anonymousNamedKind"}

## `anonymousNamedKind`

```silk
pub const anonymousNamedKind: u8
```

Occurrence-generated named aggregate kind returned by `typeKind`.

::Anchor{id="anonymousPositionalKind"}

## `anonymousPositionalKind`

```silk
pub const anonymousPositionalKind: u8
```

Occurrence-generated positional aggregate kind returned by `typeKind`.

::Anchor{id="labeledFieldKind"}

## `labeledFieldKind`

```silk
pub const labeledFieldKind: u8
```

Labeled member kind returned by `fieldKind`.

::Anchor{id="positionalFieldKind"}

## `positionalFieldKind`

```silk
pub const positionalFieldKind: u8
```

Positional member kind returned by `fieldKind`.

::Anchor{id="Reflect"}

## `Reflect`

```silk
pub struct Reflect
```

The scope for Reflect operations.

### Details

This owner carries no data. Select it with `import silk.reflect { Reflect }`
to access its inherent operations.

::Anchor{id="Reflect.impl"}

## Implementation `Reflect`

```silk
impl Reflect
```

::Anchor{id="Reflect.impl.typeOf"}

### Associated function `typeOf`

```silk
pub static fn typeOf<Owner>() -> Intrinsic.Type<Owner>
```

Returns the canonical aggregate type descriptor for `Owner`.

::Anchor{id="Reflect.impl.fields"}

### Associated function `fields`

```silk
pub static fn fields<Owner>() -> Intrinsic.Fields<Owner>
```

Returns declaration-ordered descriptors for fields visible from this wrapper.

::Anchor{id="Reflect.impl.typeKind"}

### Associated function `typeKind`

```silk
pub static fn typeKind<Owner>(descriptor: Intrinsic.Type<Owner>) -> u8
```

Returns the stable aggregate-kind code for `descriptor`.

::Anchor{id="Reflect.impl.fieldKind"}

### Associated function `fieldKind`

```silk
pub static fn fieldKind<Owner, Value>(field: Intrinsic.Field<Owner, Value>) -> u8
```

Returns whether `field` carries a label or a position.

::Anchor{id="Reflect.impl.fieldLabel"}

### Associated function `fieldLabel`

```silk
pub static fn fieldLabel<Owner, Value>(field: Intrinsic.Field<Owner, Value>) -> string<'static>
```

Returns the source label of a labeled field.

::Anchor{id="Reflect.impl.fieldOrdinal"}

### Associated function `fieldOrdinal`

```silk
pub static fn fieldOrdinal<Owner, Value>(field: Intrinsic.Field<Owner, Value>) -> usize
```

Returns the source position of a positional field.

::Anchor{id="Reflect.impl.borrowField"}

### Associated function `borrowField`

```silk
pub fn borrowField<Owner, Value>(owner: &Owner, static field: Intrinsic.Field<Owner, Value>) -> &Value
```

Borrows exactly the runtime field authorized by one static descriptor.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
