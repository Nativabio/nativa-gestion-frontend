import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

const HABITUAL_SUPPLIERS = [
    {
        name: "Amizcle",
        matches: ["amizcle"]
    },
    {
        name: "Ecomarketshop",
        matches: ["ecomarketshop", "ecomarket"]
    },
    {
        name: "Parvati",
        matches: ["parvati"]
    },
    {
        name: "Ecosmética",
        matches: ["ecosmetica", "eco cosmetica", "eco cosmética"]
    }
];

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function canonicalSupplier(value) {
    const normalized = normalizeText(value);

    const found = HABITUAL_SUPPLIERS.find((supplier) =>
        supplier.matches.some((match) =>
            normalized.includes(normalizeText(match))
        )
    );

    return found ? found.name : null;
}

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
    return numberValue(value).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatQuantity(value) {
    return numberValue(value).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    if (!value) return "—";

    const text = String(value).substring(0, 10);
    const parts = text.split("-");

    if (parts.length !== 3) return text;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function normalizationForUnit(unit) {
    const value = normalizeText(unit);

    if (
        value === "g"
        || value.includes("gram")
        || value === "ml"
        || value.includes("mililit")
    ) {
        return {
            base: 100,
            label: `100 ${unit || ""}`.trim()
        };
    }

    if (
        value === "kg"
        || value.includes("kilogram")
        || value === "l"
        || value.includes("litro")
    ) {
        return {
            base: 1,
            label: unit || "unidad"
        };
    }

    return {
        base: 1,
        label: unit || "unidad"
    };
}

function shippingAllocation(purchase, item) {
    const shipping = Math.max(numberValue(purchase.shipping_cost), 0);

    if (shipping <= 0) return 0;

    const inventorySubtotal = (purchase.items || []).reduce(
        (sum, current) =>
            sum + Math.max(numberValue(current.price), 0),
        0
    );

    const extrasSubtotal = (purchase.extra_items || []).reduce(
        (sum, current) =>
            sum
            + Math.max(
                numberValue(
                    current.base_price
                    ?? current.price
                    ?? current.cost
                ),
                0
            ),
        0
    );

    const base = inventorySubtotal + extrasSubtotal;
    const itemPrice = Math.max(numberValue(item.price), 0);

    if (base <= 0 || itemPrice <= 0) return 0;

    return shipping * itemPrice / base;
}

export default function Cotizador() {
    const [materials, setMaterials] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [desiredQuantity, setDesiredQuantity] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        setError("");

        try {
            const [materialsResponse, purchasesResponse] =
                await Promise.all([
                    fetch(`${API}/raw-materials`),
                    fetch(`${API}/purchases`)
                ]);

            const materialsData = await materialsResponse.json();
            const purchasesData = await purchasesResponse.json();

            if (!materialsResponse.ok) {
                throw new Error(
                    materialsData?.error
                    || "No se pudieron cargar las materias primas."
                );
            }

            if (!purchasesResponse.ok) {
                throw new Error(
                    purchasesData?.error
                    || "No se pudo cargar el historial de compras."
                );
            }

            const sortedMaterials = Array.isArray(materialsData)
                ? [...materialsData].sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "es",
                        { sensitivity: "base" }
                    )
                )
                : [];

            setMaterials(sortedMaterials);
            setPurchases(
                Array.isArray(purchasesData)
                    ? purchasesData
                    : []
            );
        } catch (err) {
            setError(
                err?.message
                || "No se pudo cargar el Cotizador."
            );
        } finally {
            setLoading(false);
        }
    }

    const selected = useMemo(
        () =>
            materials.find(
                (material) =>
                    String(material.id) === String(selectedMaterial)
            )
            || null,
        [materials, selectedMaterial]
    );

    const unit = selected?.unit || "";
    const normalization = normalizationForUnit(unit);

    const history = useMemo(() => {
        if (!selectedMaterial) return [];

        const rows = [];

        (purchases || []).forEach((purchase) => {
            const supplier = canonicalSupplier(purchase.supplier);

            if (!supplier) return;

            (purchase.items || []).forEach((item) => {
                if (
                    String(item.raw_material_id)
                    !== String(selectedMaterial)
                ) {
                    return;
                }

                const quantity = numberValue(item.quantity);
                const price = numberValue(item.price);

                if (quantity <= 0 || price < 0) return;

                const allocatedShipping =
                    shippingAllocation(purchase, item);

                const finalCost = price + allocatedShipping;
                const unitCost = finalCost / quantity;
                const unitCostWithoutShipping = price / quantity;

                rows.push({
                    purchaseId: purchase.id,
                    purchaseNumber: purchase.number || "",
                    supplier,
                    date: purchase.date || "",
                    quantity,
                    price,
                    allocatedShipping,
                    finalCost,
                    unitCost,
                    unitCostWithoutShipping
                });
            });
        });

        return rows.sort((a, b) => {
            const byDate = String(b.date).localeCompare(
                String(a.date)
            );

            if (byDate !== 0) return byDate;

            return numberValue(b.purchaseId)
                - numberValue(a.purchaseId);
        });
    }, [purchases, selectedMaterial]);

    const ranking = useMemo(() => {
        const latestBySupplier = new Map();

        history.forEach((row) => {
            if (!latestBySupplier.has(row.supplier)) {
                latestBySupplier.set(row.supplier, row);
            }
        });

        const withData = [];
        const withoutData = [];

        HABITUAL_SUPPLIERS.forEach((supplier) => {
            const row = latestBySupplier.get(supplier.name);

            if (row) {
                withData.push({
                    ...row,
                    supplier: supplier.name,
                    hasData: true
                });
            } else {
                withoutData.push({
                    supplier: supplier.name,
                    hasData: false
                });
            }
        });

        withData.sort(
            (a, b) => a.unitCost - b.unitCost
        );

        return [...withData, ...withoutData];
    }, [history]);

    const availableRanking = ranking.filter(
        (row) => row.hasData
    );

    const desired = Math.max(
        numberValue(desiredQuantity),
        0
    );

    if (loading) {
        return (
            <div>
                <h2>💲 Cotizador</h2>
                <p>Cargando compras y materias primas...</p>
            </div>
        );
    }

    return (
        <div>
            <div style={styles.titleRow}>
                <div>
                    <h2 style={styles.title}>💲 Cotizador</h2>
                    <div style={styles.subtitle}>
                        Compará tus proveedores según tus compras reales.
                    </div>
                </div>

                <button onClick={load}>
                    ↻ Actualizar
                </button>
            </div>

            <div style={styles.tabs}>
                <button style={styles.activeTab}>
                    📚 Histórico de Nativa
                </button>

                <button
                    style={styles.disabledTab}
                    disabled
                    title="Lo agregamos en la próxima etapa"
                >
                    🌐 Precios web actuales — próxima etapa
                </button>
            </div>

            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            <div style={styles.searchCard}>
                <div style={styles.formGrid}>
                    <div>
                        <label style={styles.label}>
                            Materia prima
                        </label>

                        <select
                            value={selectedMaterial}
                            onChange={(event) => {
                                setSelectedMaterial(
                                    event.target.value
                                );
                                setDesiredQuantity("");
                            }}
                            style={styles.input}
                        >
                            <option value="">
                                Seleccionar materia prima
                            </option>

                            {materials.map((material) => (
                                <option
                                    key={material.id}
                                    value={material.id}
                                >
                                    {material.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={styles.label}>
                            Cantidad que necesitás
                            {unit ? ` (${unit})` : ""}
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Ej. 100, 250, 350, 500..."
                            value={desiredQuantity}
                            onChange={(event) =>
                                setDesiredQuantity(
                                    event.target.value
                                )
                            }
                            disabled={!selectedMaterial}
                            style={styles.input}
                        />

                        <div style={styles.help}>
                            Es opcional. El ranking funciona igual
                            aunque no indiques cantidad.
                        </div>
                    </div>
                </div>
            </div>

            {!selectedMaterial && (
                <div style={styles.empty}>
                    Elegí una materia prima para comparar
                    Amizcle, Ecomarketshop, Parvati y Ecosmética.
                </div>
            )}

            {selectedMaterial && (
                <>
                    <div style={styles.summaryRow}>
                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>
                                Materia prima
                            </span>
                            <strong>
                                {selected?.name || "—"}
                            </strong>
                        </div>

                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>
                                Compras encontradas
                            </span>
                            <strong>
                                {history.length}
                            </strong>
                        </div>

                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>
                                Comparación
                            </span>
                            <strong>
                                por {normalization.label}
                            </strong>
                        </div>

                        {desired > 0 && (
                            <div style={styles.summaryCard}>
                                <span style={styles.summaryLabel}>
                                    Cantidad consultada
                                </span>
                                <strong>
                                    {formatQuantity(desired)}
                                    {unit ? ` ${unit}` : ""}
                                </strong>
                            </div>
                        )}
                    </div>

                    {availableRanking.length === 0 ? (
                        <div style={styles.empty}>
                            Todavía no hay compras registradas de
                            <strong>
                                {" "}{selected?.name}
                            </strong>
                            {" "}en tus cuatro proveedores habituales.
                        </div>
                    ) : (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                Ranking por última compra de cada proveedor
                            </h3>

                            <p style={styles.explanation}>
                                Se usa la compra más reciente de cada proveedor
                                y se suma el envío prorrateado. Así evitamos
                                comparar un precio viejo con uno actual.
                            </p>

                            <div style={styles.tableScroller}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Puesto</th>
                                            <th style={styles.th}>Proveedor</th>
                                            <th style={styles.th}>Última compra</th>
                                            <th style={styles.th}>Cantidad</th>
                                            <th style={styles.th}>Precio MP</th>
                                            <th style={styles.th}>Envío asignado</th>
                                            <th style={styles.th}>Costo final</th>
                                            <th style={styles.th}>
                                                Costo / {normalization.label}
                                            </th>
                                            {desired > 0 && (
                                                <th style={styles.th}>
                                                    Estimado para {formatQuantity(desired)}
                                                    {unit ? ` ${unit}` : ""}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {ranking.map((row, index) => {
                                            if (!row.hasData) {
                                                return (
                                                    <tr key={row.supplier}>
                                                        <td style={styles.td}>—</td>
                                                        <td style={styles.td}>
                                                            <strong>{row.supplier}</strong>
                                                        </td>
                                                        <td
                                                            style={styles.noData}
                                                            colSpan={
                                                                desired > 0
                                                                    ? 7
                                                                    : 6
                                                            }
                                                        >
                                                            Sin compras registradas de
                                                            esta materia prima
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            const place =
                                                availableRanking.findIndex(
                                                    (available) =>
                                                        available.supplier
                                                        === row.supplier
                                                ) + 1;

                                            const normalizedCost =
                                                row.unitCost
                                                * normalization.base;

                                            const estimated =
                                                row.unitCost * desired;

                                            return (
                                                <tr
                                                    key={row.supplier}
                                                    style={
                                                        place === 1
                                                            ? styles.bestRow
                                                            : undefined
                                                    }
                                                >
                                                    <td style={styles.td}>
                                                        {place === 1
                                                            ? "🥇"
                                                            : place === 2
                                                                ? "🥈"
                                                                : place === 3
                                                                    ? "🥉"
                                                                    : place}
                                                    </td>

                                                    <td style={styles.td}>
                                                        <strong>
                                                            {row.supplier}
                                                        </strong>

                                                        {place === 1 && (
                                                            <div style={styles.bestText}>
                                                                Mejor última compra
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td style={styles.td}>
                                                        {formatDate(row.date)}
                                                    </td>

                                                    <td style={styles.td}>
                                                        {formatQuantity(row.quantity)}
                                                        {unit ? ` ${unit}` : ""}
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        {formatMoney(row.price)}
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        {formatMoney(
                                                            row.allocatedShipping
                                                        )}
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        <strong>
                                                            {formatMoney(row.finalCost)}
                                                        </strong>
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        <strong>
                                                            {formatMoney(normalizedCost)}
                                                        </strong>
                                                    </td>

                                                    {desired > 0 && (
                                                        <td style={styles.moneyTd}>
                                                            <strong>
                                                                {formatMoney(estimated)}
                                                            </strong>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {history.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                Historial usado para la comparación
                            </h3>

                            <div style={styles.tableScroller}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Fecha</th>
                                            <th style={styles.th}>Proveedor</th>
                                            <th style={styles.th}>Cantidad</th>
                                            <th style={styles.th}>Precio MP</th>
                                            <th style={styles.th}>Envío asignado</th>
                                            <th style={styles.th}>
                                                Costo / {normalization.label}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {history.map((row, index) => (
                                            <tr
                                                key={`${row.purchaseId}-${row.supplier}-${index}`}
                                            >
                                                <td style={styles.td}>
                                                    {formatDate(row.date)}
                                                </td>
                                                <td style={styles.td}>
                                                    {row.supplier}
                                                </td>
                                                <td style={styles.td}>
                                                    {formatQuantity(row.quantity)}
                                                    {unit ? ` ${unit}` : ""}
                                                </td>
                                                <td style={styles.moneyTd}>
                                                    {formatMoney(row.price)}
                                                </td>
                                                <td style={styles.moneyTd}>
                                                    {formatMoney(
                                                        row.allocatedShipping
                                                    )}
                                                </td>
                                                <td style={styles.moneyTd}>
                                                    {formatMoney(
                                                        row.unitCost
                                                        * normalization.base
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

const styles = {
    titleRow: {
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
        color: "#666",
        marginTop: 4
    },
    tabs: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 16
    },
    activeTab: {
        fontWeight: "bold"
    },
    disabledTab: {
        opacity: 0.55,
        cursor: "not-allowed"
    },
    error: {
        padding: 12,
        border: "1px solid #d99",
        borderRadius: 8,
        background: "#fff4f4",
        color: "#8a1111",
        marginBottom: 14
    },
    searchCard: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
        marginBottom: 16
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 14
    },
    label: {
        display: "block",
        fontWeight: "bold",
        marginBottom: 5
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 10px"
    },
    help: {
        marginTop: 5,
        color: "#777",
        fontSize: 12
    },
    summaryRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10,
        marginBottom: 16
    },
    summaryCard: {
        border: "1px solid #e0e0e0",
        borderRadius: 9,
        padding: 12,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 4
    },
    summaryLabel: {
        color: "#777",
        fontSize: 12
    },
    card: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
        marginBottom: 16
    },
    cardTitle: {
        marginTop: 0,
        marginBottom: 6
    },
    explanation: {
        color: "#666",
        fontSize: 13,
        marginTop: 0,
        marginBottom: 14
    },
    tableScroller: {
        width: "100%",
        overflowX: "auto"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: 760
    },
    th: {
        textAlign: "left",
        borderBottom: "2px solid #ddd",
        padding: "8px 7px",
        fontSize: 12,
        whiteSpace: "nowrap"
    },
    td: {
        borderBottom: "1px solid #eee",
        padding: "8px 7px",
        verticalAlign: "top",
        fontSize: 13
    },
    moneyTd: {
        borderBottom: "1px solid #eee",
        padding: "8px 7px",
        verticalAlign: "top",
        fontSize: 13,
        textAlign: "right",
        whiteSpace: "nowrap"
    },
    bestRow: {
        background: "#f2fbf4"
    },
    bestText: {
        fontSize: 11,
        color: "#26703b",
        marginTop: 2
    },
    noData: {
        borderBottom: "1px solid #eee",
        padding: "8px 7px",
        color: "#999",
        fontStyle: "italic",
        fontSize: 13
    },
    empty: {
        border: "1px dashed #bbb",
        borderRadius: 10,
        padding: 26,
        textAlign: "center",
        color: "#666",
        background: "#fff"
    }
};
