# Command-line programs

`silk.cli` turns a type into a command line. You write the struct or union your program wants to receive, describe how each field is spelled on the command line, and the library does the rest: it reads the arguments, fills the value, prints help, reports mistakes with a suggestion, and writes shell completion scripts. The description is checked against the type while the program compiles, so a misspelled field name is a compile error, not a surprise at run time.

This guide builds `deploy`, a small tool with subcommands, flags, defaults, environment variables, choices, checks and a value type of its own. Then it tests the command line, adds shell completions, and ends with `silk.cli.task`, which uses the same library to write a project's automation scripts in Silk. The `silk` command itself reads its command line with `silk.cli`, so everything here is what the compiler's own help and errors are made of.

## The idea in one small program

Start with the smallest useful case. A program that resizes an image wants three things from its command line: a file, a width, and whether to keep the original. That is a struct:

```silk
import silk.cli.command { Command, CommandLine }
import silk.cli.parse { Cli }
import silk.core.effect { Effect }
import silk.core.result { Result }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.system.host_input { HostInput, HostInputError }
import silk.text.format { Format }
import silk.text.string { String }

struct Resize {
  /// The image to read
  pub input: String,
  /// The new width in pixels
  pub width: u32,
  /// Keep the original file
  pub keepOriginal: bool,
}

impl CommandLine for Resize {
  static fn command() -> Command<Resize> {
    return Command<Resize>.make("resize", "Resize an image")
  }
}

pub effect fn main() -> i32
  ! HostInputError | OutOfMemoryError | WriterError
  ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  return match move run Cli.read<Resize>() |> Effect.provideMut<Allocator>(&mut allocator) {
    Result.Success { value: resize } => {
      let mut out = StdoutWriter.make()
      run Format.format(
        "{input} to {width} pixels, keep original: {keep}\n",
        &.{ input: String.view(&resize.input), width: resize.width, keep: resize.keepOriginal },
      ) |> Effect.provideMut<Writer>(&mut out)
      0
    }
    Result.Failure { error: code } => code
  }
}
```

`impl CommandLine for Resize` is the description. Here it only gives the program a name and a line of help. Every field it does not mention becomes an option named after the field in kebab case, so `keepOriginal` is `--keep-original`. The field's type decides how the value is read: a `bool` is a flag, a `u32` must be a number, a `String` takes any text. The first line of each field's `///` comment becomes its help text.

```
$ resize --help
Usage: resize [options]

Resize an image

Options:
      --input <value>          The image to read
      --width <value>          The new width in pixels
      --keep-original          Keep the original file
  -h, --help                   Print this help
```

```
$ resize --input cat.png --width 640 --keep-original
cat.png to 640 pixels, keep original: true
$ resize --input cat.png --width wide
error: invalid value 'wide' for --width
```

`Cli.read` did all of it: it read the process arguments, printed the help on standard output, printed the error on standard error, and answered the exit code. The rest of this guide is about saying more in the description.

You can also write `impl CommandLine for Resize {}` and take every default. The program then has no name in its usage line, so give `command` once the program is more than a sketch.

## Set up

```sh
silk init deploy
cd deploy
```

As in the other guides, the code blocks below, in order, make up the whole of `src/main.silk`. First the imports:

```silk
import silk.cli.command { Command, CommandLine, Opt }
import silk.cli.completion { Completion }
import silk.cli.parse { Cli, Parsed, Variable }
import silk.cli.value { Arg, FromArg }
import silk.collections.list { List }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.num.u32
import silk.system.host_input { HostInput, HostInputError }
import silk.testing.testing { AssertionError, Testing }
import silk.text.format { Format }
import silk.text.string { String }
```

## The command line as a type

`deploy` has four subcommands. `push` sends a build to the servers, `rollback` goes back to an earlier release, `releases` has two subcommands of its own, and `completions` prints a shell script. A union says "one of these", so the subcommands are a union, and each variant's fields are that subcommand's options and arguments:

```silk
/// A deploy tool: the whole command line as one value.
struct Deploy {
  /// Say what each step does
  pub verbose: bool,
  pub action: Action,
}

/// The subcommands.
union Action {
  Push {
    pub target: String,
    pub settings: Settings,
    pub replicas: u32,
    pub tags: List<String>,
    pub wait: Option<Seconds>,
  },
  Rollback { pub settings: Settings, pub to: String },
  Releases { pub action: Releases },
  Completions { pub shell: String },
}

/// The subcommands of `deploy releases`.
union Releases {
  List,
  Prune { pub keep: u32 },
}

/// The options that `push` and `rollback` share.
struct Settings {
  pub region: String,
  pub dryRun: bool,
}
```

Four things in these types matter to the command line:

