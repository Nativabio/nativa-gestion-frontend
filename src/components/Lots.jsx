import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function Lots() {

    const [formulas, setFormulas] = useState([]);
    const [formulaId, setFormulaId] = useState("");
    const [items, setItems] = useState([]);
    const [batchNumber, setBatchNumber] = useState("");

    const [date, setDate] = useState(
        new Date().toISOString().substring(0, 10)
    );

    const [unitsProduced, setUnitsProduced] = useState("");
    const [laborHours, setLaborHours] = useState("");
    const [notes, setNotes] = useState("");

    const LABOR_COST = 10000;


    useEffect(() => {

        loadFormulas();
        loadNextLotNumber();

    }, []);


    async function loadNextLotNumber() {

        try {

            const response = await fetch(
                `${API}/next-lot-number`
            );

            const data = await response.json();

            setBatchNumber(
                data.next_number || ""
            );

        } catch {

            setBatchNumber("");

        }

    }


    async function loadFormulas() {

        const response = await fetch(
            `${API}/formulas`
        );

        const data = await response.json();

        setFormulas(data);

    }


    async function loadFormula() {

        if (formulaId === "") {

            alert("Seleccioná una fórmula");
            return;

        }

        const response = await fetch(
            `${API}/formulas/${formulaId}/items`
        );

        const data = await response.json();

        const nuevos = data.map((item) => ({

            ...item,
            real_quantity: item.quantity,
            cost: (
                item.quantity
                *
                (
                    item.unit_cost
                    /
                    item.stock
                )
            )

        }));

        setItems(nuevos);

    }


    function changeQuantity(index, value) {

        const copia = [...items];

        copia[index].real_quantity = Number(value);

        setItems(copia);

    }


    const totalMaterials = items.reduce(
        (sum, item) =>
            sum
            +
            (
                Number(item.real_quantity)
                *
                (
                    Number(item.unit_cost)
                    /
                    Number(item.stock)
                )
            ),
        0
    );


    const laborTotal =
        Number(laborHours || 0)
        *
        LABOR_COST;


    const totalCost =
        totalMaterials
        +
        laborTotal;


    const unitCost =
        Number(unitsProduced) > 0
            ?
            totalCost / Number(unitsProduced)
            :
            0;


    async function finishLot() {

        if (!batchNumber) {

            alert("No se pudo obtener el número de lote");
            return;

        }

        const response = await fetch(
            `${API}/lots`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({

                    lot_number: batchNumber,
                    formula_id: Number(formulaId),
                    production_date: date,
                    units_produced: Number(unitsProduced),
                    real_labor_hours: Number(laborHours),
                    total_cost: totalCost,
                    unit_cost: unitCost,
                    notes: notes,

                    materials: items.map((item) => ({

                        raw_material_id:
                            item.raw_material_id,

                        real_quantity:
                            Number(item.real_quantity)

                    }))

                })
            }
        );


        const data = await response.json();


        if (data.error) {

            alert("❌ " + data.error);
            return;

        }


        alert(
            `✅ Lote ${data.lot_number} guardado correctamente`
        );

        setFormulaId("");
        setItems([]);
        setUnitsProduced("");
        setLaborHours("");
        setNotes("");

        await loadNextLotNumber();

    }


    return (

        <div>

            <h2>🏭 Producción - Nuevo Lote</h2>

            <br />

            <label>Número de lote</label>

            <br />

            <input
                value={batchNumber}
                disabled
            />

            <div
                style={{
                    marginTop: 5,
                    fontSize: 12,
                    color: "#666"
                }}
            >
                El número se asigna automáticamente y no se repite.
            </div>

            <br />

            <label>Fecha</label>

            <br />

            <input
                type="date"
                value={date}
                onChange={(e) =>
                    setDate(e.target.value)
                }
            />

            <br /><br />

            <label>Fórmula</label>

            <br />

            <select
                value={formulaId}
                onChange={(e) =>
                    setFormulaId(e.target.value)
                }
            >

                <option value="">
                    Seleccionar fórmula
                </option>

                {

                    formulas.map((formula) => (

                        <option
                            key={formula.id}
                            value={formula.id}
                        >
                            {formula.name}
                        </option>

                    ))

                }

            </select>

            <button
                onClick={loadFormula}
                style={{
                    marginLeft: 10
                }}
            >
                📄 Cargar Fórmula
            </button>

            <br /><br />

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
                border="1"
                cellPadding="8"
            >

                <thead>

                    <tr>
                        <th>Materia Prima</th>
                        <th>Fórmula</th>
                        <th>Real</th>
                        <th>Desvío</th>
                    </tr>

                </thead>

                <tbody>

                    {

                        items.length === 0
                            ?
                            (
                                <tr>
                                    <td
                                        colSpan="4"
                                        style={{
                                            textAlign: "center",
                                            padding: 20
                                        }}
                                    >
                                        No hay materias primas cargadas.
                                    </td>
                                </tr>
                            )
                            :
                            items.map((item, index) => (

                                <tr key={item.id}>

                                    <td>{item.raw_material}</td>

                                    <td>{item.quantity}</td>

                                    <td>
                                        <input
                                            type="number"
                                            value={item.real_quantity}
                                            onChange={(e) =>
                                                changeQuantity(
                                                    index,
                                                    e.target.value
                                                )
                                            }
                                            style={{
                                                width: 90
                                            }}
                                        />
                                    </td>

                                    <td>
                                        {
                                            Number(item.real_quantity)
                                            -
                                            Number(item.quantity)
                                        }
                                    </td>

                                </tr>

                            ))

                    }

                </tbody>

            </table>

            <br /><br />

            <label>Unidades producidas</label>

            <br />

            <input
                type="number"
                value={unitsProduced}
                onChange={(e) =>
                    setUnitsProduced(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <label>Horas de producción</label>

            <br />

            <input
                type="number"
                step="0.25"
                value={laborHours}
                onChange={(e) =>
                    setLaborHours(
                        e.target.value
                    )
                }
            />

            <br /><br />

            <h3>Resumen del lote</h3>

            <table
                style={{
                    width: "450px"
                }}
            >

                <tbody>

                    <tr>
                        <td>Materias primas</td>
                        <td>${totalMaterials.toFixed(2)}</td>
                    </tr>

                    <tr>
                        <td>Mano de obra</td>
                        <td>${laborTotal.toFixed(2)}</td>
                    </tr>

                    <tr>
                        <td><b>Costo total</b></td>
                        <td><b>${totalCost.toFixed(2)}</b></td>
                    </tr>

                    <tr>
                        <td><b>Costo por unidad</b></td>
                        <td><b>${unitCost.toFixed(2)}</b></td>
                    </tr>

                </tbody>

            </table>

            <br />

            <button onClick={finishLot}>
                🏭 Finalizar Lote
            </button>

        </div>

    );

}
