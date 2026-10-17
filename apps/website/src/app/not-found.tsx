import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose">
      <h1>पान सापडले नाही</h1>
      <p>आपण शोधत असलेले पान उपलब्ध नाही किंवा हलवले गेले आहे.</p>
      <p><Link href="/">मुख्यपृष्ठावर जा</Link></p>
    </div>
  );
}