- `Deploy` is the root. Its `verbose` field is an option of `deploy` itself, and its `action` field will hold whichever subcommand the user chose.
- `Action.Push` has fields of five different types. Each type reads its value in its own way, as the table further down shows. `Seconds` is this program's own type.
- `Releases` is a second union inside a variant, so `deploy releases prune` is a subcommand of a subcommand. The nesting can go as deep as you like.
- `Settings` holds the two options that `push` and `rollback` share. It is a plain struct, and both variants hold one.

Variants become subcommands named after their labels in kebab case: `Push` is `push`, and a variant `CheckRoots` would be `check-roots`. A variant without fields, such as `Releases.List`, is a subcommand that takes no options.

## Describing the command line

Each type gets an `impl CommandLine`. The description is a chain of static calls that starts with `Command<T>.make(name, help)`:

```silk
impl CommandLine for Deploy {
  static fn command() -> Command<Deploy> {
    return Command<Deploy>.make("deploy", "Ship a build to the servers")
      |> Command.withVersion("0.1.0")
      |> Command.option("verbose", Opt.plain() |> Opt.short("v"))
      |> Command.subcommand("action")
  }
}

impl CommandLine for Action {
  static fn command() -> Command<Action> {
    return Command<Action>.make("", "")
      |> Command.variant("Push", "Push a build")
      |> Command.variant("Rollback", "Go back to an earlier release")
      |> Command.variant("Releases", "Look after old releases")
      |> Command.variant("Completions", "Print a shell completion script")
      |> Command.arg("target", Opt.about("The build to push") |> Opt.required)
      |> Command.flatten("settings")
      |> Command.option(
        "replicas",
        Opt.about("How many copies to run")
          |> Opt.short("n")
          |> Opt.default("2")
          |> Opt.check<u32>(positive),
      )
      |> Command.option("tags", Opt.about("A label for the release") |> Opt.long("tag") |> Opt.short("t"))
      |> Command.option("wait", Opt.about("How long to wait for health checks, such as 30s or 5m"))
      |> Command.arg("to", Opt.about("The release to go back to") |> Opt.required)
      |> Command.subcommand("action")
      |> Command.arg(
        "shell",
        Opt.plain()
          |> Opt.required
          |> Opt.choice("bash")
          |> Opt.choice("zsh")
          |> Opt.choice("fish"),
      )
  }
}

impl CommandLine for Releases {
  static fn command() -> Command<Releases> {
    return Command<Releases>.make("", "")
      |> Command.variant("List", "List the releases")
      |> Command.variant("Prune", "Delete all but the newest releases")
      |> Command.option("keep", Opt.about("How many to keep") |> Opt.default("5"))
  }
}

impl CommandLine for Settings {
  static fn command() -> Command<Settings> {
    return Command<Settings>.make("", "")
      |> Command.option(
        "region",
        Opt.about("Where to deploy")
          |> Opt.short("r")
          |> Opt.choice("eu")
          |> Opt.choice("us")
          |> Opt.default("eu")
          |> Opt.env("DEPLOY_REGION"),
      )
      |> Command.option("dryRun", Opt.about("Print the plan and change nothing"))
  }
}

fn positive(count: &u32) -> bool {
  return count.* > 0
}
```

The calls that add to a command:

| Call | What it does |
| --- | --- |
| `Command<T>.make(name, help)` | Starts a description. The name appears in the usage line; a union of subcommands can leave both empty |
| `Command.withVersion(text)` | Adds `--version`, which prints the name and `text` |
| `Command.option(field, spec)` | Reads `field` as a named option such as `--replicas 3` |
| `Command.arg(field, spec)` | Reads `field` as a positional argument, in the order the calls add them |
| `Command.subcommand(field)` | Reads `field`, a union, as the subcommand the user names |
| `Command.flatten(field)` | Reads `field`, a struct, as a group whose options belong to this command |
| `Command.variant(label, help)` | Gives a subcommand its help text |

In a union's description, `option` and `arg` name a field of any of its variants. `"target"` is a field of `Push` and `"to"` a field of `Rollback`, so both are described in one place. The `field` arguments are string literals, but they are not just text: the compiler checks each one against the type where you wrote it.

Each option or argument is an `OptionSpec`, built with `Opt`. Start with `Opt.about(help)`, or `Opt.plain()` for none, and pipe it through the changes you want:

| Builder | What it does |
| --- | --- |
| `Opt.short("n")` | Adds the one-letter alias `-n` |
| `Opt.long("tag")` | Renames the option: the field `tags` is spelled `--tag` |
| `Opt.describe(help)` | Sets the help text |
| `Opt.required` | The command line must give it |
| `Opt.default("2")` | The text to read when nothing else gives a value; help shows it |
| `Opt.env("DEPLOY_REGION")` | Reads the environment variable when the command line does not give the option |
| `Opt.choice("eu")` | Adds an accepted value; once an option has choices, it accepts only those |
| `Opt.check<u32>(positive)` | Calls an ordinary function on the value; `false` rejects it |

