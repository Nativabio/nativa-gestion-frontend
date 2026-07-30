import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function FormulaList({
    items,
    onSelect,
    onDelete
}) {
    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);

    useEffect(() => {
        async function loadOutputs() {
            try {
                const [productsResponse, materialsResponse] =
                    await Promise.all([
                        fetch(`${API}/products`),
                        fetch(`${API}/raw-materials`)
                    ]);

                const [productsData, materialsData] =
                    await Promise.all([
                        productsResponse.json(),
                        materialsResponse.json()
                    ]);

                setProducts(
                    Array.isArray(productsData)
                        ? productsData
                        : []
                );

                setRawMaterials(
                    Array.isArray(materialsData)
                        ? materialsData
                        : []
                );
            } catch {
                setProducts([]);
                setRawMaterials([]);
            }
        }

        loadOutputs();
    }, [items]);

    const productNames = useMemo(
        () =>
            new Map(
                products.map((product) => [
                    Number(product.id),
                    product.name
                ])
            ),
        [products]
    );

    const materialById = useMemo(
        () =>
            new Map(
                rawMaterials.map((material) => [
                    Number(material.id),
                    material
                ])
            ),
        [rawMaterials]
    );

    function outputInfo(formula) {
        const type = String(
            formula.output_type
            || (
                formula.output_raw_material_id
                    ? "RAW_MATERIAL"
                    : "PRODUCT"
            )
        ).toUpperCase();

        if (type === "RAW_MATERIAL") {
            const material = materialById.get(
                Number(formula.output_raw_material_id)
            );

            return {
                type,
                typeLabel: "Materia prima elaborada",
                name:
                    material?.name
                    ||
                    "Materia prima sin identificar",
                unit: material?.unit || ""
            };
        }

        return {
            type: "PRODUCT",
            typeLabel: "Producto terminado",
            name:
                productNames.get(
                    Number(formula.output_product_id)
                )
                ||
                "Producto sin identificar",
            unit: "unid."
        };
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table
                style={{
                    width: "100%",
                    minWidth: 880,
                    borderCollapse: "collapse",
                    marginBottom: 30
                }}
            >
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Resultado</th>
                        <th>Tipo</th>
                        <th>Lote</th>
                        <th>Rendimiento</th>
                        <th>Margen</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {items.map((formula) => {
                        const output = outputInfo(formula);

                        return (
                            <tr key={formula.id}>
                                <td>{formula.name}</td>
                                <td>{output.name}</td>
                                <td>{output.typeLabel}</td>
                                <td>
                                    {Number(
                                        formula.batch_size || 0
                                    ).toLocaleString(
                                        "es-AR",
                                        {
                                            maximumFractionDigits: 4
                                        }
                                    )}
                                </td>
                                <td>
                                    {Number(
                                        formula.units_produced || 0
                                    ).toLocaleString(
                                        "es-AR",
                                        {
                                            maximumFractionDigits: 4
                                        }
                                    )}
                                    {" "}
                                    {output.unit}
                                </td>
                                <td>
                                    {output.type === "PRODUCT"
                                        ? `${Number(
                                            formula.margin_percent
                                            ?? 40
                                        ).toLocaleString(
                                            "es-AR",
                                            {
                                                maximumFractionDigits: 2
                                            }
                                        )}%`
                                        : "—"}
                                </td>
                                <td>
                                    <button
                                        onClick={() =>
                                            onSelect(formula)
                                        }
                                    >
                                        ✏ Editar
                                    </button>

                                    <button
                                        style={{ marginLeft: 10 }}
                                        onClick={() =>
                                            onDelete(formula.id)
                                        }
                                    >
                                        🗑 Eliminar
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
