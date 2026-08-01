"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StackDropdownProps {
  label: string;
  options: string[];
  value: string | undefined;
  disabled: boolean;
  onChange: (value: string | undefined) => void;
}

const CUSTOM = "__custom__";

export function StackDropdown({ label, options, value, disabled, onChange }: StackDropdownProps) {
  // Custom mode is explicit state, not derived: a value outside `options` means
  // custom, but so does "custom picked, nothing typed yet" (value still undefined).
  const [customMode, setCustomMode] = useState(false);
  const isCustomValue = Boolean(value) && !options.includes(value ?? "");
  const showCustom = customMode || isCustomValue;

  return (
    <div className={cn("space-y-2", disabled && "opacity-40")}>
      <label className="block font-inter text-sm font-[510]" style={{ color: "var(--text-primary)" }}>
        {label}
      </label>
      <select
        disabled={disabled}
        value={showCustom ? CUSTOM : (value ?? "")}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustomMode(true);
            onChange(undefined);
            return;
          }
          setCustomMode(false);
          onChange(e.target.value || undefined);
        }}
        className="w-full appearance-none rounded-lg border border-(--border-subtle) px-4 py-3 font-inter text-sm shadow-(--shadow-inset) outline-none transition-all focus:border-(--text-secondary) disabled:cursor-not-allowed"
        style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
      >
        <option value="">Biarkan AI yang memilih</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={CUSTOM}>Lainnya...</option>
      </select>
      {showCustom && (
        <input
          type="text"
          disabled={disabled}
          value={isCustomValue ? value : ""}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder="Tulis pilihanmu..."
          className="w-full rounded-lg border border-(--border-subtle) px-4 py-3 font-inter text-sm shadow-(--shadow-inset) outline-none"
          style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
        />
      )}
    </div>
  );
}
