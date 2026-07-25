import { useEffect, useState } from "react";
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

        setMaterials(data);

    }


    async function loadSuppliers() {

        const response = await fetch(
            `${API}/suppliers`
        );

        const data = await response.json();

        setSuppliers(data);

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
                quantity: 1
            }
        ]);

        setSelectedMaterial("");

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

        const total = items.reduce(
            (sum, item) =>
                sum + Number(item.cost),
            0
        );

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
                    total: total
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
                        quantity: item.quantity,
                        price: item.cost
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

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 20,
                    marginTop: 20
                }}
            >

                <h3>Nueva Compra</h3>

                <label>Número de compra</label>

                <br />

                <input
                    value={purchaseNumber}
                    disabled
                    style={{
                        width: 120,
                        padding: 8,
                        marginTop: 5
                    }}
                />

                <div
                    style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: "#666"
                    }}
                >
                    El número se asigna automáticamente y no se repite.
                </div>

                <br />

                <label>Proveedor</label>

                <br />

                <select
                    value={supplier}
                    onChange={(e) =>
                        setSupplier(
                            e.target.value
                        )
                    }
                    style={{
                        width: 320,
                        padding: 8,
                        marginTop: 5
                    }}
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

                <br /><br />

                <label>Fecha</label>

                <br />

                <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                        setDate(
                            e.target.value
                        )
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
                    onChange={(e) =>
                        setPaymentMethod(
                            e.target.value
                        )
                    }
                    style={{
                        width: 320,
                        padding: 8,
                        marginTop: 5
                    }}
                >

                    <option value="Caja">Caja</option>
                    <option value="Banco">Banco</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Proveedores">
                        Proveedores / cuenta corriente
                    </option>

                </select>

                <hr style={{ margin: "25px 0" }} />

                <h3>Materias primas</h3>

                <select
                    value={selectedMaterial}
                    onChange={(e) =>
                        setSelectedMaterial(
                            e.target.value
                        )
                    }
                    style={{
                        width: 350,
                        padding: 8
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
                    style={{
                        marginLeft: 10
                    }}
                >
                    ➕ Agregar materia prima
                </button>

                <hr />

                <h3>Materias primas agregadas</h3>

                {

                    items.length === 0 && (
                        <p>No hay materias primas agregadas.</p>
                    )

                }

                {

                    items.map((item, index) => (

                        <div
                            key={index}
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
                                    gap: 20
                                }}
                            >

                                <div>

                                    <label>Cantidad</label>

                                    <br />

                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {

                                            const copy = [...items];

                                            copy[index].quantity =
                                                Number(e.target.value);

                                            setItems(copy);

                                        }}
                                        style={{
                                            width: 100
                                        }}
                                    />

                                </div>

                                <div>

                                    <label>Precio total</label>

                                    <br />

                                    <input
                                        type="number"
                                        value={item.cost}
                                        onChange={(e) => {

                                            const copy = [...items];

                                            copy[index].cost =
                                                Number(e.target.value);

                                            setItems(copy);

                                        }}
                                        style={{
                                            width: 120
                                        }}
                                    />

                                </div>

                                <div>

                                    <label>Subtotal</label>

                                    <br />

                                    <b>
                                        ${Number(item.cost || 0).toFixed(2)}
                                    </b>

                                </div>

                            </div>

                        </div>

                    ))

                }

                <hr />

                <h2>
                    Total: $
                    {
                        items
                            .reduce(
                                (sum, item) =>
                                    sum + Number(item.cost || 0),
                                0
                            )
                            .toFixed(2)
                    }
                </h2>

                <button onClick={savePurchase}>
                    💾 Guardar Compra
                </button>

            </div>

            <PurchaseHistory
                key={historyVersion}
            />

        </div>

    );

}
