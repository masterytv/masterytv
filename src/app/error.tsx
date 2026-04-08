"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          opacity: 0.6,
          marginBottom: "2rem",
          maxWidth: "30rem",
        }}
      >
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "0.75rem",
          background: "linear-gradient(135deg, #a3a6ff, #6063ee)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "1rem",
          boxShadow: "0 4px 16px rgba(96, 99, 238, 0.3)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
