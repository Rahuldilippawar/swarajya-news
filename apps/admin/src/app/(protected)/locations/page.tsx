"use client";

import { errorMessage, getFirebase, useAuth } from "@swarajya/panel-kit";
import {
  CHILD_LOCATION_TYPE,
  COLLECTIONS,
  hasPermission,
  LOCATION_TYPE_LABELS,
  taxonomySlug,
  type LocationDoc,
  type LocationType,
} from "@swarajya/shared";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useState, type FormEvent } from "react";
import { useChildLocations } from "@/lib/taxonomy";

const PLURAL: Record<LocationType, string> = { STATE: "States", DISTRICT: "Districts", TALUKA: "Talukas", VILLAGE: "Villages / Cities" };

export default function LocationsPage() {
  const { role } = useAuth();
  const canEdit = hasPermission(role, "taxonomy.manage");
  // Path from the root to the location whose children are shown.
  const [path, setPath] = useState<LocationDoc[]>([]);
  const parent = path.at(-1) ?? null;
  const childType: LocationType | null = parent ? CHILD_LOCATION_TYPE[parent.type] : "STATE";
  const { data: children, error: loadError } = useChildLocations(parent?.locationId ?? null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(loc: LocationDoc, isActive: boolean) {
    setError(null);
    try {
      await updateDoc(doc(getFirebase().db, COLLECTIONS.locations, loc.locationId), { isActive, updatedAt: serverTimestamp() });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Locations</h1>
      <nav className="panel-breadcrumb" aria-label="Location path">
        <button type="button" onClick={() => setPath([])}>All states</button>
        {path.map((loc, i) => (
          <span key={loc.locationId}>
            › <button type="button" onClick={() => setPath(path.slice(0, i + 1))}>{loc.name}</button>
          </span>
        ))}
      </nav>

      {/* Keyed by parent so a save finishing after navigation cannot clear the next level's form. */}
      {canEdit && childType && (
        <AddLocation key={parent?.locationId ?? "root"} parent={parent} type={childType} siblings={children ?? []} />
      )}
      {(loadError || error) && <p className="panel-alert" role="alert">{loadError ?? error}</p>}
      {!children && !loadError && <p className="panel-muted">Loading…</p>}

      {children && childType && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>{LOCATION_TYPE_LABELS[childType]}</th>
                <th>English name</th>
                <th>Slug</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {children.map((loc) => (
                <tr key={loc.locationId}>
                  <td>{loc.name}</td>
                  <td>{loc.nameEn ?? "—"}</td>
                  <td><code>{loc.slug}</code></td>
                  <td>
                    {canEdit ? (
                      <label className="panel-check">
                        <input type="checkbox" checked={loc.isActive} onChange={(e) => toggle(loc, e.target.checked)} />
                        {loc.isActive ? "Active" : "Inactive"}
                      </label>
                    ) : loc.isActive ? "Active" : "Inactive"}
                  </td>
                  <td>
                    {CHILD_LOCATION_TYPE[loc.type] && (
                      <button type="button" className="panel-secondary" onClick={() => setPath([...path, loc])}>
                        {PLURAL[CHILD_LOCATION_TYPE[loc.type]!]} ›
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {children.length === 0 && (
                <tr><td colSpan={5} className="panel-muted">No {PLURAL[childType].toLowerCase()} added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AddLocation({ parent, type, siblings }: { parent: LocationDoc | null; type: LocationType; siblings: LocationDoc[] }) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = taxonomySlug(name, nameEn);
  const label = LOCATION_TYPE_LABELS[type];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setError(null);
    if (siblings.some((s) => s.slug === slug)) {
      setError(`A ${label.toLowerCase()} with the slug "${slug}" already exists here.`);
      return;
    }
    setBusy(true);
    try {
      const { db } = getFirebase();
      const col = collection(db, COLLECTIONS.locations);
      // District slugs appear in public URLs (/district/<slug>), so they must be unique across all districts.
      if (type === "DISTRICT") {
        const clash = await getDocs(query(col, where("type", "==", "DISTRICT"), where("slug", "==", slug), limit(1)));
        if (!clash.empty) throw new Error(`Another district already uses the URL /district/${slug}. Change the English name.`);
      }
      const ref = doc(col);
      await setDoc(ref, {
        locationId: ref.id,
        name: name.trim(),
        ...(nameEn.trim() ? { nameEn: nameEn.trim() } : {}),
        slug,
        type,
        parentLocationId: parent?.locationId ?? null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
      <h2>Add {label.toLowerCase()}{parent ? ` in ${parent.name}` : ""}</h2>
      <form className="panel-form" onSubmit={onSubmit}>
        <label>
          Name (Marathi)
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>
        <label>
          English name <span className="panel-hint">optional, used for the slug</span>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={80} />
        </label>
        <div className="panel-field">
          Slug
          <code className="panel-hint">{slug || "…"}</code>
        </div>
        <button type="submit" disabled={busy || !slug}>{busy ? "Adding…" : `Add ${label.toLowerCase()}`}</button>
      </form>
      {error && <p className="panel-alert" role="alert">{error}</p>}
    </section>
  );
}
