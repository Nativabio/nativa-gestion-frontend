import { useEffect, useState } from "react";
import SaleHistory from "./SaleHistory";

export default function Sales() {

    const [client, setClient] = useState("");
    const [date, setDate] = useState(
        new Date().toISOString().substring(0, 10)
    );

    const [paymentMethod, setPaymentMethod] = useState("Caja");

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [items, setItems] = useState([]);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {

        const res = await fetch(
            "http://127.0.0.1:8000/products"
        );

        const data = await res.json();

        setProducts(data);

    }

    function addProduct() {

        if (selectedProduct === "") return;

        const product = products.find(
            (p) => p.id == selectedProduct
        );

        if (!product) return;

        setItems([
            ...items,
            {
                ...product,
                quantity: 1
            }
        ]);

        setSelectedProduct("");

    }

    async function saveSale() {

    console.log("CLICK EN GUARDAR VENTA");

    if (items.length === 0) {

        alert("Agregá al menos un producto");

        return;

    }

    const response = await fetch(
        "http://127.0.0.1:8000/sales",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client: client,
                date: date,
                payment_method: paymentMethod
            })
        }
    );

    console.log(response.status);

    const sale = await response.json();

    if (!response.ok) {

        alert("Error al crear la venta");

        return;

    }

    const responseItems = await fetch(
        "http://127.0.0.1:8000/sale-items",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({

                sale_id: sale.id,

                items: items.map(item => ({

                    product_id: item.id,

                    quantity: item.quantity,

                    price: item.price

                }))

            })
        }
    );

    const result = await responseItems.json();

    if (result.error) {

        alert(result.error);

        return;

    }

    alert("✅ Venta guardada correctamente");

    setItems([]);
    setClient("");
    setPaymentMethod("Caja");
    loadProducts();

}

    return (

        
        
        <div>

            <h2>🧾 Ventas</h2>

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 20,
                    marginTop: 20
                }}
            >

                <h3>Nueva Venta</h3>

                <label>Cliente</label>

                <br />

                <input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    style={{
                        width: 300,
                        padding: 8,
                        marginTop: 5
                    }}
                />

                <br /><br />

                <label>Fecha</label>

                <br />

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
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
                        setPaymentMethod(e.target.value)
                    }
                    style={{
                        width: 300,
                        padding: 8,
                        marginTop: 5
                    }}
                >
                    <option value="Caja">Caja</option>
                    <option value="Banco">Banco</option>
                    <option value="Mercado Pago">
                        Mercado Pago
                    </option>
                </select>

                <hr style={{ margin: "25px 0" }} />

                <h3>Productos</h3>

                <select
                    value={selectedProduct}
                    onChange={(e) =>
                        setSelectedProduct(e.target.value)
                    }
                    style={{
                        width: 350,
                        padding: 8
                    }}
                >

                    <option value="">
                        Seleccionar producto
                    </option>

                    {products.map((product) => (

                        <option
                            key={product.id}
                            value={product.id}
                        >
                            {product.name}
                        </option>

                    ))}

                </select>

                <button
                    onClick={addProduct}
                    style={{
                        marginLeft: 10
                    }}
                >
                    ➕ Agregar Producto
                </button>

                <hr />

                <h3>Productos agregados</h3>

                {items.length === 0 && (
                    <p>No hay productos agregados.</p>
                )}
                                {items.map((item, index) => (

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
                                gap: 20,
                                alignItems: "center"
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

                                        copy[index].quantity = Number(e.target.value);

                                        setItems(copy);

                                    }}
                                    style={{ width: 100 }}
                                />

                            </div>

                            <div>

                                <label>Precio</label>

                                <br />

                                <input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => {

                                        const copy = [...items];

                                        copy[index].price = Number(e.target.value);

                                        setItems(copy);

                                    }}
                                    style={{ width: 120 }}
                                />

                            </div>

                            <div>

                                <label>Subtotal</label>

                                <br />

                                <b>

                                    $
                                    {(item.quantity * item.price).toFixed(2)}

                                </b>

                            </div>

                        </div>

                    </div>

                ))}

                <hr />

                <h2>

                    Total: $

                    {items
                        .reduce(
                            (sum, item) =>
                                sum + item.quantity * item.price,
                            0
                        )
                        .toFixed(2)}

                </h2>

                <br />

                <button
                   onClick={saveSale}
                >
                   💾 Guardar Venta
                </button>

            </div>

            <SaleHistory />

        </div>

    );

}