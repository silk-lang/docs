RFC 7541 Appendix A static fields and Appendix B Huffman decoding trie.

Public declarations: 3.

::Anchor{id="field"}

## `field`

```silk
pub fn field(index: usize) -> Field<'static>
```

Returns the RFC 7541 static field at a one-based index from 1 through 61. Other indices return an empty field.

::Anchor{id="next"}

## `next`

```silk
pub fn next(node: usize, bit: bool) -> usize
```

Returns the child of a valid Huffman trie node for one input bit.

::Anchor{id="symbol"}

## `symbol`

```silk
pub fn symbol(node: usize) -> usize
```

Returns a byte symbol, 256 for EOS, or 257 for an internal node. The node must be a valid trie index.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