`positive` is a plain function from a borrowed value to `bool`. The parser calls it directly with the value it read, after the field type has accepted the text.

`Settings` is described like any other struct, with its own `impl CommandLine`. `Command.flatten("settings")` then pulls its two options into `push` and `rollback`, so a group of options that many commands share, such as the build options of a compiler, is written once.

## Reading it in `main`

The program's own work is an ordinary effect function that takes the parsed value. It matches on the subcommand and writes a line about what it would do:

```silk
effect fn perform(deploy: &Deploy) -> ()
  ! WriterError
  ? &mut Writer {
  match &deploy.action {
    Action.Push { target, settings, replicas, tags, wait } => {
      let what = if settings.dryRun { "would push" } else { "pushing" }
      run Format.format(
        "{what} {target} to {region} with {replicas} replicas\n",
        &.{
          what: what,
          target: String.view(&target),
          region: String.view(&settings.region),
          replicas: replicas,
        },
      )
      let labels = List<String>.asSlice(&tags)
      let mut at: usize = 0
      while at < labels.length {
        run Format.format("  tag {tag}\n", &.{ tag: String.view(&labels[at]) })
        at = at + 1
      }
      if let Option.Some { value } = &wait {
        run Format.format("  wait up to {seconds} seconds\n", &.{ seconds: value.value })
      }
    }
    Action.Rollback { settings, to } => {
      run Format.format(
        "rolling {region} back to {to}\n",
        &.{ region: String.view(&settings.region), to: String.view(&to) },
      )
    }
    Action.Releases { action: Releases.List } => run Writer.writeString("listing releases\n")
    Action.Releases { action: Releases.Prune { keep } } => {
      run Format.format("keeping the newest {keep} releases\n", &.{ keep: keep })
    }
    Action.Completions { shell } => {
      if String.view(&shell) == "zsh" {
        run Completion.writeZsh<Deploy>()
      } else if String.view(&shell) == "fish" {
        run Completion.writeFish<Deploy>()
      } else {
        run Completion.writeBash<Deploy>()
      }
    }
  }
  if deploy.verbose {
    run Writer.writeString("done\n")
  }
}
```

`main` asks `Cli.read` for a `Deploy`:

```silk
pub effect fn main() -> i32
  ! HostInputError | OutOfMemoryError | WriterError
  ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut out = StdoutWriter.make()
  let read = run Cli.read<Deploy>() |> Effect.provideMut<Allocator>(&mut allocator)
  return match move read {
    Result.Success { value: deploy } => {
      run perform(&deploy) |> Effect.provideMut<Writer>(&mut out)
      0
    }
    Result.Failure { error: code } => code
  }
}
```

`Cli.read` answers a `Result<Deploy, i32>`. `Success` holds the value. `Failure` holds the exit code for `main` to return, after the library has already done the talking: 0 after it printed the help or the version on standard output, and 2 after it printed an error on standard error. A program that wants to handle those cases itself uses `Cli.fromHost` instead, as a later section shows.

## Running it

Build it and ask for help. The top-level help lists the options of `deploy` and its subcommands with their help text:

```sh
silk build
```

```
$ deploy --help
Usage: deploy [options] <command>

Ship a build to the servers

Options:
  -v, --verbose          Say what each step does
  -h, --help             Print this help
      --version          Print the version

Commands:
  push                   Push a build
  rollback               Go back to an earlier release
  releases               Look after old releases
  completions            Print a shell completion script
```

`--verbose` has no `Opt.about` in the description, so its help comes from the `///` comment on the field. Each subcommand has its own help, which shows what each option accepts, where its value can come from, and its default:

```
$ deploy push --help
Usage: deploy push [options] <target>

Push a build

Options:
  -r, --region <value>    Where to deploy [choices: eu, us] [env: DEPLOY_REGION] [default: eu]
      --dry-run           Print the plan and change nothing
  -n, --replicas <value>  How many copies to run [default: 2]
  -t, --tag <value>       A label for the release
      --wait <value>      How long to wait for health checks, such as 30s or 5m
  -h, --help              Print this help

Arguments:
  <target>                The build to push (required)
```

```
$ deploy rollback --help
Usage: deploy rollback [options] <to>

Go back to an earlier release

Options:
  -r, --region <value>   Where to deploy [choices: eu, us] [env: DEPLOY_REGION] [default: eu]
      --dry-run          Print the plan and change nothing
  -h, --help             Print this help

Arguments:
  <to>                   The release to go back to (required)
```

`push` and `rollback` both list `--region` and `--dry-run`, from the flattened `Settings`.

Now some real command lines. The parser accepts `--name value`, `--name=value`, `-n value`, `-n3`, flags such as `--dry-run`, and options in any order around the positional arguments:

