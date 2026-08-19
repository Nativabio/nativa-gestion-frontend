import { useEffect, useState } from "react";

export default function SupplierRanking() {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [period, setPeriod] = useState("month");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        loadPurchases();
    }, []);

    async function loadPurchases() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://127.0.0.1:8000/purchases");
            const data = await response.json();

            if (!response.ok || data?.error) {
                throw new Error(
                    data?.error || "No se pudieron cargar las compras."
                );
            }

            setPurchases(Array.isArray(data) ? data : []);
        } catch (err) {
            setPurchases([]);
            setError(
                err?.message || "No se pudo cargar el ranking de proveedores."
            );
        } finally {
            setLoading(false);
        }
    }

    function dateKey(value) {
        return String(value || "").substring(0, 10);
    }

    function normalizeName(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonth = `${currentYear}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;

    const filteredPurchases = purchases.filter((purchase) => {
        const date = dateKey(purchase.date);

        if (period === "all") return true;
        if (!date) return false;

        if (period === "month") {
            return date.substring(0, 7) === currentMonth;
        }

        if (period === "year") {
            return date.substring(0, 4) === currentYear;
        }

        if (period === "custom") {
            if (fromDate && date < fromDate) return false;
            if (toDate && date > toDate) return false;
            return true;
        }

        return true;
    });

    const totals = new Map();

    filteredPurchases.forEach((purchase) => {
        const supplier = String(purchase.supplier || "").trim();
        const normalized = normalizeName(supplier);

        if (!supplier || normalized === "sin proveedor") return;

        const current = totals.get(normalized) || {
            supplier,
            purchaseCount: 0,
            total: 0
        };

        current.purchaseCount += 1;
        current.total += Number(purchase.total || 0);
        totals.set(normalized, current);
    });

    const ranking = Array.from(totals.values()).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.supplier.localeCompare(b.supplier, "es", {
            sensitivity: "base"
        });
    });

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🏆 Ranking de Proveedores</h3>
                    <div style={styles.subtitle}>
                        Ordenado por importe total de compras
                    </div>
                </div>

                <button type="button" onClick={loadPurchases}>
                    ↻ Actualizar
                </button>
            </div>

            <div style={styles.filters}>
                <div>
                    <label style={styles.label}>Período</label>
                    <select
                        value={period}
                        onChange={(event) => setPeriod(event.target.value)}
                        style={styles.input}
                    >
                        <option value="month">Mes actual</option>
                        <option value="year">Año actual</option>
                        <option value="custom">Rango personalizado</option>
                        <option value="all">Histórico completo</option>
                    </select>
                </div>

                {period === "custom" && (
                    <>
                        <div>
                            <label style={styles.label}>Desde</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(event) =>
                                    setFromDate(event.target.value)
                                }
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label style={styles.label}>Hasta</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(event) =>
                                    setToDate(event.target.value)
                                }
                                style={styles.input}
                            />
                        </div>
                    </>
                )}
            </div>

            {loading && <p>Cargando ranking...</p>}

            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            {!loading && !error && ranking.length === 0 && (
                <p>No hay compras registradas para el período seleccionado.</p>
            )}

            {!loading && !error && ranking.length > 0 && (
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Puesto</th>
                                <th style={styles.th}>Proveedor</th>
                                <th style={styles.thRight}>Compras</th>
                                <th style={styles.thRight}>Total comprado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((row, index) => (
                                <tr key={`${normalizeName(row.supplier)}-${index}`}>
                                    <td style={styles.td}>
                                        <strong>{index + 1}</strong>
                                    </td>
                                    <td style={styles.td}>
                                        {row.supplier}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {row.purchaseCount}
                                    </td>
                                    <td style={styles.tdRight}>
                                        <strong>{formatMoney(row.total)}</strong>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
        marginTop: 20
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14
    },
    title: {
        margin: 0
    },
    subtitle: {
        color: "#777",
        fontSize: 12,
        marginTop: 4
    },
    filters: {
        display: "flex",
        gap: 12,
        alignItems: "end",
        flexWrap: "wrap",
        marginBottom: 14
    },
    label: {
        display: "block",
        fontSize: 12,
        color: "#666",
        marginBottom: 4
    },
    input: {
        padding: "7px 9px",
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "white"
    },
    tableWrap: {
        overflowX: "auto"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: 520
    },
    th: {
        textAlign: "left",
        padding: "9px 7px",
        borderBottom: "2px solid #ddd",
        fontSize: 13
    },
    thRight: {
        textAlign: "right",
        padding: "9px 7px",
        borderBottom: "2px solid #ddd",
        fontSize: 13
    },
    td: {
        padding: "9px 7px",
        borderBottom: "1px solid #eee",
        fontSize: 13
    },
    tdRight: {
        padding: "9px 7px",
        borderBottom: "1px solid #eee",
        textAlign: "right",
        fontSize: 13
    },
    error: {
        padding: 10,
        borderRadius: 7,
        background: "#fff0f0",
        color: "#a33b3b",
        border: "1px solid #e7b8b8",
        marginBottom: 12
    }
};
