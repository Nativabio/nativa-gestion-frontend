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
        const response = await fetch(`${API}/products`);
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
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

    async function updatePrice(id, updatedPrice) {
        const response = await fetch(`${API}/products/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price: Number(updatedPrice)
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo guardar el precio");
            return;
        }

        alert("Precio guardado");
    }

    async function deleteProduct(id) {
        if (!window.confirm("¿Eliminar este producto?")) return;

        const response = await fetch(`${API}/products/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo eliminar el producto");
            return;
        }

        await loadProducts();
    }

    const totalUnits = useMemo(
        () =>
            products.reduce(
                (sum, product) => sum + Number(product.stock || 0),
                0
            ),
        [products]
    );

    const totalInventoryValue = useMemo(
        () =>
            products.reduce(
                (sum, product) =>
                    sum + Number(product.inventory_value || 0),
                0
            ),
        [products]
    );

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

    return (
        <div>
            <h2>📦 Productos Terminados</h2>

            <div style={styles.newProductBox}>
                <h3>➕ Nuevo Producto</h3>

                <input
                    placeholder="Nombre producto"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    style={styles.input}
                />

                <input
                    type="number"
                    placeholder="Precio"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    style={styles.input}
                />

                <input
                    type="number"
                    placeholder="Stock inicial"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    style={styles.input}
                />

                <button onClick={createProduct}>💾 Crear</button>
            </div>

            <br />

            <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.cell}>Producto</th>
                            <th style={styles.cellRight}>Stock</th>
                            <th style={styles.cellRight}>
                                Valor de inventario
                            </th>
                            <th style={styles.cell}>Precio Venta</th>
                            <th style={styles.cell}>Acción</th>
                        </tr>
                    </thead>

                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td style={styles.cell}>{product.name}</td>
                                <td style={styles.cellRight}>
                                    {formatNumber(product.stock)}
                                </td>
                                <td style={styles.cellRight}>
                                    {formatMoney(product.inventory_value)}
                                </td>
                                <td style={styles.cell}>
                                    <input
                                        type="number"
                                        value={product.price}
                                        onChange={(event) => {
                                            setProducts((current) =>
                                                current.map((item) =>
                                                    item.id === product.id
                                                        ? {
                                                            ...item,
                                                            price: Number(
                                                                event.target.value
                                                            )
                                                        }
                                                        : item
                                                )
                                            );
                                        }}
                                    />
                                </td>
                                <td style={styles.cell}>
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
                                        style={{ marginLeft: 10 }}
                                        onClick={() =>
                                            deleteProduct(product.id)
                                        }
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr style={styles.totalRow}>
                            <td style={styles.cell}>
                                <strong>TOTAL</strong>
                            </td>
                            <td style={styles.cellRight}>
                                <strong>{formatNumber(totalUnits)}</strong>
                            </td>
                            <td style={styles.cellRight}>
                                <strong>
                                    {formatMoney(totalInventoryValue)}
                                </strong>
                            </td>
                            <td style={styles.cell} colSpan={2}>
                                <small>
                                    El valor se calcula con el costo de los
                                    lotes disponibles.
                                </small>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

const styles = {
    newProductBox: {
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 10
    },
    input: {
        marginRight: 10,
        padding: 8
    },
    table: {
        width: "100%",
        minWidth: 850,
        borderCollapse: "collapse"
    },
    cell: {
        padding: 9,
        borderBottom: "1px solid #ddd",
        textAlign: "left"
    },
    cellRight: {
        padding: 9,
        borderBottom: "1px solid #ddd",
        textAlign: "right"
    },
    totalRow: {
        background: "#f5f5f5",
        borderTop: "2px solid #999"
    }
};
