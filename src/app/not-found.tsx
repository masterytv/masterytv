import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-0, #070d1f)",
        color: "var(--color-text-primary, #dfe4fe)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          fontWeight: 800,
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          opacity: 0.7,
          marginTop: "1rem",
          marginBottom: "2rem",
        }}
      >
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "0.75rem",
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "1rem",
          boxShadow: "0 4px 16px color-mix(in oklch, var(--color-primary-container) 30%, transparent)",
          transition: "opacity 0.2s",
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
