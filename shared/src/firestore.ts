import type { VideoStatus } from "./api";
import type { NewsStatus } from "./newsStatus";
import type { Role, UserStatus } from "./roles";

/** Firestore collection names — use these constants instead of string literals. */
export const COLLECTIONS = {
  users: "users",
  news: "news",
  categories: "categories",
  locations: "locations",
  editorialReviews: "editorialReviews",
  notifications: "notifications",
  whatsappMessages: "whatsappMessages",
  whatsappSubscribers: "whatsappSubscribers",
  /** providerMessageId → bulletin recipient, so delivery webhooks can find their record. */
  whatsappDeliveries: "whatsappDeliveries",
  advertisements: "advertisements",
  auditLogs: "auditLogs",
  appSettings: "appSettings",
  // Server-only sequence counters (e.g. reporter IDs); no client access.
  counters: "counters",
} as const;

/**
 * Private notes for an article live in news/{newsId}/private/sourceNotes so
 * they are never exposed when the article itself becomes public.
 */
export const NEWS_PRIVATE_SUBCOLLECTION = "private";
export const SOURCE_NOTES_DOC_ID = "sourceNotes";

export interface SourceNotesDoc {
  notes: string;
  updatedAt: TimestampLike;
}

/** The single document in `appSettings` that holds public site configuration. */
export const APP_SETTINGS_DOC_ID = "public";

