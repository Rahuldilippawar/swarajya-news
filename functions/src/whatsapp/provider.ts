/** A WhatsApp sending provider. Meta's Cloud API is built in; other BSPs can implement this. */
export interface WhatsAppProvider {
  readonly templateName: string;
  /** Sends one template message; resolves with the provider's message ID or rejects with a readable error. */
  sendTemplate(to: string, params: readonly string[]): Promise<string>;
}

export interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
  apiVersion?: string;
  /** Override only for local testing against a mock; production always uses graph.facebook.com. */
  baseUrl?: string;
}

/** WhatsApp Cloud API (graph.facebook.com). Credentials come from Secret Manager, never from Firestore or clients. */
export class MetaCloudProvider implements WhatsAppProvider {
  constructor(private readonly config: MetaConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  get templateName() {
    return this.config.templateName;
  }

  async sendTemplate(to: string, params: readonly string[]): Promise<string> {
    const { accessToken, phoneNumberId, templateName, templateLanguage, apiVersion = "v21.0", baseUrl = "https://graph.facebook.com" } = this.config;
    if (!accessToken || !phoneNumberId) throw new Error("WhatsApp is not configured (access token or phone number ID missing).");
    const res = await this.fetchImpl(`${baseUrl.replace(/\/+$/, "")}/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } };
    const id = body.messages?.[0]?.id;
    if (!res.ok || !id) {
      throw new Error(body.error?.message ? `${body.error.message} (code ${body.error.code ?? res.status})` : `HTTP ${res.status}`);
    }
    return id;
  }
}
