# 13. Putting it together

`tasks` is now two packages: the `taskcore` library and a program with a clean `execute` at its center. In this last chapter you put the board on the network. `tasks serve` starts a small HTTP service, and every request runs the same `execute` the command line uses. Only one thing changes per request: where the output goes.

The service speaks plain HTTP on 127.0.0.1. The standard library has TLS for clients, but not yet for servers, so there is no HTTPS here. More on that near the end.

## The plan: a request is a command

You could write a second set of handlers for HTTP. You don't need to. Everything the program does already goes through one function:

```silk
pub effect fn execute<'text>(words: &'text Words) -> i32
! LogError | UsageError | UnknownCommand<'text> | DuplicateTask | NoSuchTask | CorruptFile
| FileError | WriterError | OutOfMemoryError | TaskIdExhaustedError | StalledError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
```

It takes `Words`, uses services for everything outside itself, and fails with typed errors. That gives a simple plan for each request:

1. **Route.** Turn the method, path and body into `Words`, as if they had been typed on the command line.
2. **Answer.** Run `execute` with a Logger that writes into the response body instead of stdout.
3. **Status.** Pick the HTTP status from the typed failure, if there was one.
4. **Respond.** Send the status line, headers and body over the socket.

Steps 1 to 3 never touch a socket, so you can test them like any other function. The new module is `tasks/src/Http.silk`. As in chapter 12, run the commands from `tasks/` inside the workspace; the program builds into the shared `../build` folder. These are its routes:

| Request | Command |
| --- | --- |
| `GET /tasks` | `list` |
| `GET /tasks.csv` | `export` |
| `GET /version` | `version` |
| `POST /tasks`, body is the title | `add <title>` |
| `POST /tasks?priority=high` | `add <title> high` |
| `POST /tasks/<id>/done` | `done <id>` |

## A Logger that writes the response

In chapter 8 you replaced the file system and the clock in tests by providing different services. The same trick works here. The command line provides `StdoutLogger`. The server provides a Logger that collects text in memory:

```silk
pub struct BodyLogger { pub text: TextWriter }

impl BodyLogger {
  pub fn make() -> BodyLogger {
    return BodyLogger { text: TextWriter.make() }
  }

  effect fn write<Args>(
    self: &mut Self,
    level: LogLevel,
    static template: string<'static>,
    args: &Args
  ) -> () ! LogError {
    let written = run Effect.result(Format.format<Args>(template, args) |> Effect.provideMut<Writer>(&mut self.text))
    return match move written {
      Result<(), WriterError>.Success { .. } => ()
      Result<(), WriterError>.Failure { .. } => run logFailed()
    }
  }
}

effect fn logFailed() -> never ! LogError {
  fail Logger.failure(1)
}

impl Logger for BodyLogger {
  log: BodyLogger.write
}
```

`TextWriter` is the in-memory Writer from chapter 9. It now lives in `taskcore.Store`, and it was already `pub`, so `Http.silk` imports it. `write` formats the template into it, exactly as `Effect.log` would format onto stdout. The template is a `static` parameter, just like `bar`'s width in chapter 11: each template gets its own compiled copy.

That is the whole adapter. `list`, `add` and the rest have no idea they are serving a web request.

## Routing

`route` compares bytes and builds `Words`. It returns `None` for a request it does not know:

```silk
// Which command a request means, or None for an unknown route.
pub effect fn route(method: &[u8], target: &[u8], body: &[u8]) -> Option<Words>
! OutOfMemoryError
? &mut Allocator {
  if equal(method, b"GET") {
    if equal(target, b"/tasks") {
      return run words(b"list", b"", b"")
    }
    if equal(target, b"/tasks.csv") {
      return run words(b"export", b"", b"")
    }
    if equal(target, b"/version") {
      return run words(b"version", b"", b"")
    }
  }
  if equal(method, b"POST") {
    if equal(target, b"/tasks") {
      return run words(b"add", body, b"")
    }
    if startsWith(target, b"/tasks?priority=") {
      return run words(b"add", body, rest(target, 16))
    }
    // /tasks/<id>/done
    if startsWith(target, b"/tasks/") && target.length > 12 && equal(rest(target, target.length - 5), b"/done") {
      return run words(b"done", Slice.view(target, 7, target.length - 12), b"")
    }
  }
  return Option<Words>.None
}
```

`equal`, `startsWith` and `rest` are small private helpers over byte slices, and `words` copies three slices into a `Words`. Notice what `route` does not do: it does not check that the priority is a real one, or that the id is a number. `parseCommand` already does that, and its `UsageError` will become a 400 below.

