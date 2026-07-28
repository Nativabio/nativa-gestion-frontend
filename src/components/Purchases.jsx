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
    const [shippingCost, setShippingCost] = useState(0);
    const [materials, setMaterials] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [items, setItems] = useState([]);

    useEffect(() => {
        loadMaterials();
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

    async function loadMaterials() {
        const response = await fetch(`${API}/raw-materials`);
        const data = await response.json();
        setMaterials(Array.isArray(data) ? data : []);
    }

    async function loadSuppliers() {
        const response = await fetch(`${API}/suppliers`);
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
    }

    function addMaterial() {
        if (selectedMaterial === "") return;

        const material = materials.find(
            (item) => item.id === Number(selectedMaterial)
        );

        if (!material) return;

        const existingIndex = items.findIndex(
            (item) => item.id === material.id
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
                    ...material,
                    quantity: 1,
                    cost: 0
                }
            ]);
        }

        setSelectedMaterial("");
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
            currentItems.filter(
                (_, itemIndex) => itemIndex !== index
            )
        );
    }

    const materialsSubtotal = useMemo(
        () =>
            items.reduce(
                (sum, item) => sum + Number(item.cost || 0),
                0
            ),
        [items]
    );

    const shipping = Math.max(Number(shippingCost || 0), 0);

    function shippingShare(item) {
        if (shipping <= 0 || materialsSubtotal <= 0) return 0;

        return (
            shipping *
            Number(item.cost || 0) /
            materialsSubtotal
        );
    }

    const purchaseTotal = materialsSubtotal + shipping;

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
        setShippingCost(0);
        setDate(today);
        setEditingPurchase(null);
        setSelectedMaterial("");
        loadNextPurchaseNumber();
    }

    function startEditPurchase(purchase) {
        const purchaseItems = purchase.items || [];
        const totalStoredMaterialPrice = purchaseItems.reduce(
            (sum, item) => sum + Number(item.price || 0),
            0
        );
        const savedShipping = Number(purchase.shipping_cost || 0);
        const baseTotal = Math.max(
            totalStoredMaterialPrice - savedShipping,
            0
        );

        setEditingPurchase(purchase);
        setPurchaseNumber(purchase.number || "");
        setSupplier(String(purchase.supplier_reference || ""));
        setInvoiceNumber(purchase.invoice_number || "");
        setNotes(purchase.notes || "");
        setDate(String(purchase.date || today).substring(0, 10));
        setPaymentMethod(purchase.payment_method || "Caja");
        setShippingCost(savedShipping);

        setItems(
            purchaseItems.map((purchaseItem) => {
                const material = materials.find(
                    (item) =>
                        item.id === Number(purchaseItem.raw_material_id)
                );

                let basePrice = Number(purchaseItem.price || 0);

                if (
                    savedShipping > 0 &&
                    totalStoredMaterialPrice > 0
                ) {
                    basePrice =
                        Number(purchaseItem.price || 0) *
                        baseTotal /
                        totalStoredMaterialPrice;
                }

                return {
                    ...(material || {}),
                    id: Number(purchaseItem.raw_material_id),
                    name:
                        purchaseItem.name ||
                        material?.name ||
                        "Materia prima",
                    unit: purchaseItem.unit || material?.unit || "",
                    quantity: Number(purchaseItem.quantity || 0),
                    cost: Number(basePrice.toFixed(2))
                };
            })
        );

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function savePurchase() {
        if (supplier === "") {
            alert("Seleccioná un proveedor");
            return;
        }

        if (items.length === 0) {
            alert("Agregá al menos una materia prima");
            return;
        }

        const invalidItem = items.find(
            (item) =>
                Number(item.quantity || 0) <= 0 ||
                Number(item.cost || 0) < 0
        );

        if (invalidItem) {
            alert("Revisá las cantidades y los precios de la compra");
            return;
        }

        const payload = {
            supplier,
            invoice_number: invoiceNumber,
            date,
            payment_method: paymentMethod,
            shipping_cost: shipping,
            notes,
            items: items.map((item) => ({
                raw_material_id: item.id,
                quantity: Number(item.quantity || 0),
                price: Number(item.cost || 0)
            })),
            extra_items: editingPurchase?.extra_items || []
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
                        result.error ||
                        "No se pudo modificar la compra"
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
                            shipping_cost: payload.shipping_cost,
                            extra_items: payload.extra_items,
                            notes: payload.notes
                        })
                    }
                );

                result = await itemsResponse.json();

                if (!itemsResponse.ok || result.error) {
                    throw new Error(
                        result.error ||
                        "Error guardando las materias primas"
                    );
                }
            }

            alert(
                editingPurchase
                    ? `Compra ${purchaseNumber} modificada correctamente`
                    : `Compra ${purchaseNumber} guardada correctamente`
            );

            resetForm();
            await loadMaterials();

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
                            onChange={(event) =>
                                setDate(event.target.value)
                            }
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
                            onChange={(event) =>
                                setPaymentMethod(event.target.value)
                            }
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
                            Se prorratea según el precio de cada materia prima.
                        </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                        <label>Observaciones</label>
                        <input
                            value={notes}
                            onChange={(event) =>
                                setNotes(event.target.value)
                            }
                            style={styles.input}
                        />
                    </div>
                </div>

                <hr style={styles.separator} />

                <div style={styles.addRow}>
                    <select
                        value={selectedMaterial}
                        onChange={(event) =>
                            setSelectedMaterial(event.target.value)
                        }
                        style={{
                            ...styles.input,
                            width: 350,
                            maxWidth: "100%"
                        }}
                    >
                        <option value="">
                            Seleccionar materia prima
                        </option>
                        {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                                {material.name}
                            </option>
                        ))}
                    </select>

                    <button onClick={addMaterial} style={styles.addButton}>
                        ➕ Agregar
                    </button>
                </div>

                <div style={styles.itemsHeader}>
                    <div>Materia prima</div>
                    <div>Cantidad</div>
                    <div>Precio comprado</div>
                    <div>Envío asignado</div>
                    <div>Costo final</div>
                    <div></div>
                </div>

                {items.length === 0 && (
                    <p style={styles.emptyText}>
                        No hay materias primas agregadas.
                    </p>
                )}

                {items.map((item, index) => {
                    const allocatedShipping = shippingShare(item);
                    const finalCost =
                        Number(item.cost || 0) + allocatedShipping;

                    return (
                        <div
                            key={`${item.id}-${index}`}
                            style={styles.itemRow}
                        >
                            <div style={styles.itemName}>
                                {item.name}
                                <span style={styles.unitText}>
                                    {item.unit ? ` (${item.unit})` : ""}
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
                                title="Quitar materia prima"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}

                <div style={styles.summary}>
                    <div>
                        Materias primas:{" "}
                        <strong>
                            {formatMoney(materialsSubtotal)}
                        </strong>
                    </div>
                    <div>
                        Envío:{" "}
                        <strong>{formatMoney(shipping)}</strong>
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
                    await loadMaterials();
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
        gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
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
    itemsHeader: {
        display: "grid",
        gridTemplateColumns:
            "minmax(180px, 2fr) 100px 130px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "2px solid #ddd",
        fontSize: 12,
        fontWeight: "bold",
        background: "#f7f7f7",
        overflowX: "auto"
    },
    itemRow: {
        display: "grid",
        gridTemplateColumns:
            "minmax(180px, 2fr) 100px 130px 130px 130px 38px",
        gap: 8,
        alignItems: "center",
        padding: "7px 9px",
        borderBottom: "1px solid #eee",
        minWidth: 720
    },
    itemName: { fontWeight: "bold" },
    unitText: {
        fontSize: 12,
        fontWeight: "normal",
        color: "#666"
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
