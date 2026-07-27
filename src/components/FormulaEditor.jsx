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
        unidades_producidas: 0
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

    const loadIngredients = () => {
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
    };

    const addIngredient = async () => {
        if (!formula || !selectedMaterial || Number(quantity) <= 0) return;

        await fetch(`${API}/formula-items`, {
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

        setSelectedMaterial("");
        setQuantity("");
        loadIngredients();
    };

    const removeIngredient = async (itemId) => {
        await fetch(`${API}/formula-items/${itemId}`, {
            method: "DELETE"
        });

        loadIngredients();
    };

    if (!formula) {
        return (
            <div
                style={{
                    marginTop: 20,
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    padding: 20
                }}
            >
                <h2>🧪 Fórmulas</h2>
                <p>Seleccione una fórmula.</p>
            </div>
        );
    }

    return (
        <div
            style={{
                marginTop: 20,
                border: "1px solid #ccc",
                borderRadius: 10,
                padding: 20
            }}
        >
            <h2>🧪 {formula.name}</h2>

            <div>
                <h3>💰 Costos</h3>

                <p>
                    Materias primas:{" "}
                    <b>{formatMoney(costData.materias_primas)}</b>
                </p>

                <p>
                    Mano de obra:{" "}
                    <b>{formatMoney(costData.mano_obra)}</b>{" "}
                    ({costData.horas_trabajo || 0} horas)
                </p>

                <hr />

                <h3>
                    Costo total del lote:{" "}
                    {formatMoney(costData.costo_total)}
                </h3>

                <h3>
                    Costo por unidad:{" "}
                    {formatMoney(costData.costo_unitario)}
                </h3>
            </div>

            <p>
                <b>Lote estándar:</b> {formula.batch_size}
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

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
            >
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
