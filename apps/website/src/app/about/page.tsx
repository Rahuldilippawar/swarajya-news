import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "आमच्याबद्दल",
  description: `About ${SITE.name}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="prose">
      <h1>आमच्याबद्दल</h1>
      <p>
        {SITE.nameMarathi} ({SITE.name}) ही जिल्हा, तालुका आणि गावपातळीवरील बातम्या आपल्यापर्यंत पोहोचवणारी स्वतंत्र
        मराठी वृत्तवाहिनी आहे.
      </p>
      <p>
        आमचे व्हिडिओ वृत्तांत <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer">YouTube चॅनेलवर</a>{" "}
        पाहा.
      </p>
    </article>
  );
}
