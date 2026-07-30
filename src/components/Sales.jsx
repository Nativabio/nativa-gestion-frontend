import { useEffect, useMemo, useState } from "react";
import SaleHistory from "./SaleHistory";

const API_URL = "http://127.0.0.1:8000";

const STOCK_MOVEMENT_REASONS = [
    { value: "STOCK_CONTROL", label: "Control de stock" },
    { value: "LOT_TEST", label: "Testeo de lote" },
    { value: "PERSONAL_USE", label: "Consumo personal" },
    { value: "GIFT", label: "Regalo u obsequio" }
];

const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 20,
    marginTop: 20
};

const inputStyle = {
    width: 300,
    maxWidth: "100%",
    padding: 8,
    marginTop: 5
};

const moneyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS"
});

export default function Sales() {
    const today = new Date().toISOString().substring(0, 10);

    // ==========================
    // VENTAS
    // ==========================

    const [client, setClient] = useState("");
    const [date, setDate] = useState(today);
    const [paymentMethod, setPaymentMethod] = useState("Caja");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [items, setItems] = useState([]);
    const [savingSale, setSavingSale] = useState(false);

    // ==========================
    // AJUSTES DE STOCK
    // ==========================

    const [movementType, setMovementType] = useState("OUT");
    const [movementDate, setMovementDate] = useState(today);
    const [movementReason, setMovementReason] = useState("STOCK_CONTROL");
    const [movementNotes, setMovementNotes] = useState("");
    const [movementSelectedProduct, setMovementSelectedProduct] = useState("");
    const [movementItems, setMovementItems] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);
    const [savingMovement, setSavingMovement] = useState(false);

    const [products, setProducts] = useState([]);

    const sortedProducts = useMemo(
        () =>
            [...products].sort((a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || ""),
                    "es",
                    { sensitivity: "base" }
                )
            ),
        [products]
    );

    useEffect(() => {
        loadProducts();
        loadStockMovements();
    }, []);

    async function loadProducts() {
        try {
            const response = await fetch(`${API_URL}/products`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron cargar los productos"
                );
            }

            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            alert(error.message);
        }
    }

    async function loadStockMovements() {
        try {
            const response = await fetch(`${API_URL}/stock-movements`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron cargar los ajustes de stock"
                );
            }

            setStockMovements(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        }
    }

    // ==========================
    // FUNCIONES DE VENTA
    // ==========================

    function addProduct() {
        if (selectedProduct === "") return;

        const product = products.find(
            (item) => item.id === Number(selectedProduct)
        );

        if (!product) return;

        const existingIndex = items.findIndex(
            (item) => item.id === product.id
        );

        if (existingIndex >= 0) {
            const copy = [...items];

            copy[existingIndex] = {
                ...copy[existingIndex],
                quantity: Number(copy[existingIndex].quantity || 0) + 1
            };

            setItems(copy);
        } else {
            setItems([
                ...items,
                {
                    ...product,
                    quantity: 1
                }
            ]);
        }

        setSelectedProduct("");
    }

    function removeSaleItem(index) {
        setItems(
            items.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function updateSaleItem(index, field, value) {
        const copy = [...items];

        copy[index] = {
            ...copy[index],
            [field]: Number(value)
        };

        setItems(copy);
    }

    async function saveSale() {
        if (items.length === 0) {
            alert("Agregá al menos un producto");
            return;
        }

        if (
            items.some(
                (item) =>
                    Number(item.quantity) <= 0 ||
                    Number(item.price) < 0
            )
        ) {
            alert("Revisá las cantidades y los precios");
            return;
        }

        setSavingSale(true);

        try {
            const response = await fetch(`${API_URL}/sales`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client: client || "Consumidor final",
                    date,
                    payment_method: paymentMethod
                })
            });

            const sale = await response.json();

            if (!response.ok || sale.error) {
                throw new Error(
                    sale.error || "Error al crear la venta"
                );
            }

            const itemsResponse = await fetch(
                `${API_URL}/sale-items`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sale_id: sale.id,
                        items: items.map((item) => ({
                            product_id: item.id,
                            quantity: Number(item.quantity),
                            price: Number(item.price)
                        }))
                    })
                }
            );

            const result = await itemsResponse.json();

            if (!itemsResponse.ok || result.error) {
                throw new Error(
                    result.error || "No se pudo guardar la venta"
                );
            }

            let message = "✅ Venta guardada correctamente";

            if (result.advertencia) {
                message += `\n\n${result.advertencia}`;
            }

            alert(message);

            setItems([]);
            setClient("");
            setPaymentMethod("Caja");

            await loadProducts();
        } catch (error) {
            alert(error.message);
        } finally {
            setSavingSale(false);
        }
    }

    // ==========================
    // FUNCIONES DE AJUSTE DE STOCK
    // ==========================

    function changeMovementType(value) {
        setMovementType(value);
        setMovementItems([]);

        if (value === "IN") {
            setMovementReason("STOCK_CONTROL");
        }
    }

    function addMovementProduct() {
        if (movementSelectedProduct === "") return;

        const product = products.find(
            (item) => item.id === Number(movementSelectedProduct)
        );

        if (!product) return;

        const existingIndex = movementItems.findIndex(
            (item) => item.id === product.id
        );

        if (existingIndex >= 0) {
            const copy = [...movementItems];

            copy[existingIndex] = {
                ...copy[existingIndex],
                quantity: Number(copy[existingIndex].quantity || 0) + 1
            };

            setMovementItems(copy);
        } else {
            setMovementItems([
                ...movementItems,
                {
                    ...product,
                    quantity: 1
                }
            ]);
        }

        setMovementSelectedProduct("");
    }

    function removeMovementItem(index) {
        setMovementItems(
            movementItems.filter(
                (_, itemIndex) => itemIndex !== index
            )
        );
    }

    function updateMovementQuantity(index, value) {
        const copy = [...movementItems];

        copy[index] = {
            ...copy[index],
            quantity: Number(value)
        };

        setMovementItems(copy);
    }

    async function saveStockMovement() {
        if (movementItems.length === 0) {
            alert("Agregá al menos un producto");
            return;
        }

        if (
            movementItems.some(
                (item) => Number(item.quantity) <= 0
            )
        ) {
            alert("Las cantidades deben ser mayores a cero");
            return;
        }

        const actionName =
            movementType === "IN" ? "alta" : "baja";

        const confirmed = window.confirm(
            `¿Guardar esta ${actionName} de stock?`
        );

        if (!confirmed) return;

        setSavingMovement(true);

        try {
            const response = await fetch(
                `${API_URL}/stock-movements`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        movement_type: movementType,
                        date: movementDate,
                        reason:
                            movementType === "IN"
                                ? "STOCK_CONTROL"
                                : movementReason,
                        notes: movementNotes,
                        items: movementItems.map((item) => ({
                            product_id: item.id,
                            quantity: Number(item.quantity)
                        }))
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(
                    result.error ||
                    `No se pudo guardar la ${actionName} de stock`
                );
            }

            let message =
                `✅ ${result.message}\n` +
                `Costo contabilizado: ${moneyFormatter.format(
                    Number(result.total_cost || 0)
                )}`;

            if (result.advertencia) {
                message += `\n\n${result.advertencia}`;
            }

            alert(message);

            setMovementItems([]);
            setMovementNotes("");
            setMovementReason("STOCK_CONTROL");

            await Promise.all([
                loadProducts(),
                loadStockMovements()
            ]);
        } catch (error) {
            alert(error.message);
        } finally {
            setSavingMovement(false);
        }
    }

    async function deleteStockMovement(movement) {
        const type =
            String(movement.movement_type || "OUT").toUpperCase();

        const actionName =
            type === "IN" ? "alta" : "baja";

        const explanation =
            type === "IN"
                ? "Se descontarán las unidades agregadas y se eliminará el lote creado por el ajuste. Solo se podrá eliminar si esas unidades todavía no fueron utilizadas."
                : "Se devolverán las unidades a los productos y a sus lotes.";

        const confirmed = window.confirm(
            `¿Eliminar la ${actionName} ${movement.number}?\n\n` +
            explanation +
            "\nTambién se eliminará el asiento contable automático."
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `${API_URL}/stock-movements/${movement.id}`,
                {
                    method: "DELETE"
                }
            );

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(
                    result.error ||
                    `No se pudo eliminar la ${actionName} de stock`
                );
            }

            alert(`✅ ${result.message}`);

            await Promise.all([
                loadProducts(),
                loadStockMovements()
            ]);
        } catch (error) {
            alert(error.message);
        }
    }

    const movementActionLabel =
        movementType === "IN" ? "alta" : "baja";

    return (
        <div>
            <h2>🧾 Ventas y movimientos de stock</h2>

            <div style={cardStyle}>
                <h3>Nueva venta</h3>

                <label>Cliente</label>
                <br />
                <input
                    value={client}
                    onChange={(event) =>
                        setClient(event.target.value)
                    }
                    placeholder="Consumidor final"
                    style={inputStyle}
                />

                <br /><br />

                <label>Fecha</label>
                <br />
                <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                        setDate(event.target.value)
                    }
                    style={{
                        padding: 8,
                        marginTop: 5
                    }}
                />

                <br /><br />

                <label>Medio de pago</label>
                <br />
                <select
                    value={paymentMethod}
                    onChange={(event) =>
                        setPaymentMethod(event.target.value)
                    }
                    style={inputStyle}
                >
                    <option value="Caja">Caja</option>
                    <option value="Banco">Banco</option>
                    <option value="Mercado Pago">
                        Mercado Pago
                    </option>
                    <option value="Cuenta corriente">
                        Cuenta corriente
                    </option>
                </select>

                <hr style={{ margin: "25px 0" }} />

                <h3>Productos</h3>

                <select
                    value={selectedProduct}
                    onChange={(event) =>
                        setSelectedProduct(event.target.value)
                    }
                    style={{
                        width: 350,
                        maxWidth: "100%",
                        padding: 8
                    }}
                >
                    <option value="">
                        Seleccionar producto
                    </option>

                    {sortedProducts.map((product) => (
                        <option
                            key={product.id}
                            value={product.id}
                        >
                            {product.name} — Stock:{" "}
                            {Number(product.stock || 0)}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={addProduct}
                    style={{ marginLeft: 10 }}
                >
                    ➕ Agregar producto
                </button>

                <hr />

                <h3>Productos agregados</h3>

                {items.length === 0 && (
                    <p>No hay productos agregados.</p>
                )}

                {items.map((item, index) => (
                    <div
                        key={item.id}
                        style={{
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: 15,
                            marginBottom: 10
                        }}
                    >
                        <h4>{item.name}</h4>

                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                alignItems: "end",
                                flexWrap: "wrap"
                            }}
                        >
                            <div>
                                <label>Cantidad</label>
                                <br />
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={(event) =>
                                        updateSaleItem(
                                            index,
                                            "quantity",
                                            event.target.value
                                        )
                                    }
                                    style={{ width: 100 }}
                                />
                            </div>

                            <div>
                                <label>Precio</label>
                                <br />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(event) =>
                                        updateSaleItem(
                                            index,
                                            "price",
                                            event.target.value
                                        )
                                    }
                                    style={{ width: 120 }}
                                />
                            </div>

                            <div>
                                <label>Subtotal</label>
                                <br />
                                <b>
                                    {moneyFormatter.format(
                                        Number(item.quantity || 0) *
                                        Number(item.price || 0)
                                    )}
                                </b>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    removeSaleItem(index)
                                }
                            >
                                🗑️ Quitar
                            </button>
                        </div>
                    </div>
                ))}

                <hr />

                <h2>
                    Total:{" "}
                    {moneyFormatter.format(
                        items.reduce(
                            (sum, item) =>
                                sum +
                                Number(item.quantity || 0) *
                                Number(item.price || 0),
                            0
                        )
                    )}
                </h2>

                <button
                    type="button"
                    onClick={saveSale}
                    disabled={savingSale}
                >
                    {savingSale
                        ? "Guardando..."
                        : "💾 Guardar venta"}
                </button>
            </div>

            <div style={cardStyle}>
                <h3>📦 Ajuste de stock</h3>

                <p>
                    Usá <b>Alta</b> cuando el conteo físico tenga más
                    unidades que el sistema, y <b>Baja</b> cuando tenga
                    menos o cuando retires productos por otro motivo.
                </p>

                <label>Tipo de ajuste</label>
                <br />
                <select
                    value={movementType}
                    onChange={(event) =>
                        changeMovementType(event.target.value)
                    }
                    style={inputStyle}
                >
                    <option value="OUT">
                        Baja — descontar stock
                    </option>
                    <option value="IN">
                        Alta — agregar stock
                    </option>
                </select>

                <br /><br />

                <label>Fecha</label>
                <br />
                <input
                    type="date"
                    value={movementDate}
                    onChange={(event) =>
                        setMovementDate(event.target.value)
                    }
                    style={{
                        padding: 8,
                        marginTop: 5
                    }}
                />

                <br /><br />

                <label>Motivo</label>
                <br />
                <select
                    value={
                        movementType === "IN"
                            ? "STOCK_CONTROL"
                            : movementReason
                    }
                    onChange={(event) =>
                        setMovementReason(event.target.value)
                    }
                    disabled={movementType === "IN"}
                    style={inputStyle}
                >
                    {STOCK_MOVEMENT_REASONS.map((reason) => (
                        <option
                            key={reason.value}
                            value={reason.value}
                        >
                            {reason.label}
                        </option>
                    ))}
                </select>

                {movementType === "IN" && (
                    <div
                        style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: "#666"
                        }}
                    >
                        Las altas se registran únicamente por control de stock.
                    </div>
                )}

                <br /><br />

                <label>Observación</label>
                <br />
                <textarea
                    value={movementNotes}
                    onChange={(event) =>
                        setMovementNotes(event.target.value)
                    }
                    placeholder={
                        movementType === "IN"
                            ? "Ejemplo: sobrante encontrado durante el conteo físico"
                            : "Detalle del control, destinatario del regalo o prueba realizada"
                    }
                    style={{
                        width: "100%",
                        maxWidth: 650,
                        minHeight: 75,
                        padding: 8,
                        marginTop: 5
                    }}
                />

                <hr style={{ margin: "25px 0" }} />

                <h3>
                    Productos a{" "}
                    {movementType === "IN"
                        ? "agregar"
                        : "descontar"}
                </h3>

                <select
                    value={movementSelectedProduct}
                    onChange={(event) =>
                        setMovementSelectedProduct(
                            event.target.value
                        )
                    }
                    style={{
                        width: 350,
                        maxWidth: "100%",
                        padding: 8
                    }}
                >
                    <option value="">
                        Seleccionar producto
                    </option>

                    {sortedProducts.map((product) => (
                        <option
                            key={product.id}
                            value={product.id}
                        >
                            {product.name} — Stock actual:{" "}
                            {Number(product.stock || 0)}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={addMovementProduct}
                    style={{ marginLeft: 10 }}
                >
                    ➕ Agregar producto
                </button>

                <hr />

                {movementItems.length === 0 && (
                    <p>No hay productos agregados.</p>
                )}

                {movementItems.map((item, index) => (
                    <div
                        key={item.id}
                        style={{
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: 15,
                            marginBottom: 10
                        }}
                    >
                        <h4>{item.name}</h4>

                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                alignItems: "end",
                                flexWrap: "wrap"
                            }}
                        >
                            <div>
                                <label>Cantidad</label>
                                <br />
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={(event) =>
                                        updateMovementQuantity(
                                            index,
                                            event.target.value
                                        )
                                    }
                                    style={{ width: 100 }}
                                />
                            </div>

                            <div>
                                Stock actual:{" "}
                                <b>
                                    {Number(item.stock || 0)}
                                </b>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    removeMovementItem(index)
                                }
                            >
                                🗑️ Quitar
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={saveStockMovement}
                    disabled={savingMovement}
                >
                    {savingMovement
                        ? "Guardando..."
                        : `💾 Guardar ${movementActionLabel} de stock`}
                </button>
            </div>

            <div style={cardStyle}>
                <h3>Historial de ajustes de stock</h3>

                {stockMovements.length === 0 && (
                    <p>No hay ajustes de stock registrados.</p>
                )}

                {stockMovements.map((movement) => {
                    const type =
                        String(
                            movement.movement_type || "OUT"
                        ).toUpperCase();

                    const actionName =
                        type === "IN" ? "Alta" : "Baja";

                    return (
                        <div
                            key={movement.id}
                            style={{
                                borderBottom: "1px solid #ddd",
                                padding: "12px 0"
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 20,
                                    alignItems: "start",
                                    flexWrap: "wrap"
                                }}
                            >
                                <div>
                                    <b>
                                        {actionName} {movement.number}
                                        {" — "}
                                        {movement.reason_label}
                                    </b>

                                    <div>
                                        Fecha: {movement.date}
                                    </div>

                                    <div>
                                        Costo contabilizado:{" "}
                                        {moneyFormatter.format(
                                            Number(
                                                movement.total_cost || 0
                                            )
                                        )}
                                    </div>

                                    {movement.notes && (
                                        <div>
                                            Observación:{" "}
                                            {movement.notes}
                                        </div>
                                    )}

                                    <ul>
                                        {(movement.items || []).map(
                                            (item) => (
                                                <li key={item.id}>
                                                    {item.name}:{" "}
                                                    {Number(
                                                        item.quantity || 0
                                                    )}{" "}
                                                    unidad/es
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        deleteStockMovement(
                                            movement
                                        )
                                    }
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SaleHistory />
        </div>
    );
}
