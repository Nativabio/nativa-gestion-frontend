import { useEffect, useMemo, useState } from "react";
import PurchaseHistory from "./PurchaseHistory";

const API = "http://127.0.0.1:8000";

export default function Purchases() {

    const [suppliers, setSuppliers] = useState([]);
    const [supplier, setSupplier] = useState("");
    const [purchaseNumber, setPurchaseNumber] = useState("");
    const [historyVersion, setHistoryVersion] = useState(0);

    const [date, setDate] = useState(
        new Date().toISOString().substring(0, 10)
    );

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

            const response = await fetch(
                `${API}/next-purchase-number`
            );

            const data = await response.json();

            setPurchaseNumber(
                data.next_number || ""
            );

        } catch {

            setPurchaseNumber("");

        }

    }


    async function loadMaterials() {

        const response = await fetch(
            `${API}/raw-materials`
        );

        const data = await response.json();

        setMaterials(
            Array.isArray(data)
                ? data
                : []
        );

    }


    async function loadSuppliers() {

        const response = await fetch(
            `${API}/suppliers`
        );

        const data = await response.json();

        setSuppliers(
            Array.isArray(data)
                ? data
                : []
        );

    }


    function addMaterial() {

        if (selectedMaterial === "") return;

        const material = materials.find(
            (item) =>
                item.id == selectedMaterial
        );

        if (!material) return;

        setItems([
            ...items,
            {
                ...material,
                quantity: 1,
                cost: 0
            }
        ]);

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
                (_, itemIndex) =>
                    itemIndex !== index
            )
        );

    }


    const materialsSubtotal = useMemo(
        () =>
            items.reduce(
                (sum, item) =>
                    sum + Number(item.cost || 0),
                0
            ),
        [items]
    );


    const shipping = Math.max(
        Number(shippingCost || 0),
        0
    );


    function shippingShare(item) {

        if (
            shipping <= 0
            ||
            materialsSubtotal <= 0
        ) {

            return 0;

        }

        return (
            shipping
            *
            Number(item.cost || 0)
            /
            materialsSubtotal
        );

    }


    const purchaseTotal = (
        materialsSubtotal
        +
        shipping
    );


    function formatMoney(value) {

        return Number(value || 0).toLocaleString(
            "es-AR",
            {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

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
                Number(item.quantity || 0) <= 0
                ||
                Number(item.cost || 0) < 0
        );

        if (invalidItem) {

            alert(
                "Revisá las cantidades y los precios de la compra"
            );

            return;

        }

        const response = await fetch(
            `${API}/purchases`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    supplier: supplier,
                    date: date,
                    payment_method: paymentMethod,
                    total: purchaseTotal,
                    notes: (
                        shipping > 0
                            ? `Costo de envío: ${shipping}`
                            : ""
                    )
                })
            }
        );

        const purchase = await response.json();

        if (!response.ok || purchase.error) {

            alert(
                purchase.error ||
                "Error guardando compra"
            );

            return;

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

                    items: items.map((item) => ({

                        raw_material_id: item.id,

                        quantity:
                            Number(item.quantity || 0),

                        price:
                            Number(item.cost || 0)
                            +
                            shippingShare(item)

                    }))

                })
            }
        );

        const itemsData = await itemsResponse.json();

        if (!itemsResponse.ok || itemsData.error) {

            alert(
                itemsData.error ||
                "Error guardando las materias primas"
            );

            return;

        }

        alert(
            `Compra ${purchase.number} guardada correctamente`
        );

        setItems([]);
        setSupplier("");
        setPaymentMethod("Caja");
        setShippingCost(0);

        await loadMaterials();
        await loadNextPurchaseNumber();

        setHistoryVersion(
            (current) =>
                current + 1
        );

    }


    return (

        <div>

            <h2>🛒 Compras</h2>

            <div style={styles.card}>

                <h3 style={styles.sectionTitle}>
                    Nueva Compra
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
                            onChange={(e) =>
                                setSupplier(
                                    e.target.value
                                )
                            }
                            style={styles.input}
                        >

                            <option value="">
                                Seleccionar proveedor
                            </option>

                            {
                                suppliers.map((sup) => (

                                    <option
                                        key={sup.id}
                                        value={sup.id}
                                    >
                                        {sup.name}
                                    </option>

                                ))
                            }

                        </select>

                    </div>

                    <div>

                        <label>Fecha</label>

                        <input
                            type="date"
                            value={date}
                            onChange={(e) =>
                                setDate(
                                    e.target.value
                                )
                            }
                            style={styles.input}
                        />

                    </div>

                    <div>

                        <label>Forma de pago</label>

                        <select
                            value={paymentMethod}
                            onChange={(e) =>
                                setPaymentMethod(
                                    e.target.value
                                )
                            }
                            style={styles.input}
                        >

                            <option value="Caja">
                                Efectivo / Caja
                            </option>

                            <option value="Banco">
                                Transferencia / Banco
                            </option>

                            <option value="Mercado Pago">
                                Mercado Pago
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
                            onChange={(e) =>
                                setShippingCost(
                                    Number(e.target.value)
                                )
                            }
                            style={styles.input}
                        />

                        <div style={styles.helpText}>
                            Se prorratea según el precio de cada materia prima.
                        </div>

                    </div>

                </div>


                <hr style={styles.separator} />


                <div style={styles.addRow}>

                    <select
                        value={selectedMaterial}
                        onChange={(e) =>
                            setSelectedMaterial(
                                e.target.value
                            )
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

                        {
                            materials.map((material) => (

                                <option
                                    key={material.id}
                                    value={material.id}
                                >
                                    {material.name}
                                </option>

                            ))
                        }

                    </select>

                    <button
                        onClick={addMaterial}
                        style={styles.addButton}
                    >
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


                {
                    items.length === 0 && (

                        <p style={styles.emptyText}>
                            No hay materias primas agregadas.
                        </p>

                    )
                }


                {
                    items.map((item, index) => {

                        const allocatedShipping =
                            shippingShare(item);

                        const finalCost =
                            Number(item.cost || 0)
                            +
                            allocatedShipping;

                        return (

                            <div
                                key={`${item.id}-${index}`}
                                style={styles.itemRow}
                            >

                                <div style={styles.itemName}>
                                    {item.name}
                                    <span style={styles.unitText}>
                                        {item.unit
                                            ? ` (${item.unit})`
                                            : ""}
                                    </span>
                                </div>

                                <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "quantity",
                                            e.target.value
                                        )
                                    }
                                    style={styles.compactInput}
                                />

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.cost}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "cost",
                                            e.target.value
                                        )
                                    }
                                    style={styles.compactInput}
                                />

                                <div style={styles.moneyCell}>
                                    {formatMoney(
                                        allocatedShipping
                                    )}
                                </div>

                                <div style={styles.totalCell}>
                                    {formatMoney(finalCost)}
                                </div>

                                <button
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                    style={styles.removeButton}
                                    title="Quitar materia prima"
                                >
                                    ✕
                                </button>

                            </div>

                        );

                    })
                }


                <div style={styles.summary}>

                    <div>
                        Materias primas:
                        {" "}
                        <strong>
                            {formatMoney(materialsSubtotal)}
                        </strong>
                    </div>

                    <div>
                        Envío:
                        {" "}
                        <strong>
                            {formatMoney(shipping)}
                        </strong>
                    </div>

                    <div style={styles.grandTotal}>
                        Total:
                        {" "}
                        {formatMoney(purchaseTotal)}
                    </div>

                </div>


                <button
                    onClick={savePurchase}
                    style={styles.saveButton}
                >
                    💾 Guardar Compra
                </button>

            </div>

            <PurchaseHistory
                key={historyVersion}
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

    separator: {
        margin: "18px 0"
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

    itemName: {
        fontWeight: "bold"
    },

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

    saveButton: {
        marginTop: 16,
        padding: "9px 16px",
        cursor: "pointer"
    }

};
