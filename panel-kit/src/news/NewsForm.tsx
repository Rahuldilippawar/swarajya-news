"use client";

import {
  AUTHOR_EDITABLE_STATUSES,
  COLLECTIONS,
  hasErrors,
  hasPermission,
  NEWS_LIMITS,
  NEWS_PRIVATE_SUBCOLLECTION,
  newsSlug,
  parseYouTubeUrl,
  SOURCE_NOTES_DOC_ID,
  validateNews,
  youTubeThumbnailUrl,
  type NewsDoc,
  type NewsFieldErrors,
  type NewsStatus,
  type SourceNotesDoc,
  type UserDoc,
} from "@swarajya/shared";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import { getFirebase } from "../firebase";
import { callFunction, errorMessage } from "../functions";
import { selectable, useCategories } from "../taxonomy";
import { useLiveDoc, useLiveQuery } from "../useLiveQuery";
import { ArticlePreview } from "./ArticlePreview";
import { EditorialHistory } from "./EditorialHistory";
import { LocationPicker } from "./LocationPicker";
import { StatusActions } from "./StatusActions";
import { StatusBadge } from "./StatusBadge";
import { ThumbnailField } from "./ThumbnailField";
import { WhatsAppShare } from "./WhatsAppShare";
import { YouTubeField } from "./YouTubeField";

interface FormState {
  headline: string;
  summary: string;
  content: string;
  categoryId: string;
  districtId: string;
  talukaId: string;
  villageId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  isBreaking: boolean;
  isFeatured: boolean;
  reporterUid: string;
  /** `datetime-local` value in the browser's time zone, or "". */
  eventAt: string;
  /** Private; stored in news/{id}/private/sourceNotes, never on the public article. */
  sourceNotes: string;
}

type Profile = Pick<UserDoc, "fullName" | "assignedLocations"> & { reporterId?: string | null };