```
$ deploy push web
pushing web to eu with 2 replicas
$ deploy push web -r us -n 3 --tag canary -t blue --wait 2m
pushing web to us with 3 replicas
  tag canary
  tag blue
  wait up to 120 seconds
$ deploy push --region=us -n3 web --dry-run
would push web to us with 3 replicas
$ deploy -v rollback v41
rolling eu back to v41
done
$ deploy releases prune --keep 3
keeping the newest 3 releases
$ deploy push -- --web
pushing --web to eu with 2 replicas
$ deploy --version
deploy 0.1.0
```

`--tag` was given twice, and because `tags` is a `List<String>`, each occurrence was kept. `--wait 2m` became 120 seconds through `Seconds`, which comes next. `--` ends the options: every argument after it is positional, even one that starts with a dash.

## Field types

The type of a field decides how its value is read. These types work out of the box:

| Field type | On the command line |
| --- | --- |
| `bool` | A flag. It takes no value and is `true` when present |
| `String` | Any text |
| `Bytes` | The argument's exact bytes, even when they are not valid UTF-8, such as a file path |
| `i8` to `i64`, `u8` to `u64`, `usize` | A decimal number that fits the type |
| `Option<T>` | Absent unless given; then `T` reads the value |
| `List<T>` | Every occurrence, in order; as a positional argument, every remaining argument |

When the command line does not give a field and it has no default or variable, the field gets an empty value: empty text, zero, `false`, `none`, or an empty list. Mark it `Opt.required` when empty is not a sensible answer.

A field of your own type needs one of two interfaces from `silk.cli.value`. `FromArg` reads one value from one argument, and `Option<T>` and `List<T>` work for any `T` that has it. That is what `Seconds` implements, so `wait: Option<Seconds>` reads `30s` or `5m`:

```silk
/// A length of time, written as a number and `s` or `m`.
struct Seconds {
  pub value: u32,
}

impl FromArg for Seconds {
  effect fn fromArg(arg: Arg<'_>) -> Result<Seconds, bool>
    ! OutOfMemoryError
    ? &mut Allocator {
    let text = arg.text
    let length = String.byteLength(text)
    if length < 2 {
      return Result<Seconds, bool>.Failure { error: false }
    }
    let unit = String.slice(text, length - 1, 1)
    let scale: u32 = if unit == "s" { 1 } else if unit == "m" { 60 } else { 0 }
    if scale == 0 {
      return Result<Seconds, bool>.Failure { error: false }
    }
    return match u32.parse(String.slice(text, 0, length - 1)) {
      Result.Success { value } => Result<Seconds, bool>.Success { value: Seconds { value: value * scale } }
      Result.Failure { error: _ } => Result<Seconds, bool>.Failure { error: false }
    }
  }
}
```

`arg.text` is the argument as text, and `arg.bytes` is the same argument as the exact bytes the program received. Answering `Failure` makes it an invalid value, with the same message a bad number gets. For a field of type `Seconds` itself, not inside an `Option` or `List`, implement `ArgValue` instead: it also says whether the option takes a value, whether it repeats, and what the field holds when the command line does not give it.

## Defaults, environment variables, choices and checks

A value can come from four places. The command line wins, then the environment variable from `Opt.env`, then the text from `Opt.default`, then the type's empty value:

```
$ DEPLOY_REGION=us deploy push web
pushing web to us with 2 replicas
$ DEPLOY_REGION=us deploy push web --region eu
pushing web to eu with 2 replicas
$ DEPLOY_REGION=asia deploy push web
error: invalid value 'asia' for DEPLOY_REGION (choose from eu, us)
```

Whatever the source, the value goes through the same reading: the field type, then the choices, then the check. A bad value in the environment is reported with the variable's name, so the user knows where to look. `Cli.read` reads only the variables that some option names, never the whole environment.

## What the user sees when something is wrong

Every error is one line on standard error, and the exit code is 2:

```
$ deploy push
error: missing <target>
$ deploy push web --replicas 0
error: invalid value '0' for --replicas
$ deploy push web --region mars
error: invalid value 'mars' for --region (choose from eu, us)
$ deploy push web --wait soon
error: invalid value 'soon' for --wait
$ deploy push web --regoin us
error: unknown option --regoin; did you mean --region?
$ deploy push web -v
error: unknown option -v
$ deploy pushh
error: unknown command pushh for deploy; did you mean push?
$ deploy releases
error: deploy releases needs a command
$ deploy push web extra
error: unexpected argument extra
$ deploy push web --dry-run --dry-run
error: --dry-run is given more than once
$ deploy push web --dry-run=yes
error: --dry-run takes no value
$ deploy push web --replicas
error: --replicas needs a value
```

A misspelled option or subcommand gets the closest name when one is close, as `--regoin` and `pushh` did. `-v` belongs to `deploy`, not to `push`, so it must come before the subcommand: each option is read at the level of the command that declares it. The messages are the `CliError` variants in `silk.cli.parse`:

