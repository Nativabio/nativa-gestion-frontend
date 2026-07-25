import { useEffect, useState } from "react";

export default function FormulaForm({ onSaved, editing }) {


    const [products, setProducts] = useState([]);


    const [form, setForm] = useState({

        name: "",

        output_product_id: "",

        batch_size: 1,

        units_produced: 1,

        labor_hours: 0,

        notes: ""

    });



    useEffect(()=>{

        loadProducts();

    },[]);



    async function loadProducts(){

        const res = await fetch(
            "http://127.0.0.1:8000/products"
        );

        const data = await res.json();

        setProducts(data);

    }




    useEffect(() => {


        if(editing){


            setForm({

                name: editing.name || "",

                output_product_id:
                    editing.output_product_id || "",

                batch_size:
                    editing.batch_size || 1,

                units_produced:
                    editing.units_produced || 1,

                labor_hours:
                    editing.labor_hours || 0,

                notes:
                    editing.notes || ""

            });


        }


    },[editing]);





    const change = (e)=>{

        setForm({

            ...form,

            [e.target.name]: e.target.value

        });

    };






    const save = async()=>{


        const url = editing

        ? `http://127.0.0.1:8000/formulas/${editing.id}`

        : "http://127.0.0.1:8000/formulas";



        await fetch(url,{

            method: editing ? "PUT":"POST",

            headers:{

                "Content-Type":"application/json"

            },


            body:JSON.stringify({


                name:form.name,


                output_product_id:
                    Number(form.output_product_id),


                batch_size:
                    Number(form.batch_size),


                units_produced:
                    Number(form.units_produced),


                labor_hours:
                    Number(form.labor_hours),


                notes:form.notes


            })


        });



        setForm({

            name:"",

            output_product_id:"",

            batch_size:1,

            units_produced:1,

            labor_hours:0,

            notes:""

        });



        onSaved();


    };





    return (

        <div
            style={{
                border:"1px solid #ccc",
                padding:20,
                borderRadius:10,
                marginBottom:20
            }}
        >


            <h3>

                {editing
                ?"✏ Editar Fórmula"
                :"🧪 Nueva Fórmula"}

            </h3>




            <label>
                Producto terminado
            </label>

            <br/>


            <select

                name="output_product_id"

                value={form.output_product_id}

                onChange={change}

            >

                <option value="">
                    Seleccionar producto
                </option>


                {products.map(p=>(

                    <option
                        key={p.id}
                        value={p.id}
                    >

                        {p.name}

                    </option>

                ))}


            </select>




            <br/><br/>




            <input

                name="name"

                placeholder="Nombre fórmula"

                value={form.name}

                onChange={change}

            />




            <br/><br/>




            <input

                name="batch_size"

                type="number"

                placeholder="Cantidad lote"

                value={form.batch_size}

                onChange={change}

            />




            <br/><br/>




            <input

                name="units_produced"

                type="number"

                placeholder="Unidades producidas"

                value={form.units_produced}

                onChange={change}

            />




            <br/><br/>




            <input

                name="labor_hours"

                type="number"

                step="0.25"

                placeholder="Horas elaboración"

                value={form.labor_hours}

                onChange={change}

            />




            <br/><br/>




            <textarea

                name="notes"

                placeholder="Observaciones"

                value={form.notes}

                onChange={change}

                rows={4}

                style={{
                    width:"100%"
                }}

            />




            <br/><br/>




            <button onClick={save}>

                💾 Guardar

            </button>



        </div>

    );

}