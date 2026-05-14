"use client";

import { useState, memo } from "react";
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
  
  const activeKeys = apiKeys.filter((k) => !k.revoked_at);

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
        <h2 className="font-schibsted text-2xl font-bold tracking-tight text-primary-black">API Keys</h2>
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
        <div className="mb-8 rounded-xl border border-border-subtle bg-black/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium font-schibsted text-primary-black">Create new API Key</p>
          <div className="flex items-center gap-3">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key Name (e.g., Production)"
              className="max-w-sm bg-white"
            />
            <Button onClick={handleCreate} disabled={creating || !keyName.trim()} className="bg-primary-black text-white hover:bg-text-gray">
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {newKey && (
        <div className="mb-8 rounded-xl border-2 border-green-200 bg-green-50 p-5 font-schibsted">
          <h4 className="font-bold text-green-800">
            API Key Created Successfully
          </h4>
          <p className="mt-1 text-sm text-green-700">
            Please copy this key now. It will not be shown again.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-2 text-sm font-mono text-green-900 border border-green-200 flex-1">
              {newKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => handleCopy(newKey)} className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-100">
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
            <tr className="border-b border-border-subtle">
              <th className="pb-3 pr-4 font-semibold text-primary-black">Key ID</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black">Key Name</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black">Key Value</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black">Expiration</th>
              <th className="pb-3 pr-4 font-semibold text-primary-black">Active</th>
              <th className="pb-3 font-semibold text-primary-black"></th>
            </tr>
          </thead>
          <tbody>
            {activeKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-gray">No API keys found.</td>
              </tr>
            ) : (
              activeKeys.map((key) => (
                <tr key={key.id} className="border-b border-border-subtle hover:bg-black/5 transition-colors group">
                  <td className="py-4 pr-4 font-mono text-xs text-text-gray truncate max-w-[150px]">
                    {key.id}
                  </td>
                  <td className="py-4 pr-4 text-primary-black font-medium">
                    {key.name}
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs text-text-gray">
                    {key.key_prefix}********
                  </td>
                  <td className="py-4 pr-4 text-text-gray">
                    -
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-xs font-medium text-primary-black">ACTIVE</span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="relative inline-block text-left">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-gray opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          const target = e.currentTarget.nextElementSibling as HTMLElement;
                          target.style.display = target.style.display === 'block' ? 'none' : 'block';
                        }}
                      >
                        <MoreVertical size={16} />
                      </Button>
                      <div className="absolute right-0 top-full mt-1 hidden w-32 rounded-lg border border-border-subtle bg-white py-1 shadow-lg z-10" style={{ display: 'none' }}>
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Revoke Key
                        </button>
                      </div>
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
