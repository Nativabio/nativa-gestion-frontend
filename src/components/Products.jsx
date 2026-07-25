import { useEffect, useState } from "react";

export default function Products() {

    const [products, setProducts] = useState([]);

    const [name, setName] = useState("");

    const [price, setPrice] = useState("");

    const [stock, setStock] = useState("");


    useEffect(() => {

        loadProducts();

    }, []);



    async function loadProducts(){

        const res = await fetch(
            "http://127.0.0.1:8000/products"
        );

        const data = await res.json();

        setProducts(data);

    }



    async function createProduct(){

        await fetch(
            "http://127.0.0.1:8000/products",
            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    name:name,

                    price:Number(price),

                    stock:Number(stock)

                })

            }
        );


        setName("");

        setPrice("");

        setStock("");

        loadProducts();

    }



    async function updatePrice(id, price){

        await fetch(
            `http://127.0.0.1:8000/products/${id}`,
            {

                method:"PUT",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    price:Number(price)

                })

            }
        );

    }



    return (

        <div>


            <h2>📦 Productos Terminados</h2>


            <div
                style={{
                    background:"#f5f5f5",
                    padding:20,
                    borderRadius:10
                }}
            >

                <h3>➕ Nuevo Producto</h3>


                <input

                    placeholder="Nombre producto"

                    value={name}

                    onChange={(e)=>
                        setName(e.target.value)
                    }

                    style={{
                        marginRight:10,
                        padding:8
                    }}

                />


                <input

                    type="number"

                    placeholder="Precio"

                    value={price}

                    onChange={(e)=>
                        setPrice(e.target.value)
                    }

                    style={{
                        marginRight:10,
                        padding:8
                    }}

                />


                <input

                    type="number"

                    placeholder="Stock inicial"

                    value={stock}

                    onChange={(e)=>
                        setStock(e.target.value)
                    }

                    style={{
                        marginRight:10,
                        padding:8
                    }}

                />


                <button onClick={createProduct}>

                    💾 Crear

                </button>


            </div>



            <br/>


            <table

                style={{

                    width:"100%",

                    borderCollapse:"collapse"

                }}

            >


                <thead>

                    <tr>

                        <th>Producto</th>

                        <th>Stock</th>

                        <th>Precio Venta</th>

                        <th>Acción</th>

                    </tr>


                </thead>


                <tbody>


                {products.map((product)=>(


                    <tr key={product.id}>


                        <td>

                            {product.name}

                        </td>


                        <td>

                            {product.stock}

                        </td>


                        <td>


                            <input

                                type="number"

                                value={product.price}

                                onChange={(e)=>{

                                    const copy=[...products];

                                    copy.find(
                                        p=>p.id===product.id
                                    ).price=
                                    Number(e.target.value);


                                    setProducts(copy);

                                }}

                            />


                        </td>


                        <td>


                            <button

                                onClick={()=>
                                    updatePrice(
                                        product.id,
                                        product.price
                                    )
                                }

                            >

                                💾 Guardar

                            </button>

                            <button

    style={{
        marginLeft:10
    }}

    onClick={async()=>{


        if(!confirm(
            "¿Eliminar este producto?"
        ))
        return;


        await fetch(

            `http://127.0.0.1:8000/products/${product.id}`,

            {
                method:"DELETE"
            }

        );


        loadProducts();


    }}

>

    🗑️ Eliminar

</button>


                        </td>


                    </tr>


                ))}


                </tbody>


            </table>


        </div>

    );

}