"use client";

import { useEffect, useRef, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/types/database";
import { MoreVertical, Check, Copy } from "lucide-react";

interface ApiKeysFormProps {
  apiKeys: ApiKey[];
}

export const ApiKeysForm = memo(function ApiKeysForm({ apiKeys }: ApiKeysFormProps) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement>(null);

  const activeKeys = apiKeys.filter((k) => !k.revoked_at);

  useEffect(() => {
    if (!openMenuId) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    const result = await createApiKey(keyName.trim());
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else {
      setNewKey(result.key || null);
      setKeyName("");
      setShowForm(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setOpenMenuId(null);
    await revokeApiKey(id);
  };

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-schibsted text-2xl font-bold tracking-tight text-primary-black dark:text-[#F0F0F0]">
          API Keys
        </h2>
        <Button
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          className="border-green-600 text-green-600 hover:bg-green-50 font-schibsted"
        >
          Generate API Key
        </Button>
      </div>

      <p className="font-schibsted text-[15px] text-[#555555] mb-8">
        Here you can view and manage the API Keys within novaplan.
      </p>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border-subtle dark:border-white/10 bg-black/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium font-schibsted text-primary-black dark:text-[#F0F0F0]">
            Create new API Key
          </p>
          <div className="flex items-center gap-3">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key Name (e.g., Production)"
              className="max-w-sm bg-white dark:bg-[#1E1E1E]"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !keyName.trim()}
              className="btn-primary hover:bg-text-gray"
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {newKey && (
        <div className="mb-8 rounded-xl border-2 border-green-200 bg-green-50 p-5 font-schibsted">
          <h4 className="font-bold text-green-800">API Key Created Successfully</h4>
          <p className="mt-1 text-sm text-green-700">
            Please copy this key now. It will not be shown again.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="rounded-lg bg-white dark:bg-[#1E1E1E] px-3 py-2 text-sm font-mono text-green-900 border border-green-200 flex-1">
              {newKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(newKey)}
              className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-100"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <button
            className="mt-4 text-sm font-medium text-green-700 hover:text-green-900 underline"
            onClick={() => setNewKey(null)}
          >
            Close
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-lg font-schibsted">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle dark:border-white/10">
              <th className="pb-3 pr-4 font-semibold text-primary-black dark:text-[#F0F0F0]">Key ID</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black dark:text-[#F0F0F0]">Key Name</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black dark:text-[#F0F0F0]">Key Value</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black dark:text-[#F0F0F0]">Expiration</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black dark:text-[#F0F0F0]">Active</th>
              <th className="pb-3 font-semibold text-primary-black dark:text-[#F0F0F0]"></th>
            </tr>
          </thead>
          <tbody>
            {activeKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-gray dark:text-[#A0A0A0]">
                  No API keys found.
                </td>
              </tr>
            ) : (
              activeKeys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-border-subtle dark:border-white/10 hover:bg-black/5 transition-colors group"
                >
                  <td className="py-4 pr-4 font-mono text-xs text-text-gray dark:text-[#A0A0A0] truncate max-w-[150px]">
                    {key.id}
                  </td>
                  <td className="py-4 pr-4 text-primary-black dark:text-[#F0F0F0] font-medium">{key.name}</td>
                  <td className="py-4 pr-4 font-mono text-xs text-text-gray dark:text-[#A0A0A0]">
                    {key.key_prefix}********
                  </td>
                  <td className="py-4 pr-4 text-text-gray dark:text-[#A0A0A0]">-</td>
                  <td className="py-4 pr-4">
                    <span className="text-xs font-medium text-primary-black dark:text-[#F0F0F0]">ACTIVE</span>
                  </td>
                  <td className="py-4 text-right">
                    <div
                      className="relative inline-block text-left"
                      ref={openMenuId === key.id ? menuRootRef : null}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-gray dark:text-[#A0A0A0] transition-opacity focus-visible:ring-2 focus-visible:ring-primary-black/20"
                        onClick={() =>
                          setOpenMenuId((current) => (current === key.id ? null : key.id))
                        }
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === key.id}
                        aria-label={`Open actions for ${key.name}`}
                      >
                        <MoreVertical size={16} />
                      </Button>
                      {openMenuId === key.id && (
                        <div
                          className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] py-1 shadow-lg"
                          role="menu"
                          aria-label={`Actions for ${key.name}`}
                        >
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                            role="menuitem"
                            tabIndex={0}
                          >
                            Revoke Key
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