| `CliError` | Message |
| --- | --- |
| `UnknownOption` | `unknown option --regoin; did you mean --region?` |
| `Repeated` | `--dry-run is given more than once` |
| `MissingValue` | `--replicas needs a value` |
| `NotAChoice` | `invalid value 'mars' for --region (choose from eu, us)` |
| `InvalidValue` | `invalid value '0' for --replicas` |
| `UnexpectedValue` | `--dry-run takes no value` |
| `MissingRequired` | `missing <target>` |
| `UnexpectedArgument` | `unexpected argument extra` |
| `MissingCommand` | `deploy releases needs a command` |
| `UnknownCommand` | `unknown command pushh for deploy; did you mean push?` |

## Mistakes the compiler catches

The description is a compile-time value, so the compiler can check it against the type. Misspell a field in a description, such as `"kept"` for a field named `keep`:

```silk
struct Prune {
  pub keep: u32,
}

impl CommandLine for Prune {
  static fn command() -> Command<Prune> {
    return Command<Prune>.make("prune", "Delete old releases")
      |> Command.option("kept", Opt.about("How many to keep"))
  }
}
```

```
$ silk build
[x86_64-unknown-linux-gnu]
src/main.silk:16:25: error[SEM0022] main.Prune has no field kept
Failed typo in 0.13s
```

The compiler reports the name where you wrote it, on line 16. Other mistakes stop the build with a message too: describing a field twice, two options with the same name or alias, an alias longer than one letter, an alias or an environment variable on a positional argument, positional arguments next to a subcommand, and more than one subcommand field. `-h` always means help, so `Opt.short("h")` is an error. The message points at the `Opt.short` call on line 16, and its note points at line 24, the `Cli.read<Prune>()` call in `main` where the description is put to use:

```
$ silk build
[x86_64-unknown-linux-gnu]
src/main.silk:16:33: error[SEM0177] -h is the help option
  note: src/main.silk:24:20: related location
Failed alias in 0.12s
```

## Handling help and errors yourself

`Cli.read` is a shortcut. Underneath it, `Cli.fromHost<T>()` reads the arguments and the named environment variables and answers a `Parsed<T>` without printing anything:

| `Parsed<T>` | Meaning |
| --- | --- |
| `Run { value }` | The command line was accepted |
| `Help { command }` | The user asked for help; `command` is the subcommand path, such as `releases.prune`, empty for the root |
| `Version` | The user asked for `--version` |
| `Failed { error }` | A `CliError` |

Match on it when you want a different exit code, a log line for errors, or help written somewhere else. `Cli.writeHelp<T>(command)`, `Cli.writeVersion<T>()` and `Cli.writeError(&error)` write the same text `Cli.read` does, to whatever `Writer` you provide, and `Cli.message(&error)` answers the error's message as a `String`.

Two more entry points parse arguments you already have. `Cli.parse<T>(&arguments)` takes a list of `string`s and reads no environment. `Cli.parseWith<T>(&arguments, &environment)` also takes the variables, as a list of `Variable { name, value }`. In both, the first argument is the program name and is skipped. `Cli.parseBytes` takes the arguments as `Bytes`, exactly as `HostInput.arguments` gives them, so a `Bytes` field can hold a path that is not valid UTF-8.

## Testing the command line

`Cli.parse` and `Cli.parseWith` make the command line easy to test, because a test can hand them any arguments and environment. These tests go at the end of `src/main.silk`:

```silk
test effect fn readsAPush() -> ()
  ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let arguments = ["deploy", "push", "web", "-n", "3", "--tag", "canary"]
  let parsed = run Cli.parse<Deploy>(&arguments) |> Effect.provideMut<Allocator>(&mut allocator)
  match &parsed {
    Parsed.Run { value: Deploy { verbose, action: Action.Push { target, settings, replicas, tags, wait } } } => {
      run Testing.expect(!verbose && String.view(&target) == "web", "the target")
      run Testing.expect(String.view(&settings.region) == "eu", "the default region")
      run Testing.expect(replicas == 3 && List<String>.length(&tags) == 1, "replicas and tags")
      run Testing.expect(Option<Seconds>.isNone(&wait), "no wait")
    }
    _ => run Testing.expect(false, "parses push")
  }
}

test effect fn readsTheRegionFromTheEnvironment() -> ()
  ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let arguments = ["deploy", "rollback", "v41"]
  let environment = [Variable { name: "DEPLOY_REGION", value: "us" }]
  let parsed = run Cli.parseWith<Deploy>(&arguments, &environment)
    |> Effect.provideMut<Allocator>(&mut allocator)
  match &parsed {
    Parsed.Run { value: Deploy { verbose: _, action: Action.Rollback { settings, to: _ } } } => {
      run Testing.expect(String.view(&settings.region) == "us", "the region from DEPLOY_REGION")
    }
    _ => run Testing.expect(false, "parses rollback")
  }
}

test effect fn explainsAMisspelledOption() -> ()
  ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let arguments = ["deploy", "push", "web", "--regoin", "us"]
  let parsed = run Cli.parse<Deploy>(&arguments) |> Effect.provideMut<Allocator>(&mut allocator)
  match &parsed {
    Parsed.Failed { error } => {
      let message = run Cli.message(&error) |> Effect.provideMut<Allocator>(&mut allocator)
      run Testing.expect(
        String.view(&message) == "unknown option --regoin; did you mean --region?",
        "the message",
      )
    }
    _ => run Testing.expect(false, "rejects --regoin")
  }
}
```