## Answering, and choosing the status

`answer` runs one command with a fresh `BodyLogger`, then looks at the outcome:

```silk
// Runs one command with the response body as its Logger, and picks the HTTP status from
// the typed failure, if there was one.
pub effect fn answer(words: &Words) -> Reply
! OutOfMemoryError
? &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
  let mut logger = BodyLogger.make()
  let outcome = run Effect.result(execute(words)) |> Effect.provideMut<Logger>(&mut logger)
  let mut status: u16 = 200
  if let Result.Failure { error } = move outcome {
    status = match &error {
      UsageError { .. } => 400
      UnknownCommand { .. } => 400
      NoSuchTask { .. } => 404
      DuplicateTask { .. } => 409
      _ => 500
    }
    // The same messages the command line prints.
    drop run Effect.result(explain(move error)) |> Effect.provideMut<Logger>(&mut logger)
  }
  return Reply { status: status, body: move logger.text.out }
}
```

Look at the requirement row. `answer` needs a FileSystem, two clocks and an Allocator, but no Logger. It provides the Logger itself, so `?` no longer lists it. A provider removes a requirement; that is what `provideMut` has been doing since chapter 1.

This is where typed failures pay off. Because `execute` lists every way it can fail, `match &error` can map each one to a status. `match &error` looks at the failure without moving it. Then `explain`, the same handler `main` uses, writes the familiar message into the body. The CLI and the server can never disagree about what went wrong.

`Http.silk` imports `execute` and `explain` from `main`, and `main` imports `Http`. That is another import cycle, as in chapter 12, and it is fine.

## Testing without sockets

Since `route` and `answer` are ordinary effect functions, two new tests in `tests.silk` cover them. Here is the one for conflicts. It runs `add Buy milk` twice against the in-memory fakes from chapter 8:

```silk
test effect fn duplicatesAreConflicts() ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut files = MemoryFiles { contents: Bytes.make(), present: false, allocator: Allocator.systemAllocatorProvider() }
  let mut clock = FixedClock { seconds: 1000 }
  let mut timer = VirtualClock { mark: SystemClock.make(0, 0) }
  let add = run wordsOf(b"add", b"Buy milk", b"") |> Effect.provideMut<Allocator>(&mut allocator)
  let first = run answer(&add)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<MonotonicClock>(&mut timer)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let second = run answer(&add)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<MonotonicClock>(&mut timer)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(first.status == 200, "the first add succeeds")
  run Testing.expect(sameBytes(Bytes.asSlice(&first.body), b"added #1\n"), "and says so")
  run Testing.expect(second.status == 409, "the second is a conflict")
  run Testing.expect(sameBytes(Bytes.asSlice(&second.body), b"that task already exists as #1\n"), "with the CLI's message")
}
```

The other, `doneRouteCarriesTheId`, checks that `POST /tasks/12/done` routes to `done 12` and that `DELETE /tasks` routes nowhere. Add `import Http { answer, route }` and `import silk.option { Option }` to `tests.silk`, then run everything:

```sh
silk test
```

```
  tests::doneRouteCarriesTheId
    PASS  9 us
  tests::duplicatesAreConflicts
    PASS  75 us
  tests::finishingRecordsTheClockTime
    PASS  49 us
  tests::slowRemindersAreCancelled
    PASS  167 us
  tests::unknownTaskIsReported
    PASS  15 us

Tests  5 passed, 0 failed (0 cached, 5 executed, 5 selected, 5 discovered)
Time   430 us
```

The HTTP logic is tested before a single port is opened.

## The socket side

Now the part that does touch the network. It uses four standard library modules:

- `silk/native_socket`: `listen` opens a listening socket, and `withListener` runs an effect with it.
- `silk/http_server_native`: `serveNext` accepts one connection and hands it to your handler.
- `silk/http_server`: the `ConnectionHandler` interface, `withRequest`, `readSome` and `respond`.
- `silk/http`, `silk/http_head`, `silk/http_headers` and `silk/http_body`: headers, status codes and limits.

Several of these modules each export a type called `Limits`, so the imports rename them with `as`:

```silk
import silk.http_body { Limits as BodyLimits, TrailerPolicy }
import silk.http_head { Limits as HeadLimits }
import silk.http_headers { Headers, Limits as ValueLimits }
import silk.http_server { BodyMode, Connection as HttpConnection, ConnectionHandler, Limits as HttpLimits, Request, ResponseWriter, ReusePolicy, ServerError, readSome, respond, withRequest }
```

