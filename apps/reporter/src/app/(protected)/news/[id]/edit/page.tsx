"use client";

import { getFirebase, NewsForm, useLiveDoc } from "@swarajya/panel-kit";
import { COLLECTIONS, type NewsDoc } from "@swarajya/shared";
import { doc } from "firebase/firestore";
import { useParams } from "next/navigation";

export default function EditNewsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, exists } = useLiveDoc<NewsDoc>(() => doc(getFirebase().db, COLLECTIONS.news, id), [id]);

  if (error) return <p className="panel-alert" role="alert">{error}</p>;
  if (exists === false) return <p className="panel-alert" role="alert">This news article does not exist.</p>;
  if (!data) return <p className="panel-muted">Loading…</p>;
  // The form keeps its own copy of the fields; the live document supplies status, video checks and history.
  return <NewsForm key={id} newsId={id} news={data} />;
}