```sh
silk test
```

```
  main::explainsAMisspelledOption
    PASS  59 us
  main::readsAPush
    PASS  30 us
  main::readsTheRegionFromTheEnvironment
    PASS  9 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   1 ms
```

The first test checks that a push gets its target, the default region, the replica count and the tag. The second hands `parseWith` an environment and checks that `DEPLOY_REGION` was read. The third checks the exact message a user would see, with `Cli.message`.

## Shell completions

`silk.cli.completion` writes a completion script for bash, zsh or fish from the same description, during compilation. The `Completions` arm of `perform` calls `Completion.writeBash<Deploy>()`, `writeZsh` or `writeFish`. Here is the bash script:

```
$ deploy completions bash
_deploy() {
  local cur prev path words files i
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  path=""
  files=""
  for ((i = 1; i < COMP_CWORD; i++)); do
    case "$path:${COMP_WORDS[i]}" in
      ":push") path="push" ;;
      ":rollback") path="rollback" ;;
      ":releases") path="releases" ;;
      "releases:list") path="releases.list" ;;
      "releases:prune") path="releases.prune" ;;
      ":completions") path="completions" ;;
    esac
  done
  case "$path" in
    "") words="push rollback releases completions --verbose -v --help -h --version" ;;
    "push") files=1; words="--region -r --dry-run --replicas -n --tag -t --wait --help -h" ;;
    "rollback") files=1; words="--region -r --dry-run --help -h" ;;
    "releases") words="list prune --help -h" ;;
    "releases.list") words="--help -h" ;;
    "releases.prune") words="--keep --help -h" ;;
    "completions") words="bash zsh fish --help -h" ;;
  esac
  case "$path:$prev" in
    "push:--region"|"push:-r") words="eu us" ;;
    "rollback:--region"|"rollback:-r") words="eu us" ;;
  esac
  COMPREPLY=($(compgen -W "$words" -- "$cur"))
  if [ -n "$files" ]; then
    COMPREPLY+=($(compgen -f -- "$cur"))
  fi
}
complete -F _deploy deploy
```

It completes subcommand names, option names and aliases, and the choices of `--region`. It follows the subcommands already typed, so `deploy releases <Tab>` offers `list` and `prune`. Where a command takes positional arguments without choices, it completes file names too. Tell your users to load it from their shell's startup file:

```sh
source <(deploy completions bash)    # in ~/.bashrc
source <(deploy completions zsh)     # in ~/.zshrc
deploy completions fish | source     # in ~/.config/fish/config.fish
```

## Project tasks with `silk.cli.task`

Most projects grow a few scripts: generate a file, prepare fixtures, run the checks before a release. `silk.cli.task` lets you write them in Silk, in the project itself, with the same command-line library. The tasks are the variants of a union, so each task gets typed options and its own help, and `silk task` with no name lists them.

Here is a small package, `site`, whose program prints a list of pages. The list lives in `pages.txt`, and a task turns it into a Silk module before each build:

```
site/
  silk.toml
  pages.txt
  src/main.silk      the program
  src/tasks.silk     the tasks
```

`src/main.silk` imports the generated module:

```silk
import silk.core.effect { Effect }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.text.format { Format }
import Pages { PAGES }

pub effect fn main() -> i32 ! WriterError {
  let mut out = StdoutWriter.make()
  run Format.format("pages: {pages}\n", &.{ pages: PAGES }) |> Effect.provideMut<Writer>(&mut out)
  return 0
}
```

`src/tasks.silk` holds the tasks:

