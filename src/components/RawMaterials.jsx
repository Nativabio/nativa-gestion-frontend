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

    const load = () => {
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
    };

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
                    +
                    (Number(material.stock) || 0)
                    *
                    (Number(material.cost) || 0),
                0
            ),
        [items]
    );

    const remove = async (id) => {
        const ok = window.confirm("¿Eliminar esta materia prima?");

        if (!ok) return;

        await fetch(`${API}/raw-materials/${id}`, {
            method: "DELETE"
        });

        load();
    };

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

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
            >
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
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
                            *
                            (Number(material.cost) || 0);

                        return (
                            <tr key={material.id}>
                                <td>{material.code}</td>
                                <td>{material.name}</td>
                                <td>{material.category}</td>
                                <td>{material.unit}</td>
                                <td>{material.stock}</td>
                                <td>{material.minimum_stock}</td>
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
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        onClick={() => remove(material.id)}
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
    );
}
