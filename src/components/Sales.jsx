import { useEffect, useMemo, useState } from "react";
import SaleHistory from "./SaleHistory";

const API = "http://127.0.0.1:8000";

const initialDate = () => new Date().toISOString().substring(0, 10);

const STOCK_MOVEMENT_REASONS = [
    { value: "STOCK_CONTROL", label: "Control de stock" },
    { value: "LOT_TEST", label: "Testeo de lote" },
    { value: "PERSONAL_USE", label: "Consumo personal" },
    { value: "GIFT", label: "Regalo u obsequio" }
];

export default function Sales() {
    const [client, setClient] = useState("");
    const [date, setDate] = useState(initialDate());
    const [paymentMethod, setPaymentMethod] = useState("Caja");
    const [shippingCost, setShippingCost] = useState("");

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [items, setItems] = useState([]);

    const [rawMaterials, setRawMaterials] = useState([]);
    const [returnedMaterialId, setReturnedMaterialId] = useState("");
    const [returnedQuantity, setReturnedQuantity] = useState("1");
    const [returnedContainers, setReturnedContainers] = useState([]);

    const [packagingMaterialId, setPackagingMaterialId] = useState("");
    const [packagingQuantity, setPackagingQuantity] = useState("1");
    const [packagingItems, setPackagingItems] = useState([]);

    const [sales, setSales] = useState([]);
    const [historyVersion, setHistoryVersion] = useState(0);
    const [editingSaleId, setEditingSaleId] = useState(null);
    const [editingSaleNumber, setEditingSaleNumber] = useState("");
    const [saving, setSaving] = useState(false);

    // ==========================
    // CONTROL DE PRODUCTOS
    // ==========================
    const [movementType, setMovementType] = useState("OUT");
    const [movementDate, setMovementDate] = useState(initialDate());
    const [movementReason, setMovementReason] = useState("STOCK_CONTROL");
    const [movementNotes, setMovementNotes] = useState("");
    const [movementSelectedProduct, setMovementSelectedProduct] = useState("");
    const [movementItems, setMovementItems] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);
    const [savingMovement, setSavingMovement] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        await Promise.all([
            loadProducts(),
            loadRawMaterials(),
            loadSalesForClients(),
            loadStockMovements()
        ]);
    }

    async function loadProducts() {
        try {
            const response = await fetch(`${API}/products`);
            const data = await response.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }

    async function loadRawMaterials() {
        try {
            const response = await fetch(`${API}/raw-materials`);
            const data = await response.json();
            const list = Array.isArray(data) ? data : [];

            setRawMaterials(
                [...list].sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "es",
                        { sensitivity: "base" }
                    )
                )
            );
        } catch {
            setRawMaterials([]);
        }
    }

    async function loadSalesForClients() {
        try {
            const response = await fetch(`${API}/sales`);
            const data = await response.json();
            setSales(Array.isArray(data) ? data : []);
        } catch {
            setSales([]);
        }
    }

    async function loadStockMovements() {
        try {
            const response = await fetch(`${API}/stock-movements`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "No se pudieron cargar los ajustes de stock"
                );
            }

            setStockMovements(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setStockMovements([]);
        }
    }

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

    const packagingMaterials = useMemo(
        () =>
            rawMaterials.filter(
                (material) =>
                    String(material.category || "")
                        .trim()
                        .toLowerCase() === "packaging"
            ),
        [rawMaterials]
    );

    const packagingCost = useMemo(
        () =>
            packagingItems.reduce(
                (sum, item) =>
                    sum
                    +
                    Number(item.quantity || 0)
                    *
                    Number(item.unit_cost || 0),
                0
            ),
        [packagingItems]
    );

    const clientOptions = useMemo(() => {
        const names = new Map();

        sales.forEach((sale) => {
            const name = String(sale.client || "").trim();

            if (!name || name.toLowerCase() === "consumidor final") {
                return;
            }

            names.set(name.toLocaleLowerCase("es"), name);
        });

        return [...names.values()].sort((a, b) =>
            a.localeCompare(b, "es", { sensitivity: "base" })
        );
    }, [sales]);

    const productsSubtotal = items.reduce(
        (sum, item) =>
            sum
            + Number(item.quantity || 0)
            * Number(item.price || 0),
        0
    );

    const total = productsSubtotal + Number(shippingCost || 0);

    function addProduct() {
        if (!selectedProduct) {
            return;
        }

        const product = products.find(
            (item) => Number(item.id) === Number(selectedProduct)
        );

        if (!product) {
            return;
        }

        setItems((current) => {
            const existing = current.find(
                (item) => Number(item.id) === Number(product.id)
            );

            if (existing) {
                return current.map((item) =>
                    Number(item.id) === Number(product.id)
                        ? {
                            ...item,
                            quantity: Number(item.quantity || 0) + 1
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    ...product,
                    quantity: 1,
                    price: Number(product.price || 0)
                }
            ];
        });

        setSelectedProduct("");
    }

    function updateItem(index, field, value) {
        setItems((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        [field]: Number(value)
                    }
                    : item
            )
        );
    }

    function removeItem(index) {
        setItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function addReturnedContainer() {
        const quantity = Number(returnedQuantity || 0);

        if (!returnedMaterialId) {
            alert("Seleccioná el envase devuelto");
            return;
        }

        if (quantity <= 0) {
            alert("La cantidad devuelta debe ser mayor a cero");
            return;
        }

        const material = rawMaterials.find(
            (item) => Number(item.id) === Number(returnedMaterialId)
        );

        if (!material) {
            return;
        }

        setReturnedContainers((current) => {
            const existing = current.find(
                (item) =>
                    Number(item.raw_material_id) === Number(material.id)
            );

            if (existing) {
                return current.map((item) =>
                    Number(item.raw_material_id) === Number(material.id)
                        ? {
                            ...item,
                            quantity: Number(item.quantity || 0) + quantity
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    raw_material_id: material.id,
                    name: material.name,
                    unit: material.unit || "unid.",
                    quantity
                }
            ];
        });

        setReturnedMaterialId("");
        setReturnedQuantity("1");
    }

    function removeReturnedContainer(index) {
        setReturnedContainers((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function addPackagingItem() {
        const quantity = Number(packagingQuantity || 0);

        if (!packagingMaterialId) {
            alert("Seleccioná el packaging utilizado");
            return;
        }

        if (quantity <= 0) {
            alert("La cantidad de packaging debe ser mayor a cero");
            return;
        }

        const material = packagingMaterials.find(
            (item) => Number(item.id) === Number(packagingMaterialId)
        );

        if (!material) {
            alert(
                "La materia prima debe tener la categoría Packaging"
            );
            return;
        }

        setPackagingItems((current) => {
            const existing = current.find(
                (item) =>
                    Number(item.raw_material_id) === Number(material.id)
            );

            if (existing) {
                return current.map((item) =>
                    Number(item.raw_material_id) === Number(material.id)
                        ? {
                            ...item,
                            quantity: Number(item.quantity || 0) + quantity,
                            unit_cost: Number(material.cost || 0)
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    raw_material_id: material.id,
                    name: material.name,
                    unit: material.unit || "unid.",
                    quantity,
                    unit_cost: Number(material.cost || 0)
                }
            ];
        });

        setPackagingMaterialId("");
        setPackagingQuantity("1");
    }

    function removePackagingItem(index) {
        setPackagingItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function cleanSaleItems() {
        return items.map((item) => ({
            product_id: Number(item.id || item.product_id),
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0)
        }));
    }

    function cleanReturnedContainers() {
        return returnedContainers.map((item) => ({
            raw_material_id: Number(item.raw_material_id),
            quantity: Number(item.quantity || 0)
        }));
    }

    function cleanPackagingItems() {
        return packagingItems.map((item) => ({
            raw_material_id: Number(item.raw_material_id),
            quantity: Number(item.quantity || 0)
        }));
    }

    async function saveSale() {
        if (items.length === 0) {
            alert("Agregá al menos un producto");
            return;
        }

        if (items.some((item) => Number(item.quantity || 0) <= 0)) {
            alert("Las cantidades deben ser mayores a cero");
            return;
        }

        if (
            packagingItems.some(
                (item) => Number(item.quantity || 0) <= 0
            )
        ) {
            alert("Las cantidades de packaging deben ser mayores a cero");
            return;
        }

        if (Number(shippingCost || 0) < 0) {
            alert("El costo de envío no puede ser negativo");
            return;
        }

        setSaving(true);

        try {
            const commonData = {
                client: client.trim() || "Consumidor final",
                date,
                payment_method: paymentMethod,
                shipping_cost: Number(shippingCost || 0),
                returned_containers: cleanReturnedContainers(),
                packaging_items: cleanPackagingItems()
            };

            let result;

            if (editingSaleId) {
                const response = await fetch(
                    `${API}/sales/${editingSaleId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ...commonData,
                            items: cleanSaleItems()
                        })
                    }
                );

                result = await response.json();

                if (!response.ok || result.error) {
                    throw new Error(
                        result.error || "No se pudo modificar la venta"
                    );
                }
            } else {
                const saleResponse = await fetch(`${API}/sales`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(commonData)
                });

                const sale = await saleResponse.json();

                if (!saleResponse.ok || sale.error) {
                    throw new Error(
                        sale.error || "No se pudo crear la venta"
                    );
                }

                const itemsResponse = await fetch(`${API}/sale-items`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sale_id: sale.id,
                        items: cleanSaleItems(),
                        shipping_cost: Number(shippingCost || 0),
                        returned_containers: cleanReturnedContainers(),
                        packaging_items: cleanPackagingItems()
                    })
                });

                result = await itemsResponse.json();

                if (!itemsResponse.ok || result.error) {
                    throw new Error(
                        result.error || "No se pudo completar la venta"
                    );
                }
            }

            let message = editingSaleId
                ? "✅ Venta modificada correctamente"
                : "✅ Venta guardada correctamente";

            if (result.advertencia) {
                message += `\n\n⚠️ ${result.advertencia}`;
            }

            alert(message);
            resetForm();
            await loadAll();
            setHistoryVersion((value) => value + 1);
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    function startEditSale(sale) {
        setEditingSaleId(sale.id);
        setEditingSaleNumber(sale.number || "");
        setClient(sale.client || "");
        setDate(String(sale.date || initialDate()).substring(0, 10));
        setPaymentMethod(sale.payment_method || "Caja");
        setShippingCost(
            Number(sale.shipping_cost || 0) > 0
                ? String(sale.shipping_cost)
                : ""
        );

        setItems(
            (sale.items || []).map((item) => ({
                id: item.product_id,
                product_id: item.product_id,
                name: item.name,
                quantity: Number(item.quantity || 0),
                price: Number(item.price || 0)
            }))
        );

        setReturnedContainers(
            (sale.returned_containers || []).map((item) => ({
                raw_material_id: item.raw_material_id,
                name: item.name,
                unit: item.unit || "unid.",
                quantity: Number(item.quantity || 0)
            }))
        );

        setPackagingItems(
            (sale.packaging_items || []).map((item) => ({
                raw_material_id: item.raw_material_id,
                name: item.name,
                unit: item.unit || "unid.",
                quantity: Number(item.quantity || 0),
                unit_cost: Number(item.unit_cost || 0)
            }))
        );

        setPackagingMaterialId("");
        setPackagingQuantity("1");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetForm() {
        setEditingSaleId(null);
        setEditingSaleNumber("");
        setClient("");
        setDate(initialDate());
        setPaymentMethod("Caja");
        setShippingCost("");
        setSelectedProduct("");
        setItems([]);
        setReturnedMaterialId("");
        setReturnedQuantity("1");
        setReturnedContainers([]);
        setPackagingMaterialId("");
        setPackagingQuantity("1");
        setPackagingItems([]);
    }

    function changeMovementType(value) {
        setMovementType(value);
        setMovementItems([]);

        if (value === "IN") {
            setMovementReason("STOCK_CONTROL");
        }
    }

    function addMovementProduct() {
        if (!movementSelectedProduct) {
            return;
        }

        const product = products.find(
            (item) => Number(item.id) === Number(movementSelectedProduct)
        );

        if (!product) {
            return;
        }

        setMovementItems((current) => {
            const existing = current.find(
                (item) => Number(item.id) === Number(product.id)
            );

            if (existing) {
                return current.map((item) =>
                    Number(item.id) === Number(product.id)
                        ? {
                            ...item,
                            quantity: Number(item.quantity || 0) + 1
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    ...product,
                    quantity: 1
                }
            ];
        });

        setMovementSelectedProduct("");
    }

    function updateMovementQuantity(index, value) {
        setMovementItems((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        quantity: Number(value)
                    }
                    : item
            )
        );
    }

    function removeMovementItem(index) {
        setMovementItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    async function saveStockMovement() {
        if (movementItems.length === 0) {
            alert("Agregá al menos un producto");
            return;
        }

        if (
            movementItems.some(
                (item) => Number(item.quantity || 0) <= 0
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

        if (!confirmed) {
            return;
        }

        setSavingMovement(true);

        try {
            const response = await fetch(`${API}/stock-movements`, {
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
                        product_id: Number(item.id),
                        quantity: Number(item.quantity || 0)
                    }))
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(
                    result.error ||
                    `No se pudo guardar la ${actionName} de stock`
                );
            }

            let message =
                `✅ ${result.message}\n` +
                `Costo contabilizado: ${formatMoney(result.total_cost)}`;

            if (result.advertencia) {
                message += `\n\n⚠️ ${result.advertencia}`;
            }

            alert(message);

            setMovementItems([]);
            setMovementNotes("");
            setMovementReason("STOCK_CONTROL");
            setMovementSelectedProduct("");

            await Promise.all([
                loadProducts(),
                loadStockMovements()
            ]);
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            setSavingMovement(false);
        }
    }

    async function deleteStockMovement(movement) {
        const type = String(
            movement.movement_type || "OUT"
        ).toUpperCase();

        const actionName =
            type === "IN" ? "alta" : "baja";

        const explanation =
            type === "IN"
                ? (
                    "Se descontarán las unidades agregadas y se eliminará " +
                    "el lote creado por el ajuste. Solo se podrá eliminar " +
                    "si esas unidades todavía no fueron utilizadas."
                )
                : (
                    "Se devolverán las unidades a los productos y a sus lotes."
                );

        const confirmed = window.confirm(
            `¿Eliminar la ${actionName} ${movement.number}?\n\n` +
            explanation +
            "\nTambién se eliminará el asiento contable automático."
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API}/stock-movements/${movement.id}`,
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
            alert(`❌ ${error.message}`);
        }
    }

    async function historyChanged() {
        await loadAll();
        setHistoryVersion((value) => value + 1);
    }

    const movementActionLabel =
        movementType === "IN" ? "alta" : "baja";

    return (
        <div>
            <h2>🧾 Ventas</h2>

            <div style={styles.card}>
                <div style={styles.formHeader}>
                    <h3 style={{ margin: 0 }}>
                        {editingSaleId
                            ? `✏️ Editar venta ${editingSaleNumber}`
                            : "Nueva Venta"}
                    </h3>

                    {editingSaleId && (
                        <button
                            onClick={resetForm}
                            disabled={saving}
                        >
                            Cancelar edición
                        </button>
                    )}
                </div>

                <div style={styles.formGrid}>
                    <div>
                        <label>Cliente</label>
                        <br />
                        <input
                            value={client}
                            onChange={(event) => setClient(event.target.value)}
                            list="nativa-clientes"
                            placeholder="Consumidor final"
                            style={styles.input}
                        />
                        <datalist id="nativa-clientes">
                            {clientOptions.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                        <div style={styles.helpText}>
                            Escribí una letra para ver clientes anteriores.
                        </div>
                    </div>

                    <div>
                        <label>Fecha</label>
                        <br />
                        <input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div>
                        <label>Medio de pago</label>
                        <br />
                        <select
                            value={paymentMethod}
                            onChange={(event) =>
                                setPaymentMethod(event.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="Caja">Caja</option>
                            <option value="Banco">Banco</option>
                            <option value="Mercado Pago">Mercado Pago</option>
                            <option value="Tarjeta de crédito">
                                Tarjeta de crédito
                            </option>
                            <option value="Cuenta corriente">
                                Cuenta corriente
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Costo de envío cobrado</label>
                        <br />
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={shippingCost}
                            onChange={(event) =>
                                setShippingCost(event.target.value)
                            }
                            placeholder="0"
                            style={styles.input}
                        />
                    </div>
                </div>

                <hr style={{ margin: "25px 0" }} />

                <h3>Productos</h3>

                <select
                    value={selectedProduct}
                    onChange={(event) =>
                        setSelectedProduct(event.target.value)
                    }
                    style={{ ...styles.input, width: 360 }}
                >
                    <option value="">Seleccionar producto</option>
                    {sortedProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                            {product.name} — stock {Number(product.stock || 0)}
                        </option>
                    ))}
                </select>

                <button onClick={addProduct} style={{ marginLeft: 10 }}>
                    ➕ Agregar producto
                </button>

                <div style={{ marginTop: 18 }}>
                    {items.length === 0 && (
                        <p>No hay productos agregados.</p>
                    )}

                    {items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={styles.itemCard}>
                            <strong>{item.name}</strong>

                            <div style={styles.itemGrid}>
                                <div>
                                    <label>Cantidad</label>
                                    <br />
                                    <input
                                        type="number"
                                        min="0.0001"
                                        step="any"
                                        value={item.quantity}
                                        onChange={(event) =>
                                            updateItem(
                                                index,
                                                "quantity",
                                                event.target.value
                                            )
                                        }
                                        style={{ width: 105 }}
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
                                            updateItem(
                                                index,
                                                "price",
                                                event.target.value
                                            )
                                        }
                                        style={{ width: 130 }}
                                    />
                                </div>

                                <div>
                                    <label>Subtotal</label>
                                    <br />
                                    <b>
                                        {formatMoney(
                                            Number(item.quantity || 0)
                                            * Number(item.price || 0)
                                        )}
                                    </b>
                                </div>

                                <button
                                    onClick={() => removeItem(index)}
                                    style={styles.removeButton}
                                >
                                    Quitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <hr style={{ margin: "25px 0" }} />

                <h3>Envases devueltos</h3>
                <p style={styles.helpText}>
                    Elegí la materia prima que representa ese envase. Al guardar,
                    la cantidad volverá al stock.
                </p>

                <div style={styles.returnRow}>
                    <select
                        value={returnedMaterialId}
                        onChange={(event) =>
                            setReturnedMaterialId(event.target.value)
                        }
                        style={{ ...styles.input, width: 360 }}
                    >
                        <option value="">Seleccionar envase</option>
                        {rawMaterials.map((material) => (
                            <option key={material.id} value={material.id}>
                                {material.name} ({material.unit || "unid."})
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={returnedQuantity}
                        onChange={(event) =>
                            setReturnedQuantity(event.target.value)
                        }
                        style={{ width: 90, padding: 8 }}
                    />

                    <button onClick={addReturnedContainer}>
                        ➕ Agregar devolución
                    </button>
                </div>

                {returnedContainers.map((item, index) => (
                    <div
                        key={`${item.raw_material_id}-${index}`}
                        style={styles.returnedItem}
                    >
                        <span>
                            {item.name}: <b>{item.quantity}</b> {item.unit}
                        </span>
                        <button
                            onClick={() => removeReturnedContainer(index)}
                        >
                            Quitar
                        </button>
                    </div>
                ))}

                <hr style={{ margin: "25px 0" }} />

                <h3>Packaging utilizado</h3>
                <p style={styles.helpText}>
                    Se descuenta del stock de materias primas y se registra como
                    costo de Packaging. No modifica el importe cobrado.
                </p>

                {packagingMaterials.length === 0 && (
                    <p style={styles.helpText}>
                        No hay materias primas con la categoría Packaging.
                    </p>
                )}

                <div style={styles.returnRow}>
                    <select
                        value={packagingMaterialId}
                        onChange={(event) =>
                            setPackagingMaterialId(event.target.value)
                        }
                        style={{ ...styles.input, width: 360 }}
                    >
                        <option value="">Seleccionar bolsa o caja</option>
                        {packagingMaterials.map((material) => (
                            <option key={material.id} value={material.id}>
                                {material.name} — stock {Number(material.stock || 0)}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={packagingQuantity}
                        onChange={(event) =>
                            setPackagingQuantity(event.target.value)
                        }
                        style={{ width: 90, padding: 8 }}
                    />

                    <button
                        type="button"
                        onClick={addPackagingItem}
                        disabled={packagingMaterials.length === 0}
                    >
                        ➕ Agregar packaging
                    </button>
                </div>

                {packagingItems.map((item, index) => (
                    <div
                        key={`${item.raw_material_id}-${index}`}
                        style={styles.returnedItem}
                    >
                        <span>
                            {item.name}: <b>{item.quantity}</b> {item.unit}
                            {" — "}
                            costo {formatMoney(
                                Number(item.quantity || 0)
                                *
                                Number(item.unit_cost || 0)
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={() => removePackagingItem(index)}
                        >
                            Quitar
                        </button>
                    </div>
                ))}

                <hr style={{ margin: "25px 0" }} />

                <div style={styles.totalBox}>
                    <div>
                        Productos: <b>{formatMoney(productsSubtotal)}</b>
                    </div>
                    <div>
                        Envío: <b>{formatMoney(shippingCost)}</b>
                    </div>
                    <div>
                        Costo de packaging: <b>{formatMoney(packagingCost)}</b>
                    </div>
                    <div style={styles.helpText}>
                        El packaging no aumenta el total cobrado.
                    </div>
                    <h2 style={{ margin: "8px 0 0" }}>
                        Total: {formatMoney(total)}
                    </h2>
                </div>

                <button
                    onClick={saveSale}
                    disabled={saving}
                    style={styles.saveButton}
                >
                    {saving
                        ? "Guardando..."
                        : editingSaleId
                            ? "💾 Guardar cambios"
                            : "💾 Guardar venta"}
                </button>
            </div>

            <div style={styles.card}>
                <h3>📦 Control de productos</h3>

                <p>
                    Usá <b>Alta</b> cuando el conteo físico tenga más
                    unidades que el sistema, y <b>Baja</b> cuando tenga
                    menos o cuando retires productos por testeo, consumo
                    personal u obsequios.
                </p>

                <div style={styles.formGrid}>
                    <div>
                        <label>Tipo de ajuste</label>
                        <br />
                        <select
                            value={movementType}
                            onChange={(event) =>
                                changeMovementType(event.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="OUT">
                                Baja — descontar stock
                            </option>
                            <option value="IN">
                                Alta — agregar stock
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Fecha</label>
                        <br />
                        <input
                            type="date"
                            value={movementDate}
                            onChange={(event) =>
                                setMovementDate(event.target.value)
                            }
                            style={styles.input}
                        />
                    </div>

                    <div>
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
                            style={styles.input}
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
                            <div style={styles.helpText}>
                                Las altas se registran únicamente por
                                control de stock.
                            </div>
                        )}
                    </div>
                </div>

                <br />

                <label>Observación</label>
                <br />
                <textarea
                    value={movementNotes}
                    onChange={(event) =>
                        setMovementNotes(event.target.value)
                    }
                    placeholder={
                        movementType === "IN"
                            ? (
                                "Ejemplo: sobrante encontrado durante " +
                                "el conteo físico"
                            )
                            : (
                                "Detalle del control, destinatario del " +
                                "regalo o prueba realizada"
                            )
                    }
                    rows="3"
                    style={{
                        width: "650px",
                        maxWidth: "100%",
                        padding: 8,
                        boxSizing: "border-box"
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
                        setMovementSelectedProduct(event.target.value)
                    }
                    style={{ ...styles.input, width: 360 }}
                >
                    <option value="">Seleccionar producto</option>

                    {sortedProducts.map((product) => (
                        <option
                            key={product.id}
                            value={product.id}
                        >
                            {product.name} — stock actual{" "}
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

                <div style={{ marginTop: 18 }}>
                    {movementItems.length === 0 && (
                        <p>No hay productos agregados.</p>
                    )}

                    {movementItems.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            style={styles.itemCard}
                        >
                            <strong>{item.name}</strong>

                            <div style={styles.itemGrid}>
                                <div>
                                    <label>Cantidad</label>
                                    <br />
                                    <input
                                        type="number"
                                        min="0.0001"
                                        step="any"
                                        value={item.quantity}
                                        onChange={(event) =>
                                            updateMovementQuantity(
                                                index,
                                                event.target.value
                                            )
                                        }
                                        style={{ width: 105 }}
                                    />
                                </div>

                                <div>
                                    Stock actual:{" "}
                                    <b>{Number(item.stock || 0)}</b>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        removeMovementItem(index)
                                    }
                                    style={styles.removeButton}
                                >
                                    Quitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={saveStockMovement}
                    disabled={savingMovement}
                    style={styles.saveButton}
                >
                    {savingMovement
                        ? "Guardando..."
                        : `💾 Guardar ${movementActionLabel} de stock`}
                </button>
            </div>

            <div style={styles.card}>
                <h3>Historial de control de productos</h3>

                {stockMovements.length === 0 && (
                    <p>No hay ajustes de stock registrados.</p>
                )}

                {stockMovements.map((movement) => {
                    const type = String(
                        movement.movement_type || "OUT"
                    ).toUpperCase();

                    const actionName =
                        type === "IN" ? "Alta" : "Baja";

                    return (
                        <div
                            key={movement.id}
                            style={styles.historyMovement}
                        >
                            <div style={styles.historyMovementContent}>
                                <div style={styles.historyMovementLine}>
                                    <b>
                                        {actionName} {movement.number}
                                        {" — "}
                                        {movement.reason_label}
                                    </b>

                                    <span>
                                        Fecha: {movement.date}
                                    </span>

                                    <span>
                                        Costo:{" "}
                                        {formatMoney(
                                            movement.total_cost
                                        )}
                                    </span>

                                    {(movement.items || []).map(
                                        (item) => (
                                            <span
                                                key={item.id}
                                                style={styles.historyItem}
                                            >
                                                {item.name}:{" "}
                                                {Number(
                                                    item.quantity || 0
                                                )}{" "}
                                                unidad/es
                                            </span>
                                        )
                                    )}

                                    {movement.notes && (
                                        <span>
                                            Obs.: {movement.notes}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        deleteStockMovement(movement)
                                    }
                                    style={styles.historyDeleteButton}
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SaleHistory
                version={historyVersion}
                onEdit={startEditSale}
                onChanged={historyChanged}
            />
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

const styles = {
    card: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        marginTop: 20,
        background: "white"
    },
    formHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15,
        flexWrap: "wrap"
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 18,
        marginTop: 20
    },
    input: {
        width: "100%",
        maxWidth: 330,
        padding: 8,
        marginTop: 5,
        boxSizing: "border-box"
    },
    helpText: {
        color: "#666",
        fontSize: 12,
        marginTop: 5
    },
    itemCard: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 15,
        marginBottom: 10
    },
    itemGrid: {
        display: "flex",
        gap: 20,
        alignItems: "end",
        flexWrap: "wrap",
        marginTop: 12
    },
    removeButton: {
        marginLeft: "auto"
    },
    returnRow: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
    },
    returnedItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15,
        maxWidth: 560,
        border: "1px solid #ddd",
        borderRadius: 7,
        padding: "8px 10px",
        marginTop: 8
    },
    totalBox: {
        maxWidth: 390,
        border: "1px solid #bbb",
        borderRadius: 8,
        padding: 15,
        background: "#fafafa"
    },
    saveButton: {
        marginTop: 18,
        padding: "9px 14px"
    },
    historyMovement: {
        borderBottom: "1px solid #ddd",
        padding: "8px 0"
    },
    historyMovementContent: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center"
    },
    historyMovementLine: {
        display: "flex",
        alignItems: "center",
        gap: "6px 14px",
        flexWrap: "wrap",
        flex: 1,
        minWidth: 0,
        lineHeight: 1.35
    },
    historyItem: {
        whiteSpace: "nowrap"
    },
    historyDeleteButton: {
        flexShrink: 0
    }
};
