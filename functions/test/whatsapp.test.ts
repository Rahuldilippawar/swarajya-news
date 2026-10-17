// Runs against the Firestore emulator: `npm test -w functions`.
import { createHmac } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/admin";
import { previewWhatsAppBulletin, sendWhatsAppBulletin, type BulletinDeps } from "../src/whatsapp/bulletin";
import { MetaCloudProvider, type WhatsAppProvider } from "../src/whatsapp/provider";
import { addWhatsAppSubscribers, setWhatsAppSubscriberStatus } from "../src/whatsapp/subscribers";
import { handleWebhook, verifySignature, verifyToken } from "../src/whatsapp/webhook";
import type { Caller } from "../src/users";

const smm: Caller = { uid: "smm", role: "SOCIAL_MEDIA_MANAGER" };
const CONSENT = "Signed form at Pune office";

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
  await db.doc("news/p").set({ newsId: "p", slug: "pune-rain", status: "PUBLISHED", headline: "पुण्यात पाऊस", summary: "शाळांना सुट्टी", isBreaking: true });
  await db.doc("news/d").set({ newsId: "d", slug: "draft", status: "DRAFT", headline: "मसुदा", summary: "", isBreaking: false });
  await db.doc("locations/district-pune").set({ type: "DISTRICT", name: "पुणे" });
  await db.doc("users/smm").set({ fullName: "Priya More", status: "ACTIVE" });
});

async function expectCode(promise: Promise<unknown>, code: HttpsError["code"]) {
  await expect(promise).rejects.toSatisfy((err) => err instanceof HttpsError && err.code === code);
}

/** Fake provider: records sends; numbers in `failFor` are rejected. */
function fakeProvider(failFor: string[] = []) {
  let n = 0;
  const sendTemplate = vi.fn(async (to: string, _params: readonly string[]) => {
    if (failFor.includes(to)) throw new Error("(#131026) Message undeliverable");
    return `wamid.${++n}`;
  });
  return { provider: { templateName: "news_bulletin", sendTemplate } satisfies WhatsAppProvider, sendTemplate };
}

const deps = (provider: WhatsAppProvider): BulletinDeps => ({ provider, siteUrl: "https://example.com" });

async function subscribe(phones: string[], districtIds: string[] = []) {
  return addWhatsAppSubscribers(smm, { consentSource: CONSENT, entries: phones.map((phone) => ({ phone, districtIds })) });
}

describe("subscribers", () => {
  it("normalises numbers, records consent and reports invalid ones", async () => {
    const res = await addWhatsAppSubscribers(smm, {
      consentSource: CONSENT,
      entries: [{ phone: "98765 43210", name: "Ramesh", districtIds: ["district-pune", "nowhere"] }, { phone: "+919876543210" }, { phone: "12345" }],
    });
    expect(res).toEqual({ added: 1, updated: 0, skippedOptedOut: 0, invalid: ["12345"] });
    const doc = (await db.doc("whatsappSubscribers/919876543210").get()).data();
    expect(doc).toMatchObject({ phone: "+919876543210", name: "Ramesh", groups: ["ALL", "district-pune"], status: "SUBSCRIBED", consent: { source: CONSENT, recordedBy: "smm" } });
  });

  it("never re-subscribes someone who opted out through an import", async () => {
    await subscribe(["9876543210"]);
    await setWhatsAppSubscriberStatus(smm, { phone: "9876543210", status: "OPTED_OUT" });
    const res = await subscribe(["9876543210"]);
    expect(res.skippedOptedOut).toBe(1);
    expect((await db.doc("whatsappSubscribers/919876543210").get()).get("status")).toBe("OPTED_OUT");
  });

  it("needs a new consent record to re-subscribe", async () => {
    await subscribe(["9876543210"]);
    await setWhatsAppSubscriberStatus(smm, { phone: "9876543210", status: "OPTED_OUT" });
    await expectCode(setWhatsAppSubscriberStatus(smm, { phone: "9876543210", status: "SUBSCRIBED" }), "invalid-argument");
    await setWhatsAppSubscriberStatus(smm, { phone: "9876543210", status: "SUBSCRIBED", consentSource: "Phone call, agreed again" });
    expect((await db.doc("whatsappSubscribers/919876543210").get()).get("consent.source")).toBe("Phone call, agreed again");
  });

  it("requires consent and the WhatsApp permission", async () => {
    await expectCode(addWhatsAppSubscribers(smm, { entries: [{ phone: "9876543210" }] }), "invalid-argument");
    for (const role of ["REPORTER", "OWNER"] as const) {
      await expectCode(addWhatsAppSubscribers({ uid: "x", role }, { consentSource: CONSENT, entries: [{ phone: "9876543210" }] }), "permission-denied");
    }
  });
});

