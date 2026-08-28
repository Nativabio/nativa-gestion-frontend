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
        reports: []
    }
];

function formatMoney(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export default function Reportes() {
    const [section, setSection] = useState("contabilidad");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [account, setAccount] = useState("");
    const [message, setMessage] = useState("");

    const active = SECTIONS.find((item) => item.key === section) || SECTIONS[0];

    function ejecutar() {
        setMessage(
            "El esqueleto de Reportes está listo. Los reportes específicos se irán agregando acá a medida que los definamos."
        );
    }

    function limpiar() {
        setFromDate("");
        setToDate("");
        setAccount("");
        setMessage("");
    }

    return (
        <div>
            <h2>📑 Reportes</h2>
            <p>
                Módulo de consulta y análisis de información de NATIVA Gestión.
            </p>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <h3 style={styles.sidebarTitle}>Categorías</h3>
                    {SECTIONS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setSection(item.key)}
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
                            <span style={styles.badge}>Preparado para reportes</span>
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
                            <div>
                                <label style={styles.label}>Cuenta / concepto</label>
                                <input
                                    value={account}
                                    onChange={(event) => setAccount(event.target.value)}
                                    placeholder="Opcional"
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button onClick={ejecutar} style={styles.primaryButton}>
                                🔎 Consultar
                            </button>
                            <button onClick={limpiar} style={styles.secondaryButton}>
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <h3>Reportes disponibles</h3>
                        {active.reports.length === 0 ? (
                            <div style={styles.empty}>
                                <div style={styles.emptyIcon}>📋</div>
                                <strong>Todavía no hay reportes definidos en esta categoría.</strong>
                                <p style={styles.muted}>
                                    Este es el espacio que vamos a ir completando con cada
                                    análisis que necesites.
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {message && (
                        <div style={styles.infoBox}>
                            {message}
                        </div>
                    )}

                    <div style={styles.card}>
                        <h3>Herramientas del módulo</h3>
                        <div style={styles.toolGrid}>
                            <div style={styles.toolCard}>
                                <strong>🔎 Filtros</strong>
                                <span>Períodos y criterios de consulta.</span>
                            </div>
                            <div style={styles.toolCard}>
                                <strong>📊 Análisis</strong>
                                <span>Tablas, totales y comparaciones.</span>
                            </div>
                            <div style={styles.toolCard}>
                                <strong>📥 Exportación</strong>
                                <span>Preparado para exportar cuando definamos cada reporte.</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const styles = {
    layout: {
        display: "grid",
        gridTemplateColumns: "270px minmax(0, 1fr)",
        gap: 20,
        marginTop: 25,
        alignItems: "start"
    },
    sidebar: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 14,
        background: "white"
    },
    sidebarTitle: {
        margin: "4px 8px 12px"
    },
    sectionButton: {
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: 12,
        marginBottom: 7,
        border: "1px solid transparent",
        borderRadius: 8,
        background: "transparent",
        cursor: "pointer",
        textAlign: "left"
    },
    sectionButtonActive: {
        border: "1px solid #c9c9c9",
        background: "#f5f5f5"
    },
    sectionDescription: {
        display: "block",
        marginTop: 3,
        color: "#666",
        lineHeight: 1.3
    },
    card: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        background: "white",
        marginBottom: 20
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        gap: 15,
        alignItems: "flex-start"
    },
    badge: {
        border: "1px solid #ccc",
        borderRadius: 20,
        padding: "6px 10px",
        fontSize: 12,
        whiteSpace: "nowrap"
    },
    muted: {
        color: "#666",
        marginTop: 6
    },
    filters: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 15,
        marginTop: 20
    },
    label: {
        display: "block",
        fontWeight: 600,
        marginBottom: 6
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: 9,
        border: "1px solid #ccc",
        borderRadius: 7
    },
    actions: {
        display: "flex",
        gap: 10,
        marginTop: 18,
        flexWrap: "wrap"
    },
    primaryButton: {
        padding: "9px 14px",
        borderRadius: 7,
        border: "1px solid #888",
        cursor: "pointer"
    },
    secondaryButton: {
        padding: "9px 14px",
        borderRadius: 7,
        border: "1px solid #ccc",
        background: "white",
        cursor: "pointer"
    },
    empty: {
        border: "1px dashed #ccc",
        borderRadius: 8,
        padding: 30,
        textAlign: "center",
        marginTop: 15
    },
    emptyIcon: {
        fontSize: 32,
        marginBottom: 8
    },
    infoBox: {
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 14,
        marginBottom: 20,
        background: "#fafafa"
    },
    toolGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12
    },
    toolCard: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 7
    }
};
