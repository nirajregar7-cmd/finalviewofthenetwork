export type EmailFailureCode = 'not_configured' | 'unauthorized' | 'rate_limited' | 'provider' | 'network';

export class EmailDeliveryError extends Error {
  constructor(
    readonly code: EmailFailureCode,
    readonly providerStatus?: number,
  ) {
    super('Email delivery is temporarily unavailable');
    this.name = 'EmailDeliveryError';
  }
}

type SmtpTransporter = {
  sendMail: (message: {
    from: { name: string; address: string };
    to: string;
    bcc?: string[];
    subject: string;
    html: string;
  }) => Promise<unknown>;
};

export function createEmailDelivery({
  brevoApiKey,
  emailFromAddress,
  brevoEmailFromAddress = emailFromAddress,
  brevoSmtpTransporter = null,
  smtpTransporter,
  preferBrevoApi = false,
  apiTimeoutMs = 8_000,
  fetchImpl = fetch,
}: {
  brevoApiKey: string;
  emailFromAddress: string;
  brevoEmailFromAddress?: string;
  brevoSmtpTransporter?: SmtpTransporter | null;
  smtpTransporter: SmtpTransporter | null;
  preferBrevoApi?: boolean;
  apiTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}) {
  async function sendBrevoApiRequest(body: Record<string, unknown>) {
    if (!brevoApiKey) {
      throw new EmailDeliveryError('not_configured');
    }

    try {
      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(apiTimeoutMs),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new EmailDeliveryError('unauthorized', response.status);
        }
        if (response.status === 429 || response.status >= 500) {
          throw new EmailDeliveryError('rate_limited', response.status);
        }
        throw new EmailDeliveryError('provider', response.status);
      }
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      throw new EmailDeliveryError('network');
    }
  }

  async function sendBrevoApiEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    await sendBrevoApiRequest({
      sender: { name: 'The Network', email: brevoEmailFromAddress },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  }

  async function sendBrevoApiBulkEmail({
    to,
    bcc,
    subject,
    html,
  }: {
    to: string;
    bcc: string[];
    subject: string;
    html: string;
  }) {
    if (!bcc.length) return;
    await sendBrevoApiRequest({
      sender: { name: 'The Network', email: brevoEmailFromAddress },
      to: [{ email: to }],
      bcc: bcc.map((email) => ({ email })),
      subject,
      htmlContent: html,
    });
  }

  async function sendBrevoEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (brevoSmtpTransporter && !preferBrevoApi) {
      try {
        await sendSmtpTransportEmail({
          transporter: brevoSmtpTransporter,
          fromAddress: brevoEmailFromAddress,
          to,
          subject,
          html,
        });
        return;
      } catch (error) {
        // A rejected SMTP credential cannot have accepted the message, so the
        // Brevo API key is a safe provider-local fallback for auth mail.
        if (!(error instanceof EmailDeliveryError) || error.code !== 'unauthorized' || !brevoApiKey) {
          throw error;
        }
        console.warn('[email] Brevo SMTP authentication failed; falling back to Brevo API');
      }
    }

    await sendBrevoApiEmail({ to, subject, html });
    console.info('[email] message accepted by Brevo API');
  }

  async function sendSmtpEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!smtpTransporter) {
      throw new EmailDeliveryError('not_configured');
    }

    await sendSmtpTransportEmail({
      transporter: smtpTransporter,
      fromAddress: emailFromAddress,
      to,
      subject,
      html,
    });
  }

  async function sendSmtpBulkEmail({
    to,
    bcc,
    subject,
    html,
  }: {
    to: string;
    bcc: string[];
    subject: string;
    html: string;
  }) {
    if (!smtpTransporter) {
      throw new EmailDeliveryError('not_configured');
    }
    if (!bcc.length) return;

    await sendSmtpTransportEmail({
      transporter: smtpTransporter,
      fromAddress: emailFromAddress,
      to,
      bcc,
      subject,
      html,
    });
  }

  async function sendBrevoBulkEmail({
    to,
    bcc,
    subject,
    html,
  }: {
    to: string;
    bcc: string[];
    subject: string;
    html: string;
  }) {
    if (!bcc.length) return;

    if (brevoSmtpTransporter && !preferBrevoApi) {
      try {
        await sendSmtpTransportEmail({
          transporter: brevoSmtpTransporter,
          fromAddress: brevoEmailFromAddress,
          to,
          bcc,
          subject,
          html,
        });
        return;
      } catch (error) {
        if (!(error instanceof EmailDeliveryError) || error.code !== 'unauthorized' || !brevoApiKey) {
          throw error;
        }
        console.warn('[email] Brevo SMTP authentication failed; falling back to Brevo API');
      }
    }

    await sendBrevoApiBulkEmail({ to, bcc, subject, html });
  }

  async function sendSmtpTransportEmail({
    transporter,
    fromAddress,
    to,
    bcc,
    subject,
    html,
  }: {
    transporter: SmtpTransporter;
    fromAddress: string;
    to: string;
    bcc?: string[];
    subject: string;
    html: string;
  }) {
    try {
      await transporter.sendMail({
        from: { name: 'The Network', address: fromAddress },
        to,
        ...(bcc?.length ? { bcc } : {}),
        subject,
        html,
      });
    } catch (error: any) {
      const providerStatus = Number(error?.responseCode) || undefined;
      if (providerStatus === 535 || providerStatus === 534) {
        throw new EmailDeliveryError('unauthorized', providerStatus);
      }
      if ([421, 450, 451, 452, 429].includes(providerStatus || 0)) {
        throw new EmailDeliveryError('rate_limited', providerStatus);
      }
      throw new EmailDeliveryError(
        error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' ? 'network' : 'provider',
        providerStatus,
      );
    }
  }

  return { sendBrevoEmail, sendSmtpEmail, sendSmtpBulkEmail, sendBrevoBulkEmail };
}