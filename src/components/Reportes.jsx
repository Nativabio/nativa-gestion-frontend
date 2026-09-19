import { useState } from "react";

const SECTIONS = [
    {
        key: "contabilidad",
        icon: "💰",
        title: "Contabilidad",
        description: "Análisis de cuentas y movimientos contables.",
        reports: []
    },
    {
        key: "ventas",
        icon: "🧾",
        title: "Ventas",
        description: "Información y análisis de ventas.",
        reports: []
    },
    {
        key: "compras",
        icon: "🛒",
        title: "Compras",
        description: "Análisis de compras y proveedores.",
        reports: []
    },
    {
        key: "stock",
        icon: "📦",
        title: "Stock",
        description: "Existencias, movimientos y valorización.",
        reports: []
    },
    {
        key: "produccion",
        icon: "🏭",
        title: "Producción",
        description: "Producción, lotes y costos.",
        reports: []
    },
    {
        key: "costos",
        icon: "📊",
        title: "Costos",
        description: "Costos de productos, materias primas y estructura.",
        reports: ["Consumo y costo de materias primas"]
    }
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatMoney(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
    });
}

function formatDate(value) {
    if (!value) return "—";
    const [year, month, day] = String(value).split("-");
    return `${day}/${month}/${year}`;
}

export default function Reportes() {
    const [section, setSection] = useState("contabilidad");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [costReport, setCostReport] = useState(null);
    const [expandedMaterial, setExpandedMaterial] = useState(null);

    const active = SECTIONS.find((item) => item.key === section) || SECTIONS[0];

    async function ejecutar() {
        if (section !== "costos") {
            setMessage("Esta categoría todavía no tiene reportes definidos.");
            return;
        }

        if (fromDate && toDate && fromDate > toDate) {
            setMessage("La fecha Desde no puede ser posterior a Hasta.");
            return;
        }

        setLoading(true);
        setMessage("");
        setExpandedMaterial(null);

        try {
            const params = new URLSearchParams();
            if (fromDate) params.set("from_date", fromDate);
            if (toDate) params.set("to_date", toDate);

            const response = await fetch(
                `${API_URL}/reports/costs/raw-materials?${params.toString()}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "No se pudo generar el reporte.");
            }

            setCostReport(data);

            if (!data.materials.length) {
                setMessage("No hay consumos de materias primas en el período seleccionado.");
            }
        } catch (error) {
            setCostReport(null);
            setMessage(error.message || "No se pudo generar el reporte.");
        } finally {
            setLoading(false);
        }
    }

    function limpiar() {
        setFromDate("");
        setToDate("");
        setMessage("");
        setCostReport(null);
        setExpandedMaterial(null);
    }

    function cambiarSeccion(key) {
        setSection(key);
        setMessage("");
        setExpandedMaterial(null);
        if (key !== "costos") setCostReport(null);
    }

    return (
        <div>
            <h2>📑 Reportes</h2>
            <p>Módulo de consulta y análisis de información de NATIVA Gestión.</p>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <h3 style={styles.sidebarTitle}>Categorías</h3>
                    {SECTIONS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => cambiarSeccion(item.key)}
                            style={{
                                ...styles.sectionButton,
                                ...(section === item.key ? styles.sectionButtonActive : {})
                            }}
                        >
                            <span>{item.icon}</span>
                            <span style={{ textAlign: "left" }}>
                                <strong>{item.title}</strong>
                                <small style={styles.sectionDescription}>
                                    {item.description}
                                </small>
                            </span>
                        </button>
                    ))}
                </aside>

                <main>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div>
                                <h3 style={{ margin: 0 }}>{active.icon} {active.title}</h3>
                                <p style={styles.muted}>{active.description}</p>
                            </div>
                            <span style={styles.badge}>
                                {section === "costos" ? "1 reporte disponible" : "Preparado para reportes"}
                            </span>
                        </div>

                        <div style={styles.filters}>
                            <div>
                                <label style={styles.label}>Desde</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(event) => setFromDate(event.target.value)}
                                    style={styles.input}
                                />
                            </div>
                            <div>
                                <label style={styles.label}>Hasta</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(event) => setToDate(event.target.value)}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button onClick={ejecutar} style={styles.primaryButton} disabled={loading}>
                                {loading ? "⏳ Consultando..." : "🔎 Consultar"}
                            </button>
                            <button onClick={limpiar} style={styles.secondaryButton}>
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    {section === "costos" ? (
                        <>
                            <div style={styles.card}>
                                <div style={styles.reportHeader}>
                                    <div>
                                        <h3 style={{ margin: 0 }}>📊 Consumo y costo de materias primas</h3>
                                        <p style={styles.muted}>
                                            Cantidades y costos históricos utilizados en los lotes del período.
                                        </p>
                                    </div>
                                    {costReport && (
                                        <div style={styles.totalBox}>
                                            <span>Costo total</span>
                                            <strong>{formatMoney(costReport.total_cost)}</strong>
                                        </div>
                                    )}
                                </div>

                                {costReport ? (
                                    costReport.materials.length ? (
                                        <div style={styles.tableWrap}>
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th style={styles.th}>Materia prima</th>
                                                        <th style={styles.th}>Cantidad utilizada</th>
                                                        <th style={styles.th}>Unidad</th>
                                                        <th style={styles.th}>Costo consumido</th>
                                                        <th style={styles.th}>Lotes</th>
                                                        <th style={styles.th}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {costReport.materials.map((material) => {
                                                        const expanded = expandedMaterial === material.raw_material_id;
                                                        return (
                                                            <>
                                                                <tr key={material.raw_material_id}>
                                                                    <td style={styles.td}><strong>{material.name}</strong></td>
                                                                    <td style={styles.td}>{formatNumber(material.quantity_used)}</td>
                                                                    <td style={styles.td}>{material.unit || "—"}</td>
                                                                    <td style={styles.td}><strong>{formatMoney(material.cost_used)}</strong></td>
                                                                    <td style={styles.td}>{material.lot_count}</td>
                                                                    <td style={styles.td}>
                                                                        <button
                                                                            onClick={() => setExpandedMaterial(expanded ? null : material.raw_material_id)}
                                                                            style={styles.detailButton}
                                                                        >
                                                                            {expanded ? "Ocultar" : "Ver detalle"}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                                {expanded && (
                                                                    <tr key={`${material.raw_material_id}-detail`}>
                                                                        <td colSpan={6} style={styles.detailCell}>
                                                                            <div style={styles.detailTitle}>
                                                                                Detalle de {material.name}
                                                                            </div>
                                                                            <table style={styles.innerTable}>
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th style={styles.innerTh}>Lote</th>
                                                                                        <th style={styles.innerTh}>Fecha</th>
                                                                                        <th style={styles.innerTh}>Cantidad</th>
                                                                                        <th style={styles.innerTh}>Costo unitario</th>
                                                                                        <th style={styles.innerTh}>Costo</th>
                                                                                        <th style={styles.innerTh}>Fuente</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {material.details.map((detail) => (
                                                                                        <tr key={`${material.raw_material_id}-${detail.lot_id}`}>
                                                                                            <td style={styles.innerTd}>{detail.lot_number}</td>
                                                                                            <td style={styles.innerTd}>{formatDate(detail.production_date)}</td>
                                                                                            <td style={styles.innerTd}>{formatNumber(detail.quantity)} {material.unit}</td>
                                                                                            <td style={styles.innerTd}>{formatMoney(detail.unit_cost)}</td>
                                                                                            <td style={styles.innerTd}>{formatMoney(detail.subtotal_cost)}</td>
                                                                                            <td style={styles.innerTd}>
                                                                                                {detail.source === "FORMULA_ESTIMATE" ? "Estimado" : "Real"}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                            {material.estimated_lot_count > 0 && (
                                                                                <p style={styles.warning}>
                                                                                    ⚠️ Este material incluye {material.estimated_lot_count} registro(s) histórico(s) estimado(s) a partir de la fórmula. Los lotes nuevos registrados con consumo real se identifican como “Real”.
                                                                                </p>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={styles.empty}>
                                            <div style={styles.emptyIcon}>📋</div>
                                            <strong>No hay consumos en el período seleccionado.</strong>
                                        </div>
                                    )
                                ) : (
                                    <div style={styles.empty}>
                                        <div style={styles.emptyIcon}>📊</div>
                                        <strong>Seleccioná un período y presioná Consultar.</strong>
                                        <p style={styles.muted}>
                                            El informe se construye a partir del historial de materias primas de cada lote.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={styles.card}>
                            <h3>Reportes disponibles</h3>
                            <div style={styles.empty}>
                                <div style={styles.emptyIcon}>📋</div>
                                <strong>Todavía no hay reportes definidos en esta categoría.</strong>
                                <p style={styles.muted}>
                                    Este es el espacio que vamos a ir completando con cada análisis que necesites.
                                </p>
                            </div>
                        </div>
                    )}

                    {message && <div style={styles.infoBox}>{message}</div>}

                    <div style={styles.card}>
                        <h3>Herramientas del módulo</h3>
                        <div style={styles.toolGrid}>
                            <div style={styles.toolCard}>
                                <strong>🔎 Filtros</strong>
                                <span>Períodos de consulta.</span>
                            </div>
                            <div style={styles.toolCard}>
                                <strong>📊 Análisis</strong>
                                <span>Consumo, costos y detalle por lote.</span>
                            </div>
                            <div style={styles.toolCard}>
                                <strong>📥 Exportación</strong>
                                <span>Podemos agregar exportación cuando definamos los siguientes reportes.</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const styles = {
    layout: { display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", gap: 20, marginTop: 25, alignItems: "start" },
    sidebar: { border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "white" },
    sidebarTitle: { margin: "4px 8px 12px" },
    sectionButton: { width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: 12, marginBottom: 7, border: "1px solid transparent", borderRadius: 8, background: "transparent", cursor: "pointer", textAlign: "left" },
    sectionButtonActive: { border: "1px solid #c9c9c9", background: "#f5f5f5" },
    sectionDescription: { display: "block", marginTop: 3, color: "#666", lineHeight: 1.3 },
    card: { border: "1px solid #ddd", borderRadius: 10, padding: 20, background: "white", marginBottom: 20 },
    cardHeader: { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start" },
    reportHeader: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" },
    badge: { border: "1px solid #ccc", borderRadius: 20, padding: "6px 10px", fontSize: 12, whiteSpace: "nowrap" },
    muted: { color: "#666", marginTop: 6 },
    filters: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15, marginTop: 20, maxWidth: 500 },
    label: { display: "block", fontWeight: 600, marginBottom: 6 },
    input: { width: "100%", boxSizing: "border-box", padding: 9, border: "1px solid #ccc", borderRadius: 7 },
    actions: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" },
    primaryButton: { padding: "9px 14px", borderRadius: 7, border: "1px solid #888", cursor: "pointer" },
    secondaryButton: { padding: "9px 14px", borderRadius: 7, border: "1px solid #ccc", background: "white", cursor: "pointer" },
    totalBox: { minWidth: 170, padding: 14, border: "1px solid #ddd", borderRadius: 8, background: "#fafafa", display: "flex", flexDirection: "column", gap: 5 },
    tableWrap: { overflowX: "auto", marginTop: 20 },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
    th: { textAlign: "left", padding: "11px 10px", borderBottom: "2px solid #ddd", fontSize: 13 },
    td: { padding: "11px 10px", borderBottom: "1px solid #eee", verticalAlign: "middle" },
    detailButton: { padding: "6px 9px", border: "1px solid #ccc", borderRadius: 6, background: "white", cursor: "pointer" },
    detailCell: { padding: 16, background: "#fafafa", borderBottom: "1px solid #ddd" },
    detailTitle: { fontWeight: 700, marginBottom: 10 },
    innerTable: { width: "100%", borderCollapse: "collapse" },
    innerTh: { textAlign: "left", padding: "8px", borderBottom: "1px solid #ccc", fontSize: 12 },
    innerTd: { padding: "8px", borderBottom: "1px solid #e5e5e5", fontSize: 13 },
    warning: { margin: "12px 0 0", padding: 10, borderRadius: 7, background: "#fff8e6", border: "1px solid #ead9a6", fontSize: 13 },
    empty: { border: "1px dashed #ccc", borderRadius: 8, padding: 30, textAlign: "center", marginTop: 15 },
    emptyIcon: { fontSize: 32, marginBottom: 8 },
    infoBox: { border: "1px solid #ccc", borderRadius: 8, padding: 14, marginBottom: 20, background: "#fafafa" },
    toolGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
    toolCard: { border: "1px solid #ddd", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 7 }
};
