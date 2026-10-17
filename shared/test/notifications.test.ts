import { describe, expect, it } from "vitest";
import { ALL_NEWS_TOPIC, districtTopic, notificationJobId, topicFor } from "../src/notifications";

describe("notification topics", () => {
  it("produces FCM-safe district topics", () => {
    expect(districtTopic("district-pune")).toBe("district_district-pune");
    expect(districtTopic("a b/c")).toBe("district_a_b_c");
    expect(districtTopic("x".repeat(10))).toMatch(/^[A-Za-z0-9_.~%-]+$/);
  });

  it("maps targets to topics", () => {
    expect(topicFor({ type: "ALL" })).toBe(ALL_NEWS_TOPIC);
    expect(topicFor({ type: "DISTRICT", districtId: "district-pune" })).toBe("district_district-pune");
  });

  it("gives one job ID per article and audience", () => {
    expect(notificationJobId("n1", { type: "ALL" })).toBe("n1__all");
    expect(notificationJobId("n1", { type: "DISTRICT", districtId: "district-pune" })).not.toBe(notificationJobId("n1", { type: "ALL" }));
  });
});
