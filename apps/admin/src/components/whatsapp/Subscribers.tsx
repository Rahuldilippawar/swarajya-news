"use client";

import { callFunction, errorMessage, formatDateTime, getFirebase, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, normalizePhone, subscriberId, WHATSAPP_GROUP_ALL, type WhatsAppSubscriberDoc, type WhatsAppSubscriberEntry } from "@swarajya/shared";
import { collection, doc, getCountFromServer, getDoc, limit, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";

type District = { locationId: string; name: string; nameEn?: string; slug: string; isActive: boolean };

/** Shared consent fields: every addition must say how the people agreed. */
function ConsentFields({ source, setSource, confirmed, setConfirmed }: { source: string; setSource: (v: string) => void; confirmed: boolean; setConfirmed: (v: boolean) => void }) {
  return (
    <>
      <label>
        How did they agree? <span className="panel-hint">required — e.g. “Signed form at Pune office, 17 Oct”, “Replied YES to our WhatsApp message”</span>
        <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={200} required />
      </label>
      <label className="panel-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I confirm these people agreed to receive Swarajya News bulletins on WhatsApp.
      </label>
    </>
  );
}

export function Subscribers({ districts }: { districts: District[] }) {
  const { db } = getFirebase();
  const [counts, setCounts] = useState<{ subscribed: number; optedOut: number } | null>(null);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<"SUBSCRIBED" | "OPTED_OUT">("SUBSCRIBED");
  const list = useLiveQuery<WhatsAppSubscriberDoc>(
    () => query(collection(db, COLLECTIONS.whatsappSubscribers), where("status", "==", status), orderBy("createdAt", "desc"), limit(50)),
    [status],
  );
  const districtName = new Map(districts.map((d) => [d.locationId, d.name]));

  useEffect(() => {
    const col = collection(db, COLLECTIONS.whatsappSubscribers);
    Promise.all([
      getCountFromServer(query(col, where("status", "==", "SUBSCRIBED"))),
      getCountFromServer(query(col, where("status", "==", "OPTED_OUT"))),
    ])
      .then(([a, b]) => setCounts({ subscribed: a.data().count, optedOut: b.data().count }))
      .catch(() => setCounts(null));
  }, [db, version]);

  return (
    <>
      <div className="panel-stats panel-section">
        <div className="panel-card"><span className="panel-muted">Subscribed</span><strong>{counts?.subscribed ?? "…"}</strong></div>
        <div className="panel-card"><span className="panel-muted">Opted out</span><strong>{counts?.optedOut ?? "…"}</strong></div>
      </div>
      <AddSubscriber districts={districts} onDone={() => setVersion((v) => v + 1)} />
      <BulkImport districts={districts} onDone={() => setVersion((v) => v + 1)} />
      <FindSubscriber onDone={() => setVersion((v) => v + 1)} />
      <section className="panel-section">
        <div className="panel-row panel-section">
          <h2 style={{ margin: 0 }}>Latest subscribers</h2>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
            <option value="SUBSCRIBED">Subscribed</option>
            <option value="OPTED_OUT">Opted out</option>
          </select>
        </div>
        {list.error && <p className="panel-alert">{list.error}</p>}
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr><th>Phone</th><th>Name</th><th>Groups</th><th>Consent</th><th>Added</th></tr>
            </thead>
            <tbody>
              {list.data?.map((s) => (
                <tr key={s.phone}>
                  <td><code>{s.phone}</code></td>
                  <td>{s.name ?? "—"}</td>
                  <td>{s.groups.map((g) => (g === WHATSAPP_GROUP_ALL ? "All" : districtName.get(g) ?? g)).join(", ")}</td>
                  <td className="panel-hint">{s.consent?.source}</td>
                  <td>{formatDateTime(s.createdAt?.toDate())}</td>
                </tr>
              ))}
              {list.data?.length === 0 && <tr><td colSpan={5} className="panel-muted">None.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AddSubscriber({ districts, onDone }: { districts: District[]; onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const normalized = phone.trim() ? normalizePhone(phone) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!normalized || !confirmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await callFunction("addWhatsAppSubscribers", {
        consentSource: source.trim(),
        entries: [{ phone: normalized, ...(name.trim() ? { name: name.trim() } : {}), ...(districtId ? { districtIds: [districtId] } : {}) }],
      });
      setMessage(
        res.skippedOptedOut
          ? { tone: "error", text: "This number opted out earlier. Re-subscribe it below only if they agreed again." }
          : { tone: "ok", text: res.added ? `${normalized} added.` : `${normalized} updated.` },
      );
      setPhone("");
      setName("");
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2 style={{ marginTop: 0 }}>Add a subscriber</h2>
      <form className="panel-form-stack" onSubmit={onSubmit}>
        <div className="panel-form">
          <label>
            Mobile number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" aria-invalid={!!phone.trim() && !normalized} />
            {phone.trim() && <span className={normalized ? "panel-hint" : "panel-field-error"}>{normalized ?? "Not a valid mobile number"}</span>}
          </label>
          <label>
            Name <span className="panel-hint">optional</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </label>
          <label>
            District bulletins <span className="panel-hint">optional</span>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Only “all subscribers” bulletins</option>
              {districts.filter((d) => d.isActive).map((d) => (
                <option key={d.locationId} value={d.locationId}>{d.name}</option>
              ))}
            </select>
          </label>
        </div>
        <ConsentFields source={source} setSource={setSource} confirmed={confirmed} setConfirmed={setConfirmed} />
        <button type="submit" disabled={busy || !normalized || !confirmed || source.trim().length < 3}>{busy ? "Adding…" : "Add subscriber"}</button>
        {message && <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>{message.text}</p>}
      </form>
    </section>
  );
}

/** "phone, name, district" per line; district may be the Marathi or English name. */
function parseLines(text: string, districts: District[]): { entries: WhatsAppSubscriberEntry[]; unknownDistricts: string[] } {
  const byName = new Map<string, string>();
  for (const d of districts) for (const key of [d.name, d.nameEn, d.slug, d.locationId]) if (key) byName.set(key.trim().toLowerCase(), d.locationId);
  const unknownDistricts: string[] = [];
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t]/).map((c) => c.trim()))
    .filter(([phone]) => phone && !/^phone$/i.test(phone))
    .map(([phone, name, district]) => {
      const id = district ? byName.get(district.toLowerCase()) : undefined;
      if (district && !id) unknownDistricts.push(district);
      return { phone: phone!, ...(name ? { name } : {}), ...(id ? { districtIds: [id] } : {}) };
    });
  return { entries, unknownDistricts };
}

function BulkImport({ districts, onDone }: { districts: District[]; onDone: () => void }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { entries, unknownDistricts } = parseLines(text, districts);

  async function onImport() {
    if (!entries.length || !confirmed) return;
    if (entries.length > 500) {
      setMessage({ tone: "error", text: "Import at most 500 lines at a time." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await callFunction("addWhatsAppSubscribers", { consentSource: source.trim(), entries });
      setMessage({
        tone: res.invalid.length ? "error" : "ok",
        text: `${res.added} added, ${res.updated} updated, ${res.skippedOptedOut} skipped (opted out).${res.invalid.length ? ` Invalid numbers: ${res.invalid.join(", ")}` : ""}`,
      });
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <details>
        <summary><strong>Import a list</strong> <span className="panel-hint">one per line: number, name, district</span></summary>
        <div className="panel-form-stack" style={{ marginTop: 12 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"9876543210, Ramesh Patil, पुणे\n9822012345, , Nashik"} style={{ minHeight: 120, fontFamily: "monospace" }} aria-label="Subscriber list" />
          <span className="panel-hint">
            {entries.length} lines{unknownDistricts.length ? ` · unknown districts (ignored): ${[...new Set(unknownDistricts)].join(", ")}` : ""}
          </span>
          <ConsentFields source={source} setSource={setSource} confirmed={confirmed} setConfirmed={setConfirmed} />
          <button type="button" onClick={onImport} disabled={busy || !entries.length || !confirmed || source.trim().length < 3}>
            {busy ? "Importing…" : `Import ${entries.length} subscribers`}
          </button>
          {message && <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>{message.text}</p>}
        </div>
      </details>
    </section>
  );
}

function FindSubscriber({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<WhatsAppSubscriberDoc | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function find(e?: FormEvent) {
    e?.preventDefault();
    setMessage(null);
    const n = normalizePhone(phone);
    if (!n) {
      setMessage("Not a valid mobile number.");
      return;
    }
    const snap = await getDoc(doc(getFirebase().db, COLLECTIONS.whatsappSubscribers, subscriberId(n)));
    setFound(snap.exists() ? (snap.data() as WhatsAppSubscriberDoc) : null);
  }

  async function change(status: "SUBSCRIBED" | "OPTED_OUT") {
    if (!found) return;
    let consentSource: string | undefined;
    if (status === "SUBSCRIBED") {
      consentSource = window.prompt("How did they agree to receive bulletins again?")?.trim();
      if (!consentSource) return;
    } else if (!window.confirm(`Stop sending bulletins to ${found.phone}?`)) {
      return;
    }
    setBusy(true);
    try {
      await callFunction("setWhatsAppSubscriberStatus", { phone: found.phone, status, ...(consentSource ? { consentSource } : {}) });
      await find();
      onDone();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2 style={{ marginTop: 0 }}>Find a number</h2>
      <form className="panel-row" onSubmit={find}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" aria-label="Number to find" inputMode="tel" />
        <button type="submit" className="panel-secondary">Find</button>
      </form>
      {message && <p className="panel-alert" role="alert">{message}</p>}
      {found === null && <p className="panel-muted">Not subscribed.</p>}
      {found && (
        <p className="panel-row" style={{ marginTop: 12 }}>
          <code>{found.phone}</code> {found.name}
          <span className="panel-badge" data-tone={found.status === "SUBSCRIBED" ? "ok" : "muted"}>{found.status === "SUBSCRIBED" ? "Subscribed" : "Opted out"}</span>
          <span className="panel-hint">Consent: {found.consent?.source}</span>
          {found.status === "SUBSCRIBED" ? (
            <button type="button" className="panel-danger" disabled={busy} onClick={() => change("OPTED_OUT")}>Opt out</button>
          ) : (
            <button type="button" className="panel-secondary" disabled={busy} onClick={() => change("SUBSCRIBED")}>Re-subscribe…</button>
          )}
        </p>
      )}
    </section>
  );
}