/** Shown in the reporter list when the office writes a story itself. */
const DESK_REPORTER_ID = "DESK";

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalInput(date: Date | undefined): string {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toForm(news: NewsDoc | null, fallbackReporterUid: string): FormState {
  return {
    headline: news?.headline ?? "",
    summary: news?.summary ?? "",
    content: news?.content ?? "",
    categoryId: news?.categoryId ?? "",
    districtId: news?.districtId ?? "",
    talukaId: news?.talukaId ?? "",
    villageId: news?.villageId ?? "",
    youtubeUrl: news?.youtubeUrl ?? "",
    thumbnailUrl: news?.thumbnailUrl ?? "",
    tags: (news?.tags ?? []).join(", "),
    seoTitle: news?.seoTitle ?? "",
    seoDescription: news?.seoDescription ?? "",
    isBreaking: news?.isBreaking ?? false,
    isFeatured: news?.isFeatured ?? false,
    reporterUid: news?.reporterUid ?? fallbackReporterUid,
    eventAt: toLocalInput(news?.eventAt?.toDate()),
    sourceNotes: "",
  };
}

function parseTags(raw: string): string[] {
  return [...new Set(raw.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];
}

/**
 * Create/edit form for one article, used by both panels. Editors get the
 * reporter picker, breaking/featured flags and SEO fields; reporters can edit
 * only their own articles, and only while they are drafts or returned for changes.
 */
export function NewsForm({ newsId, news }: { newsId?: string; news: NewsDoc | null }) {
  const router = useRouter();
  const { user, role } = useAuth();
  const uid = user?.uid ?? "";
  const isCreate = !newsId;
  const isEditor = hasPermission(role, "news.editAny");
  const status: NewsStatus = news?.status ?? "DRAFT";
  const isAuthor = isCreate || news?.reporterUid === uid;
  const readOnly = !isEditor && !AUTHOR_EDITABLE_STATUSES.includes(status);

  const [form, setForm] = useState<FormState>(() => toForm(news, uid));
  const [saved, setSaved] = useState<FormState>(form);
  const [errors, setErrors] = useState<NewsFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { db } = getFirebase();
  const categories = useCategories();
  const reporters = useLiveQuery<UserDoc & { reporterId?: string }>(
    () => (isEditor ? query(collection(db, COLLECTIONS.users), where("role", "==", "REPORTER"), orderBy("fullName")) : null),
    [isEditor],
  );
  const profile = useLiveDoc<Profile>(() => (uid ? doc(db, COLLECTIONS.users, uid) : null), [uid]);
  const notesDoc = useLiveDoc<SourceNotesDoc>(
    () => (newsId ? doc(db, COLLECTIONS.news, newsId, NEWS_PRIVATE_SUBCOLLECTION, SOURCE_NOTES_DOC_ID) : null),
    [newsId],
  );

  // Fill in values that load after the form opens, without overwriting anything the user has typed.
  const loadedNotes = notesDoc.exists === null ? null : (notesDoc.data?.notes ?? "");
  useEffect(() => {
    if (loadedNotes === null) return;
    setForm((f) => (f.sourceNotes ? f : { ...f, sourceNotes: loadedNotes }));
    setSaved((s) => ({ ...s, sourceNotes: loadedNotes }));
  }, [loadedNotes]);
  const defaultDistrict = isCreate && !isEditor ? profile.data?.assignedLocations?.[0] : undefined;
  useEffect(() => {
    if (defaultDistrict) setForm((f) => (f.districtId ? f : { ...f, districtId: defaultDistrict }));
  }, [defaultDistrict]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const video = form.youtubeUrl.trim() ? parseYouTubeUrl(form.youtubeUrl) : null;
  const videoThumb = video?.ok ? youTubeThumbnailUrl(video.videoId) : undefined;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function reporterFields() {
    if (!isEditor) {
      // Reporters always file under their own name and ID.
      return { reporterUid: uid, reporterId: profile.data?.reporterId ?? "", reporterName: profile.data?.fullName ?? user?.email ?? "" };
    }
    const picked = reporters.data?.find((r) => r.uid === form.reporterUid);
    if (picked) return { reporterUid: picked.uid, reporterId: picked.reporterId ?? "", reporterName: picked.fullName };
    if (form.reporterUid === news?.reporterUid && news) {
      return { reporterUid: news.reporterUid, reporterId: news.reporterId, reporterName: news.reporterName };
    }
    return { reporterUid: uid, reporterId: DESK_REPORTER_ID, reporterName: user?.displayName || user?.email || "Office desk" };
  }

  async function saveNotes(id: string) {
    if (form.sourceNotes === saved.sourceNotes) return;
    await setDoc(doc(db, COLLECTIONS.news, id, NEWS_PRIVATE_SUBCOLLECTION, SOURCE_NOTES_DOC_ID), {
      notes: form.sourceNotes.trim(),
      updatedAt: serverTimestamp(),
    });
  }

  /** Saves the form; returns the article ID, or null if validation or the write failed. */
  async function save(mode: "draft" | "submit"): Promise<string | null> {
    const fieldErrors = validateNews({ ...form, tags: parseTags(form.tags) }, mode);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) {
      setMessage({ tone: "error", text: "Please fix the highlighted fields." });
      return null;
    }
    if (!isEditor && isCreate && !profile.data) {
      setMessage({ tone: "error", text: "Your profile is still loading. Please try again in a moment." });
      return null;
    }

    const content = {
      headline: form.headline.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId,
      districtId: form.districtId,
      talukaId: form.talukaId,
      villageId: form.villageId,
      tags: parseTags(form.tags),
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      updatedAt: serverTimestamp(),
    };
    const eventAt = form.eventAt ? Timestamp.fromDate(new Date(form.eventAt)) : null;
    const youtubeUrl = form.youtubeUrl.trim();
    const videoId = video?.ok ? video.videoId : null;
    const editorOnly = isEditor ? { isBreaking: form.isBreaking, isFeatured: form.isFeatured } : {};

    try {
      if (isCreate) {
        const ref = doc(collection(db, COLLECTIONS.news));
        await setDoc(ref, {
          ...content,
          youtubeUrl,
          ...(form.thumbnailUrl ? { thumbnailUrl: form.thumbnailUrl } : {}),
          ...(videoId ? { youtubeVideoId: videoId } : {}),
          ...(eventAt ? { eventAt } : {}),
          isBreaking: false,
          isFeatured: false,
          ...editorOnly,
          ...reporterFields(),
          newsId: ref.id,
          slug: newsSlug(content.headline),
          status: "DRAFT",
          viewCount: 0,
          createdAt: serverTimestamp(),
        });
        await saveNotes(ref.id);
        setSaved(form);
        router.replace(`/news/${ref.id}/edit`);
        return ref.id;
      }

      // A published article's video is locked by the Security Rules; never send it.
      const videoFields = status === "PUBLISHED" ? {} : { youtubeUrl, youtubeVideoId: videoId ?? deleteField() };
      await updateDoc(doc(db, COLLECTIONS.news, newsId), {
        ...content,
        ...videoFields,
        thumbnailUrl: form.thumbnailUrl || deleteField(),
        eventAt: eventAt ?? deleteField(),
        ...editorOnly,
        ...(isEditor ? reporterFields() : {}),
      });
      await saveNotes(newsId);
      setSaved(form);
      setMessage({ tone: "ok", text: "Saved." });
      return newsId;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
      return null;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    await save("draft");
    setBusy(false);
  }

  async function transition(to: NewsStatus, remarks?: string): Promise<boolean> {
    if (!newsId) return false;
    setBusy(true);
    setMessage(null);
    try {
      if (!readOnly && (dirty || to === "SUBMITTED")) {
        const id = await save(to === "SUBMITTED" ? "submit" : "draft");
        if (!id) return false;
      }
      const res = await callFunction("transitionNews", { newsId, to, ...(remarks ? { remarks } : {}) });
      const videoNote = res.videoStatus === "UNVERIFIED" ? " The video could not be verified with YouTube; check it manually." : "";
      const text = to === "SUBMITTED" && !isEditor ? "Submitted to the editor for review." : "Status changed.";
      setMessage({ tone: "ok", text: `${text}${videoNote}` });
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!newsId || !window.confirm("Delete this draft permanently?")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.news, newsId));
      router.replace("/news");
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
      setBusy(false);
    }
  }

  const categoryOptions = selectable(categories.data, (c) => c.categoryId === form.categoryId);
  const reporterOptions = selectable(
    reporters.data?.map((r) => ({ ...r, isActive: r.status === "ACTIVE" })) ?? null,
    (r) => r.uid === form.reporterUid,
  );
  const reporterName = reporterFields().reporterName;
  const returned = news?.lastReview && (status === "CHANGES_REQUESTED" || status === "REJECTED") ? news.lastReview : null;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>{isCreate ? "Create news" : readOnly ? "View news" : "Edit news"}</h1>
        <StatusBadge status={status} />
        {news?.isBreaking && <span className="panel-badge" data-tone="danger">Breaking</span>}
        {news?.isFeatured && <span className="panel-badge" data-tone="info">Featured</span>}
        <span className="panel-spacer" />
        {dirty && !readOnly && <span className="panel-muted">Unsaved changes</span>}
        <button type="button" className="panel-secondary" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Back to editing" : "Preview"}
        </button>
        {!readOnly && (
          <button type="submit" disabled={busy || (!dirty && !isCreate)}>{busy ? "Saving…" : isCreate ? "Save draft" : "Save"}</button>
        )}
      </div>
      {message && (
        <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      {returned && (
        <div className="panel-callout panel-section" role="note" data-tone={status === "REJECTED" ? "danger" : "warn"}>
          <strong>{status === "REJECTED" ? "Rejected by the editor" : "The editor asked for changes"}</strong>
          {returned.remarks && <p style={{ margin: "6px 0 0" }}>“{returned.remarks}”</p>}
          {status === "CHANGES_REQUESTED" && !isEditor && (
            <p className="panel-hint" style={{ margin: "6px 0 0" }}>Make the corrections, then choose “Submit for approval”.</p>
          )}
        </div>
      )}
      {readOnly && !returned && (
        <p className="panel-callout panel-section" role="note">
          {status === "PUBLISHED"
            ? "This news is published. Contact the editor if something needs correcting."
            : "This news is with the editor. You can edit it again if it is returned for changes."}
        </p>
      )}

      <fieldset disabled={readOnly || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="panel-editor">
          <div className="panel-form-stack">
            {showPreview ? (
              <ArticlePreview
                headline={form.headline}
                summary={form.summary}
                content={form.content}
                youtubeUrl={form.youtubeUrl}
                thumbnailUrl={form.thumbnailUrl || videoThumb}
                meta={[reporterName, categoryOptions.find((c) => c.categoryId === form.categoryId)?.name].filter(Boolean).join(" · ")}
              />
            ) : (
              <section className="panel-card panel-form-stack">
                <label>
                  Headline
                  <input
                    value={form.headline}
                    onChange={(e) => set("headline", e.target.value)}
                    maxLength={NEWS_LIMITS.headline.max}
                    aria-invalid={!!errors.headline}
                  />
                  <span className="panel-hint">{form.headline.trim().length}/{NEWS_LIMITS.headline.max}</span>
                  {errors.headline && <span className="panel-field-error">{errors.headline}</span>}
                </label>
                <label>
                  Summary
                  <textarea
                    value={form.summary}
                    onChange={(e) => set("summary", e.target.value)}
                    maxLength={NEWS_LIMITS.summary.max}
                    style={{ minHeight: 80 }}
                    aria-invalid={!!errors.summary}
                  />
                  <span className="panel-hint">{form.summary.trim().length}/{NEWS_LIMITS.summary.max} · shown in lists and when shared</span>
                  {errors.summary && <span className="panel-field-error">{errors.summary}</span>}
                </label>
                <label>
                  Full article
                  <textarea
                    value={form.content}
                    onChange={(e) => set("content", e.target.value)}
                    maxLength={NEWS_LIMITS.content.max}
                    style={{ minHeight: 280 }}
                    aria-invalid={!!errors.content}
                  />
                  <span className="panel-hint">Leave a blank line between paragraphs.</span>
                  {errors.content && <span className="panel-field-error">{errors.content}</span>}
                </label>
                <LocationPicker
                  value={{ districtId: form.districtId, talukaId: form.talukaId, villageId: form.villageId }}
                  onChange={(v) => setForm((f) => ({ ...f, ...v }))}
                  error={errors.districtId}
                />
                <label>
                  News date &amp; time <span className="panel-hint">when the event happened · optional</span>
                  <input type="datetime-local" value={form.eventAt} onChange={(e) => set("eventAt", e.target.value)} />
                </label>
                <YouTubeField
                  value={form.youtubeUrl}
                  onChange={(v) => set("youtubeUrl", v)}
                  verifiedStatus={news?.youtubeUrl === form.youtubeUrl ? news?.videoStatus : null}
                  locked={status === "PUBLISHED" && isEditor}
                />
                {errors.youtubeUrl && <span className="panel-field-error">{errors.youtubeUrl}</span>}
              </section>
            )}

            <section className="panel-card panel-form-stack">
              <h2 style={{ margin: 0 }}>{isEditor ? "Search & sharing" : "Tags & notes"}</h2>
              <label>
                Tags <span className="panel-hint">comma separated</span>
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} aria-invalid={!!errors.tags} />
                {errors.tags && <span className="panel-field-error">{errors.tags}</span>}
              </label>
              {isEditor && (
                <>
                  <label>
                    SEO title <span className="panel-hint">optional, defaults to the headline · up to ~60 characters shows fully on Google</span>
                    <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={120} />
                  </label>
                  <label>
                    SEO description <span className="panel-hint">optional, defaults to the summary · up to ~160 characters</span>
                    <textarea
                      value={form.seoDescription}
                      onChange={(e) => set("seoDescription", e.target.value)}
                      maxLength={300}
                      style={{ minHeight: 60 }}
                    />
                  </label>
                </>
              )}
              <label>
                Source notes <span className="panel-hint">private — only you and the editors can see this; never published</span>
                <textarea
                  value={form.sourceNotes}
                  onChange={(e) => set("sourceNotes", e.target.value)}
                  maxLength={2000}
                  style={{ minHeight: 70 }}
                  disabled={isCreate ? false : notesDoc.exists === null && !notesDoc.error}
                />
              </label>
            </section>
          </div>

          <aside className="panel-form-stack">
            {!isCreate && (
              <section className="panel-card panel-form-stack">
                <h2 style={{ margin: 0 }}>Workflow</h2>
                <StatusActions status={status} role={role} isAuthor={isAuthor} busy={busy} onTransition={transition} />
                {status === "PUBLISHED" && hasPermission(role, "notifications.send") && (
                  <a href={`/notifications?newsId=${newsId}`} className="panel-hint">Send a push notification →</a>
                )}
                {status === "PUBLISHED" && hasPermission(role, "whatsapp.send") && (
                  <a href={`/whatsapp?newsId=${newsId}`} className="panel-hint">WhatsApp bulletin to subscribers →</a>
                )}
                {status === "PUBLISHED" && news && (hasPermission(role, "whatsapp.send") || hasPermission(role, "notifications.send")) && (
                  <WhatsAppShare article={{ headline: news.headline, slug: news.slug, youtubeUrl: news.youtubeUrl }} />
                )}
                {!isEditor && status === "DRAFT" && (
                  <button type="button" className="panel-link" style={{ alignSelf: "flex-start" }} onClick={deleteDraft}>
                    Delete draft
                  </button>
                )}
              </section>
            )}
            <section className="panel-card panel-form-stack">
              <label>
                Category
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!errors.categoryId}>
                  <option value="">Select category</option>
                  {categoryOptions.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <span className="panel-field-error">{errors.categoryId}</span>}
              </label>
              {isEditor ? (
                <>
                  <label>
                    Reporter
                    <select value={form.reporterUid} onChange={(e) => set("reporterUid", e.target.value)}>
                      <option value={uid}>Office desk (you)</option>
                      {news && news.reporterUid !== uid && !reporterOptions.some((r) => r.uid === news.reporterUid) && (
                        <option value={news.reporterUid}>{news.reporterName}</option>
                      )}
                      {reporterOptions.map((r) => (
                        <option key={r.uid} value={r.uid}>{r.fullName}{r.reporterId ? ` (${r.reporterId})` : ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="panel-check">
                    <input type="checkbox" checked={form.isBreaking} onChange={(e) => set("isBreaking", e.target.checked)} />
                    Breaking news
                  </label>
                  <label className="panel-check">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
                    Feature on homepage
                  </label>
                </>
              ) : (
                <div className="panel-field">
                  Reporter
                  <span className="panel-hint">{reporterName}{profile.data?.reporterId ? ` (${profile.data.reporterId})` : ""}</span>
                </div>
              )}
            </section>
            <section className="panel-card">
              <ThumbnailField value={form.thumbnailUrl} fallback={videoThumb} onChange={(v) => set("thumbnailUrl", v)} />
              {errors.thumbnailUrl && <span className="panel-field-error">{errors.thumbnailUrl}</span>}
            </section>
            {!isCreate && newsId && (
              <section className="panel-card">
                <h2 style={{ marginTop: 0 }}>Editorial history</h2>
                <EditorialHistory newsId={newsId} />
                {hasPermission(role, "auditLogs.view") && (
                  <p className="panel-hint" style={{ marginBottom: 0 }}>
                    <a href={`/audit-log?target=${newsId}`}>Full audit trail</a>
                  </p>
                )}
              </section>
            )}
          </aside>
        </div>
      </fieldset>
    </form>
  );
}
