"use client";

import { selectable, useChildLocations, useLocationsOfType } from "../taxonomy";

export interface LocationValue {
  districtId: string;
  talukaId: string;
  villageId: string;
}

/** Cascading district → taluka → village selects. Changing a level clears the levels below it. */
export function LocationPicker({ value, onChange, error }: { value: LocationValue; onChange: (v: LocationValue) => void; error?: string }) {
  const districts = useLocationsOfType("DISTRICT");
  const talukas = useChildLocations(value.districtId || null);
  const villages = useChildLocations(value.talukaId || null);

  return (
    <div className="panel-form">
      <label>
        District
        <select value={value.districtId} onChange={(e) => onChange({ districtId: e.target.value, talukaId: "", villageId: "" })}>
          <option value="">Select district</option>
          {selectable(districts.data, (d) => d.locationId === value.districtId).map((d) => (
            <option key={d.locationId} value={d.locationId}>{d.name}</option>
          ))}
        </select>
        {error && <span className="panel-field-error">{error}</span>}
      </label>
      <label>
        Taluka <span className="panel-hint">optional</span>
        <select
          value={value.talukaId}
          disabled={!value.districtId}
          onChange={(e) => onChange({ ...value, talukaId: e.target.value, villageId: "" })}
        >
          <option value="">{value.districtId && talukas.data?.length === 0 ? "No talukas added" : "Select taluka"}</option>
          {selectable(value.districtId ? talukas.data : [], (t) => t.locationId === value.talukaId).map((t) => (
            <option key={t.locationId} value={t.locationId}>{t.name}</option>
          ))}
        </select>
      </label>
      <label>
        Village / City <span className="panel-hint">optional</span>
        <select value={value.villageId} disabled={!value.talukaId} onChange={(e) => onChange({ ...value, villageId: e.target.value })}>
          <option value="">{value.talukaId && villages.data?.length === 0 ? "No villages added" : "Select village"}</option>
          {selectable(value.talukaId ? villages.data : [], (v) => v.locationId === value.villageId).map((v) => (
            <option key={v.locationId} value={v.locationId}>{v.name}</option>
          ))}
        </select>
      </label>
      {(districts.error || talukas.error || villages.error) && (
        <p className="panel-alert" role="alert">{districts.error ?? talukas.error ?? villages.error}</p>
      )}
    </div>
  );
}
