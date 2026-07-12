// src/tabP/SocialConnect.jsx
import React, { useState, useEffect } from "react";
import { Twitter, Send, Globe, Link2 } from "lucide-react";
import { C } from "../utils/designforprofile.js";

const FIELDS = [
  { key: "twitter", label: "Twitter / X", icon: Twitter, placeholder: "yourhandle" },
  { key: "telegram", label: "Telegram", icon: Send, placeholder: "yourhandle" },
  { key: "farcaster", label: "Farcaster", icon: Globe, placeholder: "yourhandle" },
];

export const SocialConnect = ({ userRow, onUpdate, loading }) => {
  const [values, setValues] = useState({ twitter: "", telegram: "", farcaster: "" });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValues({
      twitter: userRow?.twitter || "",
      telegram: userRow?.telegram || "",
      farcaster: userRow?.farcaster || "",
    });
    setDirty(false);
  }, [userRow]);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        twitter: values.twitter.trim() || null,
        telegram: values.telegram.trim() || null,
        farcaster: values.farcaster.trim() || null,
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-4 p-4 rounded-lg space-y-3 max-w-xl font-mono"
      style={{ backgroundColor: C.panelAlt, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-1.5 border-b pb-2" style={{ borderColor: C.border }}>
        <Link2 size={12} style={{ color: C.teal }} />
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: C.bright }}>
          Social links
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ color: C.sub }}
            >
              <field.icon size={11} style={{ color: C.faint }} />
              {field.label}
            </label>
            <input
              type="text"
              value={values[field.key]}
              placeholder={field.placeholder}
              disabled={loading || saving}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="px-2 py-1.5 text-xs rounded focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.bright }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!dirty || loading || saving}
        onClick={handleSave}
        className="w-full text-[10px] font-bold py-2 rounded transition-all uppercase tracking-wider disabled:opacity-40"
        style={{ backgroundColor: dirty ? C.teal : C.panel, color: dirty ? C.bg : C.sub, border: `1px solid ${C.border}` }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default SocialConnect;
