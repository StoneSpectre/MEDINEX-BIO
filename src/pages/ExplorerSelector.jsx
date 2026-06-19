import { Link } from "react-router-dom";

export default function ExplorerSelector() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 64px)", padding: "2rem", textAlign: "center", gap: "2rem",
      backgroundColor: "hsl(var(--background))", position: "relative"
    }}>
      {/* Exit Button */}
      <button 
        onClick={() => window.location.href = '/'}
        style={{ position: "absolute", top: "20px", left: "20px", padding: "8px 16px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--muted-foreground))", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.background = "hsl(var(--accent))"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.background = "transparent"; }}
      >
        <span>←</span> Exit to Home
      </button>

      <h1 style={{ fontSize: "2.5rem", fontWeight: "600", color: "hsl(var(--primary))", margin: 0 }}>
        Medinex Explorer
      </h1>
      <p style={{ fontSize: "1.1rem", color: "hsl(var(--muted-foreground))", maxWidth: "600px" }}>
        Welcome to the Biomedical Knowledge Graph. Please choose which version of the explorer you'd like to use.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/explorer-v1" style={{ textDecoration: "none" }}>
          <div style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            padding: "2rem",
            borderRadius: "12px",
            width: "300px",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "hsl(var(--card-foreground))", marginBottom: "1rem" }}>
              Version 1
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.95rem" }}>
              The original Medinex Explorer prototype.
            </p>
          </div>
        </Link>

        <Link to="/explorer-v2" style={{ textDecoration: "none" }}>
          <div style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            padding: "2rem",
            borderRadius: "12px",
            width: "300px",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "hsl(var(--card-foreground))", marginBottom: "1rem" }}>
              Version 2
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.95rem" }}>
              The new dark-themed, data-dense clinical explorer.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