describe("bulletins", () => {
  it("previews the exact message and the recipient count", async () => {
    await subscribe(["9876543210", "9876543211"]);
    await subscribe(["9876543212"]);
    await setWhatsAppSubscriberStatus(smm, { phone: "9876543212", status: "OPTED_OUT" });
    const { provider } = fakeProvider();
    const res = await previewWhatsAppBulletin(smm, { newsId: "p", group: "ALL" }, deps(provider));
    expect(res).toMatchObject({ recipients: 2, templateName: "news_bulletin", alreadySent: false, tooMany: false });
    expect(res.preview).toContain("ब्रेकिंग न्यूज");
    expect(res.preview).toContain("https://example.com/news/pune-rain");
  });

  it("sends to every subscriber once, records each recipient, and refuses a second send", async () => {
    await subscribe(["9876543210", "9876543211"]);
    const { provider, sendTemplate } = fakeProvider();
    const res = await sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 2 }, deps(provider));

    expect(res).toEqual({ messageId: "p__ALL", status: "SENT", counts: { total: 2, accepted: 2, failed: 0 } });
    expect(sendTemplate).toHaveBeenCalledTimes(2);
    expect(sendTemplate.mock.calls[0]![1]).toEqual(["ब्रेकिंग न्यूज", "पुण्यात पाऊस", "शाळांना सुट्टी", "https://example.com/news/pune-rain"]);
    const job = (await db.doc("whatsappMessages/p__ALL").get()).data();
    expect(job).toMatchObject({ status: "SENT", requestedByName: "Priya More", counts: { total: 2, accepted: 2, failed: 0 } });
    expect((await db.collection("whatsappDeliveries").get()).size).toBe(2);

    await expectCode(sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 2 }, deps(provider)), "already-exists");
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  it("refuses to send if the list changed since the preview", async () => {
    await subscribe(["9876543210"]);
    const { provider, sendTemplate } = fakeProvider();
    await expectCode(sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 5 }, deps(provider)), "failed-precondition");
    await expectCode(sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL" }, deps(provider)), "invalid-argument");
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("marks partial failures and retries only the failed recipients", async () => {
    await subscribe(["9876543210", "9876543211", "9876543212"]);
    const first = fakeProvider(["+919876543211"]);
    const res = await sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 3 }, deps(first.provider));
    expect(res).toMatchObject({ status: "PARTIAL", counts: { total: 3, accepted: 2, failed: 1 } });
    expect((await db.doc("whatsappMessages/p__ALL/recipients/919876543211").get()).get("error")).toContain("undeliverable");

    const retry = fakeProvider();
    const again = await sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 3 }, deps(retry.provider));
    expect(retry.sendTemplate).toHaveBeenCalledTimes(1);
    expect(retry.sendTemplate.mock.calls[0]![0]).toBe("+919876543211");
    expect(again).toMatchObject({ status: "SENT", counts: { total: 3, accepted: 3, failed: 0 } });
    expect((await db.doc("whatsappMessages/p__ALL").get()).get("attempts")).toBe(2);
  });

  it("sends a district bulletin only to that district's subscribers", async () => {
    await subscribe(["9876543210"], ["district-pune"]);
    await subscribe(["9876543211"]);
    const { provider, sendTemplate } = fakeProvider();
    await sendWhatsAppBulletin(smm, { newsId: "p", group: "district-pune", expectedRecipients: 1 }, deps(provider));
    expect(sendTemplate.mock.calls.map(([to]) => to)).toEqual(["+919876543210"]);
  });

  it("only sends published news, needs a site URL, and blocks other roles", async () => {
    await subscribe(["9876543210"]);
    const { provider } = fakeProvider();
    await expectCode(previewWhatsAppBulletin(smm, { newsId: "d", group: "ALL" }, deps(provider)), "failed-precondition");
    await expectCode(previewWhatsAppBulletin(smm, { newsId: "p", group: "ALL" }, { provider, siteUrl: "" }), "failed-precondition");
    await expectCode(previewWhatsAppBulletin(smm, { newsId: "p", group: "nowhere" }, deps(provider)), "invalid-argument");
    await expectCode(sendWhatsAppBulletin({ uid: "r", role: "REPORTER" }, { newsId: "p", group: "ALL", expectedRecipients: 1 }, deps(provider)), "permission-denied");
  });
});