### Limits

An HTTP server reads bytes from strangers. The standard library makes you say, up front, how much it may read and keep: the longest request line, the most headers, the largest body, and so on. `limits()` fills in one `HttpLimits` value. Here is its first part:

```silk
fn limits() -> HttpLimits {
  return HttpLimits {
    head: HeadLimits {
      maxHeadBytes: 8192,
      maxStartLineBytes: 1024,
      maxFieldLineBytes: 2048,
      maxOwnedBytes: 65536,
      values: valueLimits(),
    },
```

The body limits allow 1 KiB of payload, which is plenty for a task title. Two other settings shape the service: `maxRequestsPerConnection: 1`, and, below, `ReusePolicy.CloseAfterResponse`. Each connection carries one request and is then closed. See the `silk/http_server` page of the std lib API reference for every field.

The limits are only checked when a connection arrives, not at build time. If you set `head.maxOwnedBytes` to 8192, too small for 8192 bytes of head plus the header records, everything builds. Then each request fails:

```sh
silk build >/dev/null 2>&1; (../build/llvm/x86_64-unknown-linux-gnu/debug/tasks serve 18414 1 & sleep 0.5; curl -s -i http://127.0.0.1:18414/tasks; echo "[curl exit $?]"; wait)
```

```
serving http://127.0.0.1:18414/tasks
a connection failed
[curl exit 56]
```

The server logs "a connection failed", and curl's exit status 56 means the connection broke while it was receiving. If you change the limits and a well-formed request starts failing like this, suspect the limits first.

### One request

`serveRequest` is the heart of the socket side. It copies what it needs out of the request, reads the body, and then uses `route` and `answer`:

```silk
  // Copy what we need from the head: reading the body needs the request back.
  let head = run Request.head(&request.*)
  let method = run Bytes.copy(String.utf8Bytes(head.method().format()))
  let target = run Bytes.copy(String.utf8Bytes(RequestTarget.format(head.target())))
  let body = run readBody(&mut request.*)

  let found = run route(Bytes.asSlice(&method), Bytes.asSlice(&target), Bytes.asSlice(&body))
  let reply = match move found {
    Option.Some { value } => run answer(&value)
    Option.None => run notFound()
  }
  let status = reply.status
  run Effect.catchAll(logRequest(asText(Bytes.asSlice(&method)), asText(Bytes.asSlice(&target)), status), ignoreLogError)
```

The copies are there because of borrowing. `head` borrows the request, and `readBody` needs `&mut request.*`. Copying the method and target into owned `Bytes` ends the shared loan before the mutable one starts. `readBody` calls `readSome` in a loop until the body is complete.

`logRequest` writes one line per request to the server's own Logger. That is the `StdoutLogger` from `main`, not the `BodyLogger`, which belongs to `answer`. Two Loggers are in play, and each call site gets the nearest provider.

### Headers in one array

The response needs a `Content-Length` and a `Content-Type`. Each `Header` borrows its value, so the type is `Header<'value>`:

```silk
effect fn header<'value>(name: string<'static>, value: &'value [u8]) -> Header<'value> ! ServerError {
```

The Content-Type value is a `'static` byte string. The Content-Length value is borrowed from a local `Bytes` holding the digits. Putting the two in one array is natural. Here is the `main` of a small standalone program that does just that, with a plain version of `header` above it:

```silk
pub fn main() -> i32 {
  let length: [u8; 2] = ['4', '2']
  // A 'static header and a header borrowing `length`, side by side in one array.
  let entries = [
    header("Content-Type", b"text/plain"),
    header("Content-Length", &length),
  ]
  return 0
}
```

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     56 modules, 1 in package          0.07s
  check    2 modules                         0.17s
  borrow   108 bodies                        0.00s
Finished tasks in 0.25s
```

The two elements look alike, but their types differ in the lifetime. The first is a `Header<'static>`. The second borrows `length`, so it can only live as long as `length` does. An array has one element type, and the compiler settles on the shorter of the two lifetimes. A `'static` header is fine wherever a shorter-lived one is expected, so both fit, in either order.

`header` in `Http.silk` can fail, so each call needs its own `run`. Binding the headers first keeps the array short:

```silk
  let length = run Effect.catchAll(decimal(reply.body.length()), badLength)
  let contentLength = run header("Content-Length", Bytes.asSlice(&length))
  let contentType = run header("Content-Type", b"text/plain; charset=utf-8")
  let entries = [contentLength, contentType]
