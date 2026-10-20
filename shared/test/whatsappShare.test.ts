import { describe, expect, it } from "vitest";
import { whatsappShareText, whatsappShareUrl } from "../src/whatsappShare";

const settings = {
  channelName: "स्वराज्य न्यूज",
  tvChannel: "GTPL केबल नेटवर्क – चॅनल क्र. ९९३",
  contactDetails: { editorName: "श्री. योगेश भदाणे", editorPhone: "8625970948" },
  socialLinks: {
    whatsapp: "https://whatsapp.com/channel/abc",
    telegram: "https://t.me/S_Nd24",
    facebook: "https://www.facebook.com/profile.php?id=1",
    instagram: "https://www.instagram.com/swarajyanews2025",
  },
};

describe("whatsappShareText", () => {
  it("builds the house format for a video story", () => {
    const text = whatsappShareText(
      { headline: " धुळ्यात संघाचे पथसंचालन ", slug: "dhule-k3x9a", youtubeUrl: "https://youtu.be/iZCcYK97r4Y" },
      settings,
      "https://site.example/",
    );
    const lines = text.split("\n");
    expect(lines[0]).toBe("https://youtu.be/iZCcYK97r4Y");
    expect(lines[1]).toBe("_*धुळ्यात संघाचे पथसंचालन*_");
    expect(lines[2]).toBe("📰 संपूर्ण बातमी: https://site.example/news/dhule-k3x9a");
    expect(text).toContain("_*ताज्या अपडेट्स साठी जॉईन करा*_");
    expect(text).toContain("🔷 *टेलिग्राम* https://t.me/S_Nd24");
    expect(text).toContain("टी.व्ही. वर... GTPL केबल नेटवर्क – चॅनल क्र. ९९३");
    expect(lines.at(-1)).toBe("🔷 *संचालक/ मुख्य संपादक - श्री. योगेश भदाणे मो. 8625970948*");
    expect(text).not.toContain("ट्विटर");
  });

  it("uses the article link when there is no video, and skips empty sections", () => {
    const text = whatsappShareText({ headline: "बातमी", slug: "a" }, { channelName: "स्वराज्य न्यूज", contactDetails: {}, socialLinks: {} }, "https://s.example");
    expect(text.split("\n").slice(0, 2)).toEqual(["https://s.example/news/a", "_*बातमी*_"]);
    expect(text).not.toContain("जॉईन करा");
    expect(text).not.toContain("संचालक");
  });

  it("encodes the text for wa.me", () => {
    expect(whatsappShareUrl("a & b\n*c*")).toBe("https://wa.me/?text=a%20%26%20b%0A*c*");
  });
});
