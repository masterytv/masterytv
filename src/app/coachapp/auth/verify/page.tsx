"use client";

import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-accent-500/5 blur-[100px]" />
      </div>
      <div className="glass relative w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 ring-1 ring-brand-500/20">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary">Verifying your email...</h1>
        <p className="mt-2 text-sm text-text-secondary">Please wait while we sign you in.</p>
      </div>
    </div>
  );
}

function VerifyContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function verifyToken() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as
        | "signup"
        | "magiclink"
        | "recovery"
        | "invite"
        | "email_change"
        | "email";

      if (!tokenHash || !type) {
        setStatus("error");
        setErrorMessage("Invalid verification link. Please request a new one.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message.includes("expired")
            ? "This link has expired. Please request a new one."
            : error.message
        );
      } else {
        setStatus("success");
        // Brief pause so user sees the success state, then redirect
        setTimeout(() => {
          router.push("/coachapp/dashboard");
        }, 1200);
      }
    }

    verifyToken();
  }, [searchParams, router, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background gradient effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-accent-500/5 blur-[100px]" />
      </div>

      <div className="glass relative w-full max-w-md rounded-2xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 ring-1 ring-brand-500/20">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">
              Verifying your email...
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Please wait while we sign you in.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">
              Email verified!
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 ring-1 ring-danger/20">
              <XCircle className="h-8 w-8 text-danger" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{errorMessage}</p>
            <button
              onClick={() => router.push("/coachapp/login")}
              className="mt-6 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
