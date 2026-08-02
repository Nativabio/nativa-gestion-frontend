import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

const emptyForm = {
    code: "",
    name: "",
    category: "",
    unit: "g",
    stock: 0,
    minimum_stock: 0,
    cost: 0,
    supplier: "",
    location: "",
    is_intermediate: 0
};

export default function RawMaterialForm({ onSaved, editItem }) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editItem) {
            setForm({
                code: editItem.code || "",
                name: editItem.name || "",
                category: editItem.category || "",
                unit: editItem.unit || "g",
                stock: Number(editItem.stock || 0),
                minimum_stock: Number(editItem.minimum_stock || 0),
                cost: Number(editItem.cost || 0),
                supplier: editItem.supplier || "",
                location: editItem.location || "",
                is_intermediate: Number(editItem.is_intermediate || 0)
            });
        } else {
            setForm(emptyForm);
        }
    }, [editItem]);

    function change(event) {
        const { name, value, type, checked } = event.target;

        if (name === "is_intermediate" && type === "checkbox") {
            setForm((current) => ({
                ...current,
                is_intermediate: checked ? 1 : 0,
                stock:
                    checked && !editItem
                        ? 0
                        : current.stock,
                cost:
                    checked && !editItem
                        ? 0
                        : current.cost
            }));
            return;
        }

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    }

    async function save() {
        if (!form.name.trim()) {
            alert("Ingresá el nombre de la materia prima");
            return;
        }

        if (!form.unit.trim()) {
            alert("Ingresá la unidad");
            return;
        }

        setSaving(true);

        try {
            const method = editItem ? "PUT" : "POST";
            const url = editItem
                ? `${API}/raw-materials/${editItem.id}`
                : `${API}/raw-materials`;

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    code: form.code || editItem?.code || "",
                    name: form.name.trim(),
                    category: form.category.trim(),
                    unit: form.unit.trim(),
                    stock: Number(form.stock || 0),
                    minimum_stock: Number(form.minimum_stock || 0),
                    cost: Number(form.cost || 0),
                    supplier: form.supplier.trim(),
                    location: form.location.trim(),
                    is_intermediate: Number(form.is_intermediate || 0)
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                alert(
                    data.error
                    || "No se pudo guardar la materia prima"
                );
                return;
            }

            setForm(emptyForm);
            onSaved?.();
        } catch {
            alert("No se pudo conectar con el backend");
        } finally {
            setSaving(false);
        }
    }

    const isIntermediate = Number(form.is_intermediate || 0) === 1;

    return (
        <div style={styles.card}>
            <h3>
                {editItem
                    ? "✏️ Editar Materia Prima"
                    : "🌿 Nueva Materia Prima"}
            </h3>

            <div style={styles.grid}>
                <div>
                    <label>Nombre</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Categoría</label>
                    <input
                        name="category"
                        value={form.category}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Unidad</label>
                    <select
                        name="unit"
                        value={form.unit}
                        onChange={change}
                        style={styles.input}
                    >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="unidad">unidad</option>
                        <option value="kg">kg</option>
                        <option value="l">l</option>
                    </select>
                </div>

                <div>
                    <label>Stock</label>
                    <input
                        name="stock"
                        type="number"
                        step="0.01"
                        value={form.stock}
                        onChange={change}
                        disabled={isIntermediate}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Stock mínimo</label>
                    <input
                        name="minimum_stock"
                        type="number"
                        step="0.01"
                        value={form.minimum_stock}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Costo por {form.unit || "unidad"}</label>
                    <input
                        name="cost"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={form.cost}
                        onChange={change}
                        disabled={isIntermediate}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Proveedor</label>
                    <input
                        name="supplier"
                        value={form.supplier}
                        onChange={change}
                        disabled={isIntermediate}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Ubicación</label>
                    <input
                        name="location"
                        value={form.location}
                        onChange={change}
                        style={styles.input}
                    />
                </div>
            </div>

            <label style={styles.checkbox}>
                <input
                    name="is_intermediate"
                    type="checkbox"
                    checked={isIntermediate}
                    onChange={change}
                />
                Es una materia prima elaborada
                (por ejemplo, un oleato)
            </label>

            {isIntermediate && (
                <div style={styles.info}>
                    El stock y el costo se generarán al fabricar su lote.
                    No hace falta cargarlos manualmente.
                </div>
            )}

            <div style={styles.help}>
                El código se genera internamente y no se muestra.
            </div>

            <button
                onClick={save}
                disabled={saving}
                style={{ marginTop: 14 }}
            >
                {saving
                    ? "Guardando..."
                    : editItem
                        ? "💾 Guardar cambios"
                        : "💾 Guardar Materia Prima"}
            </button>
        </div>
    );
}

const styles = {
    card: {
        border: "1px solid #ccc",
        padding: 20,
        borderRadius: 10,
        marginBottom: 20
    },
    grid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 14
    },
    input: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: 8,
        marginTop: 5
    },
    checkbox: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginTop: 18,
        fontWeight: "bold"
    },
    help: {
        marginTop: 6,
        fontSize: 12,
        color: "#666"
    },
    info: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        background: "#f3f7ed",
        border: "1px solid #ccd8bf",
        color: "#4b5c3c",
        fontSize: 13
    }
};
