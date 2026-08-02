import { useEffect, useMemo, useState } from "react";
import RawMaterialForm from "./RawMaterialForm";

const API = "http://127.0.0.1:8000";

export default function RawMaterials() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [editItem, setEditItem] = useState(null);

    const formatCurrency = (value) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);

    const formatQuantity = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    function load() {
        fetch(`${API}/raw-materials`)
            .then((response) => response.json())
            .then((data) => {
                const materials = Array.isArray(data) ? data : [];
                setItems(
                    [...materials].sort((a, b) =>
                        String(a.name || "").localeCompare(
                            String(b.name || ""),
                            "es",
                            { sensitivity: "base" }
                        )
                    )
                );
            })
            .catch(() => setItems([]));
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(
        () =>
            items.filter((item) =>
                String(item.name || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            ),
        [items, search]
    );

    const totalInventoryValue = useMemo(
        () =>
            items.reduce(
                (sum, material) =>
                    sum
                    + (Number(material.stock) || 0)
                    * (Number(material.cost) || 0),
                0
            ),
        [items]
    );

    async function remove(id) {
        const ok = window.confirm("¿Eliminar esta materia prima?");
        if (!ok) return;

        const response = await fetch(`${API}/raw-materials/${id}`, {
            method: "DELETE"
        });
        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || "No se pudo eliminar la materia prima");
            return;
        }

        load();
    }

    return (
        <div>
            <h2>🌿 Materias Primas</h2>

            <RawMaterialForm
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
                editItem={editItem}
            />

            <div
                style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 20
                }}
            >
                <input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    style={{
                        flex: 1,
                        padding: 10
                    }}
                />
            </div>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        minWidth: 900,
                        borderCollapse: "collapse"
                    }}
                >
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Categoría</th>
                            <th>Unidad</th>
                            <th>Stock</th>
                            <th>Mínimo</th>
                            <th>Valor total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((material) => {
                            const totalValue =
                                (Number(material.stock) || 0)
                                * (Number(material.cost) || 0);

                            const isIntermediate =
                                Number(material.is_intermediate || 0) === 1;

                            return (
                                <tr key={material.id}>
                                    <td>{material.name}</td>
                                    <td>
                                        {isIntermediate
                                            ? "🧪 Elaborada"
                                            : "Materia prima"}
                                    </td>
                                    <td>{material.category}</td>
                                    <td>{material.unit}</td>
                                    <td>{formatQuantity(material.stock)}</td>
                                    <td>
                                        {formatQuantity(material.minimum_stock)}
                                    </td>
                                    <td>{formatCurrency(totalValue)}</td>
                                    <td>
                                        {Number(material.stock) === 0
                                            ? "🔴 Sin stock"
                                            : Number(material.stock)
                                                  <= Number(material.minimum_stock)
                                                ? "🟡 Bajo"
                                                : "🟢 OK"}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setEditItem(material)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => remove(material.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr
                            style={{
                                borderTop: "2px solid #777",
                                fontWeight: "bold"
                            }}
                        >
                            <td colSpan="6" style={{ textAlign: "right" }}>
                                Valor total de todas las materias primas:
                            </td>
                            <td>{formatCurrency(totalInventoryValue)}</td>
                            <td colSpan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
