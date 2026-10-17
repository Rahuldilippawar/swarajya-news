import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { REGION } from "./admin";
import { callable } from "./callable";
import * as news from "./news";
import * as notifications from "./notifications";
import * as users from "./users";
import { recordView as countView } from "./views";
import * as bulletin from "./whatsapp/bulletin";
import { MetaCloudProvider } from "./whatsapp/provider";
import * as subscribers from "./whatsapp/subscribers";
import { handleWebhook, verifySignature } from "./whatsapp/webhook";

setGlobalOptions({ region: REGION, maxInstances: 10 });

/** Liveness check used by deployment smoke tests. */
export const health = onRequest((_req, res) => {
  res.json({ ok: true, service: "swarajya-news-functions" });
});

export const createStaffUser = callable("createStaffUser", users.createStaffUser);
export const setStaffRole = callable("setStaffRole", users.setStaffRole);
export const setStaffStatus = callable("setStaffStatus", users.setStaffStatus);
export const updateStaffProfile = callable("updateStaffProfile", users.updateStaffProfile);

export const transitionNews = callable("transitionNews", (caller, data) => news.transitionNews(caller, data));

/**
 * Public view counter used by the website (one call per article per browser
 * session). Always answers 204 so callers learn nothing about unpublished articles.
 */
export const recordView = onRequest({ cors: true, maxInstances: 5 }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    await countView((req.body as { newsId?: unknown } | undefined)?.newsId);
  } catch (err) {
    logger.error("recordView failed", err);
  }
  res.status(204).end();
});

export const sendNotification = callable("sendNotification", (caller, data) => notifications.sendNotification(caller, data));

// ---------------------------------------------------------------- WhatsApp
// Secrets live in Cloud Secret Manager (firebase functions:secrets:set NAME), never in code or Firestore.
const WHATSAPP_ACCESS_TOKEN = defineSecret("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_APP_SECRET = defineSecret("WHATSAPP_APP_SECRET");
const WHATSAPP_VERIFY_TOKEN = defineSecret("WHATSAPP_VERIFY_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = defineString("WHATSAPP_PHONE_NUMBER_ID", { default: "" });
const WHATSAPP_TEMPLATE_NAME = defineString("WHATSAPP_TEMPLATE_NAME", { default: "news_bulletin" });
const WHATSAPP_TEMPLATE_LANGUAGE = defineString("WHATSAPP_TEMPLATE_LANGUAGE", { default: "mr" });
const PUBLIC_SITE_URL = defineString("PUBLIC_SITE_URL", { default: "" });
const WHATSAPP_API_BASE_URL = defineString("WHATSAPP_API_BASE_URL", { default: "https://graph.facebook.com" });

const bulletinDeps = () => ({
  provider: new MetaCloudProvider({
    accessToken: WHATSAPP_ACCESS_TOKEN.value(),
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID.value(),
    templateName: WHATSAPP_TEMPLATE_NAME.value(),
    templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE.value(),
    baseUrl: WHATSAPP_API_BASE_URL.value(),
  }),
  siteUrl: PUBLIC_SITE_URL.value(),
});

export const addWhatsAppSubscribers = callable("addWhatsAppSubscribers", subscribers.addWhatsAppSubscribers);
export const setWhatsAppSubscriberStatus = callable("setWhatsAppSubscriberStatus", subscribers.setWhatsAppSubscriberStatus);
export const previewWhatsAppBulletin = callable(
  "previewWhatsAppBulletin",
  (caller, data) => bulletin.previewWhatsAppBulletin(caller, data, bulletinDeps()),
  { secrets: [WHATSAPP_ACCESS_TOKEN] },
);
export const sendWhatsAppBulletin = callable(
  "sendWhatsAppBulletin",
  (caller, data) => bulletin.sendWhatsAppBulletin(caller, data, bulletinDeps()),
  { secrets: [WHATSAPP_ACCESS_TOKEN], timeoutSeconds: 540, memory: "512MiB" },
);

/** Meta webhook: GET verifies the subscription; POST carries delivery receipts and STOP/START replies. */
export const whatsappWebhook = onRequest({ secrets: [WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN] }, async (req, res) => {
  if (req.method === "GET") {
    const ok = req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === WHATSAPP_VERIFY_TOKEN.value();
    res.status(ok ? 200 : 403).send(ok ? String(req.query["hub.challenge"] ?? "") : "forbidden");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  if (!verifySignature(req.rawBody, req.get("x-hub-signature-256"), WHATSAPP_APP_SECRET.value())) {
    logger.warn("whatsappWebhook: invalid signature");
    res.status(401).end();
    return;
  }
  try {
    const result = await handleWebhook(req.body);
    logger.info("whatsappWebhook processed", result);
  } catch (err) {
    // Answer 200 anyway: Meta retries failed deliveries, and receipts are not critical.
    logger.error("whatsappWebhook failed", err);
  }
  res.status(200).end();
});
