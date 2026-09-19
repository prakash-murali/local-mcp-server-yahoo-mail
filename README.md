# Yahoo Mail MCP Server

An MCP server that gives Claude access to a Yahoo Mail account: read messages, create
folders, move messages between folders, and compose/send email. It connects directly
to Yahoo's IMAP and SMTP servers using an **app password** — Yahoo does not offer a
general-purpose OAuth Mail API for third-party apps, so this is the supported way to
integrate.

There are two ways to install it — pick whichever fits how much you want to inspect
before running it:

- **[Quick start (npm)](#quick-start-npm)** — no clone, no build, one config block.
- **[Build from source (GitHub)](#build-from-source-github)** — clone and compile it
  yourself so you know exactly what's running.

## 1. Generate a Yahoo app password

Yahoo requires an app-specific password for IMAP/SMTP access (your normal account
password will not work, especially if 2-step verification is on).

1. Sign in at https://login.yahoo.com and go to **Account Info → Account Security**.
2. Turn on **2-step verification** if it isn't already on (required for app passwords).
3. Under **App passwords**, click **Generate app password**, name it (e.g. "Claude MCP"),
   and copy the generated password. You won't be able to view it again.

## Quick start (npm)

No install step required — `npx` fetches and runs the package on demand. Add this to
your Claude config (`claude_desktop_config.json`, reachable from Claude Desktop's
**Settings → Local MCP servers → Edit config**):

```json
{
  "mcpServers": {
    "yahoo-mail": {
      "command": "npx",
      "args": ["-y", "local-mcp-server-yahoo-mail"],
      "env": {
        "YAHOO_EMAIL": "you@yahoo.com",
        "YAHOO_APP_PASSWORD": "your-16-char-app-password"
      }
    }
  }
}
```

Or with the Claude Code CLI:

```bash
claude mcp add yahoo-mail --env YAHOO_EMAIL=you@yahoo.com --env YAHOO_APP_PASSWORD=xxxxxxxxxxxxxxxx -- npx -y local-mcp-server-yahoo-mail
```

Fully quit and relaunch Claude Desktop afterward — MCP servers are only loaded at startup.

## Build from source (GitHub)

Prefer to read and compile the code yourself before it touches your inbox:

```bash
git clone https://github.com/prakashmurali123/local-mcp-server-yahoo-mail.git
cd local-mcp-server-yahoo-mail
npm install
npm run build
```

Then point your config at the built file instead of `npx`:

```json
{
  "mcpServers": {
    "yahoo-mail": {
      "command": "node",
      "args": ["/absolute/path/to/local-mcp-server-yahoo-mail/dist/index.js"],
      "env": {
        "YAHOO_EMAIL": "you@yahoo.com",
        "YAHOO_APP_PASSWORD": "your-16-char-app-password"
      }
    }
  }
}
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `YAHOO_EMAIL` | yes | — | Your full Yahoo Mail address |
| `YAHOO_APP_PASSWORD` | yes | — | App password generated in step 1 |
| `YAHOO_IMAP_HOST` | no | `imap.mail.yahoo.com` | IMAP host override |
| `YAHOO_IMAP_PORT` | no | `993` | IMAP port override |
| `YAHOO_SMTP_HOST` | no | `smtp.mail.yahoo.com` | SMTP host override |
| `YAHOO_SMTP_PORT` | no | `465` | SMTP port override |
| `YAHOO_MCP_READ_ONLY` | no | `false` | Set to `true` to disable `create_folder`, `move_message`, and `send_email` — only reading is possible. |

Credentials are never written to disk by this server — they're read from environment
variables at startup and used only to authenticate to Yahoo's IMAP/SMTP servers over TLS.

### Try it read-only first

If you'd rather not grant write/send access right away, set `YAHOO_MCP_READ_ONLY` to
`true` in the `env` block. The server won't even register the `create_folder`,
`move_message`, or `send_email` tools — Claude can only list folders and read messages
until you turn it off.

## Tools

- **list_folders** — list all folders/mailboxes (Inbox, Sent, Drafts, Trash, custom folders).
- **create_folder** — create a new folder; use `/` for nested paths (`Projects/Alpha`).
- **list_messages** — list message summaries in a folder, with optional filters (unread only,
  sender, subject substring, since date) and a result limit.
- **get_message** — fetch the full text/HTML body of one message by folder + UID.
- **move_message** — move a message from one folder to another by UID.
- **send_email** — compose and send an email (to/cc/bcc, subject, text and/or HTML body,
  optional reply threading headers).

## Security

This server is a thin, auditable bridge between Claude and Yahoo's own mail servers —
there's no third-party backend in between.

- **No network calls other than to Yahoo.** The only hosts this code talks to are
  `imap.mail.yahoo.com` and `smtp.mail.yahoo.com` (or whatever you override them to),
  both over TLS. No telemetry, no analytics, no other endpoint.
- **Small, readable codebase.** The entire implementation is ~5 files under `src/` —
  read it yourself before trusting it with your inbox.
- **App password, not your real password.** It's scoped to IMAP/SMTP and can be revoked
  independently at any time from Yahoo Account Security, without touching your main
  login credentials.
- **Credentials stay local.** They're read from environment variables at process start
  and are never logged or written to disk by this code.
- **Well-known dependencies.** `imapflow`, `nodemailer`, `mailparser`, and the official
  `@modelcontextprotocol/sdk` — all widely used, independently auditable packages.
- **Optional read-only mode.** Set `YAHOO_MCP_READ_ONLY=true` to disable all
  write/send capability while you evaluate it (see above).

If you find a security issue, please open an issue rather than a public PR with exploit details.

## Development

```bash
npm run dev    # tsc --watch
npm start       # run the built server directly (for manual stdio testing)
```