/**
 * Structural type satisfied by both the web SDK and the Admin SDK `Timestamp`,
 * so these interfaces can be shared without importing either SDK.
 */
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export interface UserDoc {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  reporterId?: string;
  assignedLocations: string[];
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface NewsDoc {
  newsId: string;
  headline: string;
  slug: string;
  summary: string;
  content: string;
  categoryId: string;
  districtId: string;
  talukaId?: string;
  villageId?: string;
  reporterId: string;
  /** Firebase Auth uid of the reporter; used by Security Rules for ownership. */
  reporterUid: string;
  reporterName: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  videoProvider?: "YOUTUBE";
  videoTitle?: string;
  videoStatus?: VideoStatus;
  status: NewsStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  viewCount: number;
  /** When the reported event happened (entered by the reporter). */
  eventAt?: TimestampLike;
  /** Latest editor decision, kept on the article so lists can show remarks without extra reads. Server-written. */
  lastReview?: { action: ReviewAction; remarks?: string; reviewerId: string; at: TimestampLike };
  submittedAt?: TimestampLike;
  approvedBy?: string;
  approvedAt?: TimestampLike;
  publishedAt?: TimestampLike;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface CategoryDoc {
  /** Same as the document ID and the slug, so category URLs never change. */
  categoryId: string;
  /** Display name, usually Marathi (e.g. "राजकारण"). */
  name: string;
  nameEn?: string;
  slug: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

export const LOCATION_TYPES = ["STATE", "DISTRICT", "TALUKA", "VILLAGE"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export interface LocationDoc {
  locationId: string;
  /** Display name, usually Marathi (e.g. "पुणे"). */
  name: string;
  /** Optional English name, used to build readable URL slugs (e.g. "pune"). */
  nameEn?: string;
  slug: string;
  type: LocationType;
  parentLocationId: string | null;
  isActive: boolean;
}

/** The type of location that sits under each level of the hierarchy. */
export const CHILD_LOCATION_TYPE: Record<LocationType, LocationType | null> = {
  STATE: "DISTRICT",
  DISTRICT: "TALUKA",
  TALUKA: "VILLAGE",
  VILLAGE: null,
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  STATE: "State",
  DISTRICT: "District",
  TALUKA: "Taluka",
  VILLAGE: "Village / City",
};

export const REVIEW_ACTIONS = ["START_REVIEW", "APPROVE", "REQUEST_CHANGES", "REJECT", "PUBLISH", "UNPUBLISH", "ARCHIVE"] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export interface EditorialReviewDoc {
  reviewId: string;
  newsId: string;
  reviewerId: string;
  action: ReviewAction;
  remarks?: string;
  createdAt: TimestampLike;
}

export type JobStatus = "QUEUED" | "SENDING" | "SENT" | "FAILED";

export interface NotificationDoc {
  notificationId: string;
  title: string;
  body: string;
  newsId: string;
  slug: string;
  targetType: "ALL" | "DISTRICT";
  /** District ID when targetType is DISTRICT. */
  targetValue?: string;
  topic: string;
  createdBy: string;
  createdByName: string;
  createdAt: TimestampLike;
  status: JobStatus;
  /** Number of send attempts (a FAILED job can be retried). */
  attempts: number;
  providerMessageId?: string;
  error?: string;
  sentAt?: TimestampLike;
}

/** One bulletin: an article sent to a recipient group. Document ID: bulletinJobId(newsId, group). */
export interface WhatsAppMessageDoc {
  messageId: string;
  newsId: string;
  templateName: string;
  recipientGroup: string;
  /** The rendered message, as recipients see it. */
  preview: string;
  status: "SENDING" | "SENT" | "PARTIAL" | "FAILED";
  counts: { total: number; accepted: number; failed: number; delivered: number; read: number };
  attempts: number;
  requestedBy: string;
  requestedByName: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** whatsappMessages/{jobId}/recipients/{subscriberId}: one recipient of one bulletin. */
export interface WhatsAppRecipientDoc {
  phone: string;
  status: "ACCEPTED" | "FAILED" | "SENT" | "DELIVERED" | "READ";
  providerMessageId?: string;
  error?: string;
  updatedAt: TimestampLike;
}

/** whatsappSubscribers/{subscriberId}. Phone numbers are personal data: functions write, distribution staff read. */
export interface WhatsAppSubscriberDoc {
  phone: string;
  name?: string;
  /** "ALL" plus any district IDs whose bulletins they receive. */
  groups: string[];
  status: "SUBSCRIBED" | "OPTED_OUT";
  consent: { source: string; recordedBy: string; at: TimestampLike };
  optedOutAt?: TimestampLike;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export const AD_PLACEMENTS = ["HOME_TOP", "HOME_INLINE", "ARTICLE_TOP", "ARTICLE_BOTTOM", "SIDEBAR", "APP_BANNER"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  HOME_TOP: "Website homepage — top",
  HOME_INLINE: "Website homepage — between sections",
  ARTICLE_TOP: "Website article — above the story",
  ARTICLE_BOTTOM: "Website article — below the story",
  SIDEBAR: "Website — side column (wide screens)",
  APP_BANNER: "Android app — home banner",
};

export interface AdvertisementDoc {
  advertisementId: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  startAt: TimestampLike;
  endAt: TimestampLike;
  isActive: boolean;
  /** Totals, written only by the recordAdEvent function. Per-day counts are in advertisements/{id}/daily/{yyyy-mm-dd}. */
  impressions?: number;
  clicks?: number;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export function isAdRunning(ad: Pick<AdvertisementDoc, "isActive" | "startAt" | "endAt">, now = new Date()): boolean {
  return ad.isActive && ad.startAt.toDate() <= now && now < ad.endAt.toDate();
}

export interface AuditLogDoc {
  logId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: TimestampLike;
  relevantMetadata?: Record<string, unknown>;
}

export const SOCIAL_NETWORKS = ["youtube", "facebook", "instagram", "whatsapp", "telegram", "x"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** appSettings/public — editable by the Super Admin in Admin → Settings, read by the website and app. */
export interface AppSettingsDoc {
  channelName: string;
  tagline?: string;
  contactDetails: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    /** Director / chief editor, shown on the Contact page (e.g. "श्री. योगेश भदाणे"). */
    editorName?: string;
    editorPhone?: string;
  };
  socialLinks: Partial<Record<SocialNetwork, string>>;
  /** Where to watch the channel on TV, e.g. "GTPL केबल नेटवर्क – चॅनल क्र. ९९३". Optional; the platform does not depend on it. */
  tvChannel?: string;
  updatedAt?: TimestampLike;
  updatedBy?: string;
}
