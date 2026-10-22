# The Silk book

This book teaches Silk by building one program from start to finish. Read the chapters in order. Each one picks up the program where the last one left it, adds something, and explains the language features that change makes necessary.

## Who it is for

You should be comfortable programming in some language and using a terminal. You don't need to know Rust, C or systems programming. When Silk does something unusual, such as explicit moves, effects or work at compile time, the book explains why before it explains how.

## The program

`tasks` is a small task tracker. In chapter 1 it prints one line. By the end it is two packages, a library and a program. The program reads and writes a task file, sends reminders on fibers, exports CSV through reflection, and serves everything over HTTP with tests that use fake clocks and file systems.

| Chapters | What `tasks` gains |
| --- | --- |
| 1 to 3 | A project, functions, and types for tasks and commands |
| 4 to 6 | A board that owns its tasks, borrowed titles, filters and generic counting |
| 7 to 9 | Typed failures, a clock and a file system as services, `List` and `HashMap` |
| 10 to 11 | Reminders on fibers, package parameters, per-target code and CSV export |
| 12 to 13 | A library package, tests, and an HTTP service |

## How to read it

Every program and every output in the book was compiled and run. After `silk run`, the book shows only what the program printed, not the build's progress rows before it. Type the code yourself when you can. Each chapter breaks the program on purpose at least once, so you learn to read the compiler's errors before you meet them alone.

The book never tries to be complete. When a topic has more rules than a chapter needs, it points to the page in the Language reference that covers it, by title, in bold. The std lib API reference lists every module and function.

Start with **1. Hello, Silk** under Chapters.
