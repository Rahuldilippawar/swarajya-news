"use client";

import { errorMessage, getFirebase, useAuth, useCategories } from "@swarajya/panel-kit";
import { COLLECTIONS, hasPermission, taxonomySlug, type CategoryDoc } from "@swarajya/shared";
import { doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState, type FormEvent } from "react";

export default function CategoriesPage() {
  const { role } = useAuth();
  const canEdit = hasPermission(role, "taxonomy.manage");
  const { data: categories, error: loadError } = useCategories();
  const [error, setError] = useState<string | null>(null);

  async function save(c: CategoryDoc, changes: Partial<CategoryDoc>) {
    setError(null);
    try {
      await updateDoc(doc(getFirebase().db, COLLECTIONS.categories, c.categoryId), { ...changes, updatedAt: serverTimestamp() });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Categories</h1>
      {canEdit ? <AddCategory nextOrder={((categories ?? []).at(-1)?.displayOrder ?? 0) + 10} /> : (
        <p className="panel-muted">Only the Super Admin can change categories.</p>
      )}
      {(loadError || error) && <p className="panel-alert" role="alert">{loadError ?? error}</p>}
      {!categories && !loadError && <p className="panel-muted">Loading…</p>}
      {categories && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>English name</th>
                <th>URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.categoryId}>
                  <td style={{ width: 90 }}>
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={c.displayOrder}
                        aria-label={`Display order for ${c.name}`}
                        onBlur={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          if (Number.isFinite(value) && value !== c.displayOrder) void save(c, { displayOrder: value });
                        }}
                      />
                    ) : c.displayOrder}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        defaultValue={c.name}
                        maxLength={60}
                        aria-label={`Name for ${c.categoryId}`}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value && value !== c.name) void save(c, { name: value });
                        }}
                      />
                    ) : c.name}
                  </td>
                  <td>{c.nameEn ?? "—"}</td>
                  <td><code>/category/{c.slug}</code></td>
                  <td>
                    {canEdit ? (
                      <label className="panel-check">
                        <input type="checkbox" checked={c.isActive} onChange={(e) => save(c, { isActive: e.target.checked })} />
                        {c.isActive ? "Active" : "Inactive"}
                      </label>
                    ) : c.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={5} className="panel-muted">No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AddCategory({ nextOrder }: { nextOrder: number }) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = taxonomySlug(name, nameEn);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setBusy(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const ref = doc(db, COLLECTIONS.categories, slug);
      // The slug is the document ID, so creating inside a transaction guarantees it is unique.
      await runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) throw new Error(`A category with the URL /category/${slug} already exists.`);
        tx.set(ref, {
          categoryId: slug,
          slug,
          name: name.trim(),
          ...(nameEn.trim() ? { nameEn: nameEn.trim() } : {}),
          isActive: true,
          displayOrder: nextOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      setName("");
      setNameEn("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2>Add category</h2>
      <form className="panel-form" onSubmit={onSubmit}>
        <label>
          Name (Marathi)
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="राजकारण" />
        </label>
        <label>
          English name <span className="panel-hint">used for the URL</span>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={60} placeholder="Politics" />
        </label>
        <div className="panel-field">
          URL
          <code className="panel-hint">/category/{slug || "…"}</code>
        </div>
        <button type="submit" disabled={busy || !slug}>{busy ? "Adding…" : "Add category"}</button>
      </form>
      {error && <p className="panel-alert" role="alert">{error}</p>}
    </section>
  );
}
