/**
 * FCM topics. The Android app subscribes to these and Cloud Functions send to
 * them, so the names must match apps/android/lib/notifications/topics.dart.
 */
export const ALL_NEWS_TOPIC = "news_all";

/** Topic for one district's news; FCM topic names allow only [A-Za-z0-9-_.~%]. */
export function districtTopic(districtId: string): string {
  return `district_${districtId.replace(/[^A-Za-z0-9_.~-]/g, "_")}`;
}

export const NOTIFICATION_LIMITS = { title: 100, body: 250 } as const;

export type NotificationTarget = { type: "ALL" } | { type: "DISTRICT"; districtId: string };

/**
 * One notification per article and audience: the job's document ID, so a
 * second send (double click, two editors) is detected atomically.
 */
export function notificationJobId(newsId: string, target: NotificationTarget): string {
  return target.type === "ALL" ? `${newsId}__all` : `${newsId}__${districtTopic(target.districtId)}`;
}

export function topicFor(target: NotificationTarget): string {
  return target.type === "ALL" ? ALL_NEWS_TOPIC : districtTopic(target.districtId);
}
