import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

const emptyForm = {
    name: "",
    output_product_id: "",
    batch_size: 1,
    units_produced: 1,
    labor_hours: 0,
    margin_percent: 40,
    notes: ""
};

export default function FormulaForm({ onSaved, editing }) {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name || "",
                output_product_id: editing.output_product_id || "",
                batch_size: editing.batch_size || 1,
                units_produced: editing.units_produced || 1,
                labor_hours: editing.labor_hours || 0,
                margin_percent:
                    editing.margin_percent ?? 40,
                notes: editing.notes || ""
            });
        } else {
            setForm(emptyForm);
        }
    }, [editing]);

    async function loadProducts() {
        const response = await fetch(`${API}/products`);
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
    }

    function change(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function save() {
        const margin = Number(form.margin_percent);

        if (!form.output_product_id) {
            alert("Seleccioná el producto terminado");
            return;
        }

        if (!form.name.trim()) {
            alert("Ingresá el nombre de la fórmula");
            return;
        }

        if (margin < 0 || margin >= 100) {
            alert("El margen debe ser mayor o igual a 0 y menor a 100");
            return;
        }

        const url = editing
            ? `${API}/formulas/${editing.id}`
            : `${API}/formulas`;

        const response = await fetch(url, {
            method: editing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: form.name.trim(),
                output_product_id: Number(form.output_product_id),
                batch_size: Number(form.batch_size),
                units_produced: Number(form.units_produced),
                labor_hours: Number(form.labor_hours),
                margin_percent: margin,
                notes: form.notes
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo guardar la fórmula");
            return;
        }

        setForm(emptyForm);
        onSaved();
    }

    return (
        <div
            style={{
                border: "1px solid #ccc",
                padding: 20,
                borderRadius: 10,
                marginBottom: 20
            }}
        >
            <h3>
                {editing ? "✏ Editar Fórmula" : "🧪 Nueva Fórmula"}
            </h3>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 14
                }}
            >
                <div>
                    <label>Producto terminado</label>
                    <select
                        name="output_product_id"
                        value={form.output_product_id}
                        onChange={change}
                        style={styles.input}
                    >
                        <option value="">Seleccionar producto</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Nombre de la fórmula</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Cantidad del lote</label>
                    <input
                        name="batch_size"
                        type="number"
                        min="0"
                        step="any"
                        value={form.batch_size}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Unidades producidas</label>
                    <input
                        name="units_produced"
                        type="number"
                        min="0.0001"
                        step="any"
                        value={form.units_produced}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Horas de elaboración</label>
                    <input
                        name="labor_hours"
                        type="number"
                        min="0"
                        step="0.25"
                        value={form.labor_hours}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Margen de rentabilidad (%)</label>
                    <input
                        name="margin_percent"
                        type="number"
                        min="0"
                        max="99.99"
                        step="0.01"
                        value={form.margin_percent}
                        onChange={change}
                        style={styles.input}
                    />
                    <div style={styles.helpText}>
                        Ejemplo: 40% divide el costo por 0,60.
                    </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                    <label>Observaciones</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={change}
                        rows={4}
                        style={styles.input}
                    />
                </div>
            </div>

            <button onClick={save} style={{ marginTop: 16 }}>
                💾 Guardar
            </button>
        </div>
    );
}

const styles = {
    input: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: 8,
        marginTop: 5
    },
    helpText: {
        marginTop: 4,
        fontSize: 12,
        color: "#666"
    }
};
