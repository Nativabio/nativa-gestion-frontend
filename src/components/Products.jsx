import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");

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

    async function createProduct() {
        if (!name.trim()) {
            alert("Ingresá el nombre del producto");
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
                stock: Number(stock || 0)
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
        await loadProducts();
    }

    async function updatePrice(id, productPrice) {
        const response = await fetch(`${API}/products/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price: Number(productPrice || 0)
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo guardar el precio");
            return;
        }

        alert("Precio guardado");
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

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API}/products/${product.id}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                alert(
                    `❌ ${
                        data.error
                        ||
                        "No se pudo eliminar el producto"
                    }`
                );
                return;
            }

            let successMessage = `✅ ${data.message}`;

            if (data.warning) {
                successMessage += `\n\n⚠️ ${data.warning}`;
            }

            alert(successMessage);
            await loadProducts();
        } catch {
            alert("❌ No se pudo conectar con el backend");
        }
    }

    function changePrice(productId, value) {
        setProducts((current) =>
            current.map((product) =>
                product.id === productId
                    ? {
                        ...product,
                        price: Number(value)
                    }
                    : product
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
            <h2>📦 Productos Terminados</h2>

            <div style={styles.newProductCard}>
                <h3>➕ Nuevo Producto</h3>

                <input
                    placeholder="Nombre producto"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    style={styles.newInput}
                />

                <input
                    type="number"
                    placeholder="Precio"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    style={styles.newInput}
                />

                <input
                    type="number"
                    placeholder="Stock inicial"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    style={styles.newInput}
                />

                <button onClick={createProduct}>💾 Crear</button>
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
                            <th style={styles.thRight}>Stock</th>
                            <th style={styles.thRight}>Valor al costo</th>
                            <th style={styles.th}>Precio de venta</th>
                            <th style={styles.thRight}>
                                Valor total de venta
                            </th>
                            <th style={styles.thCenter}>Acción</th>
                        </tr>
                    </thead>

                    <tbody>
                        {products.map((product) => {
                            const saleValue =
                                Number(product.stock || 0)
                                * Number(product.price || 0);

                            return (
                                <tr key={product.id}>
                                    <td style={styles.tdStrong}>
                                        {product.name}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {formatNumber(product.stock)}
                                    </td>
                                    <td style={styles.tdRight}>
                                        {formatMoney(product.inventory_value)}
                                    </td>
                                    <td style={styles.td}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={product.price}
                                            onChange={(event) =>
                                                changePrice(
                                                    product.id,
                                                    event.target.value
                                                )
                                            }
                                            style={{ width: 135 }}
                                        />
                                        <div style={styles.priceTotalHint}>
                                            Total: {formatMoney(saleValue)}
                                        </div>
                                    </td>
                                    <td style={styles.tdRightStrong}>
                                        {formatMoney(saleValue)}
                                    </td>
                                    <td style={styles.tdCenter}>
                                        <button
                                            onClick={() =>
                                                updatePrice(
                                                    product.id,
                                                    product.price
                                                )
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
                            <td colSpan="2" style={styles.footerLabel}>
                                Totales del stock
                            </td>
                            <td style={styles.tdRightStrong}>
                                {formatMoney(totalInventoryCost)}
                            </td>
                            <td></td>
                            <td style={styles.tdRightStrong}>
                                {formatMoney(totalSaleValue)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <p style={styles.note}>
                El valor al costo se toma de los lotes que respaldan el stock.
                El valor de venta se calcula con el precio vigente de cada producto.
            </p>
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
    newInput: {
        marginRight: 10,
        marginBottom: 8,
        padding: 8
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
        minWidth: 980,
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
    priceTotalHint: {
        marginTop: 5,
        fontSize: 12,
        color: "#666"
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
