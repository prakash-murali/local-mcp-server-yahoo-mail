export interface YahooConfig {
  email: string;
  appPassword: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  readOnly: boolean;
  draftsOnly: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Set it to your Yahoo Mail address / app password.`
    );
  }
  return value;
}

export function loadConfig(): YahooConfig {
  return {
    email: requireEnv("YAHOO_EMAIL"),
    appPassword: requireEnv("YAHOO_APP_PASSWORD"),
    imapHost: process.env.YAHOO_IMAP_HOST || "imap.mail.yahoo.com",
    imapPort: Number(process.env.YAHOO_IMAP_PORT || 993),
    smtpHost: process.env.YAHOO_SMTP_HOST || "smtp.mail.yahoo.com",
    smtpPort: Number(process.env.YAHOO_SMTP_PORT || 465),
    readOnly: process.env.YAHOO_MCP_READ_ONLY === "true",
    draftsOnly: process.env.YAHOO_MCP_DRAFTS_ONLY === "true",
  };
}
