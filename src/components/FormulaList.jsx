export default function FormulaList({
    items,
    onSelect,
    onDelete
}) {
    return (
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 30
            }}
        >
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Lote</th>
                    <th>Unidades</th>
                    <th>Margen</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody>
                {items.map((formula) => (
                    <tr key={formula.id}>
                        <td>{formula.name}</td>
                        <td>{formula.batch_size}</td>
                        <td>{formula.units_produced}</td>
                        <td>
                            {Number(
                                formula.margin_percent ?? 40
                            ).toLocaleString("es-AR", {
                                maximumFractionDigits: 2
                            })}%
                        </td>
                        <td>
                            <button onClick={() => onSelect(formula)}>
                                ✏ Editar
                            </button>
                            <button
                                style={{ marginLeft: 10 }}
                                onClick={() => onDelete(formula.id)}
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
