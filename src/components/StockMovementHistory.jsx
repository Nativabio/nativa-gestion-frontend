function formatMoney(value) {
    return Number(value || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    const normalized = String(value || "").substring(0, 10);
    const parts = normalized.split("-");

    if (parts.length !== 3) return normalized;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function itemsText(movement) {
    return (movement.items || [])
        .map(
            (item) =>
                `${item.name} × ${Number(item.quantity || 0)}`
        )
        .join(" · ");
}

export default function StockMovementHistory({
    movements = [],
    onDelete
}) {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>
                Historial de control de productos
            </h3>

            {movements.length === 0 && (
                <p>No hay ajustes de stock registrados.</p>
            )}

            <div style={styles.list}>
                {movements.map((movement) => {
                    const type = String(
                        movement.movement_type || "OUT"
                    ).toUpperCase();

                    const actionName =
                        type === "IN" ? "Alta" : "Baja";

                    const products = itemsText(movement);

                    return (
                        <div
                            key={movement.id}
                            style={styles.row}
                        >
                            <div style={styles.content}>
                                <div style={styles.line}>
                                    <strong>
                                        {actionName} {movement.number}
                                        {" — "}
                                        {movement.reason_label}
                                    </strong>

                                    <span>
                                        {formatDate(movement.date)}
                                    </span>

                                    <span>
                                        Costo:{" "}
                                        {formatMoney(movement.total_cost)}
                                    </span>
                                </div>

                                <div
                                    style={styles.lineMuted}
                                    title={[
                                        products,
                                        movement.notes
                                    ].filter(Boolean).join(" — ")}
                                >
                                    {products || "Sin productos"}
                                    {movement.notes
                                        ? ` — ${movement.notes}`
                                        : ""}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => onDelete?.(movement)}
                                style={styles.deleteButton}
                                title="Eliminar movimiento"
                            >
                                🗑️
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    card: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        marginTop: 20,
        background: "white",
        minWidth: 0
    },
    title: {
        marginTop: 0
    },
    list: {
        display: "grid"
    },
    row: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        padding: "9px 0",
        borderBottom: "1px solid #e7e7e7",
        minWidth: 0
    },
    content: {
        minWidth: 0
    },
    line: {
        display: "flex",
        gap: "6px 14px",
        alignItems: "center",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: 13
    },
    lineMuted: {
        marginTop: 4,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: "#666",
        fontSize: 12
    },
    deleteButton: {
        padding: "5px 8px",
        flexShrink: 0
    }
};
