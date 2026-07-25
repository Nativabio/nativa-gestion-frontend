export default function FormulaList({
    items,
    onSelect,
    onDelete
}) {


    return (

        <table
            style={{
                width:"100%",
                borderCollapse:"collapse",
                marginBottom:30
            }}
        >

            <thead>

                <tr>

                    <th>Nombre</th>
                    <th>Lote</th>
                    <th>Acciones</th>

                </tr>

            </thead>


            <tbody>


            {items.map(f => (

                <tr key={f.id}>


                    <td>
                        {f.name}
                    </td>


                    <td>
                        {f.batch_size}
                    </td>


                    <td>


                        <button
                            onClick={() => onSelect(f)}
                        >
                            ✏ Editar
                        </button>


                        <button
                            style={{
                                marginLeft:10
                            }}
                            onClick={() => onDelete(f.id)}
                        >
                            🗑 Eliminar
                        </button>


                    </td>


                </tr>


            ))}


            </tbody>


        </table>

    );

}