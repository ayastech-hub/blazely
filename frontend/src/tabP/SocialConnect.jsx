// src/tabP/SocialConnect.jsx
import React, { useState, useEffect } from "react";
import { Twitter, Send, Globe } from "lucide-react";
import { C } from "../utils/designForProfile";

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
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.sub }}>
              <field.icon size={13} style={{ color: C.faint }} />
              {field.label}
            </label>
            <input
              type="text"
              value={values[field.key]}
              placeholder={field.placeholder}
              disabled={loading || saving}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.bright }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!dirty || loading || saving}
        onClick={handleSave}
        className="w-full text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-40"
        style={{ backgroundColor: dirty ? C.teal : C.panel, color: dirty ? C.bg : C.sub, border: `1px solid ${C.borderSoft}` }}
      >
        {saving ? "Saving..." : "Save social links"}
      </button>
    </div>
  );
};

export default SocialConnect;
