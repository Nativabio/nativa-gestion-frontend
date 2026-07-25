import { useEffect, useState } from "react";

export default function Suppliers() {

    const [suppliers, setSuppliers] = useState([]);

    const [form, setForm] = useState({
        name: "",
        contact: "",
        phone: "",
        email: "",
        payment_terms: "",
        notes: ""
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    async function loadSuppliers() {

        const res = await fetch("http://127.0.0.1:8000/suppliers");

        const data = await res.json();

        setSuppliers(data);

    }

    async function saveSupplier() {

        await fetch("http://127.0.0.1:8000/suppliers", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                name: form.name,
                business_name: "",
                tax_id: "",
                phone: form.phone,
                email: form.email,
                address: "",
                city: "",
                province: "",
                contact: form.contact,
                payment_terms: form.payment_terms,
                notes: form.notes

            })

        });

        setForm({
            name: "",
            contact: "",
            phone: "",
            email: "",
            payment_terms: "",
            notes: ""
        });

        loadSuppliers();

    }

    return (

        <div>

            <h2>👥 Proveedores</h2>

            <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e)=>setForm({...form,name:e.target.value})}
            />

            <br/><br/>

            <input
                placeholder="Persona de contacto"
                value={form.contact}
                onChange={(e)=>setForm({...form,contact:e.target.value})}
            />

            <br/><br/>

            <input
                placeholder="Teléfono"
                value={form.phone}
                onChange={(e)=>setForm({...form,phone:e.target.value})}
            />

            <br/><br/>

            <input
                placeholder="Email"
                value={form.email}
                onChange={(e)=>setForm({...form,email:e.target.value})}
            />

            <br/><br/>

            <input
                placeholder="Condición de pago"
                value={form.payment_terms}
                onChange={(e)=>setForm({...form,payment_terms:e.target.value})}
            />

            <br/><br/>

            <textarea
                placeholder="Observaciones"
                rows={3}
                style={{width:"100%"}}
                value={form.notes}
                onChange={(e)=>setForm({...form,notes:e.target.value})}
            />

            <br/><br/>

            <button onClick={saveSupplier}>
                💾 Guardar
            </button>

            <hr/>

            <h3>Proveedores registrados</h3>

            {suppliers.map((supplier)=>(

                <div
                    key={supplier.id}
                    style={{
                        border:"1px solid #ddd",
                        borderRadius:8,
                        padding:15,
                        marginBottom:10
                    }}
                >

                    <b>{supplier.name}</b>

                    <br/>

                    👤 {supplier.contact}

                    <br/>

                    📞 {supplier.phone}

                    <br/>

                    📧 {supplier.email}

                    <br/>

                    💳 {supplier.payment_terms}

                </div>

            ))}

        </div>

    );

}