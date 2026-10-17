import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { REGION } from "./admin";
import { callable } from "./callable";
import * as users from "./users";

setGlobalOptions({ region: REGION, maxInstances: 10 });

/** Liveness check used by deployment smoke tests. */
export const health = onRequest((_req, res) => {
  res.json({ ok: true, service: "swarajya-news-functions" });
});

export const createStaffUser = callable("createStaffUser", users.createStaffUser);
export const setStaffRole = callable("setStaffRole", users.setStaffRole);
export const setStaffStatus = callable("setStaffStatus", users.setStaffStatus);
export const updateStaffProfile = callable("updateStaffProfile", users.updateStaffProfile);
