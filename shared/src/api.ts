import type { NewsStatus } from "./newsStatus";
import type { NotificationTarget } from "./notifications";
import type { Role, UserStatus } from "./roles";

/**
 * Request and response shapes of the callable Cloud Functions, shared by the
 * panels (callers) and the functions (handlers) so both sides stay in sync.
 */
export interface CallableApi {
  createStaffUser: {
    request: { email: string; fullName: string; role: Role; assignedLocations?: string[] };
    /** The password-setup link must be handed to the new user over a trusted channel. */
    response: { uid: string; reporterId: string | null; passwordSetupLink: string };
  };
  setStaffRole: {
    request: { uid: string; role: Role };
    response: { uid: string; role: Role; reporterId: string | null };
  };
  setStaffStatus: {
    request: { uid: string; status: UserStatus };
    response: { uid: string; status: UserStatus };
  };
  updateStaffProfile: {
    /**
     * Managers may change any field; staff may set only their own photoUrl.
     * renewCard extends the ID card's validity by a year from today.
     */
    request: { uid: string; fullName?: string; assignedLocations?: string[]; photoUrl?: string; designation?: string; renewCard?: boolean };
    response: { uid: string };
  };
  transitionNews: {
    request: { newsId: string; to: NewsStatus; remarks?: string };
    response: { newsId: string; status: NewsStatus; slug: string; videoStatus: VideoStatus | null };
  };
  sendNotification: {
    request: { newsId: string; title: string; body: string; target: NotificationTarget };
    response: { notificationId: string; status: "SENT"; providerMessageId: string };
  };
  addWhatsAppSubscribers: {
    /** consentSource records how these people agreed to receive bulletins (required by WhatsApp policy). */
    request: { entries: WhatsAppSubscriberEntry[]; consentSource: string };
    response: { added: number; updated: number; skippedOptedOut: number; invalid: string[] };
  };
  setWhatsAppSubscriberStatus: {
    request: { phone: string; status: "SUBSCRIBED" | "OPTED_OUT"; consentSource?: string };
    response: { phone: string; status: "SUBSCRIBED" | "OPTED_OUT" };
  };
  previewWhatsAppBulletin: {
    request: { newsId: string; group: string };
    response: { preview: string; recipients: number; templateName: string; alreadySent: boolean; tooMany: boolean };
  };
  getReport: {
    /** Inclusive dates in India time, YYYY-MM-DD. At most 366 days. */
    request: { from: string; to: string };
    response: {
      from: string;
      to: string;
      totals: { published: number; submitted: number; approved: number; rejected: number; changesRequested: number; views: number; videos: number };
      byDay: { date: string; published: number }[];
      byReporter: ReporterReportRow[];
      byCategory: ReportRow[];
      byDistrict: ReportRow[];
      /** Published in the range, most viewed first (capped). */
      articles: ReportArticle[];
      truncated: boolean;
    };
  };
  sendWhatsAppBulletin: {
    /** expectedRecipients must match the current list, so nobody sends to a list that grew since the preview. */
    request: { newsId: string; group: string; expectedRecipients: number };
    response: {
      messageId: string;
      status: "SENT" | "PARTIAL" | "FAILED";
      counts: { total: number; accepted: number; failed: number };
    };
  };
}

export interface WhatsAppSubscriberEntry {
  phone: string;
  name?: string;
  districtIds?: string[];
}

export interface ReportRow {
  key: string;
  label: string;
  published: number;
  views: number;
}

export interface ReporterReportRow {
  reporterUid: string;
  name: string;
  reporterId: string;
  submitted: number;
  published: number;
  changesRequested: number;
  rejected: number;
  views: number;
}

export interface ReportArticle {
  newsId: string;
  slug: string;
  headline: string;
  reporterName: string;
  categoryId: string;
  districtId: string;
  publishedAt: string;
  views: number;
  hasVideo: boolean;
}

export type VideoStatus = "UNVERIFIED" | "AVAILABLE" | "UNAVAILABLE";

export type CallableName = keyof CallableApi;
export type CallableRequest<N extends CallableName> = CallableApi[N]["request"];
export type CallableResponse<N extends CallableName> = CallableApi[N]["response"];
