"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkflowStore } from "@/lib/store";
import { useChatSessionStore } from "@/lib/chatSessionStore";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setAuthModalOpen           = useWorkflowStore((s) => s.setAuthModalOpen);
  const setAuthModalView           = useWorkflowStore((s) => s.setAuthModalView);
  const setResetPasswordModalOpen  = useWorkflowStore((s) => s.setResetPasswordModalOpen);
  const addToast                   = useWorkflowStore((s) => s.addToast);
  const clearLocalData             = useWorkflowStore((s) => s.clearLocalData);
  const clearSessions              = useChatSessionStore((s) => s.clearSessions);
  const supabase                   = createClient();

  useEffect(() => {
    // Auth landings come back via query params, not the hash (PKCE flow):
    //   ?type=recovery — the /api/auth/callback route established a recovery
    //                    session and sent us back to set a new password.
    //   ?auth_error=   — that route's code exchange failed.
    //   ?code=...      — a PKCE code that reached the root instead of the
    //                    callback route; exchange it here as a fallback.
    const query      = new URLSearchParams(window.location.search);
    const code       = query.get("code");
    const queryType  = query.get("type");
    const queryError = query.get("auth_error");

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      ["code", "type", "auth_error"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    };

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        cleanUrl();
        if (error) {
          // The client's own detectSessionInUrl may have already consumed the
          // code, so a failure here can be benign — only warn if we truly have
          // no session.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            addToast("That link is invalid or expired — request a new one.", "info");
          }
        } else if (queryType === "recovery") {
          setResetPasswordModalOpen(true);
        }
      });
    } else if (queryType === "recovery") {
      // Recovery session was already established by the callback route.
      cleanUrl();
      setResetPasswordModalOpen(true);
    } else if (queryError) {
      cleanUrl();
      addToast("That link is invalid or expired — please request a new one.", "info");
    }

    // Handle Supabase auth hash params on page load.
    const hash   = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    if (params.get("type") === "recovery") {
      // Valid recovery link — establish session then open the reset modal.
      const access_token  = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(() => {
          setResetPasswordModalOpen(true);
        });
      } else {
        setResetPasswordModalOpen(true);
      }
    } else if (params.get("error")) {
      // Supabase returned an auth error (e.g. expired OTP).
      // Open the forgot-password flow so they can request a new link.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      addToast("Reset link expired — please request a new one.", "info");
      setAuthModalView("forgot");
      setAuthModalOpen(true);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setResetPasswordModalOpen(true);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearLocalData();
    clearSessions();
    setUser(null);
  };

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#A0A0A0] max-w-[120px] truncate hidden sm:block">
          {user.email}
        </span>
        <button onClick={signOut} className="toolbar-btn text-[11px]">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setAuthModalOpen(true)} className="toolbar-btn text-[11px]">
      Sign in
    </button>
  );
}
