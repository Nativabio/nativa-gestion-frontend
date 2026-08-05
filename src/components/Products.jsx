import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

const PRODUCT_TYPES = {
    MANUFACTURED: "Elaboración propia",
    RESALE: "Reventa"
};

export default function Products() {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [productType, setProductType] = useState("MANUFACTURED");
    const [unitCost, setUnitCost] = useState("");
    const [marginPercent, setMarginPercent] = useState("40");

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const response = await fetch(`${API}/products`);
            const data = await response.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }

    const newSuggestedPrice = useMemo(
        () => calculateSuggestedPrice(unitCost, marginPercent),
        [unitCost, marginPercent]
    );

    async function createProduct() {
        if (!name.trim()) {
            alert("Ingresá el nombre del producto");
            return;
        }

        const margin = Number(marginPercent || 0);

        if (margin < 0 || margin >= 100) {
            alert("El margen debe ser mayor o igual a 0 y menor a 100");
            return;
        }

        const response = await fetch(`${API}/products`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name.trim(),
                price: Number(price || 0),
                stock: Number(stock || 0),
                product_type: productType,
                unit_cost:
                    productType === "RESALE"
                        ? Number(unitCost || 0)
                        : 0,
                margin_percent: margin
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo crear el producto");
            return;
        }

        setName("");
        setPrice("");
        setStock("");
        setProductType("MANUFACTURED");
        setUnitCost("");
        setMarginPercent("40");
        await loadProducts();
    }

    async function updateProduct(product) {
        const response = await fetch(`${API}/products/${product.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price: Number(product.price || 0),
                margin_percent: Number(product.margin_percent || 0)
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo guardar el producto");
            return;
        }

        alert("Producto guardado");
        await loadProducts();
    }

    async function deleteProduct(product) {
        const confirmed = window.confirm(
            `¿Eliminar definitivamente ${product.name}?\n\n`
            +
            "Esta eliminación temporal no se bloqueará por ventas, "
            +
            "movimientos o compras anteriores. Esos registros se "
            +
            "conservarán y solo se quitará su vínculo directo con el "
            +
            "producto. Los asientos contables no se modificarán."
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `${API}/products/${product.id}`,
                { method: "DELETE" }
            );
            const data = await response.json();

            if (!response.ok || data.error) {
                alert(data.error || "No se pudo eliminar el producto");
                return;
            }

            let message = `✅ ${data.message}`;

            if (data.warning) {
                message += `\n\n⚠️ ${data.warning}`;
            }

            alert(message);
            await loadProducts();
        } catch {
            alert("❌ No se pudo conectar con el backend");
        }
    }

    function changeProduct(productId, field, value) {
        setProducts((current) =>
            current.map((product) =>
                product.id === productId
                    ? {
                        ...product,
                        [field]: Number(value)
                    }
                    : product
            )
        );
    }

    function useSuggestedPrice(product) {
        const suggested = calculateSuggestedPrice(
            product.unit_cost,
            product.margin_percent
        );

        setProducts((current) =>
            current.map((item) =>
                item.id === product.id
                    ? { ...item, price: suggested }
                    : item
            )
        );
    }

    const totalInventoryCost = useMemo(
        () =>
            products.reduce(
                (sum, product) =>
                    sum + Number(product.inventory_value || 0),
                0
            ),
        [products]
    );

    const totalSaleValue = useMemo(
        () =>
            products.reduce(
                (sum, product) =>
                    sum
                    + Number(product.stock || 0)
                    * Number(product.price || 0),
                0
            ),
        [products]
    );

    return (
        <div>
            <h2>📦 Productos</h2>

            <div style={styles.newProductCard}>
                <h3>➕ Nuevo Producto</h3>

                <div style={styles.formGrid}>
                    <div>
                        <label>Nombre</label>
                        <input
                            placeholder="Nombre del producto"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div>
                        <label>Tipo</label>
                        <select
                            value={productType}
                            onChange={(event) =>
                                setProductType(event.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="MANUFACTURED">
                                Elaboración propia
                            </option>
                            <option value="RESALE">
                                Producto de reventa
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Precio de venta</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Precio"
                            value={price}
                            onChange={(event) => setPrice(event.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div>
                        <label>Stock inicial</label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Stock"
                            value={stock}
                            onChange={(event) => setStock(event.target.value)}
                            style={styles.input}
                        />
                    </div>

                    {productType === "RESALE" && (
                        <>
                            <div>
                                <label>Costo unitario inicial</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitCost}
                                    onChange={(event) =>
                                        setUnitCost(event.target.value)
                                    }
                                    style={styles.input}
                                />
                                <div style={styles.helpText}>
                                    Luego se actualizará desde Compras.
                                </div>
                            </div>

                            <div>
                                <label>Margen deseado (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="99.99"
                                    step="0.01"
                                    value={marginPercent}
                                    onChange={(event) =>
                                        setMarginPercent(event.target.value)
                                    }
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.suggestedCard}>
                                <span>Precio sugerido</span>
                                <strong>
                                    {formatMoney(newSuggestedPrice)}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPrice(
                                            newSuggestedPrice
                                                ? String(newSuggestedPrice)
                                                : ""
                                        )
                                    }
                                    disabled={newSuggestedPrice <= 0}
                                >
                                    Usar sugerido
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <button onClick={createProduct} style={styles.createButton}>
                    💾 Crear
                </button>
            </div>

            <div style={styles.infoBox}>
                Los productos de reventa no usan fórmula ni lote de producción.
                El stock y el costo promedio se actualizan al registrarlos en
                Compras.
            </div>

            <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <span>Valor total al costo</span>
                    <strong>{formatMoney(totalInventoryCost)}</strong>
                </div>

                <div style={styles.summaryCard}>
                    <span>Valor total a precio de venta</span>
                    <strong>{formatMoney(totalSaleValue)}</strong>
                </div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Producto</th>
                            <th style={styles.th}>Tipo</th>
                            <th style={styles.thRight}>Stock</th>
                            <th style={styles.thRight}>Costo unitario</th>
                            <th style={styles.thRight}>Valor al costo</th>
                            <th style={styles.th}>Margen</th>
                            <th style={styles.thRight}>Precio sugerido</th>
                            <th style={styles.th}>Precio de venta</th>
                            <th style={styles.thRight}>Valor venta</th>
                            <th style={styles.thCenter}>Acción</th>
                        </tr>
                    </thead>

                    <tbody>
                        {products.map((product) => {
                            const isResale =
                                product.product_type === "RESALE";
                            const saleValue =
                                Number(product.stock || 0)
                                * Number(product.price || 0);
                            const suggested = isResale
                                ? calculateSuggestedPrice(
                                    product.unit_cost,
                                    product.margin_percent
                                )
                                : 0;

                            return (
                                <tr key={product.id}>
                                    <td style={styles.tdStrong}>
                                        {product.name}
                                    </td>
                                    <td style={styles.td}>
                                        <span
                                            style={
                                                isResale
                                                    ? styles.resaleBadge
                                                    : styles.manufacturedBadge
                                            }
                                        >
                                            {PRODUCT_TYPES[
                                                product.product_type
                                            ] || "Elaboración propia"}
                                        </span>
                                    </td>
                                    <td style={styles.tdRight}>
                                        {formatNumber(product.stock)}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {formatMoney(product.unit_cost)}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {formatMoney(product.inventory_value)}
                                    </td>
                                    <td style={styles.td}>
                                        {isResale ? (
                                            <input
                                                type="number"
                                                min="0"
                                                max="99.99"
                                                step="0.01"
                                                value={product.margin_percent}
                                                onChange={(event) =>
                                                    changeProduct(
                                                        product.id,
                                                        "margin_percent",
                                                        event.target.value
                                                    )
                                                }
                                                style={{ width: 85 }}
                                            />
                                        ) : (
                                            <span style={styles.mutedText}>
                                                En fórmula
                                            </span>
                                        )}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {isResale ? (
                                            <>
                                                <strong>
                                                    {formatMoney(suggested)}
                                                </strong>
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            useSuggestedPrice(
                                                                product
                                                            )
                                                        }
                                                        style={styles.smallButton}
                                                    >
                                                        Usar
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <span style={styles.mutedText}>—</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={product.price}
                                            onChange={(event) =>
                                                changeProduct(
                                                    product.id,
                                                    "price",
                                                    event.target.value
                                                )
                                            }
                                            style={{ width: 125 }}
                                        />
                                    </td>
                                    <td style={styles.tdRightStrong}>
                                        {formatMoney(saleValue)}
                                    </td>
                                    <td style={styles.tdCenter}>
                                        <button
                                            onClick={() =>
                                                updateProduct(product)
                                            }
                                        >
                                            💾 Guardar
                                        </button>

                                        <button
                                            onClick={() =>
                                                deleteProduct(product)
                                            }
                                            style={{ marginLeft: 8 }}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot>
                        <tr style={styles.footerRow}>
                            <td colSpan="4" style={styles.footerLabel}>
                                Totales del stock
                            </td>
                            <td style={styles.tdRightStrong}>
                                {formatMoney(totalInventoryCost)}
                            </td>
                            <td colSpan="3"></td>
                            <td style={styles.tdRightStrong}>
                                {formatMoney(totalSaleValue)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <p style={styles.note}>
                En elaboración propia, el costo se toma de los lotes. En
                reventa, se toma del costo promedio vigente de las compras.
            </p>
        </div>
    );
}

function calculateSuggestedPrice(cost, marginPercent) {
    const normalizedCost = Math.max(Number(cost || 0), 0);
    const margin = Number(marginPercent || 0);

    if (margin < 0 || margin >= 100) return 0;

    const denominator = 1 - margin / 100;

    if (denominator <= 0) return 0;

    return Number((normalizedCost / denominator).toFixed(2));
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

const styles = {
    newProductCard: {
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 10
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
        alignItems: "start"
    },
    input: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 9px",
        marginTop: 4
    },
    helpText: {
        fontSize: 11,
        color: "#666",
        marginTop: 4
    },
    suggestedCard: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 10,
        background: "white",
        display: "flex",
        flexDirection: "column",
        gap: 6
    },
    createButton: {
        marginTop: 15,
        padding: "8px 15px",
        cursor: "pointer"
    },
    infoBox: {
        marginTop: 14,
        padding: 12,
        border: "1px solid #d7dfd3",
        borderRadius: 8,
        background: "#f8fbf6",
        color: "#44513f",
        fontSize: 13
    },
    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 15,
        margin: "22px 0"
    },
    summaryCard: {
        border: "1px solid #ddd",
        borderRadius: 9,
        padding: 16,
        background: "white",
        display: "flex",
        flexDirection: "column",
        gap: 7
    },
    table: {
        width: "100%",
        minWidth: 1480,
        borderCollapse: "collapse"
    },
    th: {
        textAlign: "left",
        padding: 10,
        borderBottom: "2px solid #bbb",
        background: "#f6f6f6"
    },
    thRight: {
        textAlign: "right",
        padding: 10,
        borderBottom: "2px solid #bbb",
        background: "#f6f6f6"
    },
    thCenter: {
        textAlign: "center",
        padding: 10,
        borderBottom: "2px solid #bbb",
        background: "#f6f6f6"
    },
    td: {
        padding: 10,
        borderBottom: "1px solid #ddd"
    },
    tdStrong: {
        padding: 10,
        borderBottom: "1px solid #ddd",
        fontWeight: "bold"
    },
    tdRight: {
        padding: 10,
        borderBottom: "1px solid #ddd",
        textAlign: "right"
    },
    tdRightStrong: {
        padding: 10,
        borderBottom: "1px solid #ddd",
        textAlign: "right",
        fontWeight: "bold"
    },
    tdCenter: {
        padding: 10,
        borderBottom: "1px solid #ddd",
        textAlign: "center",
        whiteSpace: "nowrap"
    },
    resaleBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 10,
        background: "#fff3cd",
        color: "#6a5200",
        fontSize: 12,
        whiteSpace: "nowrap"
    },
    manufacturedBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 10,
        background: "#e8f1e5",
        color: "#34522d",
        fontSize: 12,
        whiteSpace: "nowrap"
    },
    smallButton: {
        marginTop: 4,
        padding: "3px 8px",
        fontSize: 11,
        cursor: "pointer"
    },
    mutedText: {
        color: "#777",
        fontSize: 12
    },
    footerRow: {
        borderTop: "2px solid #777",
        background: "#fafafa"
    },
    footerLabel: {
        padding: 10,
        textAlign: "right",
        fontWeight: "bold"
    },
    note: {
        color: "#666",
        fontSize: 13,
        marginTop: 12
    }
};
