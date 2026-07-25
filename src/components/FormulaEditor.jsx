import { useEffect, useState } from "react";

export default function FormulaEditor({ formula }) {

    const [materials, setMaterials] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [costData, setCostData] = useState({
    costo_total:0,
    materias_primas:0,
    mano_obra:0,
    horas_trabajo:0
});

    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [quantity, setQuantity] = useState("");

    // Cargar materias primas
    useEffect(() => {

        fetch("http://127.0.0.1:8000/raw-materials")
            .then(r => r.json())
            .then(setMaterials)
            .catch(() => setMaterials([]));

    }, []);

    // Cargar ingredientes de la fórmula
    useEffect(() => {

        if (formula) {
            loadIngredients();
        }

    }, [formula]);

    const loadIngredients = () => {


    fetch(
        `http://127.0.0.1:8000/formula-items/${formula.id}`
    )
    .then(r => r.json())
    .then(setIngredients);



    fetch(
        `http://127.0.0.1:8000/formula-cost/${formula.id}`
    )
    .then(r => r.json())
    .then(data => {

    setCostData(data);

});


};

    const addIngredient = async () => {

        if (!selectedMaterial || quantity <= 0) return;

        await fetch(
            "http://127.0.0.1:8000/formula-items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    formula_id: formula.id,
                    raw_material_id: Number(selectedMaterial),
                    quantity: Number(quantity)
                })
            }
        );

        setSelectedMaterial("");
        setQuantity("");

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
        Materias primas:
        <b> ${costData.materias_primas}</b>
    </p>

    <p>
        Mano de obra:
        <b> ${costData.mano_obra}</b>
        (
        {costData.horas_trabajo} horas
        )
    </p>


    <hr />

    <h3>
        Costo total lote:
        ${costData.costo_total}
    </h3>

    <p>
    <b>📦 Unidades producidas:</b> {formula.units_produced}
</p>

<p>
    <b>💰 Costo por unidad:</b> $
    {
        (
            costData.costo_total /
            formula.units_produced
        ).toFixed(2)
    }
</p>

</div>

            <p>
                <b>Lote estándar:</b> {formula.batch_size}
            </p>

            <hr />

            <h3>🌿 Agregar ingrediente</h3>

            <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
            >

                <option value="">
                    Seleccionar materia prima...
                </option>

                {materials.map(material => (

                    <option
                        key={material.id}
                        value={material.id}
                    >
                        {material.code} - {material.name}
                    </option>

                ))}

            </select>

            <input
                type="number"
                placeholder="Cantidad"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                    marginLeft: 10
                }}
            />

            <button
                onClick={addIngredient}
                style={{
                    marginLeft: 10
                }}
            >
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
                        <th>Costo</th>
                        <th>Total</th>
                        <th></th>

                    </tr>

                </thead>

                <tbody>

                    {ingredients.map((item) => (

                        <tr key={item.id}>

                            <td>{item.raw_material?.name}</td>

                            <td>{item.quantity}</td>

                            <td>{item.raw_material?.unit}</td>

                            <td>
                                $
                                {item.raw_material?.cost}
                            </td>

                            <td>
                                $
                                 {(
                             item.quantity *
                               (
                             (item.raw_material?.cost || 0) /
                             (item.raw_material?.stock || 1)
                                )
                                 ).toFixed(2)}
                            </td>
                            <td>

                                  <button
                                     onClick={async()=>{

                                       await fetch(
                                         `http://127.0.0.1:8000/formula-items/${item.id}`,
                                         {
                                          method:"DELETE"
                                             }
                                        );

                                         loadIngredients();

                                 }}
    >
                                      🗑
                                     </button>

                                 </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}