```

Don't leave `Content-Length` out. The response uses `BodyMode.ContentLength`, which promises that header. Without it, the request is logged with 200 and then the write fails:

```
serving http://127.0.0.1:18414/tasks
GET /tasks -> 200
a connection failed
[curl exit 52]
```

curl exit 52 means "empty reply from server".

### Writing the body: a callback

`respond` sends the status line and headers, then calls you back to write the body. Your callback receives a `ResponseWriter` borrow that is only valid during that call. In Silk terms the callback is higher-ranked: it must work for whatever lifetime `'call` the caller picks. See **Closures and callable types** in the reference.

The natural first try is a closure, passed as the last argument of `respond`, that captures `reply.body`:

```silk
    effect fn(writer: &mut ResponseWriter<Connection>) -> u16 ! ServerError ? &mut MonotonicClock {
      drop run ResponseWriter.writeAll(&mut writer.*, Bytes.asSlice(&reply.body), Option<Instant>.none())
      let none: [Header<'static>; 0] = []
      let trailers = match move Headers.make(&none, valueLimits()) {
        Result.Failure { error } => { fail ServerError.Value { error: move error } }
        Result.Success { value } => value
      }
      run ResponseWriter.finish(&mut writer.*, &trailers, Option<Instant>.none())
      return 0
    },
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     95 modules, 8 in package          0.15s
  check    9 modules                         7.67s
  borrow   1,329 bodies                      0.14s
Finished tasks in 7.83s
```

That works. The closure borrows `reply.body`, and the borrow is fine because `respond` is done with the callback before it returns. But ten lines of body writing now sit in the middle of the `respond` call. This chapter moves them into a named function plus a staged call. Write the body writer as a function whose last parameter is the body:

```silk
// Writes the body once the head is out. The extra `body` argument is bound at the call site:
// `writeBody(move body)` is a function of the writer alone.
effect<'call> fn writeBody<'call, 'writerView: 'call, 'requestView: 'writerView, 'connectionView: 'requestView, 'transportView: 'connectionView>(
  writer: &'call mut ResponseWriter<'writerView, 'requestView, 'connectionView, 'transportView, Connection>,
  body: Bytes,
) -> u16 ! ServerError ? &mut MonotonicClock {
  drop run ResponseWriter.writeAll(&mut writer.*, Bytes.asSlice(&body), Option<Instant>.none())
  let none: [Header<'static>; 0] = []
  let trailers = match Headers.make(&none, valueLimits()) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value } => value
  }
  run ResponseWriter.finish(&mut writer.*, &trailers, Option<Instant>.none())
  return 0
}
```

The lifetime list is long, but it only says that the writer borrows the request, which borrows the connection, which borrows the transport. Calling a function with fewer arguments than parameters fills the trailing ones. So `writeBody(move reply.body)` binds `body` and leaves a function of the writer alone, which is what `respond` wants:

```silk
  drop run respond(
    move request,
    &response,
    BodyMode.ContentLength { length: usize.toU64(reply.body.length()) },
    ReusePolicy.CloseAfterResponse,
    TrailerPolicy.defaultPolicy(),
    Option<Instant>.none(),
    writeBody(move reply.body),
  )
  return status
```

You have used staged calls before without the name: `acceptLoop(count)` below is one too.

### The handler and the accept loop

`serveNext` wants a value that implements `ConnectionHandler`. `TasksHandler` holds nothing; its `handle` method asks for one request and passes it to `serveRequest`:

```silk
    drop handler
    let handled = run withRequest(&mut connection.*, Option<Instant>.none(), serveRequest)
    return match move handled {
      Option.None => 0
      Option.Some { value } => value
    }
```

The accept loop serves `count` connections, or forever when `count` is 0. A failed connection is logged and the loop carries on, so one bad client cannot stop the server:

```silk
// Serves `count` connections (0: forever), one at a time. A broken connection is logged and skipped.
effect fn acceptLoop(listener: &mut Listener, count: u32) -> i32
! LogError | OutOfMemoryError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
  let mut served: u32 = 0
  while count == 0 || served < count {
    let outcome = run Effect.result(serveNext<u16, ServerError | OutOfMemoryError>(
      &mut listener.*, limits(), Option<Instant>.none(), TasksHandler {},
    ))
    if let Result.Failure { error } = move outcome {
      drop error
      run Effect.log("a connection failed\n", &())
    }
    served = served + 1
  }
  return 0
}
```

Finally, `serve` opens the socket:

