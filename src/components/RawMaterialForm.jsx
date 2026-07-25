import { useEffect, useState } from "react";

export default function RawMaterialForm({ onSaved, editItem }) {

  const emptyForm = {
    code: "",
    name: "",
    category: "",
    unit: "",
    stock: 0,
    minimum_stock: 0,
    cost: 0,
    supplier: "",
    location: "",
  };

  const [form, setForm] = useState(emptyForm);


  useEffect(() => {

    if (editItem) {
      setForm(editItem);
    } else {
      setForm(emptyForm);
    }

  }, [editItem]);


  const change = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  };


  const save = async () => {

    const method = editItem ? "PUT" : "POST";

    const url = editItem
      ? `http://127.0.0.1:8000/raw-materials/${editItem.id}`
      : "http://127.0.0.1:8000/raw-materials";


    await fetch(url, {

      method: method,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({

        ...form,

        stock: Number(form.stock),
        minimum_stock: Number(form.minimum_stock),
        cost: Number(form.cost),

      }),

    });


    setForm(emptyForm);

    onSaved();

  };


  return (

    <div
      style={{
        border: "1px solid #ccc",
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
      }}
    >

      <h3>
        {editItem
          ? "✏️ Editar Materia Prima"
          : "🌿 Nueva Materia Prima"}
      </h3>


      <input
        name="code"
        placeholder="Código"
        value={form.code}
        onChange={change}
      />
      <br /><br />


      <input
        name="name"
        placeholder="Nombre"
        value={form.name}
        onChange={change}
      />
      <br /><br />


      <input
        name="category"
        placeholder="Categoría"
        value={form.category}
        onChange={change}
      />
      <br /><br />


      <input
        name="unit"
        placeholder="Unidad"
        value={form.unit}
        onChange={change}
      />
      <br /><br />


      <input
        name="stock"
        type="number"
        placeholder="Stock"
        value={form.stock}
        onChange={change}
      />
      <br /><br />


      <input
        name="minimum_stock"
        type="number"
        placeholder="Stock mínimo"
        value={form.minimum_stock}
        onChange={change}
      />
      <br /><br />


      <input
        name="cost"
        type="number"
        placeholder="Costo"
        value={form.cost}
        onChange={change}
      />
      <br /><br />


      <input
        name="supplier"
        placeholder="Proveedor"
        value={form.supplier}
        onChange={change}
      />
      <br /><br />


      <input
        name="location"
        placeholder="Ubicación"
        value={form.location}
        onChange={change}
      />
      <br /><br />


      <button onClick={save}>
        💾 {editItem ? "Guardar cambios" : "Guardar Materia Prima"}
      </button>


    </div>

  );

}