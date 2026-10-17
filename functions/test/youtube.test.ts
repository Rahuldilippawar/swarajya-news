import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyYouTubeVideo } from "../src/youtube";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("verifyYouTubeVideo", () => {
  it("marks public, embeddable videos available with their title", async () => {
    stubFetch(async () => new Response(JSON.stringify({ title: "बातमी" }), { status: 200 }));
    await expect(verifyYouTubeVideo("dQw4w9WgXcQ")).resolves.toEqual({ status: "AVAILABLE", title: "बातमी" });
  });

  it.each([401, 403, 404, 400])("marks HTTP %i as unavailable", async (status) => {
    stubFetch(async () => new Response("", { status }));
    await expect(verifyYouTubeVideo("dQw4w9WgXcQ")).resolves.toEqual({ status: "UNAVAILABLE" });
  });

  it("does not guess when YouTube is down or unreachable", async () => {
    stubFetch(async () => new Response("", { status: 503 }));
    await expect(verifyYouTubeVideo("dQw4w9WgXcQ")).resolves.toEqual({ status: "UNVERIFIED" });
    stubFetch(async () => {
      throw new TypeError("network");
    });
    await expect(verifyYouTubeVideo("dQw4w9WgXcQ")).resolves.toEqual({ status: "UNVERIFIED" });
  });
});
