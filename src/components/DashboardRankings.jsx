import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

function dateKey(value) {
    return String(value || "").substring(0, 10);
}

function currentMonthKey() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0")
    ].join("-");
}

function money(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function number(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        maximumFractionDigits: 2
    });
}

export default function DashboardRankings() {
    const [sales, setSales] = useState([]);
    const [period, setPeriod] = useState("month");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadSales();
    }, []);

    async function loadSales() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API}/sales`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron cargar los rankings"
                );
            }

            setSales(Array.isArray(data) ? data : []);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredSales = useMemo(() => {
        const month = currentMonthKey();
        const year = String(new Date().getFullYear());

        return sales.filter((sale) => {
            const date = dateKey(sale.date);

            if (period === "month") {
                return date.startsWith(month);
            }

            if (period === "year") {
                return date.startsWith(year);
            }

            if (period === "custom") {
                if (from && date < from) return false;
                if (to && date > to) return false;
            }

            return true;
        });
    }, [sales, period, from, to]);

    const clientRanking = useMemo(() => {
        const ranking = new Map();

        filteredSales.forEach((sale) => {
            const client = String(
                sale.client || "Consumidor final"
            ).trim();

            if (
                !client
                || client.toLocaleLowerCase("es")
                    === "consumidor final"
            ) {
                return;
            }

            const key = client.toLocaleLowerCase("es");
            const current = ranking.get(key) || {
                client,
                sales: 0,
                units: 0,
                total: 0
            };

            current.sales += 1;
            current.total += Number(sale.total || 0);
            current.units += (sale.items || []).reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0),
                0
            );

            ranking.set(key, current);
        });

        return [...ranking.values()]
            .sort(
                (a, b) =>
                    b.total - a.total
                    || b.units - a.units
            )
            .slice(0, 10);
    }, [filteredSales]);

    const productRanking = useMemo(() => {
        const ranking = new Map();

        filteredSales.forEach((sale) => {
            (sale.items || []).forEach((item) => {
                const key = String(
                    item.product_id || item.name || ""
                );

                const current = ranking.get(key) || {
                    product: item.name || "Producto sin nombre",
                    units: 0,
                    total: 0
                };

                const quantity = Number(item.quantity || 0);
                const subtotal = Number(
                    item.subtotal
                    ?? quantity * Number(item.price || 0)
                );

                current.units += quantity;
                current.total += subtotal;
                ranking.set(key, current);
            });
        });

        return [...ranking.values()]
            .sort(
                (a, b) =>
                    b.units - a.units
                    || b.total - a.total
            )
            .slice(0, 10);
    }, [filteredSales]);

    return (
        <section style={styles.section}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>
                        🏆 Rankings de ventas
                    </h3>
                    <p style={styles.subtitle}>
                        Solo se consideran ventas reales.
                    </p>
                </div>

                <div style={styles.filters}>
                    <select
                        value={period}
                        onChange={(event) =>
                            setPeriod(event.target.value)
                        }
                        style={styles.input}
                    >
                        <option value="month">Mes actual</option>
                        <option value="year">Año actual</option>
                        <option value="all">Histórico completo</option>
                        <option value="custom">Rango personalizado</option>
                    </select>

                    {period === "custom" && (
                        <>
                            <input
                                type="date"
                                value={from}
                                onChange={(event) =>
                                    setFrom(event.target.value)
                                }
                                style={styles.input}
                                title="Desde"
                            />
                            <input
                                type="date"
                                value={to}
                                onChange={(event) =>
                                    setTo(event.target.value)
                                }
                                style={styles.input}
                                title="Hasta"
                            />
                        </>
                    )}

                    <button
                        type="button"
                        onClick={loadSales}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {loading && <p>Cargando rankings...</p>}

            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div style={styles.columns}>
                    <RankingCard title="👥 Mejores clientes">
                        <div style={styles.table}>
                            <div style={styles.tableHeaderClients}>
                                <span>#</span>
                                <span>Cliente</span>
                                <span>Compras</span>
                                <span>Unidades</span>
                                <span>Total</span>
                            </div>

                            {clientRanking.length === 0 ? (
                                <p style={styles.empty}>
                                    No hay clientes identificados en el período.
                                </p>
                            ) : (
                                clientRanking.map((item, index) => (
                                    <div
                                        key={item.client}
                                        style={styles.tableRowClients}
                                    >
                                        <strong>{index + 1}</strong>
                                        <span style={styles.name}>
                                            {item.client}
                                        </span>
                                        <span>{item.sales}</span>
                                        <span>{number(item.units)}</span>
                                        <strong>{money(item.total)}</strong>
                                    </div>
                                ))
                            )}
                        </div>
                    </RankingCard>

                    <RankingCard title="📦 Productos más vendidos">
                        <div style={styles.table}>
                            <div style={styles.tableHeaderProducts}>
                                <span>#</span>
                                <span>Producto</span>
                                <span>Unidades</span>
                                <span>Total</span>
                            </div>

                            {productRanking.length === 0 ? (
                                <p style={styles.empty}>
                                    No hay productos vendidos en el período.
                                </p>
                            ) : (
                                productRanking.map((item, index) => (
                                    <div
                                        key={item.product}
                                        style={styles.tableRowProducts}
                                    >
                                        <strong>{index + 1}</strong>
                                        <span style={styles.name}>
                                            {item.product}
                                        </span>
                                        <strong>{number(item.units)}</strong>
                                        <span>{money(item.total)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </RankingCard>
                </div>
            )}
        </section>
    );
}

function RankingCard({ title, children }) {
    return (
        <div style={styles.card}>
            <h4 style={styles.cardTitle}>{title}</h4>
            {children}
        </div>
    );
}

const styles = {
    section: {
        marginTop: 25,
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
        minWidth: 0
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15,
        flexWrap: "wrap"
    },
    title: {
        margin: 0
    },
    subtitle: {
        margin: "5px 0 0",
        color: "#666",
        fontSize: 12
    },
    filters: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap"
    },
    input: {
        padding: 7,
        maxWidth: "100%"
    },
    columns: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(330px, 1fr))",
        gap: 18,
        marginTop: 16
    },
    card: {
        border: "1px solid #e1e1e1",
        borderRadius: 9,
        padding: 14,
        minWidth: 0
    },
    cardTitle: {
        margin: "0 0 10px"
    },
    table: {
        display: "grid",
        minWidth: 0
    },
    tableHeaderClients: {
        display: "grid",
        gridTemplateColumns:
            "28px minmax(100px, 1fr) 60px 65px 95px",
        gap: 8,
        padding: "7px 5px",
        borderBottom: "2px solid #ddd",
        fontSize: 11,
        fontWeight: "bold"
    },
    tableRowClients: {
        display: "grid",
        gridTemplateColumns:
            "28px minmax(100px, 1fr) 60px 65px 95px",
        gap: 8,
        alignItems: "center",
        padding: "8px 5px",
        borderBottom: "1px solid #eee",
        fontSize: 12
    },
    tableHeaderProducts: {
        display: "grid",
        gridTemplateColumns:
            "28px minmax(120px, 1fr) 70px 95px",
        gap: 8,
        padding: "7px 5px",
        borderBottom: "2px solid #ddd",
        fontSize: 11,
        fontWeight: "bold"
    },
    tableRowProducts: {
        display: "grid",
        gridTemplateColumns:
            "28px minmax(120px, 1fr) 70px 95px",
        gap: 8,
        alignItems: "center",
        padding: "8px 5px",
        borderBottom: "1px solid #eee",
        fontSize: 12
    },
    name: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    empty: {
        color: "#666",
        fontSize: 13
    },
    error: {
        marginTop: 12,
        padding: 10,
        border: "1px solid #d9534f",
        borderRadius: 7,
        color: "#a94442"
    }
};
