# NOTICE

Shadow Dream is an independent, clean-room implementation of an OneBot 11 runtime and a
LiteLoaderQQNT integration layer.

The following projects were consulted as **behavioral and API-shape references**
during development:

- **NapCatQQ** — NTQQ wrapper service names, message element shapes, OneBot
  action behavior, and the general idea of capturing QQ's already-loaded
  `wrapper.node`. No NapCatQQ source code is copied into Shadow Dream. NapCatQQ's
  repository carries its own limited redistribution license; this project does
  not redistribute or derive from its code.
- **SnowLuma** — the idea of an external runtime that talks to QQNT through a
  captured wrapper/session, and OneBot transport layout. No SnowLuma source code
  or native binaries are copied.

Runtime dependencies:

- `ws` — MIT License, Copyright (c) 2011 Einar Otto Stangvik & contributors.
- `typescript`, `@types/node`, `@types/ws` — development-only dependencies.

QQ, QQNT, and related marks are trademarks of Tencent. Shadow Dream is not affiliated
with or endorsed by Tencent.
