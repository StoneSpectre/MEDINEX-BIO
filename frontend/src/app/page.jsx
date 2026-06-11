"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "2rem", textAlign: "center", gap: "2rem",
      backgroundColor: "var(--color-background-tertiary)"
    }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "600", color: "#1BC99A", margin: 0 }}>
        Medinex Explorer
      </h1>
      <p style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", maxWidth: "600px" }}>
        Welcome to the Biomedical Knowledge Graph. Please choose which version of the explorer you'd like to use.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/v1" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--color-background-secondary)",
            border: "1px solid var(--color-border-secondary)",
            padding: "2rem",
            borderRadius: "12px",
            width: "300px",
            transition: "transform 0.2s, borderColor 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1BC99A"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-primary)", marginBottom: "1rem" }}>
              Version 1
            </h2>
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.95rem" }}>
              The original Medinex Explorer prototype.
            </p>
          </div>
        </Link>

        <Link href="/v2" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--color-background-secondary)",
            border: "1px solid var(--color-border-secondary)",
            padding: "2rem",
            borderRadius: "12px",
            width: "300px",
            transition: "transform 0.2s, borderColor 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1BC99A"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-primary)", marginBottom: "1rem" }}>
              Version 2
            </h2>
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.95rem" }}>
              The new dark-themed, data-dense clinical explorer.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
