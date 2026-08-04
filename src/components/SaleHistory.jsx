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
                    data.error
                    || "No se pudo cargar el historial de ventas"
                );
            }

            setSales(Array.isArray(data) ? data : []);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }

    async function deleteSale(sale) {
        const confirmed = window.confirm(
            `¿Seguro que querés eliminar la venta ${sale.number || ""}?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `${API}/sales/${sale.id}`,
                { method: "DELETE" }
            );
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudo eliminar la venta"
                );
            }

            alert(data.mensaje || "Venta eliminada");
            await loadSales();

            if (onChanged) {
                onChanged();
            }
        } catch (deleteError) {
            alert(`❌ ${deleteError.message}`);
        }
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
        const parts = normalized.split("-");

        if (parts.length !== 3) return normalized;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function saleDetail(sale) {
        const detail = (sale.items || [])
            .map(
                (item) =>
                    `${item.name} × ${formatNumber(item.quantity)}`
            )
            .join(" · ");

        return detail || "Sin detalle de productos";
    }

    function returnedDetail(sale) {
        const items = sale.returned_containers || [];

        if (items.length === 0) return "";

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
                    <h2 style={styles.title}>
                        📋 Historial de Ventas
                    </h2>
                    <p style={styles.subtitle}>
                        Vista compacta, sin desplazamiento horizontal.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadSales}
                    style={styles.refreshButton}
                >
                    🔄 Actualizar
                </button>
            </div>

            {loading && <p>Cargando ventas...</p>}

            {error && (
                <div style={styles.errorBox}>
                    {error}
                </div>
            )}

            {!loading && !error && sales.length === 0 && (
                <p>No hay ventas registradas.</p>
            )}

            <div style={styles.list}>
                {!loading
                    && !error
                    && sales.map((sale) => {
                        const returned = returnedDetail(sale);

                        return (
                            <article
                                key={sale.id}
                                style={styles.saleCard}
                            >
                                <div style={styles.mainArea}>
                                    <div style={styles.firstLine}>
                                        <strong style={styles.saleNumber}>
                                            {sale.number}
                                        </strong>

                                        <span>
                                            {formatDate(sale.date)}
                                        </span>

                                        <span style={styles.client}>
                                            {sale.client || "Consumidor final"}
                                        </span>

                                        <span>
                                            {sale.payment_method || "Caja"}
                                        </span>

                                        <strong style={styles.total}>
                                            {formatMoney(sale.total)}
                                        </strong>
                                    </div>

                                    <div
                                        style={styles.detailLine}
                                        title={saleDetail(sale)}
                                    >
                                        {saleDetail(sale)}
                                    </div>

                                    {(Number(sale.shipping_cost || 0) > 0
                                        || returned) && (
                                        <div style={styles.extraLine}>
                                            {Number(sale.shipping_cost || 0) > 0 && (
                                                <span>
                                                    Envío:{" "}
                                                    {formatMoney(sale.shipping_cost)}
                                                </span>
                                            )}

                                            {returned && (
                                                <span title={returned}>
                                                    Envases devueltos: {returned}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={styles.actions}>
                                    {onEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onEdit(sale)}
                                            style={styles.editButton}
                                        >
                                            ✏️ Editar
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => deleteSale(sale)}
                                        style={styles.deleteButton}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </article>
                        );
                    })}
            </div>
        </div>
    );
}

const styles = {
    container: {
        marginTop: 35,
        borderTop: "1px solid #ddd",
        paddingTop: 20,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15,
        flexWrap: "wrap",
        marginBottom: 15
    },
    title: {
        margin: 0
    },
    subtitle: {
        margin: "5px 0 0",
        color: "#666",
        fontSize: 13
    },
    refreshButton: {
        padding: "7px 12px"
    },
    list: {
        display: "grid",
        gap: 9
    },
    saleCard: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
        border: "1px solid #ddd",
        borderRadius: 9,
        padding: "11px 12px",
        background: "white",
        minWidth: 0
    },
    mainArea: {
        minWidth: 0
    },
    firstLine: {
        display: "flex",
        alignItems: "center",
        gap: "8px 14px",
        flexWrap: "wrap",
        fontSize: 13
    },
    saleNumber: {
        fontSize: 14
    },
    client: {
        fontWeight: 600
    },
    total: {
        marginLeft: "auto",
        whiteSpace: "nowrap"
    },
    detailLine: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 1.35,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: "#333"
    },
    extraLine: {
        display: "flex",
        gap: "5px 16px",
        flexWrap: "wrap",
        marginTop: 5,
        fontSize: 12,
        color: "#666",
        overflow: "hidden"
    },
    actions: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
        justifyContent: "flex-end"
    },
    editButton: {
        padding: "6px 9px",
        whiteSpace: "nowrap"
    },
    deleteButton: {
        padding: "6px 9px",
        background: "#d9534f",
        color: "white",
        border: "none",
        borderRadius: 5,
        whiteSpace: "nowrap"
    },
    errorBox: {
        padding: 12,
        border: "1px solid #d9534f",
        borderRadius: 7,
        color: "#a94442",
        background: "#fff5f5"
    }
};
