import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function isPackagingMaterial(item) {
    const material = item?.raw_material || {};
    const category = normalizeText(material.category);
    const name = normalizeText(material.name);

    return (
        category.includes("envase")
        ||
        category.includes("etiqueta")
        ||
        name.includes("envase")
        ||
        name.includes("etiqueta")
    );
}

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

    const outputType = String(
        formula?.output_type
        || (
            formula?.output_raw_material_id
                ? "RAW_MATERIAL"
                : "PRODUCT"
        )
    ).toUpperCase();

    const outputMaterial = materials.find(
        (material) =>
            Number(material.id)
            ===
            Number(formula?.output_raw_material_id)
    );

    const outputUnit =
        outputType === "RAW_MATERIAL"
            ? outputMaterial?.unit || ""
            : "unidad";

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const formatNumber = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4
        });

    const formatPercentage = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    useEffect(() => {
        loadMaterials();
    }, []);

    useEffect(() => {
        if (formula) {
            loadIngredients();
        } else {
            setIngredients([]);
        }
    }, [formula]);

    async function loadMaterials() {
        try {
            const response = await fetch(`${API}/raw-materials`);
            const data = await response.json();
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
        } catch {
            setMaterials([]);
        }
    }

    async function loadIngredients() {
        if (!formula) return;

        try {
            const [itemsResponse, costResponse] =
                await Promise.all([
                    fetch(`${API}/formula-items/${formula.id}`),
                    fetch(`${API}/formula-cost/${formula.id}`)
                ]);

            const [itemsData, costResult] =
                await Promise.all([
                    itemsResponse.json(),
                    costResponse.json()
                ]);

            const formulaItems =
                Array.isArray(itemsData)
                    ? itemsData
                    : [];

            setIngredients(
                [...formulaItems].sort((a, b) =>
                    String(
                        a.raw_material?.name || ""
                    ).localeCompare(
                        String(
                            b.raw_material?.name || ""
                        ),
                        "es",
                        { sensitivity: "base" }
                    )
                )
            );

            if (!costResult.error) {
                setCostData(costResult);
            }
        } catch {
            setIngredients([]);
        }
    }

    const availableMaterials = useMemo(
        () =>
            materials.filter(
                (material) =>
                    !(
                        outputType === "RAW_MATERIAL"
                        &&
                        Number(material.id)
                        ===
                        Number(formula?.output_raw_material_id)
                    )
            ),
        [
            materials,
            outputType,
            formula?.output_raw_material_id
        ]
    );

    const percentageBase = useMemo(
        () =>
            ingredients.reduce(
                (total, item) =>
                    isPackagingMaterial(item)
                        ? total
                        : total + Number(item.quantity || 0),
                0
            ),
        [ingredients]
    );

    async function addIngredient() {
        if (
            !formula
            ||
            !selectedMaterial
            ||
            Number(quantity) <= 0
        ) {
            alert("Seleccioná una materia prima y una cantidad");
            return;
        }

        const response = await fetch(`${API}/formula-items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                formula_id: formula.id,
                raw_material_id:
                    Number(selectedMaterial),
                quantity: Number(quantity)
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(
                data.error
                ||
                "No se pudo agregar el ingrediente"
            );
            return;
        }

        setSelectedMaterial("");
        setQuantity("");
        loadIngredients();
    }

    async function removeIngredient(itemId) {
        const response = await fetch(
            `${API}/formula-items/${itemId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(
                data.error
                ||
                "No se pudo eliminar el ingrediente"
            );
            return;
        }

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

            <p>
                <b>Resultado:</b>{" "}
                {outputType === "RAW_MATERIAL"
                    ? (
                        outputMaterial?.name
                        ||
                        "Materia prima elaborada"
                    )
                    : "Producto terminado"}
            </p>

            <div style={styles.costGrid}>
                <div style={styles.costBox}>
                    <span>Materias primas</span>
                    <strong>
                        {formatMoney(costData.materias_primas)}
                    </strong>
                </div>

                <div style={styles.costBox}>
                    <span>Mano de obra</span>
                    <strong>
                        {formatMoney(costData.mano_obra)}
                    </strong>
                    <small>
                        {costData.horas_trabajo || 0} horas
                    </small>
                </div>

                <div style={styles.costBox}>
                    <span>Costo total del lote</span>
                    <strong>
                        {formatMoney(costData.costo_total)}
                    </strong>
                </div>

                <div style={styles.costBox}>
                    <span>
                        Costo por {outputUnit || "unidad"}
                    </span>
                    <strong>
                        {formatMoney(costData.costo_unitario)}
                    </strong>
                </div>

                {outputType === "PRODUCT" && (
                    <div style={styles.priceBox}>
                        <span>
                            Precio estimado con margen de{" "}
                            {Number(
                                costData.margen_rentabilidad || 0
                            ).toLocaleString(
                                "es-AR",
                                { maximumFractionDigits: 2 }
                            )}%
                        </span>
                        <strong>
                            {formatMoney(
                                costData.precio_estimado
                            )}
                        </strong>
                    </div>
                )}
            </div>

            <p>
                <b>Lote estándar:</b>{" "}
                {formatNumber(formula.batch_size)}
                {" · "}
                <b>
                    {outputType === "RAW_MATERIAL"
                        ? "Rendimiento estimado"
                        : "Unidades"}
                    :
                </b>{" "}
                {formatNumber(formula.units_produced)}
                {outputType === "RAW_MATERIAL"
                    && outputUnit
                    ? ` ${outputUnit}`
                    : ""}
            </p>

            <hr />

            <h3>🌿 Agregar ingrediente</h3>

            <select
                value={selectedMaterial}
                onChange={(event) =>
                    setSelectedMaterial(event.target.value)
                }
            >
                <option value="">
                    Seleccionar materia prima...
                </option>

                {availableMaterials.map((material) => (
                    <option
                        key={material.id}
                        value={material.id}
                    >
                        {material.name}
                        {Number(material.is_intermediate) === 1
                            ? " (elaborada)"
                            : ""}
                    </option>
                ))}
            </select>

            <input
                type="number"
                min="0.0001"
                step="any"
                placeholder="Cantidad"
                value={quantity}
                onChange={(event) =>
                    setQuantity(event.target.value)
                }
                style={{ marginLeft: 10 }}
            />

            <button
                onClick={addIngredient}
                style={{ marginLeft: 10 }}
            >
                ➕ Agregar
            </button>

            <hr />

            <h3>📋 Ingredientes</h3>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>Materia Prima</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                        <th>Costo unitario</th>
                        <th>Costo utilizado</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    {ingredients.length === 0 ? (
                        <tr>
                            <td
                                colSpan="6"
                                style={{ textAlign: "center" }}
                            >
                                No hay ingredientes cargados.
                            </td>
                        </tr>
                    ) : (
                        ingredients.map((item) => {
                            const unitCost = Number(
                                item.raw_material?.cost || 0
                            );

                            const usedCost =
                                Number(item.quantity || 0)
                                *
                                unitCost;

                            const excludedFromPercentage =
                                isPackagingMaterial(item);

                            const percentage =
                                !excludedFromPercentage
                                &&
                                percentageBase > 0
                                    ? (
                                        Number(item.quantity || 0)
                                        /
                                        percentageBase
                                    ) * 100
                                    : 0;

                            return (
                                <tr key={item.id}>
                                    <td>
                                        {item.raw_material?.name}
                                        {Number(
                                            item.raw_material
                                                ?.is_intermediate
                                            || 0
                                        ) === 1
                                            ? " (elaborada)"
                                            : ""}
                                    </td>
                                    <td>
                                        {formatNumber(item.quantity)}
                                    </td>
                                    <td>
                                        {excludedFromPercentage
                                            ? "—"
                                            : `${formatPercentage(
                                                percentage
                                            )}%`}
                                    </td>
                                    <td>
                                        {formatMoney(unitCost)}
                                    </td>
                                    <td>
                                        {formatMoney(usedCost)}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() =>
                                                removeIngredient(
                                                    item.id
                                                )
                                            }
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            <p style={styles.help}>
                El porcentaje se calcula solo sobre los ingredientes.
                Los envases y las etiquetas quedan excluidos.
            </p>
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
    },
    help: {
        marginTop: 10,
        fontSize: 12,
        color: "#666"
    }
};
