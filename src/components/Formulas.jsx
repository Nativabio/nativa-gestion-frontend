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


        if(!confirm("¿Eliminar fórmula?"))
            return;


        await fetch(
            `http://127.0.0.1:8000/formulas/${id}`,
            {
                method:"DELETE"
            }
        );


        setSelected(null);

        load();


    };



    return (

        <div>


            <FormulaForm

                onSaved={()=>{
                    setEditing(null);
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