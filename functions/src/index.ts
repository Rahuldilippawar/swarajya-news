import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { REGION } from "./admin";
import { callable } from "./callable";
import * as news from "./news";
import * as users from "./users";
import { recordView as countView } from "./views";

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
