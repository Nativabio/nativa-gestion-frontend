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
    if (value === null || value === undefined || value === "") {
        return "—";
    }

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

function supplierOrder(name) {
    const index = HABITUAL_SUPPLIERS.findIndex(
        (supplier) => supplier.name === name
    );

    return index >= 0 ? index : 99;
}

export default function Cotizador() {
    const [materials, setMaterials] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [desiredQuantity, setDesiredQuantity] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [mode, setMode] = useState("history");
    const [webLoading, setWebLoading] = useState(false);
    const [webError, setWebError] = useState("");
    const [webData, setWebData] = useState(null);
    const [showSources, setShowSources] = useState(false);

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

                rows.push({
                    purchaseId: purchase.id,
                    supplier,
                    date: purchase.date || "",
                    quantity,
                    price,
                    allocatedShipping,
                    finalCost,
                    unitCost
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

    async function consultWebPrices() {
        if (!selected) {
            setWebError("Elegí una materia prima.");
            return;
        }

        if (desired <= 0) {
            setWebError(
                "Para comparar precios web indicá la cantidad exacta que querés comprar."
            );
            return;
        }

        setWebLoading(true);
        setWebError("");
        setWebData(null);

        try {
            const params = new URLSearchParams({
                raw_material_id: String(selected.id),
                query: selected.name || "",
                unit: unit || "",
                quantity: String(desired)
            });

            const response = await fetch(
                `${API}/supplier-web-quotes?${params.toString()}`
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error
                    || "No se pudieron consultar los precios web."
                );
            }

            setWebData(data);
        } catch (err) {
            setWebError(
                err?.message
                || "No se pudieron consultar los precios web."
            );
        } finally {
            setWebLoading(false);
        }
    }

    const webRows = useMemo(() => {
        const rows = Array.isArray(webData?.results)
            ? [...webData.results]
            : [];

        return rows.sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;

            return supplierOrder(a.provider)
                - supplierOrder(b.provider);
        });
    }, [webData]);

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
                        Compará tus proveedores por histórico o por precio web actual.
                    </div>
                </div>

                <button onClick={load}>
                    ↻ Actualizar datos de Nativa
                </button>
            </div>

            <div style={styles.tabs}>
                <button
                    style={
                        mode === "history"
                            ? styles.activeTab
                            : styles.tab
                    }
                    onClick={() => setMode("history")}
                >
                    📚 Histórico de Nativa
                </button>

                <button
                    style={
                        mode === "web"
                            ? styles.activeTab
                            : styles.tab
                    }
                    onClick={() => setMode("web")}
                >
                    🌐 Precios web actuales
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
                                setWebData(null);
                                setWebError("");
                                setShowSources(false);
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
                            onChange={(event) => {
                                setDesiredQuantity(
                                    event.target.value
                                );
                                setWebData(null);
                                setShowSources(false);
                            }}
                            disabled={!selectedMaterial}
                            style={styles.input}
                        />

                        <div style={styles.help}>
                            Opcional y variable según lo que vayas a comprar.
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

            {selectedMaterial && mode === "history" && (
                <>
                    <div style={styles.summaryRow}>
                        <Summary
                            label="Materia prima"
                            value={selected?.name || "—"}
                        />
                        <Summary
                            label="Compras encontradas"
                            value={history.length}
                        />
                        <Summary
                            label="Comparación"
                            value={`por ${normalization.label}`}
                        />
                        {desired > 0 && (
                            <Summary
                                label="Cantidad consultada"
                                value={
                                    `${formatQuantity(desired)}`
                                    + (unit ? ` ${unit}` : "")
                                }
                            />
                        )}
                    </div>

                    {availableRanking.length === 0 ? (
                        <div style={styles.empty}>
                            Todavía no hay compras registradas de{" "}
                            <strong>{selected?.name}</strong>
                            {" "}en tus cuatro proveedores habituales.
                        </div>
                    ) : (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                Ranking por última compra de cada proveedor
                            </h3>

                            <p style={styles.explanation}>
                                Se usa la compra más reciente de cada proveedor
                                y se suma el envío prorrateado.
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
                                        {ranking.map((row) => {
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
                                                        <Medal place={place} />
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

            {selectedMaterial && mode === "web" && (
                <>
                    <div style={styles.webActionCard}>
                        <div>
                            <h3 style={styles.cardTitle}>
                                🌐 Consulta en las tiendas ahora
                            </h3>
                            <p style={styles.explanation}>
                                Nativa usa una ficha confirmada por vos para cada
                                proveedor y presentación. Así no vuelve a adivinar
                                el producto por el nombre.
                            </p>
                        </div>

                        <div style={styles.actionButtons}>
                            <button
                                onClick={() => {
                                    if (desired <= 0) {
                                        setWebError(
                                            "Indicá primero la cantidad exacta que querés comprar."
                                        );
                                        return;
                                    }
                                    setWebError("");
                                    setShowSources(!showSources);
                                }}
                                style={styles.webButton}
                            >
                                ⚙️ Configurar fuentes
                            </button>

                            <button
                                onClick={consultWebPrices}
                                disabled={webLoading}
                                style={styles.webButton}
                            >
                                {webLoading
                                    ? "Consultando..."
                                    : "🔎 Consultar precios actuales"}
                            </button>
                        </div>
                    </div>

                    {showSources && desired > 0 && (
                        <SourceConfiguration
                            material={selected}
                            quantity={desired}
                            unit={unit}
                            onClose={() => setShowSources(false)}
                            onChanged={() => setWebData(null)}
                        />
                    )}

                    {webError && (
                        <div style={styles.error}>
                            {webError}
                        </div>
                    )}

                    {webLoading && (
                        <div style={styles.empty}>
                            Consultando Amizcle, Ecomarketshop,
                            Parvati y Ecosmética...
                        </div>
                    )}

                    {!webLoading && !webData && !webError && (
                        <div style={styles.empty}>
                            Indicá una cantidad (por ejemplo 250 ml) y configurá una vez
                            las fichas correctas con <strong>⚙️ Configurar fuentes</strong>.
                            Después Nativa reutiliza esas fuentes para esa presentación.
                        </div>
                    )}

                    {!webLoading && webData && (
                        <>
                            <div style={styles.summaryRow}>
                                <Summary
                                    label="Materia prima"
                                    value={selected?.name || "—"}
                                />
                                <Summary
                                    label="Comparación"
                                    value={
                                        unit
                                            ? `por 100 ${unit}`
                                            : "según presentación"
                                    }
                                />
                                {desired > 0 && (
                                    <Summary
                                        label="Cantidad que necesitás"
                                        value={
                                            `${formatQuantity(desired)}`
                                            + (unit ? ` ${unit}` : "")
                                        }
                                    />
                                )}
                                <Summary
                                    label="Proveedores consultados"
                                    value={webRows.length}
                                />
                            </div>

                            <div style={styles.notice}>
                                <strong>Importante:</strong>{" "}
                                para el Cotizador <strong>ml y cc son equivalentes</strong>.
                                Solo entra al ranking una fuente configurada para la
                                cantidad consultada. Si una tienda oculta el precio de
                                la variante en JavaScript, podés guardar un precio manual
                                de respaldo; queda marcado como manual y con fecha.
                            </div>

                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>
                                    Resultado web actual
                                </h3>

                                <div style={styles.tableScroller}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Puesto</th>
                                                <th style={styles.th}>Proveedor</th>
                                                <th style={styles.th}>Producto encontrado</th>
                                                <th style={styles.th}>Presentación</th>
                                                <th style={styles.th}>Precio publicado</th>
                                                <th style={styles.th}>
                                                    Costo / 100 {unit || ""}
                                                </th>
                                                {desired > 0 && (
                                                    <th style={styles.th}>
                                                        Equivalente {formatQuantity(desired)}
                                                        {unit ? ` ${unit}` : ""}
                                                    </th>
                                                )}
                                                <th style={styles.th}>Estado</th>
                                                <th style={styles.th}></th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {webRows.map((row) => (
                                                <tr
                                                    key={row.provider}
                                                    style={
                                                        row.rank === 1
                                                            ? styles.bestRow
                                                            : undefined
                                                    }
                                                >
                                                    <td style={styles.td}>
                                                        {row.rank
                                                            ? <Medal place={row.rank} />
                                                            : "—"}
                                                    </td>

                                                    <td style={styles.td}>
                                                        <strong>
                                                            {row.provider}
                                                        </strong>
                                                        {row.rank === 1 && (
                                                            <div style={styles.bestText}>
                                                                Más barato detectado
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td style={styles.td}>
                                                        {row.product_name || "—"}
                                                    </td>

                                                    <td style={styles.td}>
                                                        {row.presentation_quantity
                                                            ? (
                                                                <>
                                                                    {formatQuantity(
                                                                        row.presentation_quantity
                                                                    )}{" "}
                                                                    {row.presentation_unit}
                                                                </>
                                                            )
                                                            : "No detectada"}
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        {row.price !== undefined
                                                            ? formatMoney(row.price)
                                                            : "—"}
                                                    </td>

                                                    <td style={styles.moneyTd}>
                                                        {row.normalized_cost !== null
                                                            && row.normalized_cost !== undefined
                                                            ? formatMoney(
                                                                row.normalized_cost
                                                            )
                                                            : "—"}
                                                    </td>

                                                    {desired > 0 && (
                                                        <td style={styles.moneyTd}>
                                                            {row.estimated_cost !== null
                                                                && row.estimated_cost !== undefined
                                                                ? formatMoney(
                                                                    row.estimated_cost
                                                                )
                                                                : "—"}
                                                        </td>
                                                    )}

                                                    <td style={styles.td}>
                                                        <Status row={row} />
                                                    </td>

                                                    <td style={styles.td}>
                                                        {row.product_url ? (
                                                            <a
                                                                href={row.product_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Abrir producto
                                                            </a>
                                                        ) : row.store_url ? (
                                                            <a
                                                                href={row.store_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Abrir tienda
                                                            </a>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}


function SourceConfiguration({
    material,
    quantity,
    unit,
    onClose,
    onChanged
}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [candidateLoading, setCandidateLoading] = useState("");
    const [candidates, setCandidates] = useState({});

    const sourceUnit = normalizedSourceUnit(unit);

    useEffect(() => {
        loadSources();
    }, [material?.id, quantity, sourceUnit]);

    function normalizedSourceUnit(value) {
        const normalized = normalizeText(value);

        if (
            normalized === "ml"
            || normalized === "cc"
            || normalized.includes("mililit")
        ) {
            return "ml";
        }

        if (
            normalized === "g"
            || normalized.includes("gram")
        ) {
            return "g";
        }

        return normalized || "unidad";
    }

    async function loadSources() {
        if (!material?.id || quantity <= 0) return;

        setLoading(true);
        setMessage("");

        try {
            const params = new URLSearchParams({
                quantity: String(quantity),
                unit: sourceUnit
            });

            const response = await fetch(
                `${API}/supplier-quote-sources/${material.id}?${params.toString()}`
            );
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron cargar las fuentes."
                );
            }

            setRows(
                (data.results || []).map((row) => ({
                    ...row,
                    product_url: row.product_url || "",
                    product_name: row.product_name || "",
                    manual_price: row.manual_price ?? ""
                }))
            );
        } catch (err) {
            setMessage(
                err.message || "No se pudieron cargar las fuentes."
            );
        } finally {
            setLoading(false);
        }
    }

    function updateRow(provider, field, value) {
        setRows((current) =>
            current.map((row) =>
                row.provider === provider
                    ? { ...row, [field]: value }
                    : row
            )
        );
    }

    async function searchCandidates(row) {
        setCandidateLoading(row.provider);
        setMessage("");

        try {
            const params = new URLSearchParams({
                provider: row.provider,
                query: material.name || "",
                unit: sourceUnit,
                quantity: String(quantity)
            });

            const response = await fetch(
                `${API}/supplier-source-candidates?${params.toString()}`
            );
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron buscar candidatos."
                );
            }

            setCandidates((current) => ({
                ...current,
                [row.provider]: data.results || []
            }));
        } catch (err) {
            setMessage(
                err.message || "No se pudieron buscar candidatos."
            );
        } finally {
            setCandidateLoading("");
        }
    }

    async function saveRow(row) {
        const url = String(row.product_url || "").trim();

        if (!url) {
            setMessage(
                `Pegá o elegí la ficha correcta de ${row.provider}.`
            );
            return;
        }

        setMessage("");

        try {
            const response = await fetch(
                `${API}/supplier-quote-sources/${material.id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        provider: row.provider,
                        product_url: url,
                        product_name:
                            String(row.product_name || "").trim(),
                        target_quantity: quantity,
                        target_unit: sourceUnit,
                        manual_price:
                            row.manual_price === ""
                                ? null
                                : numberValue(row.manual_price)
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudo guardar la fuente."
                );
            }

            setMessage(
                `✓ ${row.provider}: fuente guardada para ${formatQuantity(quantity)} ${sourceUnit}.`
            );
            await loadSources();
            onChanged?.();
        } catch (err) {
            setMessage(
                err.message || "No se pudo guardar la fuente."
            );
        }
    }

    async function removeRow(row) {
        if (!row.configured) return;

        setMessage("");

        try {
            const params = new URLSearchParams({
                quantity: String(quantity),
                unit: sourceUnit
            });

            const response = await fetch(
                `${API}/supplier-quote-sources/${material.id}/${encodeURIComponent(row.provider)}?${params.toString()}`,
                { method: "DELETE" }
            );
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudo quitar la fuente."
                );
            }

            setMessage(`Fuente de ${row.provider} eliminada.`);
            setCandidates((current) => ({
                ...current,
                [row.provider]: []
            }));
            await loadSources();
            onChanged?.();
        } catch (err) {
            setMessage(err.message || "No se pudo quitar la fuente.");
        }
    }

    if (loading) {
        return (
            <div style={styles.card}>
                <strong>⚙️ Cargando fuentes...</strong>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <div style={styles.configHeader}>
                <div>
                    <h3 style={styles.cardTitle}>
                        ⚙️ Fuentes de {material?.name}
                    </h3>
                    <p style={styles.explanation}>
                        Configurando <strong>{formatQuantity(quantity)} {sourceUnit}</strong>.
                        Para líquidos, 250 cc y 250 ml se guardan como la misma presentación.
                    </p>
                </div>

                <button onClick={onClose}>
                    Cerrar
                </button>
            </div>

            {message && (
                <div style={styles.configMessage}>
                    {message}
                </div>
            )}

            <div style={styles.sourceGrid}>
                {rows.map((row) => (
                    <div
                        key={row.provider}
                        style={styles.sourceCard}
                    >
                        <div style={styles.sourceTitleRow}>
                            <strong>{row.provider}</strong>
                            <span
                                style={
                                    row.configured
                                        ? styles.okBadge
                                        : styles.mutedBadge
                                }
                            >
                                {row.configured
                                    ? "✓ Configurada"
                                    : "Sin configurar"}
                            </span>
                        </div>

                        <label style={styles.smallLabel}>
                            Ficha del producto
                        </label>

                        <input
                            value={row.product_url}
                            onChange={(event) =>
                                updateRow(
                                    row.provider,
                                    "product_url",
                                    event.target.value
                                )
                            }
                            placeholder="https://..."
                            style={styles.input}
                        />

                        <label style={styles.smallLabel}>
                            Nombre en esa tienda
                        </label>

                        <input
                            value={row.product_name}
                            onChange={(event) =>
                                updateRow(
                                    row.provider,
                                    "product_name",
                                    event.target.value
                                )
                            }
                            placeholder="Ej. Aceite Almendras Dulces"
                            style={styles.input}
                        />

                        <label style={styles.smallLabel}>
                            Precio manual de respaldo (opcional)
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.manual_price}
                            onChange={(event) =>
                                updateRow(
                                    row.provider,
                                    "manual_price",
                                    event.target.value
                                )
                            }
                            placeholder={
                                `Precio de ${formatQuantity(quantity)} ${sourceUnit}`
                            }
                            style={styles.input}
                        />

                        <div style={styles.help}>
                            Usalo solo si la tienda oculta el precio de
                            esta variante. Nativa intentará leerlo automáticamente primero.
                        </div>

                        <div style={styles.sourceActions}>
                            <button
                                onClick={() => searchCandidates(row)}
                                disabled={
                                    candidateLoading === row.provider
                                }
                            >
                                {candidateLoading === row.provider
                                    ? "Buscando..."
                                    : "🔎 Buscar candidatos"}
                            </button>

                            <button onClick={() => saveRow(row)}>
                                💾 Guardar
                            </button>

                            {row.configured && (
                                <button
                                    onClick={() => removeRow(row)}
                                    style={styles.dangerButton}
                                >
                                    Quitar
                                </button>
                            )}
                        </div>

                        {(candidates[row.provider] || []).length > 0 && (
                            <div style={styles.candidateBox}>
                                <strong style={styles.candidateTitle}>
                                    Posibles fichas
                                </strong>

                                {(candidates[row.provider] || []).map(
                                    (candidate) => (
                                        <div
                                            key={candidate.url}
                                            style={styles.candidateRow}
                                        >
                                            <div style={styles.candidateText}>
                                                {candidate.title || candidate.url}
                                            </div>

                                            <div style={styles.candidateActions}>
                                                <a
                                                    href={candidate.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Ver
                                                </a>

                                                <button
                                                    onClick={() => {
                                                        updateRow(
                                                            row.provider,
                                                            "product_url",
                                                            candidate.url
                                                        );
                                                        updateRow(
                                                            row.provider,
                                                            "product_name",
                                                            candidate.title || ""
                                                        );
                                                    }}
                                                >
                                                    Usar
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {row.updated_at && (
                            <div style={styles.help}>
                                Última configuración: {row.updated_at}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Summary({ label, value }) {
    return (
        <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>
                {label}
            </span>
            <strong>{value}</strong>
        </div>
    );
}

function Medal({ place }) {
    if (place === 1) return "🥇";
    if (place === 2) return "🥈";
    if (place === 3) return "🥉";
    return place;
}

function Status({ row }) {
    if (row.status === "not_configured") {
        return (
            <div>
                <span style={styles.mutedBadge}>
                    ⚙️ Fuente sin configurar
                </span>
                <div style={styles.statusDetail}>
                    Confirmá la ficha para esta presentación.
                </div>
            </div>
        );
    }

    if (row.status === "manual" && row.normalized_cost !== null) {
        return (
            <div>
                <span style={styles.warningBadge}>
                    ✎ Precio manual
                </span>
                {row.updated_at && (
                    <div style={styles.statusDetail}>
                        Actualizado: {row.updated_at}
                    </div>
                )}
            </div>
        );
    }

    if (row.status === "needs_manual") {
        return (
            <div>
                <span style={styles.warningBadge}>
                    ⚠ Precio no legible
                </span>
                {row.message && (
                    <div style={styles.statusDetail}>
                        {row.message}
                    </div>
                )}
            </div>
        );
    }

    if (row.status === "ok" && row.normalized_cost !== null) {
        return (
            <span style={styles.okBadge}>
                ✓ Comparable
            </span>
        );
    }

    if (row.status === "ok") {
        return (
            <div>
                <span style={styles.warningBadge}>
                    ⚠ Revisar presentación
                </span>
                {row.message && (
                    <div style={styles.statusDetail}>
                        {row.message}
                    </div>
                )}
            </div>
        );
    }

    if (row.status === "not_found") {
        return (
            <div>
                <span style={styles.mutedBadge}>
                    Sin resultado
                </span>
                {row.message && (
                    <div style={styles.statusDetail}>
                        {row.message}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <span style={styles.errorBadge}>
                Error de consulta
            </span>
            {row.message && (
                <div style={styles.statusDetail}>
                    {row.message}
                </div>
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
    tab: {
        padding: "8px 12px",
        cursor: "pointer"
    },
    activeTab: {
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: "bold",
        border: "2px solid #555"
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
        gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
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
        gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
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
    webActionCard: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap"
    },
    webButton: {
        padding: "10px 14px",
        fontWeight: "bold",
        cursor: "pointer"
    },
    actionButtons: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
    },
    configHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap"
    },
    configMessage: {
        padding: "9px 11px",
        borderRadius: 7,
        background: "#f6f6f6",
        marginBottom: 12,
        fontSize: 13
    },
    sourceGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 12
    },
    sourceCard: {
        border: "1px solid #ddd",
        borderRadius: 9,
        padding: 12,
        background: "#fafafa"
    },
    sourceTitleRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 10
    },
    smallLabel: {
        display: "block",
        fontSize: 12,
        fontWeight: "bold",
        marginTop: 9,
        marginBottom: 4
    },
    sourceActions: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
        marginTop: 11
    },
    dangerButton: {
        color: "#9a2222"
    },
    candidateBox: {
        borderTop: "1px solid #ddd",
        marginTop: 12,
        paddingTop: 10
    },
    candidateTitle: {
        fontSize: 12
    },
    candidateRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderBottom: "1px solid #eee"
    },
    candidateText: {
        fontSize: 12,
        overflowWrap: "anywhere"
    },
    candidateActions: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        flexShrink: 0
    },
    cardTitle: {
        marginTop: 0,
        marginBottom: 6
    },
    explanation: {
        color: "#666",
        fontSize: 13,
        marginTop: 0,
        marginBottom: 8
    },
    notice: {
        border: "1px solid #e0d29e",
        borderRadius: 9,
        background: "#fffbea",
        padding: 12,
        marginBottom: 16,
        fontSize: 13
    },
    tableScroller: {
        width: "100%",
        overflowX: "auto"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: 850
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
        background: "#fff",
        marginBottom: 16
    },
    okBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 999,
        background: "#e8f6eb",
        color: "#226d36",
        fontSize: 11,
        fontWeight: "bold"
    },
    warningBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 999,
        background: "#fff3cd",
        color: "#7a5c00",
        fontSize: 11,
        fontWeight: "bold"
    },
    mutedBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 999,
        background: "#f0f0f0",
        color: "#666",
        fontSize: 11,
        fontWeight: "bold"
    },
    errorBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 999,
        background: "#fde8e8",
        color: "#9a2222",
        fontSize: 11,
        fontWeight: "bold"
    },
    statusDetail: {
        marginTop: 4,
        color: "#777",
        fontSize: 11,
        maxWidth: 240
    }
};
