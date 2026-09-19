import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import addressparser from "nodemailer/lib/addressparser/index.js";
import type { YahooConfig } from "./config.js";

export interface SendMailOptions {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

function isAllowed(address: string, allowed: string[]): boolean {
  const addr = address.toLowerCase();
  return allowed.some((entry) =>
    entry.includes("@") ? addr === entry : addr.endsWith(`@${entry}`)
  );
}

function assertRecipientsAllowed(config: YahooConfig, opts: SendMailOptions): void {
  if (config.allowedRecipients.length === 0) return;

  const recipients = [opts.to, opts.cc, opts.bcc]
    .filter((field): field is string => !!field)
    .flatMap((field) => addressparser(field))
    .map((entry) => entry.address)
    .filter((addr): addr is string => !!addr);

  const blocked = recipients.filter((addr) => !isAllowed(addr, config.allowedRecipients));
  if (blocked.length > 0) {
    throw new Error(
      `Recipient(s) not permitted by YAHOO_MCP_ALLOWED_RECIPIENTS: ${blocked.join(", ")}. ` +
        `Allowed: ${config.allowedRecipients.join(", ")}.`
    );
  }
}

function toMailOptions(config: YahooConfig, opts: SendMailOptions) {
  if (!opts.text && !opts.html) {
    throw new Error("Either text or html body must be provided.");
  }
  return {
    from: config.email,
    to: opts.to,
    cc: opts.cc,
    bcc: opts.bcc,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  };
}

export async function sendMail(
  config: YahooConfig,
  opts: SendMailOptions
): Promise<{ messageId: string }> {
  const mailOptions = toMailOptions(config, opts);
  assertRecipientsAllowed(config, opts);

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: true,
    auth: { user: config.email, pass: config.appPassword },
  });

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

export async function buildDraft(
  config: YahooConfig,
  opts: SendMailOptions
): Promise<Buffer> {
  const mailOptions = toMailOptions(config, opts);
  assertRecipientsAllowed(config, opts);
  return new MailComposer(mailOptions).compile().build();
}