```silk
import silk.cli.command { Command, CommandLine, Opt }
import silk.cli.task { Task, TaskError, TaskSet }
import silk.collections.bytes { Bytes }
import silk.collections.slice { Slice }
import silk.core.effect { Effect }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.system.child_process { ChildProcess, ProcessError }
import silk.system.filesystem { FileError, FileSystem, Path }
import silk.system.host_input { HostInput, HostInputError }
import silk.text.format { Format }
import silk.text.string { String }

/// This project's tasks: each variant is one `silk task <name>`.
union Tasks {
  Codegen,
  Release { pub version: String, pub skipTests: bool },
}

impl CommandLine for Tasks {
  static fn command() -> Command<Tasks> {
    return Command<Tasks>.make("tasks", "The site's tasks")
      |> Command.variant("Codegen", "Write src/Pages.silk from pages.txt")
      |> Command.variant("Release", "Generate, test, then build a release")
      |> Command.arg("version", Opt.about("The version to release") |> Opt.required)
      |> Command.option("skipTests", Opt.about("Build without testing first"))
  }
}

impl TaskSet for Tasks {
  effect fn perform(self: Tasks) -> ()
    ! TaskError | ProcessError | FileError | HostInputError | OutOfMemoryError | WriterError
    ? &mut HostInput | &mut Allocator | &mut ChildProcess | &mut FileSystem {
    match move self {
      Tasks.Codegen => run codegen()
      Tasks.Release { version, skipTests } => {
        run codegen()
        if !skipTests {
          run Task.silk(&["test"])
        }
        run Task.silk(&["build", "--release", "--no-hooks"])
        let mut out = StdoutWriter.make()
        run Format.format("released site {version}\n", &.{ version: String.view(&version) })
          |> Effect.provideMut<Writer>(&mut out)
      }
    }
  }
}

// Writes `src/Pages.silk`, a constant that lists the pages named in `pages.txt`, one per line.
effect fn codegen() -> ()
  ! TaskError | FileError | HostInputError | OutOfMemoryError | WriterError
  ? &mut HostInput | &mut Allocator | &mut FileSystem {
  let root = run Task.root()
  let names = run FileSystem.readFile(&run Path.join(&root, "pages.txt"))
  let lines = Bytes.asSlice(&names)
  let mut module = run Bytes.copy(b"// Written by `silk task codegen`.\npub const PAGES: string = \"")
  let mut at: usize = 0
  let mut first = true
  while at < lines.length {
    let mut end = at
    while end < lines.length && lines[end] != 10 {
      end = end + 1
    }
    if end > at {
      if !first {
        run Bytes.append(&mut module, b", ")
      }
      run Bytes.append(&mut module, Slice.view<u8>(lines, at, end - at))
      first = false
    }
    at = end + 1
  }
  if first {
    run Task.abort("pages.txt lists no pages")
  }
  run Bytes.append(&mut module, b"\"\n")
  run FileSystem.writeFile(&run Path.join(&root, "src/Pages.silk"), Bytes.asSlice(&module))
  let mut out = StdoutWriter.make()
  run Writer.writeString("wrote src/Pages.silk\n") |> Effect.provideMut<Writer>(&mut out)
}

pub effect fn main() -> i32 ? &mut HostInput {
  return run Task.main<Tasks>()
}
```

`Tasks` is a union with an ordinary `CommandLine` description, like `Action` in `deploy`. `TaskSet` adds one function, `perform`, which runs the task the user chose. Its error row and service row are fixed by the interface, so every task can fail with a `TaskError`, start programs, and read and write files. `main` hands everything to `Task.main<Tasks>()`, which reads the command line, calls `perform`, and turns the outcome into an exit status.

A `Path` is always absolute, so the task joins its file names to `Task.root()`, the package directory.

### Running a task

`silk task` builds the package's `tasks` profile, an executable for this machine whose root module is `src/tasks.silk`, and runs it from the package directory. It needs no entry in `silk.toml`. Without a task name it prints the list:

```
$ silk task
Usage: tasks <command>

The site's tasks

Options:
  -h, --help     Print this help

Commands:
  codegen        Write src/Pages.silk from pages.txt
  release        Generate, test, then build a release
```

From here on, the outputs leave out the progress rows that `silk` prints on standard error while it builds the tasks, as the other guides do for `silk run`. Run a task by its name, in kebab case:

```
$ silk task codegen
wrote src/Pages.silk
$ cat src/Pages.silk
// Written by `silk task codegen`.
pub const PAGES: string = "index, about, blog"
```

Everything after the task's name belongs to the task, so its own `--help` and options work. The options before the name are the compiler's, such as `--manifest-path`:

```
$ silk task release --help
Usage: tasks release [options] <version>

Generate, test, then build a release

Options:
      --skip-tests          Build without testing first
  -h, --help                Print this help

Arguments:
  <version>                 The version to release (required)
$ silk task relase 1.0
error: unknown command relase for tasks; did you mean release?
```

`release` calls `codegen` first, then runs two more commands. `Task.silk` runs the compiler that built the tasks, so `silk test` and `silk build --release` use the same compiler as the `silk task` that started them. The build gets `--no-hooks` because `release` has just run `codegen` itself; the next section explains hooks. Their output goes straight to the terminal:

