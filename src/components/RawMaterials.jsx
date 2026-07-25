import { useEffect, useState } from "react";
import RawMaterialForm from "./RawMaterialForm";

export default function RawMaterials() {

    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [editItem, setEditItem] = useState(null);

    const load = () => {

        fetch("http://127.0.0.1:8000/raw-materials")
            .then(r => r.json())
            .then(setItems)
            .catch(() => setItems([]));

    };

    useEffect(() => {
        load();
    }, []);


    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase())
    );
const remove = async (id) => {

  const ok = window.confirm(
    "¿Eliminar esta materia prima?"
  );

  if (!ok) return;

  await fetch(
    `http://127.0.0.1:8000/raw-materials/${id}`,
    {
      method: "DELETE",
    }
  );

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
                    onChange={(e) => setSearch(e.target.value)}
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
                        <th>Costo</th>
                        <th>Estado</th>
                        <th>Acciones</th>

                    </tr>

                </thead>

                <tbody>

                    {filtered.map(mp => (

                        <tr key={mp.id}>

                            <td>{mp.code}</td>

                            <td>{mp.name}</td>

                            <td>{mp.category}</td>

                            <td>{mp.unit}</td>

                            <td>{mp.stock}</td>

                            <td>{mp.minimum_stock}</td>

                            <td>${mp.cost}</td>

                            <td>
                            {
                              mp.stock === 0
                               ? "🔴 Sin stock"
                               : mp.stock <= mp.minimum_stock
                               ? "🟡 Bajo"
                               : "🟢 OK"
                            }
                            </td>

                            <td>

<button onClick={() => setEditItem(mp)}>
    ✏️
</button>

<button onClick={() => remove(mp.id)}>
    🗑️
</button>

</td>


                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}