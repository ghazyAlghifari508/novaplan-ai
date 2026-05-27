"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/app/actions/notifications";
import type { NotificationPreferences } from "@/types/database";

interface NotificationsFormProps {
  preferences: NotificationPreferences | null;
}

export const NotificationsForm = memo(function NotificationsForm({
  preferences,
}: NotificationsFormProps) {
  return (
    <form action={updateNotificationPreferences} className="space-y-8">
      <div className="space-y-5">
        <label className="flex items-start gap-3 rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-4 cursor-pointer transition-colors hover:bg-light-gray-bg dark:bg-[#161616]">
          <input
            type="checkbox"
            name="quota_warning"
            defaultChecked={preferences?.quota_warning !== false}
            className="mt-0.5 h-4 w-4 accent-primary-black"
          />
          <div>
            <p className="font-medium text-sm">Peringatan Quota</p>
            <p className="text-xs text-text-gray dark:text-[#A0A0A0] mt-0.5">
              Dapatkan notifikasi saat quota PRD mendekati batas
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-4 cursor-pointer transition-colors hover:bg-light-gray-bg dark:bg-[#161616]">
          <input
            type="checkbox"
            name="prd_completed"
            defaultChecked={preferences?.prd_completed !== false}
            className="mt-0.5 h-4 w-4 accent-primary-black"
          />
          <div>
            <p className="font-medium text-sm">PRD Selesai</p>
            <p className="text-xs text-text-gray dark:text-[#A0A0A0] mt-0.5">
              Notifikasi ketika PRD berhasil digenerate
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-4 cursor-pointer transition-colors hover:bg-light-gray-bg dark:bg-[#161616]">
          <input
            type="checkbox"
            name="payment_updates"
            defaultChecked={preferences?.payment_updates !== false}
            className="mt-0.5 h-4 w-4 accent-primary-black"
          />
          <div>
            <p className="font-medium text-sm">Update Pembayaran</p>
            <p className="text-xs text-text-gray dark:text-[#A0A0A0] mt-0.5">
              Konfirmasi pembayaran dan update subscription
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-4 cursor-pointer transition-colors hover:bg-light-gray-bg dark:bg-[#161616]">
          <input
            type="checkbox"
            name="product_updates"
            defaultChecked={preferences?.product_updates || false}
            className="mt-0.5 h-4 w-4 accent-primary-black"
          />
          <div>
            <p className="font-medium text-sm">Update Produk</p>
            <p className="text-xs text-text-gray dark:text-[#A0A0A0] mt-0.5">
              Info fitur baru dan update NovaPlan
            </p>
          </div>
        </label>
      </div>

      <Button type="submit">Simpan Preferensi</Button>
    </form>
  );
});
