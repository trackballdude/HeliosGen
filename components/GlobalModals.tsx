"use client";
import AuthModal from "@/components/AuthModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import SettingsModal from "@/components/SettingsModal";
import Toaster from "@/components/Toaster";
import { useWorkflowStore } from "@/lib/store";

export default function GlobalModals({ callbackBaseUrl }: { callbackBaseUrl?: string }) {
  const settingsOpen    = useWorkflowStore((s) => s.settingsOpen);
  const setSettingsOpen = useWorkflowStore((s) => s.setSettingsOpen);

  return (
    <>
      <AuthModal callbackBaseUrl={callbackBaseUrl} />
      <ResetPasswordModal />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <Toaster />
    </>
  );
}
