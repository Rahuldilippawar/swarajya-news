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
  advertisements: "advertisements",
  auditLogs: "auditLogs",
  appSettings: "appSettings",
  // Server-only sequence counters (e.g. reporter IDs); no client access.
  counters: "counters",
} as const;

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
  videoStatus?: "UNVERIFIED" | "AVAILABLE" | "UNAVAILABLE";
  status: NewsStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  viewCount: number;
  submittedAt?: TimestampLike;
  approvedBy?: string;
  approvedAt?: TimestampLike;
  publishedAt?: TimestampLike;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface CategoryDoc {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

export const LOCATION_TYPES = ["STATE", "DISTRICT", "TALUKA", "VILLAGE"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export interface LocationDoc {
  locationId: string;
  name: string;
  slug: string;
  type: LocationType;
  parentLocationId: string | null;
  isActive: boolean;
}

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
  newsId?: string;
  targetType: "ALL" | "TOPIC" | "DISTRICT";
  targetValue?: string;
  createdBy: string;
  createdAt: TimestampLike;
  status: JobStatus;
}

export interface WhatsAppMessageDoc {
  messageId: string;
  newsId: string;
  templateName: string;
  recipientGroup: string;
  providerMessageId?: string;
  status: JobStatus | "DELIVERED" | "READ";
  requestedBy: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export const AD_PLACEMENTS = ["HOME_TOP", "HOME_INLINE", "ARTICLE_TOP", "ARTICLE_BOTTOM", "SIDEBAR", "APP_BANNER"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export interface AdvertisementDoc {
  advertisementId: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  startAt: TimestampLike;
  endAt: TimestampLike;
  isActive: boolean;
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

export interface AppSettingsDoc {
  channelName: string;
  logoUrl: string;
  contactDetails: { phone?: string; email?: string; address?: string };
  socialLinks: { youtube?: string; facebook?: string; instagram?: string; whatsapp?: string; x?: string };
  homepageConfiguration: { featuredCategoryIds: string[]; showShortVideos: boolean };
}
