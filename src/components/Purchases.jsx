import { useEffect, useMemo, useState } from "react";
import PurchaseHistory from "./PurchaseHistory";

const API = "http://127.0.0.1:8000";

export default function Purchases() {
    const today = new Date().toISOString().substring(0, 10);

    const [suppliers, setSuppliers] = useState([]);
    const [supplier, setSupplier] = useState("");
    const [purchaseNumber, setPurchaseNumber] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [historyVersion, setHistoryVersion] = useState(0);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [saving, setSaving] = useState(false);

    const [date, setDate] = useState(today);
    const [paymentMethod, setPaymentMethod] = useState("Caja");
    const [installmentsCount, setInstallmentsCount] = useState(1);
    const [shippingCost, setShippingCost] = useState(0);
    const [materials, setMaterials] = useState([]);
    const [resaleProducts, setResaleProducts] = useState([]);
    const [selectedInventory, setSelectedInventory] = useState("");
    const [items, setItems] = useState([]);
    const [productionItems, setProductionItems] = useState([]);
    const [productionItemName, setProductionItemName] = useState("");
    const [productionItemCategory, setProductionItemCategory] = useState(
        "Herramientas y utensilios"
    );

    useEffect(() => {
        loadInventoryOptions();
        loadSuppliers();
        loadNextPurchaseNumber();
    }, []);

    async function loadNextPurchaseNumber() {
        try {
            const response = await fetch(`${API}/next-purchase-number`);
            const data = await response.json();
            setPurchaseNumber(data.next_number || "");
        } catch {
            setPurchaseNumber("");
        }
    }

    async function loadInventoryOptions() {
        try {
            const [materialsResponse, productsResponse] = await Promise.all([
                fetch(`${API}/raw-materials`),
                fetch(`${API}/products`)
            ]);

            const [materialsData, productsData] = await Promise.all([
                materialsResponse.json(),
                productsResponse.json()
            ]);

            setMaterials(
                Array.isArray(materialsData) ? materialsData : []
            );
            setResaleProducts(
                Array.isArray(productsData)
                    ? productsData.filter(
                        (product) => product.product_type === "RESALE"
                    )
                    : []
            );
        } catch {
            setMaterials([]);
            setResaleProducts([]);
        }
    }

    async function loadSuppliers() {
        const response = await fetch(`${API}/suppliers`);
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
    }

    function addInventoryItem() {
        if (!selectedInventory) return;

        const [itemType, rawId] = selectedInventory.split(":");
        const inventoryId = Number(rawId);

        const source =
            itemType === "RESALE"
                ? resaleProducts
                : materials;
        const inventory = source.find(
            (item) => item.id === inventoryId
        );

        if (!inventory) return;

        const key = `${itemType}:${inventoryId}`;
        const existingIndex = items.findIndex(
            (item) => item.key === key
        );

        if (existingIndex >= 0) {
            setItems((current) =>
                current.map((item, index) =>
                    index === existingIndex
                        ? {
                            ...item,
                            quantity: Number(item.quantity || 0) + 1
                        }
                        : item
                )
            );
        } else {
            setItems((current) => [
                ...current,
                {
                    key,
                    item_type: itemType,
                    inventory_id: inventory.id,
                    raw_material_id:
                        itemType === "RAW_MATERIAL"
                            ? inventory.id
                            : null,
                    product_id:
                        itemType === "RESALE"
                            ? inventory.id
                            : null,
                    name: inventory.name,
                    unit:
                        itemType === "RESALE"
                            ? "unidad"
                            : inventory.unit || "",
                    quantity: 1,
                    cost: 0
                }
            ]);
        }

        setSelectedInventory("");
    }

    function updateItem(index, field, value) {
        setItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
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
        setItems((currentItems) =>
            currentItems.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function addProductionItem() {
        const cleanName = productionItemName.trim();

        if (!cleanName) {
            alert("Ingresá el nombre del material o herramienta");
            return;
        }

        setProductionItems((current) => [
            ...current,
            {
                key: `PRODUCTION:${Date.now()}:${current.length}`,
                name: cleanName,
                category:
                    productionItemCategory || "Herramientas y utensilios",
                quantity: 1,
                cost: 0
            }
        ]);

        setProductionItemName("");
    }

    function updateProductionItem(index, field, value) {
        setProductionItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        [field]:
                            field === "quantity" || field === "cost"
                                ? Number(value)
                                : value
                    }
                    : item
            )
        );
    }

    function removeProductionItem(index) {
        setProductionItems((currentItems) =>
            currentItems.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    const inventorySubtotal = useMemo(
        () =>
            items.reduce(
                (sum, item) => sum + Number(item.cost || 0),
                0
            ),
        [items]
    );

    const productionSubtotal = useMemo(
        () =>
            productionItems.reduce(
                (sum, item) => sum + Number(item.cost || 0),
                0
            ),
        [productionItems]
    );

    const shipping = Math.max(Number(shippingCost || 0), 0);
    const shippingBase = inventorySubtotal + productionSubtotal;

    function shippingShare(item) {
        if (shipping <= 0 || shippingBase <= 0) return 0;

        return (
            shipping
            * Number(item.cost || 0)
            / shippingBase
        );
    }

    const purchaseTotal =
        inventorySubtotal + productionSubtotal + shipping;

    const validInstallmentsCount = Math.max(
        Math.trunc(Number(installmentsCount || 0)),
        0
    );

    const installmentPreviewAmount =
        paymentMethod === "Tarjeta" && validInstallmentsCount > 0
            ? purchaseTotal / validInstallmentsCount
            : 0;

    function installmentDueDate(installmentNumber) {
        if (!date) return "";

        const baseDate = new Date(`${date}T12:00:00`);
        baseDate.setDate(
            baseDate.getDate() + (30 * installmentNumber)
        );

        return baseDate.toLocaleDateString("es-AR");
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function resetForm() {
        setItems([]);
        setSupplier("");
        setInvoiceNumber("");
        setNotes("");
        setPaymentMethod("Caja");
        setInstallmentsCount(1);
        setShippingCost(0);
        setDate(today);
        setEditingPurchase(null);
        setSelectedInventory("");
        setProductionItems([]);
        setProductionItemName("");
        setProductionItemCategory("Herramientas y utensilios");
        loadNextPurchaseNumber();
    }

    function startEditPurchase(purchase) {
        const purchaseItems = purchase.items || [];
        const totalStoredPrice = purchaseItems.reduce(
            (sum, item) => sum + Number(item.price || 0),
            0
        );
        const savedShipping = Number(purchase.shipping_cost || 0);
        const savedExtraBase = (purchase.extra_items || []).reduce(
            (sum, item) =>
                sum + Number(item.base_price ?? item.price ?? 0),
            0
        );
        const fullBaseTotal = Math.max(
            Number(purchase.total || 0) - savedShipping,
            0
        );
        const inventoryBaseTotal = Math.max(
            fullBaseTotal - savedExtraBase,
            0
        );

        setEditingPurchase(purchase);
        setPurchaseNumber(purchase.number || "");
        setSupplier(String(purchase.supplier_reference || ""));
        setInvoiceNumber(purchase.invoice_number || "");
        setNotes(purchase.notes || "");
        setDate(String(purchase.date || today).substring(0, 10));
        setPaymentMethod(purchase.payment_method || "Caja");
        setInstallmentsCount(
            Number(purchase.installments_count || 0)
        );
        setShippingCost(savedShipping);

        setItems(
            purchaseItems.map((purchaseItem) => {
                const itemType =
                    purchaseItem.item_type === "RESALE"
                        ? "RESALE"
                        : "RAW_MATERIAL";
                const inventoryId = Number(
                    itemType === "RESALE"
                        ? purchaseItem.product_id
                        : purchaseItem.raw_material_id
                );
                const source =
                    itemType === "RESALE"
                        ? resaleProducts
                        : materials;
                const inventory = source.find(
                    (item) => item.id === inventoryId
                );

                let basePrice = Number(purchaseItem.price || 0);

                if (savedShipping > 0 && totalStoredPrice > 0) {
                    basePrice =
                        Number(purchaseItem.price || 0)
                        * inventoryBaseTotal
                        / totalStoredPrice;
                }

                return {
                    key: `${itemType}:${inventoryId}`,
                    item_type: itemType,
                    inventory_id: inventoryId,
                    raw_material_id:
                        itemType === "RAW_MATERIAL"
                            ? inventoryId
                            : null,
                    product_id:
                        itemType === "RESALE"
                            ? inventoryId
                            : null,
                    name:
                        purchaseItem.name
                        || inventory?.name
                        || "Artículo",
                    unit:
                        purchaseItem.unit
                        || inventory?.unit
                        || (itemType === "RESALE" ? "unidad" : ""),
                    quantity: Number(purchaseItem.quantity || 0),
                    cost: Number(basePrice.toFixed(2))
                };
            })
        );

        setProductionItems(
            (purchase.extra_items || []).map((item, index) => ({
                key: `PRODUCTION:${purchase.id}:${index}`,
                name: item.name || "Material de producción",
                category:
                    item.category || "Herramientas y utensilios",
                quantity: Number(item.quantity || 0),
                cost: Number(item.price || 0)
            }))
        );

        setProductionItemName("");
        setProductionItemCategory("Herramientas y utensilios");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function savePurchase() {
        if (supplier === "") {
            alert("Seleccioná un proveedor");
            return;
        }

        if (items.length === 0 && productionItems.length === 0) {
            alert(
                "Agregá al menos una materia prima, producto de reventa "
                + "o material de producción"
            );
            return;
        }

        const invalidItem = items.find(
            (item) =>
                Number(item.quantity || 0) <= 0
                || Number(item.cost || 0) < 0
        );

        if (invalidItem) {
            alert("Revisá las cantidades y los precios de la compra");
            return;
        }

        const invalidProductionItem = productionItems.find(
            (item) =>
                !String(item.name || "").trim()
                || Number(item.quantity || 0) <= 0
                || Number(item.cost || 0) < 0
        );

        if (invalidProductionItem) {
            alert(
                "Revisá los nombres, cantidades y precios de los "
                + "materiales de producción"
            );
            return;
        }

        if (
            paymentMethod === "Tarjeta"
            && !editingPurchase
            && validInstallmentsCount < 1
        ) {
            alert("Ingresá la cantidad de cuotas de la tarjeta");
            return;
        }

        const payload = {
            supplier,
            invoice_number: invoiceNumber,
            date,
            payment_method: paymentMethod,
            installments_count:
                paymentMethod === "Tarjeta"
                    ? validInstallmentsCount
                    : 0,
            shipping_cost: shipping,
            notes,
            items: items.map((item) => ({
                item_type: item.item_type,
                raw_material_id: item.raw_material_id,
                product_id: item.product_id,
                quantity: Number(item.quantity || 0),
                price: Number(item.cost || 0)
            })),
            extra_items: productionItems.map((item) => ({
                name: String(item.name || "").trim(),
                category:
                    String(item.category || "").trim()
                    || "Herramientas y utensilios",
                quantity: Number(item.quantity || 0),
                price: Number(item.cost || 0)
            }))
        };

        setSaving(true);

        try {
            let result;

            if (editingPurchase) {
                const response = await fetch(
                    `${API}/purchases/${editingPurchase.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                result = await response.json();

                if (!response.ok || result.error) {
                    throw new Error(
                        result.error || "No se pudo modificar la compra"
                    );
                }
            } else {
                const response = await fetch(`${API}/purchases`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        supplier: payload.supplier,
                        invoice_number: payload.invoice_number,
                        date: payload.date,
                        payment_method: payload.payment_method,
                        notes: payload.notes
                    })
                });

                const purchase = await response.json();

                if (!response.ok || purchase.error) {
                    throw new Error(
                        purchase.error || "Error guardando compra"
                    );
                }

                const itemsResponse = await fetch(
                    `${API}/purchase-items`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            purchase_id: purchase.id,
                            items: payload.items,
                            installments_count: payload.installments_count,
                            shipping_cost: payload.shipping_cost,
                            extra_items: payload.extra_items,
                            notes: payload.notes
                        })
                    }
                );

                result = await itemsResponse.json();

                if (!itemsResponse.ok || result.error) {
                    throw new Error(
                        result.error || "Error guardando los artículos"
                    );
                }
            }

            alert(
                editingPurchase
                    ? `Compra ${purchaseNumber} modificada correctamente`
                    : `Compra ${purchaseNumber} guardada correctamente`
            );

            resetForm();
            await loadInventoryOptions();
            setHistoryVersion((current) => current + 1);
        } catch (error) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <h2>🛒 Compras</h2>

            <div style={styles.card}>
                <h3 style={styles.sectionTitle}>
                    {editingPurchase
                        ? `✏️ Editar compra ${editingPurchase.number}`
                        : "Nueva Compra"}
                </h3>

                <div style={styles.formGrid}>
                    <div>
                        <label>Número de compra</label>
                        <input
                            value={purchaseNumber}
                            disabled
                            style={styles.input}
                        />
                        <div style={styles.helpText}>
                            Se asigna automáticamente.
                        </div>
                    </div>

                    <div>
                        <label>Proveedor</label>
                        <select
                            value={supplier}
                            onChange={(event) =>
                                setSupplier(event.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="">Seleccionar proveedor</option>
                            {suppliers.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {sup.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Fecha</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div>
                        <label>Número de factura</label>
                        <input
                            value={invoiceNumber}
                            onChange={(event) =>
                                setInvoiceNumber(event.target.value)
                            }
                            style={styles.input}
                        />
                    </div>

                    <div>
                        <label>Forma de pago</label>
                        <select
                            value={paymentMethod}
                            onChange={(event) => {
                                const value = event.target.value;
                                setPaymentMethod(value);

                                if (
                                    value === "Tarjeta"
                                    && Number(installmentsCount || 0) <= 0
                                    && !editingPurchase
                                ) {
                                    setInstallmentsCount(1);
                                }
                            }}
                            style={styles.input}
                        >
                            <option value="Caja">Efectivo / Caja</option>
                            <option value="Banco">
                                Transferencia / Banco
                            </option>
                            <option value="Mercado Pago">
                                Mercado Pago
                            </option>
                            <option value="Tarjeta">
                                Tarjeta de crédito
                            </option>
                            <option value="Proveedores">
                                Cuenta corriente
                            </option>
                        </select>
                    </div>

                    {paymentMethod === "Tarjeta" && (
                        <div>
                            <label>Cantidad de cuotas</label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                step="1"
                                value={
                                    installmentsCount > 0
                                        ? installmentsCount
                                        : ""
                                }
                                onChange={(event) =>
                                    setInstallmentsCount(
                                        Math.max(
                                            Math.trunc(
                                                Number(
                                                    event.target.value || 0
                                                )
                                            ),
                                            0
                                        )
                                    )
                                }
                                placeholder="Ej. 3"
                                style={styles.input}
                            />
                            <div style={styles.helpText}>
                                {
                                    validInstallmentsCount > 0
                                        ? `${validInstallmentsCount} cuota${
                                            validInstallmentsCount === 1
                                                ? ""
                                                : "s"
                                        } de aprox. ${formatMoney(
                                            installmentPreviewAmount
                                        )}`
                                        : (
                                            editingPurchase
                                                ? "Compra anterior sin cronograma de cuotas."
                                                : "Ingresá la cantidad de cuotas."
                                        )
                                }
                            </div>
                        </div>
                    )}

                    <div>
                        <label>Costo de envío</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={shippingCost}
                            onChange={(event) =>
                                setShippingCost(Number(event.target.value))
                            }
                            style={styles.input}
                        />
                        <div style={styles.helpText}>
                            Se prorratea según el precio de cada artículo.
                        </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                        <label>Observaciones</label>
                        <input
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            style={styles.input}
                        />
                    </div>
                </div>

                {
                    paymentMethod === "Tarjeta"
                    && validInstallmentsCount > 0
                    && (
                        <div style={styles.installmentsBox}>
                            <strong>💳 Plan de cuotas</strong>
                            <div>
                                Total: {formatMoney(purchaseTotal)}
                                {" · "}
                                {validInstallmentsCount} cuota
                                {validInstallmentsCount === 1 ? "" : "s"}
                                {" · "}
                                aprox. {formatMoney(installmentPreviewAmount)}
                                {" cada una"}
                            </div>
                            <div style={styles.helpText}>
                                Primera exigible:{" "}
                                {installmentDueDate(1)}
                                {" · "}
                                Última exigible:{" "}
                                {installmentDueDate(validInstallmentsCount)}
                                {" · "}
                                El sistema las pasa a Tarjeta de crédito
                                a pagar cada 30 días.
                            </div>
                        </div>
                    )
                }

                <hr style={styles.separator} />

                <div style={styles.infoBox}>
                    Las materias primas aumentan el stock de insumos. Los
                    productos de reventa aumentan el stock de mercadería. Los
                    materiales y herramientas de producción se registran como
                    gasto y no modifican ningún stock.
                </div>

                <div style={styles.addRow}>
                    <select
                        value={selectedInventory}
                        onChange={(event) =>
                            setSelectedInventory(event.target.value)
                        }
                        style={{
                            ...styles.input,
                            width: 420,
                            maxWidth: "100%"
                        }}
                    >
                        <option value="">
                            Seleccionar artículo comprado
                        </option>

                        <optgroup label="Materias primas">
                            {materials.map((material) => (
                                <option
                                    key={`RAW_MATERIAL:${material.id}`}
                                    value={`RAW_MATERIAL:${material.id}`}
                                >
                                    {material.name}
                                </option>
                            ))}
                        </optgroup>

                        <optgroup label="Productos de reventa">
                            {resaleProducts.map((product) => (
                                <option
                                    key={`RESALE:${product.id}`}
                                    value={`RESALE:${product.id}`}
                                >
                                    {product.name}
                                </option>
                            ))}
                        </optgroup>
                    </select>

                    <button
                        onClick={addInventoryItem}
                        style={styles.addButton}
                    >
                        ➕ Agregar
                    </button>
                </div>

                <div style={styles.itemsScroller}>
                    <div style={styles.itemsHeader}>
                        <div>Artículo</div>
                        <div>Tipo</div>
                        <div>Cantidad</div>
                        <div>Precio comprado</div>
                        <div>Envío asignado</div>
                        <div>Costo final</div>
                        <div></div>
                    </div>

                    {items.length === 0 && (
                        <p style={styles.emptyText}>
                            No hay artículos agregados.
                        </p>
                    )}

                    {items.map((item, index) => {
                        const allocatedShipping = shippingShare(item);
                        const finalCost =
                            Number(item.cost || 0) + allocatedShipping;

                        return (
                            <div key={item.key} style={styles.itemRow}>
                                <div style={styles.itemName}>
                                    {item.name}
                                    <span style={styles.unitText}>
                                        {item.unit ? ` (${item.unit})` : ""}
                                    </span>
                                </div>

                                <div>
                                    <span
                                        style={
                                            item.item_type === "RESALE"
                                                ? styles.resaleBadge
                                                : styles.materialBadge
                                        }
                                    >
                                        {item.item_type === "RESALE"
                                            ? "Reventa"
                                            : "Materia prima"}
                                    </span>
                                </div>

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
                                    style={styles.compactInput}
                                />

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.cost}
                                    onChange={(event) =>
                                        updateItem(
                                            index,
                                            "cost",
                                            event.target.value
                                        )
                                    }
                                    style={styles.compactInput}
                                />

                                <div style={styles.moneyCell}>
                                    {formatMoney(allocatedShipping)}
                                </div>

                                <div style={styles.totalCell}>
                                    {formatMoney(finalCost)}
                                </div>

                                <button
                                    onClick={() => removeItem(index)}
                                    style={styles.removeButton}
                                    title="Quitar artículo"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>

                <hr style={styles.separator} />

                <div style={styles.productionHeader}>
                    <div>
                        <h4 style={styles.productionTitle}>
                            🧰 Materiales y herramientas de producción
                        </h4>
                        <div style={styles.helpText}>
                            Ejemplos: jarra medidora, espátula, molde, guantes
                            o elementos de limpieza. Se contabilizan como gasto
                            y no generan stock.
                        </div>
                    </div>
                </div>

                <div style={styles.productionAddRow}>
                    <input
                        value={productionItemName}
                        onChange={(event) =>
                            setProductionItemName(event.target.value)
                        }
                        placeholder="Nombre del material o herramienta"
                        style={{ ...styles.input, marginTop: 0 }}
                    />

                    <select
                        value={productionItemCategory}
                        onChange={(event) =>
                            setProductionItemCategory(event.target.value)
                        }
                        style={{ ...styles.input, marginTop: 0 }}
                    >
                        <option value="Herramientas y utensilios">
                            Herramientas y utensilios
                        </option>
                        <option value="Moldes y elementos de producción">
                            Moldes y elementos de producción
                        </option>
                        <option value="Limpieza y seguridad">
                            Limpieza y seguridad
                        </option>
                        <option value="Otro material de producción">
                            Otro material de producción
                        </option>
                    </select>

                    <button
                        onClick={addProductionItem}
                        style={styles.addButton}
                    >
                        ➕ Agregar material
                    </button>
                </div>

                <div style={styles.productionScroller}>
                    <div style={styles.productionItemsHeader}>
                        <div>Material o herramienta</div>
                        <div>Categoría</div>
                        <div>Cantidad</div>
                        <div>Precio comprado</div>
                        <div>Envío asignado</div>
                        <div>Costo final</div>
                        <div></div>
                    </div>

                    {productionItems.length === 0 && (
                        <p style={styles.emptyText}>
                            No hay materiales de producción agregados.
                        </p>
                    )}

                    {productionItems.map((item, index) => {
                        const allocatedShipping = shippingShare(item);
                        const finalCost =
                            Number(item.cost || 0) + allocatedShipping;

                        return (
                            <div
                            key={item.key}
                            style={styles.productionItemRow}
                        >
                            <input
                                value={item.name}
                                onChange={(event) =>
                                    updateProductionItem(
                                        index,
                                        "name",
                                        event.target.value
                                    )
                                }
                                style={styles.compactInput}
                            />

                            <select
                                value={item.category}
                                onChange={(event) =>
                                    updateProductionItem(
                                        index,
                                        "category",
                                        event.target.value
                                    )
                                }
                                style={styles.compactInput}
                            >
                                <option value="Herramientas y utensilios">
                                    Herramientas y utensilios
                                </option>
                                <option value="Moldes y elementos de producción">
                                    Moldes y elementos de producción
                                </option>
                                <option value="Limpieza y seguridad">
                                    Limpieza y seguridad
                                </option>
                                <option value="Otro material de producción">
                                    Otro material de producción
                                </option>
                            </select>

                            <input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={item.quantity}
                                onChange={(event) =>
                                    updateProductionItem(
                                        index,
                                        "quantity",
                                        event.target.value
                                    )
                                }
                                style={styles.compactInput}
                            />

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cost}
                                onChange={(event) =>
                                    updateProductionItem(
                                        index,
                                        "cost",
                                        event.target.value
                                    )
                                }
                                style={styles.compactInput}
                            />

                            <div style={styles.moneyCell}>
                                {formatMoney(allocatedShipping)}
                            </div>

                            <div style={styles.totalCell}>
                                {formatMoney(finalCost)}
                            </div>

                            <button
                                onClick={() => removeProductionItem(index)}
                                style={styles.removeButton}
                                title="Quitar material de producción"
                            >
                                ✕
                            </button>
                            </div>
                        );
                    })}
                </div>

                <div style={styles.summary}>
                    <div>
                        Stock comprado:{" "}
                        <strong>{formatMoney(inventorySubtotal)}</strong>
                    </div>
                    <div>
                        Materiales de producción:{" "}
                        <strong>{formatMoney(productionSubtotal)}</strong>
                    </div>
                    <div>
                        Envío: <strong>{formatMoney(shipping)}</strong>
                    </div>
                    <div style={styles.grandTotal}>
                        Total: {formatMoney(purchaseTotal)}
                    </div>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={savePurchase}
                        style={styles.saveButton}
                        disabled={saving}
                    >
                        {saving
                            ? "Guardando..."
                            : editingPurchase
                                ? "💾 Guardar cambios"
                                : "💾 Guardar Compra"}
                    </button>

                    {editingPurchase && (
                        <button
                            onClick={resetForm}
                            style={styles.cancelButton}
                            disabled={saving}
                        >
                            Cancelar edición
                        </button>
                    )}
                </div>
            </div>

            <PurchaseHistory
                key={historyVersion}
                onEdit={startEditPurchase}
                onChanged={async () => {
                    await loadInventoryOptions();
                    await loadNextPurchaseNumber();
                }}
            />
        </div>
    );
}

const styles = {
    card: {
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 18,
        marginTop: 16
    },
    sectionTitle: {
        marginTop: 0,
        marginBottom: 15
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
        padding: "7px 8px",
        marginTop: 4
    },
    compactInput: {
        width: "100%",
        minWidth: 90,
        boxSizing: "border-box",
        padding: "6px 7px"
    },
    helpText: {
        marginTop: 4,
        fontSize: 11,
        color: "#666"
    },
    separator: { margin: "18px 0" },
    installmentsBox: {
        marginTop: 14,
        padding: 11,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa",
        lineHeight: 1.5
    },
    infoBox: {
        marginBottom: 14,
        padding: 11,
        border: "1px solid #d7dfd3",
        borderRadius: 8,
        background: "#f8fbf6",
        color: "#44513f",
        fontSize: 13
    },
    addRow: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 14
    },
    addButton: {
        padding: "7px 12px",
        cursor: "pointer"
    },
    itemsScroller: {
        width: "100%",
        overflowX: "auto"
    },
    itemsHeader: {
        display: "grid",
        gridTemplateColumns:
            "minmax(180px, 2fr) 115px 100px 130px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "2px solid #ddd",
        fontSize: 12,
        fontWeight: "bold",
        background: "#f7f7f7",
        minWidth: 850
    },
    itemRow: {
        display: "grid",
        gridTemplateColumns:
            "minmax(180px, 2fr) 115px 100px 130px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "1px solid #eee",
        minWidth: 850
    },
    itemName: { fontWeight: "bold" },
    unitText: {
        fontSize: 12,
        fontWeight: "normal",
        color: "#666"
    },
    materialBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 10,
        background: "#e8f1e5",
        color: "#34522d",
        fontSize: 11,
        whiteSpace: "nowrap"
    },
    resaleBadge: {
        display: "inline-block",
        padding: "3px 7px",
        borderRadius: 10,
        background: "#fff3cd",
        color: "#6a5200",
        fontSize: 11,
        whiteSpace: "nowrap"
    },
    moneyCell: {
        fontSize: 13,
        textAlign: "right"
    },
    totalCell: {
        fontSize: 13,
        fontWeight: "bold",
        textAlign: "right"
    },
    removeButton: {
        border: "none",
        background: "transparent",
        color: "#b00020",
        fontSize: 18,
        cursor: "pointer"
    },
    emptyText: {
        margin: "14px 0",
        color: "#666"
    },
    productionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12
    },
    productionTitle: {
        margin: 0,
        fontSize: 16
    },
    productionAddRow: {
        display: "grid",
        gridTemplateColumns: "minmax(220px, 2fr) minmax(210px, 1fr) auto",
        gap: 8,
        alignItems: "center",
        marginBottom: 14
    },
    productionScroller: {
        width: "100%",
        overflowX: "auto"
    },
    productionItemsHeader: {
        display: "grid",
        gridTemplateColumns:
            "minmax(220px, 2fr) minmax(210px, 1.5fr) 100px 140px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "2px solid #ddd",
        fontSize: 12,
        fontWeight: "bold",
        background: "#f7f7f7",
        minWidth: 1040
    },
    productionItemRow: {
        display: "grid",
        gridTemplateColumns:
            "minmax(220px, 2fr) minmax(210px, 1.5fr) 100px 140px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "1px solid #eee",
        minWidth: 1040
    },
    summary: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 20,
        alignItems: "center",
        flexWrap: "wrap",
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid #ddd"
    },
    grandTotal: {
        fontSize: 20,
        fontWeight: "bold"
    },
    actions: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap"
    },
    saveButton: {
        marginTop: 16,
        padding: "9px 16px",
        cursor: "pointer"
    },
    cancelButton: {
        marginTop: 16,
        padding: "9px 16px",
        cursor: "pointer"
    }
};
