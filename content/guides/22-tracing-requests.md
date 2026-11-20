# Tracing requests

A request that calls three functions and crosses two services can still appear as one trace. Each operation gets a span ID and remembers the ID of its parent. All the spans share the trace ID. This guide records a checkout and its stock reservation in memory, then shows how to connect the same code to an OpenTelemetry collector.

## Record a checkout

Create a project with `silk init shop`, change into the `shop` directory and replace `src/main.silk` with this program.

```silk
import silk.concurrency.sync { Arc }
import silk.core.effect { Effect }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.text.format { Format }
import silk.trace { Meter, Metric, Trace, Tracer }
import silk.trace.record { Config, Memory, Recorder }

fn reserve(units: u64) -> () {
  let _span = Trace.span("reserve stock")
  Trace.set("stock.units", &units)
  Trace.event("reservation accepted")
  Metric.count("stock.reservations", 1)
}

@trace(name: "checkout", args: .("orderId"), kind: "server")
effect fn checkout(orderId: u64) -> () {
  reserve(2)
}

effect fn recordCheckout() -> () ! OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let recorder = run Arc<Recorder>.make(run Recorder.make(Config.make("shop")))
  run checkout(42)
    |> Effect.provideAmbient<Tracer>(&recorder)
    |> Effect.provideAmbient<Meter>(&recorder)

  let mut memory = Memory.make()
  run memory.drain(recorder.get())
  let spans = memory.spans()
  let mut at: usize = 0
  while at < spans.length {
    run Format.format("{name}\n", &.{name: spans[at].name})
    at = at + 1
  }
}

pub effect fn main() -> () ! OutOfMemoryError | WriterError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut out = StdoutWriter.make()
  run recordCheckout()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
}
```

```sh
silk run
```

```text
reserve stock
checkout
```

The inner span finishes first. Its parent span ID points to `checkout`. The parent carries the numeric attribute `orderId = 42`, and its child carries `stock.units = 2` and a timed event. Keeping `_span` in scope covers all three observations inside `reserve`. The guard closes the span when the function returns. Keep each manual guard in its opening execution and provider scope. If you open two by hand, close the inner one first.

Providing `Tracer` enables spans throughout the supplied effect. Providing `Meter` enables the counter as well. A program can provide either service independently. A plain function such as `reserve` can make observations without a service requirement in its signature.

## Choose what to record

Use `@trace` when a span covers a whole function. Omitting `name` uses the qualified declaration name. An effect function opens the span when its body runs. A typed failure records error status and the error type. Cancellation records error status and a `silk.cancelled` attribute. Use `Trace.span` when just one block of work needs timing.

Pick a span name with stable cardinality, such as `"checkout"`. Put request-specific values in attributes. The recorder keeps numbers and booleans typed and uses `Display` for other values. An attribute formatter runs in the observed function, so it must finish without parking, suspending or requiring another service.

The default recorder samples every root. To record about a tenth of new traces, create a mutable config with `Config.make("shop")`, set `config.sampleRatio = 0.1`, and pass it to `Recorder.make`. Children inherit the decision. An unsampled request still has IDs that can travel to another service. When a recorded function forks a child, the child receives the current IDs at fork time. A child can finish after its parent, and a fiber can resume on a different worker with the same open span.

## Join an incoming request

A client sends the current trace and span IDs in the W3C `traceparent` HTTP header. For example, this field carries a sampled trace.

```text
00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

In a server handler, parse the header and open a span for the request. This fragment uses the helper from the checkout example.

```silk
import silk.core.option { Option }
import silk.trace { SpanContext, Trace }

