"use client";

import { callFunction, errorMessage, getFirebase, useAuth, useLiveQuery } from "@swarajya/panel-kit";
import {
  COLLECTIONS,
  hasErrors,
  hasPermission,
  NEWS_LIMITS,
  newsSlug,
  parseYouTubeUrl,
  validateNews,
  youTubeThumbnailUrl,
  type NewsDoc,
  type NewsFieldErrors,
  type NewsStatus,
  type UserDoc,
} from "@swarajya/shared";
import { collection, deleteField, doc, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { selectable, useCategories } from "@/lib/taxonomy";
import { ArticlePreview } from "./ArticlePreview";
import { EditorialHistory } from "./EditorialHistory";
import { LocationPicker } from "./LocationPicker";
import { StatusActions } from "./StatusActions";
import { StatusBadge } from "./StatusBadge";
import { ThumbnailField } from "./ThumbnailField";
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
}

/** Shown in the reporter list when the office writes a story itself. */
const DESK_REPORTER_ID = "DESK";

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
  };
}

function parseTags(raw: string): string[] {
  return [...new Set(raw.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];
}

export function NewsForm({ newsId, news }: { newsId?: string; news: NewsDoc | null }) {
  const router = useRouter();
  const { user, role } = useAuth();
  const uid = user?.uid ?? "";
  const isCreate = !newsId;

  const [form, setForm] = useState<FormState>(() => toForm(news, uid));
  const [saved, setSaved] = useState<FormState>(form);
  const [errors, setErrors] = useState<NewsFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = useCategories();
  const reporters = useLiveQuery<UserDoc & { reporterId?: string }>(
    () => query(collection(getFirebase().db, COLLECTIONS.users), where("role", "==", "REPORTER"), orderBy("fullName")),
    [],
  );

  const status: NewsStatus = news?.status ?? "DRAFT";
  const isEditor = hasPermission(role, "news.editAny");
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const video = form.youtubeUrl.trim() ? parseYouTubeUrl(form.youtubeUrl) : null;
  const videoThumb = video?.ok ? youTubeThumbnailUrl(video.videoId) : undefined;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function validationInput() {
    return { ...form, tags: parseTags(form.tags) };
  }

  function reporterFields() {
    const picked = reporters.data?.find((r) => r.uid === form.reporterUid);
    if (picked) return { reporterUid: picked.uid, reporterId: picked.reporterId ?? "", reporterName: picked.fullName };
    if (form.reporterUid === news?.reporterUid && news) {
      return { reporterUid: news.reporterUid, reporterId: news.reporterId, reporterName: news.reporterName };
    }
    return { reporterUid: uid, reporterId: DESK_REPORTER_ID, reporterName: user?.displayName || user?.email || "Office desk" };
  }

  /** Saves the form; returns the article ID, or null if validation or the write failed. */
  async function save(mode: "draft" | "submit"): Promise<string | null> {
    const fieldErrors = validateNews(validationInput(), mode);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) {
      setMessage({ tone: "error", text: "Please fix the highlighted fields." });
      return null;
    }

    const { db } = getFirebase();
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
    const youtubeUrl = form.youtubeUrl.trim();
    const videoId = video?.ok ? video.videoId : null;
    const editorOnly = isEditor ? { isBreaking: form.isBreaking, isFeatured: form.isFeatured, ...reporterFields() } : {};

    try {
      if (isCreate) {
        const ref = doc(collection(db, COLLECTIONS.news));
        await setDoc(ref, {
          ...content,
          youtubeUrl,
          ...(form.thumbnailUrl ? { thumbnailUrl: form.thumbnailUrl } : {}),
          ...(videoId ? { youtubeVideoId: videoId } : {}),
          isBreaking: false,
          isFeatured: false,
          ...editorOnly,
          newsId: ref.id,
          slug: newsSlug(content.headline),
          status: "DRAFT",
          viewCount: 0,
          createdAt: serverTimestamp(),
        });
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
        ...editorOnly,
      });
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
      if (dirty || to === "SUBMITTED") {
        const id = await save(to === "SUBMITTED" ? "submit" : "draft");
        if (!id) return false;
      }
      const res = await callFunction("transitionNews", { newsId, to, ...(remarks ? { remarks } : {}) });
      const videoNote = res.videoStatus === "UNVERIFIED" ? " The video could not be verified with YouTube; check it manually." : "";
      setMessage({ tone: "ok", text: `Status changed.${videoNote}` });
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const categoryOptions = selectable(categories.data, (c) => c.categoryId === form.categoryId);
  const reporterOptions = selectable(
    reporters.data?.map((r) => ({ ...r, isActive: r.status === "ACTIVE" })) ?? null,
    (r) => r.uid === form.reporterUid,
  );
  const reporterName = reporterFields().reporterName;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>{isCreate ? "Create news" : "Edit news"}</h1>
        <StatusBadge status={status} />
        {news?.isBreaking && <span className="panel-badge" data-tone="danger">Breaking</span>}
        {news?.isFeatured && <span className="panel-badge" data-tone="info">Featured</span>}
        <span className="panel-spacer" />
        {dirty && <span className="panel-muted">Unsaved changes</span>}
        <button type="button" className="panel-secondary" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Back to editing" : "Preview"}
        </button>
        <button type="submit" disabled={busy || (!dirty && !isCreate)}>{busy ? "Saving…" : isCreate ? "Save draft" : "Save"}</button>
      </div>
      {message && (
        <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}

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
              <YouTubeField
                value={form.youtubeUrl}
                onChange={(v) => set("youtubeUrl", v)}
                verifiedStatus={news?.youtubeUrl === form.youtubeUrl ? news?.videoStatus : null}
                locked={status === "PUBLISHED"}
              />
              {errors.youtubeUrl && <span className="panel-field-error">{errors.youtubeUrl}</span>}
            </section>
          )}

          <section className="panel-card panel-form-stack">
            <h2 style={{ margin: 0 }}>Search &amp; sharing</h2>
            <label>
              Tags <span className="panel-hint">comma separated</span>
              <input value={form.tags} onChange={(e) => set("tags", e.target.value)} aria-invalid={!!errors.tags} />
              {errors.tags && <span className="panel-field-error">{errors.tags}</span>}
            </label>
            <label>
              SEO title <span className="panel-hint">optional, defaults to the headline · up to ~60 characters shows fully on Google</span>
              <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={120} />
            </label>
            <label>
              SEO description <span className="panel-hint">optional, defaults to the summary · up to ~160 characters</span>
              <textarea value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={300} style={{ minHeight: 60 }} />
            </label>
          </section>
        </div>

        <aside className="panel-form-stack">
          {!isCreate && (
            <section className="panel-card panel-form-stack">
              <h2 style={{ margin: 0 }}>Workflow</h2>
              <StatusActions
                status={status}
                role={role}
                isAuthor={news?.reporterUid === uid}
                busy={busy}
                onTransition={transition}
              />
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
            {isEditor && (
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
            )}
            {isEditor && (
              <>
                <label className="panel-check">
                  <input type="checkbox" checked={form.isBreaking} onChange={(e) => set("isBreaking", e.target.checked)} />
                  Breaking news
                </label>
                <label className="panel-check">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
                  Feature on homepage
                </label>
              </>
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
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
