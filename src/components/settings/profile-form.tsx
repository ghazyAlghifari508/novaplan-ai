"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, uploadAvatar } from "@/app/actions/settings";

export const ProfileForm = memo(function ProfileForm({
  profile,
}: {
  profile: { full_name: string | null; avatar_url: string | null; email: string; plan?: string };
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt="Avatar"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--bg-surface) text-2xl text-(--text-secondary)">
              {profile.full_name?.charAt(0) || profile.email.charAt(0)}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full btn-primary text-xs shadow hover:bg-text-gray">
            +
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) return;

                setUploading(true);
                const fd = new FormData();
                fd.append("avatar", file);
                await uploadAvatar(fd);
                setUploading(false);
              }}
            />
          </label>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-inter font-[510] text-lg font-bold">{profile.full_name || "User"}</h2>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              profile.plan === 'hengker' 
                ? 'bg-steel text-snow ring-graphite'
                : profile.plan === 'pro'
                ? 'bg-steel text-snow ring-graphite'
                : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20'
            }`}>
              {profile.plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
          <p className="mt-1 text-sm text-(--text-secondary)">{profile.email}</p>
        </div>
      </div>

      <form action={updateProfile} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
          <Input
            name="full_name"
            defaultValue={profile.full_name || ""}
            placeholder="Nama lengkap kamu"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Peran</label>
          <select
            name="role"
            defaultValue="user"
            className="h-11 w-full rounded-lg border border-(--border-subtle) bg-(--bg-card) px-4 text-sm focus:border-primary-black focus:outline-none focus:ring-2 focus:ring-primary-black/5"
          >
            <option value="pm">Product Manager</option>
            <option value="developer">Software Developer</option>
            <option value="founder">Startup Founder / CTO</option>
            <option value="designer">UX/UI Designer</option>
            <option value="student">Mahasiswa / Fresh Graduate</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

        <Button type="submit">Simpan Perubahan</Button>
      </form>
    </div>
  );
});