fn receive(header: string) -> () {
  match Trace.parseTraceparent(header) {
    Option<SpanContext>.Some {value} => {
      let _span = Trace.spanFrom(&value, "receive order")
      reserve(2)
    }
    Option<SpanContext>.None => {
      let _span = Trace.span("receive order")
      reserve(2)
    }
  }
}
```

A valid header gives `receive order` the caller's trace ID and parent span ID. The missing or malformed header case starts with the current local context. For an outbound call, `Trace.current()` obtains the context and `let field = Trace.traceparent(&context)` makes an owned field value. Pass `field.view()` to an API that accepts its text. In a Silk HTTP client, call `run inject(&mut request)` from `silk.http.trace` to set the header before sending. On the server, `let _span = serverSpan(&head, "receive order")` reads the header and opens the receiving span. An absent, malformed or duplicate header starts a local server span. Use the IDs to correlate telemetry while the application handles the request in the same way with either sampling decision.

## Export to a collector

To inspect a trace locally, save this collector configuration as `otelcol.yaml`. The debug exporter prints each accepted batch.

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
exporters:
  debug:
    verbosity: detailed
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
```

Start the collector in another terminal with `otelcol --config=otelcol.yaml`. Give the recorder a stable service name such as `"shop"`. An OTLP sink takes the receiver's base URL. The sink sends spans to `/v1/traces`, logs to `/v1/logs` and cumulative measurements to `/v1/metrics`.

Keep `reserve` and `checkout` from the first program. Remove the imports for `Format`, `Memory`, `StdoutWriter` and `Writer`. Keep `WriterError` for encoding failures. Add these imports and replace `recordCheckout` and `main` with the following functions.

```silk
import silk.http.client { Http, HttpError }
import silk.http.client_native { NativeHttp }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.trace.sink { flush, Otlp, OtlpResponseError }

effect fn recordCheckout() -> () ! OutOfMemoryError | WriterError | HttpError | OtlpResponseError ? &mut Allocator {
  let recorder = run Arc<Recorder>.make(run Recorder.make(Config.make("shop")))
  run checkout(42)
    |> Effect.provideAmbient<Tracer>(&recorder)
    |> Effect.provideAmbient<Meter>(&recorder)

  let mut dest = Otlp.http("http://127.0.0.1:4318")
  let mut network = NativeHttp.make()
  let mut clock = OsMonotonicClock.make()
  run flush(recorder.get(), &mut dest)
    |> Effect.provideMut<Http>(&mut network)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

pub effect fn main() -> () ! OutOfMemoryError | WriterError | HttpError | OtlpResponseError {
  let mut allocator = Allocator.systemAllocatorProvider()
  run recordCheckout() |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Look in the collector's output for the resource `service.name = shop` and the two spans with a shared trace ID. For a long-lived service, run `exportBatches` concurrently outside the provided scope and flush at shutdown. Export can wait on HTTP and retry a temporarily unavailable collector. Recording appends to bounded in-memory buffers, so a slow collector can cause dropped records. Inspect the recorder's drop counts when a trace has gaps.

## Add correlated logs and metrics

To correlate existing structured logs, wrap the recorder with `OtelLogger` and provide it as the ambient `Logger` around the same request.

```silk
let logger = run Arc<OtelLogger>.make(OtelLogger.make(&recorder))
run checkout(42)
  |> Effect.provideAmbient<Tracer>(&recorder)
  |> Effect.provideAmbient<Meter>(&recorder)
  |> Effect.provideAmbient<Logger>(&logger)
```

Import `Logger` from `silk.io.logger` and `OtelLogger` from `silk.trace.log`. A log inside a span carries the current trace and span IDs. Outside a span, the event still has its own timestamp, severity and fields. For metrics with dimensions, use an attribute variant such as `Metric.countWith("stock.reservations", 1, &.{warehouse: "east"})`. Once the recorder's series limit is reached, new combinations contribute to one overflow series.

## API reference

`silk.trace` contains span and metric operations. `silk.trace.record` configures the recorder. `silk.trace.sink` supplies in-memory, console and OTLP sinks. `silk.trace.log` connects the ambient logger. The **Services and providers** reference explains provider scope, and **Concurrent I/O patterns** covers running an effect in a fiber.
