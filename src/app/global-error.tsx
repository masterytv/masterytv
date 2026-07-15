"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070d1f",
          color: "#dfe4fe",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
          margin: 0,
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Something went wrong
        </h1>
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
            background: "#ffffff",
            color: "#0b1120",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