```
$ silk task release 1.0.0
wrote src/Pages.silk

Tests  0 passed, 0 failed (0 cached, 0 executed, 0 selected, 0 discovered)
Time   19 us
released site 1.0.0
```

`Tests` and `Time` come from `silk test`, which found no tests in this package. The functions that start programs:

| Function | What it does |
| --- | --- |
| `Task.exec(program, &arguments)` | Runs a program with the task's terminal, environment and working directory, and waits. A name without `/` is looked up on `PATH`. A nonzero status fails the task with that status |
| `Task.silk(&arguments)` | `Task.exec` with the compiler that built the tasks |
| `Task.capture(program, &arguments)` | Runs a program and answers its standard output as `Bytes`; its standard error passes through |
| `Task.execBytes(program, &arguments)` | `Task.exec` for a program and arguments that are not UTF-8 |

A task that needs another task calls it: tasks are ordinary functions.

### When a task fails

`Task.abort(message)` fails the task with a message and status 1. `Task.main` writes the message after `error: ` on standard error and exits with the status. A `TaskError` you build yourself carries any nonzero status, and `Task.exec` uses the status of the program that failed. Any other failure, such as a `FileError`, is reported in one general line with status 1.

### Hooks

The `[tasks]` table in the root manifest runs tasks around the compiler's own commands. `site` runs `codegen` before every build:

```toml
[package]
name = "site"
version = "0.1.0"

[tasks]
before-build = ["codegen"]
```

`silk build` now builds the tasks, runs `codegen`, and then builds the program. This output keeps the progress rows to show the order:

```
$ silk build
Compiling site (x86_64-unknown-linux-gnu, tasks)
  load      212 modules, 1 in package         0.00s
  check     1 module                          0.00s
  codegen   0 functions                       0.00s
  link      clang                             0.00s
Finished build/llvm/x86_64-unknown-linux-gnu/tasks/site in 0.02s
wrote src/Pages.silk
Compiling site (x86_64-unknown-linux-gnu, debug)
  load      166 modules, 2 in package         0.00s
  check     2 modules                         0.09s
  codegen   531 functions                     0.11s
  borrow    215 bodies                        0.00s
  link      clang                             0.25s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/site in 0.48s
```

The hooks are `before-build`, `after-build`, `before-run`, `before-test`, `after-test`, `before-pack` and `after-pack`, each a list of task names that run in order. A failing hook stops the command:

```
$ : > pages.txt
$ silk build
error: pages.txt lists no pages
silk: before-build task `codegen` failed
```

`--no-hooks` skips them. Here, without `codegen`, the generated module is missing:

```
$ silk build --no-hooks
[x86_64-unknown-linux-gnu]
src/main.silk:5:8: error[MOD0001] Unknown module Pages
Failed site in 0.13s
```

Only the root manifest of a command is read, so a dependency's tasks never run in your build. A command that a hook starts runs no hooks of its own. `check`, `hash`, `format`, `doc`, `generate` and the editor never run them.

### What a task can see

The task starts in the package directory, with the user's rights and environment, and these variables:

| Variable | Holds |
| --- | --- |
| `SILK_PROJECT_ROOT` | The package directory; `Task.root()` answers it as a `Path` |
| `SILK_INVOCATION_DIRECTORY` | Where the user typed the command; `Task.invocationDirectory()` |
| `SILK_COMPILER` | The compiler that built the tasks; `Task.silk` runs it |
| `SILK_HOOK` | In a hook, its name, such as `before-build` |
| `SILK_HOOK_RESULT` | In `after-pack`, the object `silk pack --json` writes |

The tasks profile is an ordinary profile. Add `[profiles.tasks]` to choose another root module with `main`, and `[profiles.tasks.dependencies]` for dependencies that only the tasks need; they are fetched only when the tasks build.

## API reference

- `silk/cli/command`: `CommandLine`, `Command` (`make`, `withVersion`, `option`, `arg`, `subcommand`, `flatten`, `variant`), `Opt` (`about`, `plain`, `short`, `long`, `describe`, `required`, `default`, `env`, `choice`, `check`), `OptionSpec`, `VariantSpec`
- `silk/cli/parse`: `Cli` (`read`, `fromHost`, `parse`, `parseWith`, `parseBytes`, `writeHelp`, `writeVersion`, `writeError`, `message`), `Parsed`, `CliError`, `Variable`
- `silk/cli/value`: `ArgValue`, `FromArg`, `Arg`
- `silk/cli/completion`: `Completion` (`writeBash`, `writeZsh`, `writeFish`)
- `silk/cli/task`: `TaskSet`, `Task` (`main`, `exec`, `execBytes`, `silk`, `capture`, `abort`, `root`, `invocationDirectory`), `TaskError`
- `silk/system/host_input`: `HostInput`, `HostInputError`
- `silk/text/format`: `Format`
- `silk/testing/testing`: `Testing`, `AssertionError`