```silk
pub effect fn serve(port: u16, count: u32) -> i32
! LogError | OutOfMemoryError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
  let endpoint = Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
  let options = match ListenOptions.make(128, true, 1000000) {
    Result.Success { value } => value
    Result.Failure { .. } => ListenOptions.defaults()
  }
  let listening = run Effect.result(listen(endpoint, options))
  let listener = match move listening {
    Result.Success { value } => move value
    Result.Failure { error } => {
      drop error
      run Effect.log("cannot listen on 127.0.0.1:{port}\n", &.{ port: port })
      return 1
    }
  }
  run Effect.log("serving http://127.0.0.1:{port}/tasks\n", &.{ port: port })
  return run withListener(move listener, acceptLoop(count))
}
```

`ListenOptions.make(128, true, 1000000)` sets a backlog of 128, turns on address reuse and polls every millisecond. The defaults leave address reuse off. Then restarting the server right after stopping it fails for a while, because the old socket still holds the port.

The server binds to 127.0.0.1 only, so nothing outside your machine can reach it.

## Wiring `serve` into `main`

`serve` is not a `Command`. `execute` runs once per request, and a request should never start another server. So `main` checks for `serve` before it calls `execute`, and runs the server under the same real providers:

```silk
  if sameText(Bytes.asSlice(&words.command), "serve") {
    let serving = Effect.catchAll(startServer(&words), serverFailed)
    return run move serving
      |> Effect.provideMut<Logger>(&mut logger)
      |> Effect.provideMut<FileSystem>(&mut files)
      |> Effect.provideMut<SystemClock>(&mut clock)
      |> Effect.provideMut<MonotonicClock>(&mut timer)
      |> Effect.provideMut<Allocator>(&mut allocator)
  }
```

`startServer` parses the optional port (default 8080) and connection count, then calls `Http.serve`:

```silk
// tasks serve [port] [connections]: the same board over HTTP. 0 connections means forever.
effect fn startServer<'text>(words: &'text Words) -> i32
! LogError | UsageError | OutOfMemoryError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
  let port = run portOf(run text(&words.first))
  let count = run countOf(run text(&words.second))
  return run Http.serve(port, count)
}
```

`main.silk` has `import Http` with no braces, so it calls the function by its module name, `Http.serve`. `serverFailed` turns a `UsageError` into the usage text, which now mentions `serve`:

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks serve abc
```

```
usage: tasks list | add <title> [low|normal|high] | done <id> | remind [ms] | export | version | serve [port] [connections]
```

## Try it

Build, then start the server in the background on port 18413. Any free port works. The `12` makes it stop after twelve connections, which suits a scripted session; leave it out to serve forever.

```sh
silk build
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     95 modules, 8 in package          0.15s
  check    8 modules                         5.32s
  codegen  7,485 functions                   5.72s
  borrow   1,349 bodies                      0.14s
  link     clang                             2.80s
Finished /home/you/tasks-workspace/build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 14.36s
```

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks serve 18413 12 &
```

Start with an empty board. `-i` shows the response head:

```sh
curl -s -i http://127.0.0.1:18413/tasks
```

```
HTTP/1.1 200 OK
Content-Length: 30
Content-Type: text/plain; charset=utf-8
Connection: close

0 open [--------------------]
```

The body is exactly what `tasks list` prints. Add some tasks. The title is the request body:

```sh
curl -s -i -X POST -d 'Buy milk' http://127.0.0.1:18413/tasks
```

```
HTTP/1.1 200 OK
Content-Length: 9
Content-Type: text/plain; charset=utf-8
Connection: close

added #1
```

```sh
curl -s -X POST -d 'Write the Silk book' 'http://127.0.0.1:18413/tasks?priority=high'
curl -s -X POST -d 'Water the plants' 'http://127.0.0.1:18413/tasks?priority=low'
```

```
added #2
added #3
```

Now the failures. A duplicate title, with extra spaces, is a 409:

```sh
curl -s -i -X POST -d ' Buy milk ' http://127.0.0.1:18413/tasks
```

```
HTTP/1.1 409 Conflict
Content-Length: 31
Content-Type: text/plain; charset=utf-8
Connection: close

that task already exists as #1
```

A priority that `parseCommand` rejects is a 400, with the usage text:

```sh
curl -s -i -X POST -d 'Call the plumber' 'http://127.0.0.1:18413/tasks?priority=urgent'
```

