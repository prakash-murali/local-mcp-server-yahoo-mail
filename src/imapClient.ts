import { ImapFlow, type ListResponse } from "imapflow";
import { simpleParser } from "mailparser";
import type { YahooConfig } from "./config.js";

async function withClient<T>(
  config: YahooConfig,
  fn: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: true,
    auth: { user: config.email, pass: config.appPassword },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export interface FolderInfo {
  path: string;
  name: string;
  delimiter: string;
  specialUse?: string;
}

export async function listFolders(config: YahooConfig): Promise<FolderInfo[]> {
  return withClient(config, async (client) => {
    const mailboxes = await client.list();
    return mailboxes.map((mb: ListResponse) => ({
      path: mb.path,
      name: mb.name,
      delimiter: mb.delimiter,
      specialUse: mb.specialUse,
    }));
  });
}

export async function createFolder(config: YahooConfig, path: string): Promise<{ path: string; created: boolean }> {
  return withClient(config, async (client) => {
    const segments = path.split(/[/.]/).filter(Boolean);
    const result = await client.mailboxCreate(segments);
    return { path: result.path, created: result.created };
  });
}

export interface MessageSummary {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  seen: boolean;
  flags: string[];
}

export interface ListMessagesOptions {
  folder: string;
  limit?: number;
  unseenOnly?: boolean;
  from?: string;
  subject?: string;
  since?: string;
}

export async function listMessages(
  config: YahooConfig,
  opts: ListMessagesOptions
): Promise<MessageSummary[]> {
  return withClient(config, async (client) => {
    const lock = await client.getMailboxLock(opts.folder, { readOnly: true });
    try {
      const searchQuery: Record<string, unknown> = {};
      if (opts.unseenOnly) searchQuery.seen = false;
      if (opts.from) searchQuery.from = opts.from;
      if (opts.subject) searchQuery.subject = opts.subject;
      if (opts.since) searchQuery.since = new Date(opts.since);

      const hasFilters = Object.keys(searchQuery).length > 0;
      const uids = hasFilters
        ? await client.search(searchQuery, { uid: true })
        : await client.search({ all: true }, { uid: true });

      if (!uids || uids.length === 0) return [];

      const limit = opts.limit ?? 20;
      const targetUids = uids.slice(-Math.max(limit, 1)).reverse();

      const summaries: MessageSummary[] = [];
      for await (const msg of client.fetch(
        targetUids,
        { envelope: true, flags: true, uid: true },
        { uid: true }
      )) {
        summaries.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: (msg.envelope?.from ?? [])
            .map((a) => a.address || a.name)
            .filter(Boolean)
            .join(", "),
          to: (msg.envelope?.to ?? [])
            .map((a) => a.address || a.name)
            .filter(Boolean)
            .join(", "),
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
          seen: msg.flags?.has("\\Seen") ?? false,
          flags: msg.flags ? Array.from(msg.flags) : [],
        });
      }
      summaries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return summaries;
    } finally {
      lock.release();
    }
  });
}

export interface MessageDetail extends MessageSummary {
  text: string;
  html: string | null;
}

export async function getMessage(
  config: YahooConfig,
  folder: string,
  uid: number
): Promise<MessageDetail> {
  return withClient(config, async (client) => {
    const lock = await client.getMailboxLock(folder, { readOnly: true });
    try {
      const msg = await client.fetchOne(
        String(uid),
        { envelope: true, flags: true, source: true, uid: true },
        { uid: true }
      );
      if (!msg || !msg.source) {
        throw new Error(`Message with UID ${uid} not found in folder "${folder}"`);
      }
      const parsed = await simpleParser(msg.source);
      return {
        uid: msg.uid,
        subject: msg.envelope?.subject ?? "(no subject)",
        from: (msg.envelope?.from ?? [])
          .map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        to: (msg.envelope?.to ?? [])
          .map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        seen: msg.flags?.has("\\Seen") ?? false,
        flags: msg.flags ? Array.from(msg.flags) : [],
        text: parsed.text ?? "",
        html: typeof parsed.html === "string" ? parsed.html : null,
      };
    } finally {
      lock.release();
    }
  });
}

export async function moveMessage(
  config: YahooConfig,
  sourceFolder: string,
  uid: number,
  destFolder: string
): Promise<{ moved: boolean; uidMap?: Record<string, number> }> {
  return withClient(config, async (client) => {
    const lock = await client.getMailboxLock(sourceFolder);
    try {
      const result = await client.messageMove(String(uid), destFolder, { uid: true });
      return { moved: !!result, uidMap: result && result.uidMap ? Object.fromEntries(result.uidMap) : undefined };
    } finally {
      lock.release();
    }
  });
}
