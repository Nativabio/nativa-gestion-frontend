import { useEffect, useState } from "react";

import FormulaForm from "./FormulaForm";
import FormulaList from "./FormulaList";
import FormulaEditor from "./FormulaEditor";


export default function Formulas() {


    const [items,setItems] = useState([]);

    const [selected,setSelected] = useState(null);

    const [editing,setEditing] = useState(null);



    const load = () => {


        fetch("http://127.0.0.1:8000/formulas")

        .then(r=>r.json())

        .then(data=>{

            setItems(data);

        });


    };



    useEffect(()=>{

        load();

    },[]);



    const deleteFormula = async(id)=>{


        const formula = items.find(
            (item) => Number(item.id) === Number(id)
        );

        const confirmed = confirm(
            `¿Eliminar definitivamente la fórmula ${
                formula?.name || "seleccionada"
            }?\n\n`
            +
            "Primero deben haberse eliminado todos sus lotes. "
            +
            "Los asientos contables no se modificarán."
        );

        if(!confirmed)
            return;


        try {

            const response = await fetch(
                `http://127.0.0.1:8000/formulas/${id}`,
                {
                    method:"DELETE"
                }
            );

            const data = await response.json();

            if(!response.ok || data.error) {

                alert(
                    `❌ ${
                        data.error
                        ||
                        "No se pudo eliminar la fórmula"
                    }`
                );

                return;
            }

            alert(`✅ ${data.message}`);

            setSelected(null);
            setEditing(null);

            await load();

        } catch {

            alert("❌ No se pudo conectar con el backend");
        }


    };



    return (

        <div>


            <FormulaForm

                onSaved={()=>{
                    setEditing(null);
                    setSelected(null);
                    load();
                }}

                editing={editing}

            />



            <h3>
                📋 Fórmulas
            </h3>



            <FormulaList

                items={items}

                onSelect={(f)=>{

                    setSelected(f);
                    setEditing(f);

                }}

                onDelete={deleteFormula}

            />



            <FormulaEditor

                formula={selected}

            />


        </div>

    );


}