```
HTTP/1.1 400 Bad Request
Content-Length: 124
Content-Type: text/plain; charset=utf-8
Connection: close

usage: tasks list | add <title> [low|normal|high] | done <id> | remind [ms] | export | version | serve [port] [connections]
```

Finish a task, then try one that does not exist:

```sh
curl -s -X POST http://127.0.0.1:18413/tasks/1/done
```

```
finished #1
```

```sh
curl -s -i -X POST http://127.0.0.1:18413/tasks/9/done
```

```
HTTP/1.1 404 Not Found
Content-Length: 20
Content-Type: text/plain; charset=utf-8
Connection: close

there is no task #9
```

The list, the CSV export and the version all work too:

```sh
curl -s http://127.0.0.1:18413/tasks
```

```
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
[x] #1 Buy milk (normal, done today)
2 open [######--------------]
```

```sh
curl -s http://127.0.0.1:18413/tasks.csv
```

```
id,title,priority,done
1,Buy milk,normal,yes
2,Write the Silk book,high,no
3,Water the plants,low,no
```

```sh
curl -s -i http://127.0.0.1:18413/nope
```

```
HTTP/1.1 404 Not Found
Content-Length: 14
Content-Type: text/plain; charset=utf-8
Connection: close

no such route
```

```sh
curl -s http://127.0.0.1:18413/version
```

```
tasks 0.13 (linux, debug build)
tasks file /tasks.txt, reminders wait 300ms
```

That was the twelfth connection, so the server exits with status 0. Meanwhile, its own output was one line per request:

```
serving http://127.0.0.1:18413/tasks
GET /tasks -> 200
POST /tasks -> 200
POST /tasks?priority=high -> 200
POST /tasks?priority=low -> 200
POST /tasks -> 409
POST /tasks?priority=urgent -> 400
POST /tasks/1/done -> 200
POST /tasks/9/done -> 404
GET /tasks -> 200
GET /tasks.csv -> 200
GET /nope -> 404
GET /version -> 200
```

The server saved to the same `tasks.txt` as the command line, so the CLI sees the same board:

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks list
```

```
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
[x] #1 Buy milk (normal, done today)
2 open [######--------------]
```

If the port is already in use, here by another running server, `serve` says so and exits with status 1:

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks serve 18413 1
```

```
cannot listen on 127.0.0.1:18413
```

## What this server is, and is not

The server handles one connection at a time. Requests run in order, each one loads `tasks.txt` in full, and a slow client makes the next one wait. That keeps the board consistent with no locking at all, and it is plenty for a personal tool.

It also speaks plain HTTP. The standard library's TLS support is client-side only (`silk/tls_client` and `silk/tls_connection`), so a Silk program can call an HTTPS service but cannot yet serve one. Keep the server on 127.0.0.1. If it must be reachable from elsewhere, put a TLS-terminating proxy in front of it.

## Summary

- You can reuse a whole program as a service by changing a provider: `BodyLogger` turns CLI output into a response body.
- Typed failures map directly to HTTP statuses, and the same `explain` writes the message for both front ends.
- Keeping routing and answering free of sockets lets you test them with the fakes you already have.
- `silk/native_socket` and `silk/http_server` give you `listen`, `serveNext`, `withRequest`, `readSome` and `respond`, with explicit limits checked per connection.
- A staged call such as `writeBody(move reply.body)` builds a callback from a named function, which keeps a long callback out of the call that receives it.
- An array literal takes its element type from its first element, so put the shortest-lived borrow first.

## Where to go next

That is the end of the book. In thirteen chapters `tasks` grew from one log line to two packages, a test suite, reminders on fibers, a compile-time CSV export and an HTTP service. Along the way you met nearly every part of the language at least once.

From here, three places will serve you best:

- **The Language reference.** Every page this book linked, from **Lexical structure** to **Package parameters**, gives the full rules and the diagnostic codes. When the compiler prints a code like SEM0021, the reference page for that topic explains the rule behind it.
- **The std lib API reference.** One page per module, generated from the source. Start with the modules you used here: `silk/effect`, `silk/logger`, `silk/filesystem`, `silk/hash_map`, `silk/list`, `silk/local_scheduler` and `silk/http_server`.
- **The guides.** Shorter, task-focused pages for things this book only touched on, or left out.

A good next project is to extend `tasks` yourself. Add a `DELETE /tasks/<id>` route and a `remove` command, give tasks due dates, or write a second program that depends on `taskcore` and prints a weekly summary. Each one exercises the same pieces: a new typed failure, a new `Command` variant, a test with fake providers, and a build that tells you exactly what you missed.