describe("webhook", () => {
  const statuses = (...list: { id: string; status: string; errors?: { message: string }[] }[]) => ({ entry: [{ changes: [{ value: { statuses: list } }] }] });
  const message = (from: string, body: string) => ({ entry: [{ changes: [{ value: { messages: [{ from, type: "text", text: { body } }] } }] }] });

  async function sentBulletin() {
    await subscribe(["9876543210", "9876543211"]);
    await sendWhatsAppBulletin(smm, { newsId: "p", group: "ALL", expectedRecipients: 2 }, deps(fakeProvider().provider));
  }

  it("records deliveries and reads, ignoring repeats and out-of-order receipts", async () => {
    await sentBulletin();
    await handleWebhook(statuses({ id: "wamid.1", status: "sent" }, { id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "read" }));
    await handleWebhook(statuses({ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "delivered" }, { id: "unknown", status: "read" }));
    const job = (await db.doc("whatsappMessages/p__ALL").get()).data();
    expect(job?.counts).toMatchObject({ delivered: 2, read: 1, accepted: 2, failed: 0 });
    expect((await db.doc("whatsappMessages/p__ALL/recipients/919876543211").get()).get("status")).toBe("READ");
  });

  it("records failures reported after acceptance", async () => {
    await sentBulletin();
    await handleWebhook(statuses({ id: "wamid.1", status: "failed", errors: [{ message: "Recipient not on WhatsApp" }] }));
    const job = (await db.doc("whatsappMessages/p__ALL").get()).data();
    expect(job).toMatchObject({ status: "PARTIAL", counts: { accepted: 1, failed: 1 } });
  });

  it("opts people out on STOP and in on START", async () => {
    await subscribe(["9876543210"]);
    expect(await handleWebhook(message("919876543210", "STOP"))).toMatchObject({ optOuts: 1 });
    expect((await db.doc("whatsappSubscribers/919876543210").get()).get("status")).toBe("OPTED_OUT");

    expect(await handleWebhook(message("919999999999", "START"))).toMatchObject({ optIns: 1 });
    expect((await db.doc("whatsappSubscribers/919999999999").get()).data()).toMatchObject({
      status: "SUBSCRIBED",
      groups: ["ALL"],
      consent: { source: "WhatsApp START message" },
    });
    expect(await handleWebhook(message("919876543210", "hello"))).toMatchObject({ optOuts: 0, optIns: 0 });
  });

  it("verifies Meta's signature", () => {
    const body = Buffer.from('{"entry":[]}');
    const sig = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(verifySignature(body, sig, "app-secret")).toBe(true);
    expect(verifySignature(body, sig, "other-secret")).toBe(false);
    expect(verifySignature(Buffer.from('{"entry":[1]}'), sig, "app-secret")).toBe(false);
    expect(verifySignature(body, undefined, "app-secret")).toBe(false);
    expect(verifySignature(body, sig, "")).toBe(false);
  });

  it("checks the subscription verify token", () => {
    expect(verifyToken("s3cret", "s3cret")).toBe(true);
    expect(verifyToken("s3cres", "s3cret")).toBe(false);
    expect(verifyToken(["s3cret"], "s3cret")).toBe(false);
    expect(verifyToken("", "")).toBe(false);
  });
});

describe("MetaCloudProvider", () => {
  const config = { accessToken: "token", phoneNumberId: "123", templateName: "news_bulletin", templateLanguage: "mr" };

  it("sends the template with body parameters", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.X" }] }), { status: 200 }));
    const id = await new MetaCloudProvider(config, fetchImpl as unknown as typeof fetch).sendTemplate("+919876543210", ["a", "b"]);
    expect(id).toBe("wamid.X");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "919876543210",
      type: "template",
      template: { name: "news_bulletin", language: { code: "mr" }, components: [{ type: "body", parameters: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }] },
    });
  });

  it("surfaces Meta's error message", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Template name does not exist", code: 132001 } }), { status: 400 }));
    await expect(new MetaCloudProvider(config, fetchImpl as unknown as typeof fetch).sendTemplate("+91", ["a"])).rejects.toThrow(
      "Template name does not exist (code 132001)",
    );
  });

  it("refuses to run unconfigured", async () => {
    await expect(new MetaCloudProvider({ ...config, accessToken: "" }).sendTemplate("+91", [])).rejects.toThrow(/not configured/);
  });
});
