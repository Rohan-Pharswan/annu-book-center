"use client";

import { STORE_CONFIG } from "@/lib/storeConfig";

export default function ContactStore({ title, subtitle, orderWhatsAppUrl, style = {} }) {
  const primaryWaUrl = orderWhatsAppUrl || `https://wa.me/${STORE_CONFIG.primaryPhoneRaw}?text=${encodeURIComponent("Hello Annu Book Center, I would like to inquire about books and delivery.")}`;
  const altWaUrl = `https://wa.me/${STORE_CONFIG.altPhoneRaw}?text=${encodeURIComponent("Hello Annu Book Center, I would like to inquire about books and delivery.")}`;

  return (
    <div className="panel stack contact-store-box" style={{ background: "var(--surface-muted, #f8fafc)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", ...style }}>
      {title && <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{title}</h4>}
      {subtitle && <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{subtitle}</p>}

      <div className="contact-store-actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
        <a
          href={primaryWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            background: "#25D366",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            padding: "8px 14px",
            borderRadius: "6px"
          }}
        >
          <span>💬</span> WhatsApp Store ({STORE_CONFIG.primaryPhone})
        </a>

        <a
          href={`tel:${STORE_CONFIG.primaryPhoneRaw}`}
          className="btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            fontSize: "0.9rem",
            padding: "8px 14px"
          }}
        >
          <span>📞</span> Call ({STORE_CONFIG.primaryPhone})
        </a>

        <a
          href={`tel:${STORE_CONFIG.altPhoneRaw}`}
          className="btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            fontSize: "0.9rem",
            padding: "8px 14px"
          }}
        >
          <span>☎️</span> Alt ({STORE_CONFIG.altPhone})
        </a>

        <a
          href={STORE_CONFIG.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ghost-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            fontSize: "0.88rem",
            padding: "8px 12px"
          }}
        >
          <span>📍</span> Visit Store on Google Maps
        </a>
      </div>

      <div style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)", marginTop: "4px" }}>
        <strong>Store Address:</strong> {STORE_CONFIG.address} &bull; <em>Timings: {STORE_CONFIG.timings}</em>
      </div>
    </div>
  );
}
