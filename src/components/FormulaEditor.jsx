import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function FormulaEditor({ formula }) {
    const [materials, setMaterials] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [costData, setCostData] = useState({
        costo_total: 0,
        costo_unitario: 0,
        materias_primas: 0,
        mano_obra: 0,
        horas_trabajo: 0,
        unidades_producidas: 0,
        margen_rentabilidad: 40,
        precio_estimado: 0
    });

    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [quantity, setQuantity] = useState("");

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    useEffect(() => {
        fetch(`${API}/raw-materials`)
            .then((response) => response.json())
            .then((data) => {
                const rawMaterials = Array.isArray(data) ? data : [];

                setMaterials(
                    [...rawMaterials].sort((a, b) =>
                        String(a.name || "").localeCompare(
                            String(b.name || ""),
                            "es",
                            { sensitivity: "base" }
                        )
                    )
                );
            })
            .catch(() => setMaterials([]));
    }, []);

    useEffect(() => {
        if (formula) {
            loadIngredients();
        }
    }, [formula]);

    function loadIngredients() {
        if (!formula) return;

        fetch(`${API}/formula-items/${formula.id}`)
            .then((response) => response.json())
            .then((data) => {
                const formulaItems = Array.isArray(data) ? data : [];

                setIngredients(
                    [...formulaItems].sort((a, b) =>
                        String(a.raw_material?.name || "").localeCompare(
                            String(b.raw_material?.name || ""),
                            "es",
                            { sensitivity: "base" }
                        )
                    )
                );
            })
            .catch(() => setIngredients([]));

        fetch(`${API}/formula-cost/${formula.id}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data.error) {
                    setCostData(data);
                }
            });
    }

    async function addIngredient() {
        if (!formula || !selectedMaterial || Number(quantity) <= 0) return;

        const response = await fetch(`${API}/formula-items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                formula_id: formula.id,
                raw_material_id: Number(selectedMaterial),
                quantity: Number(quantity)
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo agregar el ingrediente");
            return;
        }

        setSelectedMaterial("");
        setQuantity("");
        loadIngredients();
    }

    async function removeIngredient(itemId) {
        await fetch(`${API}/formula-items/${itemId}`, {
            method: "DELETE"
        });

        loadIngredients();
    }

    if (!formula) {
        return (
            <div style={styles.card}>
                <h2>🧪 Fórmulas</h2>
                <p>Seleccione una fórmula.</p>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <h2>🧪 {formula.name}</h2>

            <div style={styles.costGrid}>
                <div style={styles.costBox}>
                    <span>Materias primas</span>
                    <strong>{formatMoney(costData.materias_primas)}</strong>
                </div>

                <div style={styles.costBox}>
                    <span>Mano de obra</span>
                    <strong>{formatMoney(costData.mano_obra)}</strong>
                    <small>{costData.horas_trabajo || 0} horas</small>
                </div>

                <div style={styles.costBox}>
                    <span>Costo total del lote</span>
                    <strong>{formatMoney(costData.costo_total)}</strong>
                </div>

                <div style={styles.costBox}>
                    <span>Costo por unidad</span>
                    <strong>{formatMoney(costData.costo_unitario)}</strong>
                </div>

                <div style={styles.priceBox}>
                    <span>
                        Precio estimado con margen de{" "}
                        {Number(costData.margen_rentabilidad || 0).toLocaleString(
                            "es-AR",
                            { maximumFractionDigits: 2 }
                        )}%
                    </span>
                    <strong>{formatMoney(costData.precio_estimado)}</strong>
                </div>
            </div>

            <p>
                <b>Lote estándar:</b> {formula.batch_size}
                {" · "}
                <b>Unidades:</b> {formula.units_produced}
            </p>

            <hr />

            <h3>🌿 Agregar ingrediente</h3>

            <select
                value={selectedMaterial}
                onChange={(event) =>
                    setSelectedMaterial(event.target.value)
                }
            >
                <option value="">Seleccionar materia prima...</option>
                {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                        {material.code} - {material.name}
                    </option>
                ))}
            </select>

            <input
                type="number"
                min="0.0001"
                step="any"
                placeholder="Cantidad"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                style={{ marginLeft: 10 }}
            />

            <button onClick={addIngredient} style={{ marginLeft: 10 }}>
                ➕ Agregar
            </button>

            <hr />

            <h3>📋 Ingredientes</h3>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>Materia Prima</th>
                        <th>Cantidad</th>
                        <th>Unidad</th>
                        <th>Costo unitario</th>
                        <th>Costo utilizado</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map((item) => {
                        const unitCost = Number(
                            item.raw_material?.cost || 0
                        );
                        const usedCost =
                            Number(item.quantity || 0) * unitCost;

                        return (
                            <tr key={item.id}>
                                <td>{item.raw_material?.name}</td>
                                <td>{item.quantity}</td>
                                <td>{item.raw_material?.unit}</td>
                                <td>{formatMoney(unitCost)}</td>
                                <td>{formatMoney(usedCost)}</td>
                                <td>
                                    <button
                                        onClick={() =>
                                            removeIngredient(item.id)
                                        }
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

const styles = {
    card: {
        marginTop: 20,
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 20
    },
    costGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 20
    },
    costBox: {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 5
    },
    priceBox: {
        border: "2px solid #777",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 5
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    }
};
