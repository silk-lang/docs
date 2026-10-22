The provider protocol that prepares child Fibers and publishes them atomically.

## When to use
Implement [`Scheduler`](#Scheduler) to supply the task policy for `Fiber.forkChild`. Application code uses
the Fiber operations and a provider such as `silk.local_scheduler`, not this protocol.

## Details
A fork has two steps:

1. `Scheduler.prepare` allocates and prepares one child, but does not publish it. The returned
   [`PendingPublication`](#PendingPublication) owns the complete task submission, the response channel, and the
   Fiber.
2. `Fiber.forkChild` registers that data after the exclusive service dispatch ends, and parks
   until the driver accepts or rejects the child.

Thus no executable value crosses the service boundary.

## Errors
`prepare` fails with `OutOfMemoryError`, or with [`TaskIdExhaustedError`](#TaskIdExhaustedError) when no task identity
is left.

## Gotchas
A provider must not expose the Fiber before publication succeeds. A publication failure consumes
the complete pending value and returns no Fiber.

Import as `Scheduler` with `import silk.scheduler { Scheduler }`.

Public declarations: 15.

::Anchor{id="TaskId"}

## `TaskId`

```silk
pub struct TaskId
```

A task identity that is unique within one Scheduler execution.

### Details

A provider reserves identities monotonically and does not reuse them during one execution.

::Anchor{id="TaskId.value"}

### Field `value`

```silk
pub value: u64
```

The provider-local monotonic identity value.

::Anchor{id="TaskId.impl.Copy"}

## Implementation `Copy for TaskId`

```silk
impl Copy for TaskId
```

::Anchor{id="TaskId.impl.HashKey"}

## Implementation `HashKey for TaskId`

```silk
impl HashKey for TaskId
```

::Anchor{id="TaskId.impl.HashKey.equals"}

### Operation `equals`

```silk
equals: TaskId.taskIdEquals
```

::Anchor{id="TaskId.impl.HashKey.hash"}

### Operation `hash`

```silk
hash: TaskId.taskIdHash
```

::Anchor{id="TaskIdExhaustedError"}

## `TaskIdExhaustedError`

```silk
pub struct TaskIdExhaustedError
```

A typed failure that reports exhaustion of the task identity space.

::Anchor{id="PublicationResponse"}

## `PublicationResponse`

```silk
pub struct PublicationResponse
```

A response that records whether one prepared child was published or rejected.

### Details

The parent owns this cell while parked. The Scheduler driver changes `phase` exactly once before
it wakes the parent.

::Anchor{id="PublicationResponse.phase"}

### Field `phase`

```silk
pub phase: ResponseWaiting | ResponsePublished | ResponseRejected
```

The current publication decision.

::Anchor{id="ResponseWaiting"}

## `ResponseWaiting`

```silk
pub struct ResponseWaiting
```

A publication decision has not been made yet.

::Anchor{id="ResponsePublished"}

## `ResponsePublished`

```silk
pub struct ResponsePublished
```

The Scheduler accepted the prepared child for publication.

::Anchor{id="ResponseRejected"}

## `ResponseRejected`

```silk
pub struct ResponseRejected
```

The Scheduler rejected and destroyed the prepared child without activation.

::Anchor{id="NoRequest"}

## `NoRequest`

```silk
pub struct NoRequest
```

A parent task has no pending publication request.

::Anchor{id="PendingRequest"}

## `PendingRequest`

```silk
pub struct PendingRequest
```

A parent is parked until the Scheduler processes one publication request.

::Anchor{id="PendingRequest.wake"}

### Field `wake`

```silk
pub wake: Wake
```

The Wake consumed after the publication response has been stored.

::Anchor{id="TaskMailbox"}

## `TaskMailbox`

```silk
pub struct TaskMailbox
```

The parent-facing mailbox for one child publication request.

::Anchor{id="TaskMailbox.request"}

### Field `request`

```silk
pub request: NoRequest | PendingRequest
```

The request currently visible to the Scheduler driver.

::Anchor{id="TaskMailbox.response"}

### Field `response`

```silk
pub response: Shared<PublicationResponse>
```

The response cell written before the request Wake is consumed.

::Anchor{id="NoSubmission"}

## `NoSubmission`

```silk
pub struct NoSubmission
```

A submission slot contains no prepared child.

::Anchor{id="PendingSubmission"}

## `PendingSubmission`

```silk
pub struct PendingSubmission
```

A submission slot owns one complete prepared child.

::Anchor{id="PendingSubmission.task"}

### Field `task`

```silk
pub task: PreparedTask
```

The prepared task moved into the slot before the parent parks.

::Anchor{id="SubmissionSlot"}

## `SubmissionSlot`

```silk
pub struct SubmissionSlot
```

The child-task payload paired with one parent mailbox request.

::Anchor{id="SubmissionSlot.phase"}

### Field `phase`

```silk
pub phase: NoSubmission | PendingSubmission
```

The currently installed child submission.

::Anchor{id="PreparedTask"}

## `PreparedTask`

```silk
pub struct PreparedTask
```

A complete unpublished task that one Scheduler provider prepared.

### Details
The Scheduler driver can put this data into its private task store, or destroy it unchanged. The
Execution stays `Initial` until a successful publication calls `Execution.notifyInitial`.

::Anchor{id="PreparedTask.identity"}

### Field `identity`

```silk
pub identity: TaskId
```

The reserved identity of the child.

::Anchor{id="PreparedTask.parent"}

### Field `parent`

```silk
pub parent: TaskId
```

The identity of the structured parent.

::Anchor{id="PreparedTask.execution"}

### Field `execution`

```silk
pub execution: Intrinsic.Execution<()>
```

The unpublished child Execution.

::Anchor{id="PreparedTask.canceller"}

### Field `canceller`

```silk
pub canceller: CompletionCanceller
```

The type-erased endpoint used if the task is cancelled.

::Anchor{id="PreparedTask.mailbox"}

### Field `mailbox`

```silk
pub mailbox: Shared<TaskMailbox>
```

The child's own publication-request mailbox.

::Anchor{id="PreparedTask.submission"}

### Field `submission`

```silk
pub submission: Shared<SubmissionSlot>
```

The child's own publication-submission slot.

::Anchor{id="PendingPublication"}

## `PendingPublication`

```silk
pub struct PendingPublication<A, E>
```

A prepared child Fiber and the canonical data required for atomic publication.

### Details

`Fiber.forkChild` moves `task` into `parentSubmission`, installs a Wake in `parentMailbox`, and
parks until `response` reports acceptance or rejection. No executable value crosses the service
boundary.

::Anchor{id="PendingPublication.fiber"}

### Field `fiber`

```silk
pub fiber: Fiber<A, E>
```

The affine result handle returned only after successful publication.

::Anchor{id="PendingPublication.parentMailbox"}

### Field `parentMailbox`

```silk
pub parentMailbox: Shared<TaskMailbox>
```

The mailbox owned by the parent task.

::Anchor{id="PendingPublication.parentSubmission"}

### Field `parentSubmission`

```silk
pub parentSubmission: Shared<SubmissionSlot>
```

The submission slot owned by the parent task.

::Anchor{id="PendingPublication.response"}

### Field `response`

```silk
pub response: Shared<PublicationResponse>
```

The response observed after the parent resumes.

::Anchor{id="PendingPublication.task"}

### Field `task`

```silk
pub task: PreparedTask
```

The complete unpublished child task.

::Anchor{id="Scheduler"}

## `Scheduler`

```silk
pub service Scheduler
```

A mutable service that prepares one child task for later atomic publication.

### When to use

Implement it to supply the task policy for `Fiber.forkChild`. Application code uses the Fiber
operations and a provider such as `silk.local_scheduler`, not this protocol.

### Details

`prepare` allocates and prepares one child, but does not publish it. `Fiber.forkChild` registers
the returned [`PendingPublication`](#PendingPublication) after the exclusive service dispatch ends, and parks until
the driver accepts or rejects the child. Thus no executable value crosses the service boundary.
/// Each task receives a distinct owned provider. `prepare` ends its exclusive provider access
before the caller registers the returned publication data and parks for the response.

::Anchor{id="Scheduler.prepare"}

### Operation `prepare`

```silk
effect fn prepare<A: 'static, E: 'static>(
    child: once Effect<'static;
      A
      ! E
      ? &mut Scheduler | &mut MonotonicClock
    >
  ) -> PendingPublication<A, E>
  ! OutOfMemoryError | TaskIdExhaustedError
  ? &mut Scheduler
```

Prepares one lazy child task and returns its affine publication value.

#### Details

The child can require only its owned Scheduler and MonotonicClock providers. Preparation
reserves all child endpoints and one task identity before it returns. It does not activate
the child.

::Anchor{id="Scheduler.impl"}

## Implementation `Scheduler`

```silk
impl Scheduler
```

::Anchor{id="Scheduler.impl.pending"}

### Associated function `pending`

```silk
pub fn pending<A, E>(
    fiber: Fiber<A, E>,
    parentMailbox: Shared<TaskMailbox>,
    parentSubmission: Shared<SubmissionSlot>,
    response: Shared<PublicationResponse>,
    task: PreparedTask,
  ) -> PendingPublication<A, E>
```

Creates one canonical pending publication from its prepared data.

#### When to use

Use this provider operation after all child task storage and endpoints have been prepared.

#### Details

The parent mailbox, submission slot, and response must belong to the calling task. The
prepared task remains unpublished and must not have received initial readiness.

Category: Concurrency.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
