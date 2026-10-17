import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { REGION } from "./admin";

setGlobalOptions({ region: REGION, maxInstances: 10 });

/** Liveness check used by deployment smoke tests. */
export const health = onRequest((_req, res) => {
  res.json({ ok: true, service: "swarajya-news-functions" });
});
