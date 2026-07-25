import { useEffect, useState } from "react";

export default function FormulaIngredients() {

    const [materials, setMaterials] = useState([]);

    useEffect(() => {

        fetch("http://127.0.0.1:8000/raw-materials")
            .then(r => r.json())
            .then(setMaterials);

    }, []);

    return (

        <div
            style={{
                marginTop: 30,
                padding: 20,
                border: "1px solid #ddd",
                borderRadius: 10
            }}
        >

            <h3>🧪 Ingredientes</h3>

            <select
                style={{
                    padding: 8,
                    width: 300
                }}
            >

                <option>
                    Seleccionar materia prima...
                </option>

                {materials.map(m => (

                    <option
                        key={m.id}
                        value={m.id}
                    >
                        {m.code} - {m.name}
                    </option>

                ))}

            </select>

        </div>

    );

}