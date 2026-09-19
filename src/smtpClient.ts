import nodemailer from "nodemailer";
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

export async function sendMail(
  config: YahooConfig,
  opts: SendMailOptions
): Promise<{ messageId: string }> {
  if (!opts.text && !opts.html) {
    throw new Error("Either text or html body must be provided.");
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: true,
    auth: { user: config.email, pass: config.appPassword },
  });

  const info = await transporter.sendMail({
    from: config.email,
    to: opts.to,
    cc: opts.cc,
    bcc: opts.bcc,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });

  return { messageId: info.messageId };
}
