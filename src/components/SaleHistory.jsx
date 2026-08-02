import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function SaleHistory({
    version = 0,
    onEdit,
    onChanged
}) {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadSales();
    }, [version]);

    async function loadSales() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API}/sales`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudo cargar el historial de ventas"
                );
            }

            setSales(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function deleteSale(id) {
        const confirmed = window.confirm(
            "¿Seguro que querés eliminar esta venta? Se revertirá el stock, los lotes, la contabilidad y los envases devueltos."
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API}/sales/${id}`, {
                method: "DELETE"
            });
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudo eliminar la venta"
                );
            }

            alert(data.mensaje || "Venta eliminada");
            await loadSales();

            if (onChanged) {
                await onChanged();
            }
        } catch (err) {
            alert(`❌ ${err.message}`);
        }
    }

    function saleDetail(sale) {
        const items = sale.items || [];

        if (items.length === 0) {
            return "Sin detalle";
        }

        return items
            .map(
                (item) =>
                    `${item.name} × ${formatNumber(item.quantity)}`
            )
            .join(" · ");
    }

    function returnedDetail(sale) {
        const items = sale.returned_containers || [];

        if (items.length === 0) {
            return "—";
        }

        return items
            .map(
                (item) =>
                    `${item.name} × ${formatNumber(item.quantity)}`
            )
            .join(" · ");
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>📋 Historial de Ventas</h2>
                    <p style={styles.subtitle}>
                        Ventas registradas, ordenadas desde la más reciente.
                    </p>
                </div>

                <button onClick={loadSales} style={styles.refreshButton}>
                    🔄 Actualizar
                </button>
            </div>

            {loading && <p>Cargando ventas...</p>}

            {error && <div style={styles.errorBox}>{error}</div>}

            {!loading && !error && sales.length === 0 && (
                <p>No hay ventas registradas.</p>
            )}

            {!loading && !error && sales.length > 0 && (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Venta</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Cliente</th>
                                <th style={styles.th}>Detalle</th>
                                <th style={styles.th}>Pago</th>
                                <th style={styles.thRight}>Productos</th>
                                <th style={styles.thRight}>Envío</th>
                                <th style={styles.thRight}>Total</th>
                                <th style={styles.th}>Envases devueltos</th>
                                <th style={styles.thCenter}>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {sales.map((sale) => {
                                const detail = saleDetail(sale);
                                const returns = returnedDetail(sale);
                                const shipping = Number(sale.shipping_cost || 0);
                                const productTotal =
                                    Number(sale.total || 0) - shipping;

                                return (
                                    <tr key={sale.id}>
                                        <td style={styles.tdStrong}>
                                            {sale.number}
                                        </td>
                                        <td style={styles.td}>
                                            {formatDate(sale.date)}
                                        </td>
                                        <td style={styles.td}>
                                            {sale.client || "Consumidor final"}
                                        </td>
                                        <td
                                            style={styles.detailCell}
                                            title={detail}
                                        >
                                            {detail}
                                        </td>
                                        <td style={styles.td}>
                                            {sale.payment_method || "Caja"}
                                            {sale.payment_status
                                                && sale.payment_status !== "PAGADA"
                                                ? ` · ${sale.payment_status}`
                                                : ""}
                                        </td>
                                        <td style={styles.tdRight}>
                                            {formatMoney(productTotal)}
                                        </td>
                                        <td style={styles.tdRight}>
                                            {formatMoney(shipping)}
                                        </td>
                                        <td style={styles.tdRight}>
                                            {formatMoney(sale.total)}
                                        </td>
                                        <td
                                            style={styles.returnCell}
                                            title={returns}
                                        >
                                            {returns}
                                        </td>
                                        <td style={styles.tdCenter}>
                                            <button
                                                onClick={() => onEdit?.(sale)}
                                                style={styles.editButton}
                                                title="Editar venta"
                                            >
                                                ✏️ Editar
                                            </button>

                                            <button
                                                onClick={() => deleteSale(sale.id)}
                                                style={styles.deleteButton}
                                                title="Eliminar venta"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

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
        maximumFractionDigits: 3
    });
}

function formatDate(value) {
    const normalized = String(value || "").substring(0, 10);

    if (!normalized) {
        return "";
    }

    const parts = normalized.split("-");

    if (parts.length !== 3) {
        return normalized;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const styles = {
    container: {
        marginTop: 35,
        borderTop: "1px solid #ddd",
        paddingTop: 20
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 18
    },
    title: { margin: 0 },
    subtitle: {
        margin: "5px 0 0",
        color: "#666",
        fontSize: 14
    },
    tableWrapper: {
        width: "100%",
        overflowX: "auto",
        border: "1px solid #ddd",
        borderRadius: 10,
        background: "white"
    },
    table: {
        width: "100%",
        minWidth: 1390,
        borderCollapse: "collapse"
    },
    th: {
        padding: "11px 12px",
        textAlign: "left",
        borderBottom: "2px solid #ddd",
        background: "#f6f6f6",
        fontSize: 13,
        whiteSpace: "nowrap"
    },
    thRight: {
        padding: "11px 12px",
        textAlign: "right",
        borderBottom: "2px solid #ddd",
        background: "#f6f6f6",
        fontSize: 13,
        whiteSpace: "nowrap"
    },
    thCenter: {
        padding: "11px 12px",
        textAlign: "center",
        borderBottom: "2px solid #ddd",
        background: "#f6f6f6",
        fontSize: 13,
        whiteSpace: "nowrap"
    },
    td: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 14,
        verticalAlign: "middle",
        whiteSpace: "nowrap"
    },
    tdStrong: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 14,
        fontWeight: "bold",
        verticalAlign: "middle",
        whiteSpace: "nowrap"
    },
    detailCell: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 14,
        verticalAlign: "middle",
        minWidth: 260,
        maxWidth: 400,
        lineHeight: 1.35
    },
    returnCell: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 14,
        verticalAlign: "middle",
        minWidth: 190,
        maxWidth: 320,
        lineHeight: 1.35
    },
    tdRight: {
        padding: "10px 12px",
        borderBottom: "1px solid #eee",
        textAlign: "right",
        fontSize: 14,
        fontWeight: "bold",
        verticalAlign: "middle",
        whiteSpace: "nowrap"
    },
    tdCenter: {
        padding: "8px 12px",
        borderBottom: "1px solid #eee",
        textAlign: "center",
        verticalAlign: "middle",
        whiteSpace: "nowrap"
    },
    editButton: {
        marginRight: 6,
        padding: "6px 10px",
        cursor: "pointer"
    },
    deleteButton: {
        background: "#d9534f",
        color: "white",
        padding: "6px 10px",
        border: "none",
        borderRadius: 5,
        cursor: "pointer",
        whiteSpace: "nowrap"
    },
    refreshButton: {
        padding: "7px 12px",
        cursor: "pointer"
    },
    errorBox: {
        padding: 12,
        border: "1px solid #d9534f",
        borderRadius: 7,
        color: "#a94442",
        background: "#fff5f5"
    }
};
