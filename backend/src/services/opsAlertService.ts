import { sendAdminEmail } from './emailService';
import { billingError, billingWarn } from '../utils/structuredLogger';

const OPS_ALERTS_ENABLED = process.env.OPS_ALERTS_ENABLED !== 'false';

/**
 * Alerta operacional para a equipe (e-mail admin + Slack opcional).
 * Fire-and-forget — não bloqueia fluxo principal.
 */
export function sendOpsAlert(title: string, details: Record<string, unknown>): void {
  if (!OPS_ALERTS_ENABLED) {
    return;
  }

  billingWarn({
    event: 'ops_alert',
    title,
    ...details,
  });

  const slackUrl = process.env.SLACK_OPS_WEBHOOK_URL;
  if (slackUrl) {
    void fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Flock Billing — ${title}*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
      }),
    }).catch((err) => {
      billingError({
        event: 'ops_alert_slack_failed',
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  void sendAdminEmail({
    subject: `[Flock Billing] ${title}`,
    html: `<h2>${title}</h2><pre>${JSON.stringify(details, null, 2)}</pre>`,
  }).catch((err) => {
    billingError({
      event: 'ops_alert_email_failed',
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
