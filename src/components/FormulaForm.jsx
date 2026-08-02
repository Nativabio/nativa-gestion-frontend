import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

const emptyForm = {
    name: "",
    output_type: "PRODUCT",
    output_product_id: "",
    output_raw_material_id: "",
    batch_size: 1,
    units_produced: 1,
    labor_hours: 0,
    margin_percent: 40,
    notes: ""
};

export default function FormulaForm({ onSaved, editing }) {
    const [form, setForm] = useState(emptyForm);
    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadOutputs();
    }, []);

    useEffect(() => {
        if (!editing) {
            setForm(emptyForm);
            return;
        }

        const outputType = String(
            editing.output_type
            || (editing.output_raw_material_id ? "RAW_MATERIAL" : "PRODUCT")
        ).toUpperCase();

        setForm({
            name: editing.name || "",
            output_type: outputType,
            output_product_id:
                outputType === "PRODUCT"
                    ? String(editing.output_product_id || "")
                    : "",
            output_raw_material_id:
                outputType === "RAW_MATERIAL"
                    ? String(editing.output_raw_material_id || "")
                    : "",
            batch_size: Number(editing.batch_size || 1),
            units_produced: Number(editing.units_produced || 1),
            labor_hours: Number(editing.labor_hours || 0),
            margin_percent: Number(editing.margin_percent ?? 40),
            notes: editing.notes || ""
        });
    }, [editing]);

    async function loadOutputs() {
        try {
            const [productsResponse, materialsResponse] = await Promise.all([
                fetch(`${API}/products`),
                fetch(`${API}/raw-materials`)
            ]);

            const [productsData, materialsData] = await Promise.all([
                productsResponse.json(),
                materialsResponse.json()
            ]);

            setProducts(
                (Array.isArray(productsData) ? productsData : [])
                    .slice()
                    .sort((a, b) =>
                        String(a.name || "").localeCompare(
                            String(b.name || ""),
                            "es",
                            { sensitivity: "base" }
                        )
                    )
            );

            setRawMaterials(
                (Array.isArray(materialsData) ? materialsData : [])
                    .slice()
                    .sort((a, b) =>
                        String(a.name || "").localeCompare(
                            String(b.name || ""),
                            "es",
                            { sensitivity: "base" }
                        )
                    )
            );
        } catch {
            setProducts([]);
            setRawMaterials([]);
        }
    }

    const intermediateMaterials = useMemo(
        () =>
            rawMaterials.filter(
                (material) => Number(material.is_intermediate || 0) === 1
            ),
        [rawMaterials]
    );

    const selectedIntermediate = rawMaterials.find(
        (material) =>
            Number(material.id)
            === Number(form.output_raw_material_id)
    );

    const isRawMaterial = form.output_type === "RAW_MATERIAL";

    function change(event) {
        const { name, value } = event.target;

        if (name === "output_type") {
            setForm((current) => ({
                ...current,
                output_type: value,
                output_product_id:
                    value === "PRODUCT"
                        ? current.output_product_id
                        : "",
                output_raw_material_id:
                    value === "RAW_MATERIAL"
                        ? current.output_raw_material_id
                        : ""
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
            alert("Ingresá el nombre de la fórmula");
            return;
        }

        if (
            form.output_type === "PRODUCT"
            && !form.output_product_id
        ) {
            alert("Seleccioná el producto terminado que produce la fórmula");
            return;
        }

        if (
            form.output_type === "RAW_MATERIAL"
            && !form.output_raw_material_id
        ) {
            alert("Seleccioná la materia prima elaborada que produce la fórmula");
            return;
        }

        if (Number(form.batch_size) <= 0) {
            alert("El tamaño del lote base debe ser mayor a cero");
            return;
        }

        if (Number(form.units_produced) <= 0) {
            alert("El rendimiento previsto debe ser mayor a cero");
            return;
        }

        if (Number(form.labor_hours || 0) < 0) {
            alert("Las horas de trabajo no pueden ser negativas");
            return;
        }

        if (
            Number(form.margin_percent || 0) < 0
            || Number(form.margin_percent || 0) >= 100
        ) {
            alert("El margen debe ser mayor o igual a 0 y menor a 100");
            return;
        }

        setSaving(true);

        try {
            const method = editing ? "PUT" : "POST";
            const url = editing
                ? `${API}/formulas/${editing.id}`
                : `${API}/formulas`;

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    output_type: form.output_type,
                    output_product_id:
                        form.output_type === "PRODUCT"
                            ? Number(form.output_product_id)
                            : null,
                    output_raw_material_id:
                        form.output_type === "RAW_MATERIAL"
                            ? Number(form.output_raw_material_id)
                            : null,
                    batch_size: Number(form.batch_size),
                    units_produced: Number(form.units_produced),
                    labor_hours: Number(form.labor_hours || 0),
                    margin_percent:
                        form.output_type === "PRODUCT"
                            ? Number(form.margin_percent || 0)
                            : 0,
                    notes: form.notes.trim()
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                alert(
                    data.error
                    || "No se pudo guardar la fórmula"
                );
                return;
            }

            setForm(emptyForm);
            await loadOutputs();
            onSaved?.();
        } catch {
            alert("No se pudo conectar con el backend");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={styles.card}>
            <h3>
                {editing ? "✏️ Editar Fórmula" : "🧪 Nueva Fórmula"}
            </h3>

            <div style={styles.grid}>
                <div>
                    <label>Nombre de la fórmula</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={change}
                        placeholder="Ej.: Oleato de lavanda"
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Resultado de la elaboración</label>
                    <select
                        name="output_type"
                        value={form.output_type}
                        onChange={change}
                        style={styles.input}
                    >
                        <option value="PRODUCT">Producto terminado</option>
                        <option value="RAW_MATERIAL">
                            Materia prima elaborada
                        </option>
                    </select>
                </div>

                {form.output_type === "PRODUCT" ? (
                    <div>
                        <label>Producto obtenido</label>
                        <select
                            name="output_product_id"
                            value={form.output_product_id}
                            onChange={change}
                            style={styles.input}
                        >
                            <option value="">Seleccionar...</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label>Materia prima obtenida</label>
                        <select
                            name="output_raw_material_id"
                            value={form.output_raw_material_id}
                            onChange={change}
                            style={styles.input}
                        >
                            <option value="">Seleccionar...</option>
                            {intermediateMaterials.map((material) => (
                                <option key={material.id} value={material.id}>
                                    {material.name}
                                </option>
                            ))}
                        </select>
                        {intermediateMaterials.length === 0 && (
                            <div style={styles.help}>
                                Primero creá la materia prima y marcala como
                                “materia prima elaborada”.
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label>Tamaño del lote base</label>
                    <input
                        name="batch_size"
                        type="number"
                        min="0.0001"
                        step="0.01"
                        value={form.batch_size}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>
                        {isRawMaterial
                            ? `Rendimiento estimado${
                                selectedIntermediate?.unit
                                    ? ` (${selectedIntermediate.unit})`
                                    : ""
                            }`
                            : "Unidades previstas"}
                    </label>
                    <input
                        name="units_produced"
                        type="number"
                        min="0.0001"
                        step="0.01"
                        value={form.units_produced}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                <div>
                    <label>Horas de trabajo estimadas</label>
                    <input
                        name="labor_hours"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.labor_hours}
                        onChange={change}
                        style={styles.input}
                    />
                </div>

                {!isRawMaterial && (
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
                    </div>
                )}
            </div>

            <div style={{ marginTop: 14 }}>
                <label>Notas</label>
                <textarea
                    name="notes"
                    value={form.notes}
                    onChange={change}
                    rows="3"
                    style={styles.textarea}
                />
            </div>

            {isRawMaterial && (
                <div style={styles.info}>
                    Después de guardar la fórmula, agregá sus ingredientes.
                    Para el oleato, por ejemplo: 200 g de aceite de almendras
                    y 50 g de flores de lavanda. La cantidad real obtenida se
                    carga al fabricar el lote.
                </div>
            )}

            <button
                onClick={save}
                disabled={saving}
                style={{ marginTop: 14 }}
            >
                {saving
                    ? "Guardando..."
                    : editing
                        ? "💾 Guardar cambios"
                        : "💾 Guardar Fórmula"}
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
            "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14
    },
    input: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: 8,
        marginTop: 5
    },
    textarea: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: 8,
        marginTop: 5,
        resize: "vertical"
    },
    help: {
        marginTop: 6,
        fontSize: 12,
        color: "#8a5a00"
    },
    info: {
        marginTop: 14,
        padding: 12,
        borderRadius: 8,
        background: "#f3f7ed",
        border: "1px solid #ccd8bf",
        color: "#4b5c3c",
        fontSize: 13,
        lineHeight: 1.45
    }
};
