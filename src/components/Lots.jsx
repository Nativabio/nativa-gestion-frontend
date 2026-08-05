import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function Lots() {
    const [view, setView] = useState("new");

    const [formulas, setFormulas] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [formulaId, setFormulaId] = useState("");
    const [items, setItems] = useState([]);
    const [extraMaterialId, setExtraMaterialId] = useState("");
    const [batchNumber, setBatchNumber] = useState("");
    const [laborHourCost, setLaborHourCost] = useState(10000);

    const [date, setDate] = useState(
        new Date().toISOString().substring(0, 10)
    );
    const [expirationDate, setExpirationDate] = useState("");

    const [unitsProduced, setUnitsProduced] = useState("");
    const [laborHours, setLaborHours] = useState("");
    const [notes, setNotes] = useState("");

    const [lots, setLots] = useState([]);
    const [loadingLots, setLoadingLots] = useState(false);
    const [expandedLotId, setExpandedLotId] = useState(null);
    const [lotFilter, setLotFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [showLegacyTestLots, setShowLegacyTestLots] = useState(false);

    const [editingLot, setEditingLot] = useState(null);
    const [editForm, setEditForm] = useState({
        production_date: "",
        expiration_date: "",
        units_produced: "",
        real_labor_hours: "",
        notes: ""
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const formatNumber = (value) =>
        Number(value || 0).toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    const formatDate = (value) => {
        const dateValue = String(value || "").substring(0, 10);
        const parts = dateValue.split("-");

        if (parts.length !== 3) {
            return dateValue || "-";
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    useEffect(() => {
        loadFormulas();
        loadNextLotNumber();
        loadSettings();
        loadLots();
    }, []);

    async function loadNextLotNumber() {
        try {
            const response = await fetch(`${API}/next-lot-number`);
            const data = await response.json();

            setBatchNumber(data.next_number || "");
        } catch {
            setBatchNumber("");
        }
    }

    async function loadSettings() {
        try {
            const response = await fetch(`${API}/settings`);
            const data = await response.json();

            setLaborHourCost(
                Number(data.labor_hour_cost || 0)
            );
        } catch {
            setLaborHourCost(10000);
        }
    }

    async function loadFormulas() {
        try {
            const [
                formulasResponse,
                productsResponse,
                materialsResponse
            ] = await Promise.all([
                fetch(`${API}/formulas`),
                fetch(`${API}/products`),
                fetch(`${API}/raw-materials`)
            ]);

            const [
                formulasData,
                productsData,
                materialsData
            ] = await Promise.all([
                formulasResponse.json(),
                productsResponse.json(),
                materialsResponse.json()
            ]);

            const materialList = Array.isArray(materialsData)
                ? materialsData
                : [];

            setRawMaterials(
                [...materialList].sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "es",
                        { sensitivity: "base" }
                    )
                )
            );

            const productNames = new Map(
                (Array.isArray(productsData)
                    ? productsData
                    : []
                ).map((product) => [
                    Number(product.id),
                    product.name
                ])
            );

            const materialsById = new Map(
                materialList.map((material) => [
                    Number(material.id),
                    material
                ])
            );

            const formulaList = (
                Array.isArray(formulasData)
                    ? formulasData
                    : []
            ).map((formula) => {
                const outputType = String(
                    formula.output_type
                    || (
                        formula.output_raw_material_id
                            ? "RAW_MATERIAL"
                            : "PRODUCT"
                    )
                ).toUpperCase();

                const outputMaterial = materialsById.get(
                    Number(formula.output_raw_material_id)
                );

                return {
                    ...formula,
                    output_type: outputType,
                    output_name:
                        outputType === "RAW_MATERIAL"
                            ? (
                                outputMaterial?.name
                                ||
                                "Materia prima elaborada"
                            )
                            : (
                                productNames.get(
                                    Number(formula.output_product_id)
                                )
                                ||
                                "Producto terminado"
                            ),
                    output_unit:
                        outputType === "RAW_MATERIAL"
                            ? outputMaterial?.unit || ""
                            : "unid."
                };
            });

            setFormulas(
                [...formulaList].sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "es",
                        { sensitivity: "base" }
                    )
                )
            );
        } catch {
            setFormulas([]);
            setRawMaterials([]);
        }
    }

    async function loadLots() {
        setLoadingLots(true);

        try {
            const response = await fetch(`${API}/lots`);
            const data = await response.json();

            setLots(Array.isArray(data) ? data : []);
        } catch {
            setLots([]);
        } finally {
            setLoadingLots(false);
        }
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
        const formulaItems = Array.isArray(data) ? data : [];

        const newItems = formulaItems
            .map((item) => ({
                ...item,
                real_quantity: Number(item.quantity || 0),
                is_extra: false
            }))
            .sort((a, b) =>
                String(a.raw_material || "").localeCompare(
                    String(b.raw_material || ""),
                    "es",
                    { sensitivity: "base" }
                )
            );

        setItems(newItems);
        setExtraMaterialId("");
    }

    function changeQuantity(index, value) {
        setItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        real_quantity:
                            value === ""
                                ? ""
                                : Number(value)
                    }
                    : item
            )
        );
    }

    function addExtraMaterial() {
        if (!extraMaterialId) {
            alert("Seleccioná una materia prima extra");
            return;
        }

        const material = rawMaterials.find(
            (item) => Number(item.id) === Number(extraMaterialId)
        );

        if (!material) {
            alert("No se encontró la materia prima seleccionada");
            return;
        }

        const alreadyAdded = items.some(
            (item) =>
                Number(item.raw_material_id)
                ===
                Number(material.id)
        );

        if (alreadyAdded) {
            alert(
                "Esa materia prima ya está incluida en el lote. "
                +
                "Modificá su cantidad en la tabla."
            );
            return;
        }

        setItems((currentItems) => [
            ...currentItems,
            {
                id: `extra-${material.id}`,
                raw_material_id: material.id,
                raw_material: material.name,
                quantity: 0,
                real_quantity: 0,
                unit: material.unit || "",
                unit_cost: Number(material.cost || 0),
                is_extra: true
            }
        ]);

        setExtraMaterialId("");
    }

    function removeExtraMaterial(index) {
        setItems((currentItems) =>
            currentItems.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    const selectedFormula = formulas.find(
        (formula) =>
            Number(formula.id)
            ===
            Number(formulaId)
    );

    const selectedOutputType = String(
        selectedFormula?.output_type || "PRODUCT"
    ).toUpperCase();

    const selectedOutputUnit =
        selectedFormula?.output_unit
        ||
        (
            selectedOutputType === "RAW_MATERIAL"
                ? ""
                : "unid."
        );

    const availableExtraMaterials = rawMaterials.filter(
        (material) =>
            !items.some(
                (item) =>
                    Number(item.raw_material_id)
                    ===
                    Number(material.id)
            )
            &&
            !(
                selectedOutputType === "RAW_MATERIAL"
                &&
                Number(selectedFormula?.output_raw_material_id)
                ===
                Number(material.id)
            )
    );

    const totalMaterials = items.reduce(
        (sum, item) =>
            sum
            +
            Number(item.real_quantity || 0)
            *
            Number(item.unit_cost || 0),
        0
    );

    const laborTotal =
        Number(laborHours || 0)
        *
        Number(laborHourCost || 0);

    const totalCost = totalMaterials + laborTotal;

    const unitCost =
        Number(unitsProduced) > 0
            ? totalCost / Number(unitsProduced)
            : 0;

    async function finishLot() {
        if (!batchNumber) {
            alert("No se pudo obtener el número de lote");
            return;
        }

        if (!formulaId) {
            alert("Seleccioná una fórmula");
            return;
        }

        if (items.length === 0) {
            alert("Cargá la fórmula antes de finalizar el lote");
            return;
        }

        if (
            items.some(
                (item) => Number(item.real_quantity || 0) < 0
            )
        ) {
            alert("Las cantidades usadas no pueden ser negativas");
            return;
        }

        if (
            !items.some(
                (item) => Number(item.real_quantity || 0) > 0
            )
        ) {
            alert(
                "Al menos una materia prima debe tener "
                +
                "una cantidad mayor a cero"
            );
            return;
        }

        if (Number(unitsProduced) <= 0) {
            alert("Ingresá las unidades producidas");
            return;
        }

        const response = await fetch(`${API}/lots`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                lot_number: batchNumber,
                formula_id: Number(formulaId),
                production_date: date,
                expiration_date: expirationDate || null,
                units_produced: Number(unitsProduced),
                real_labor_hours: Number(laborHours || 0),
                total_cost: totalCost,
                unit_cost: unitCost,
                notes,
                materials: items.map((item) => ({
                    raw_material_id: Number(item.raw_material_id),
                    real_quantity: Number(item.real_quantity || 0)
                }))
            })
        });

        const data = await response.json();

        if (data.error) {
            alert(`❌ ${data.error}`);
            return;
        }

        alert(
            `✅ ${
                data.message
                ||
                `Lote ${data.lot_number} guardado correctamente`
            }`
        );

        setFormulaId("");
        setItems([]);
        setExtraMaterialId("");
        setExpirationDate("");
        setUnitsProduced("");
        setLaborHours("");
        setNotes("");

        await loadNextLotNumber();
        await loadLots();
    }

    function openEditLot(lot) {
        setEditingLot(lot);

        setEditForm({
            production_date:
                String(lot.production_date || "").substring(0, 10),
            expiration_date:
                String(lot.expiration_date || "").substring(0, 10),
            units_produced:
                String(lot.units_produced ?? ""),
            real_labor_hours:
                String(lot.real_labor_hours ?? ""),
            notes:
                lot.notes || ""
        });
    }

    function closeEditLot() {
        setEditingLot(null);

        setEditForm({
            production_date: "",
            expiration_date: "",
            units_produced: "",
            real_labor_hours: "",
            notes: ""
        });
    }

    function changeEditField(event) {
        const { name, value } = event.target;

        setEditForm((current) => ({
            ...current,
            [name]: value
        }));
    }

    async function saveEditedLot() {
        if (!editingLot) {
            return;
        }

        if (!editForm.production_date) {
            alert("Ingresá la fecha de elaboración");
            return;
        }

        if (Number(editForm.units_produced) <= 0) {
            alert("Las unidades producidas deben ser mayores a cero");
            return;
        }

        if (Number(editForm.real_labor_hours || 0) < 0) {
            alert("Las horas de producción no pueden ser negativas");
            return;
        }

        const confirmed = window.confirm(
            `¿Guardar los cambios del lote ${editingLot.lot_number}?`
        );

        if (!confirmed) {
            return;
        }

        setSavingEdit(true);

        try {
            const response = await fetch(
                `${API}/lots/${editingLot.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        production_date: editForm.production_date,
                        expiration_date:
                            editForm.expiration_date || null,
                        units_produced:
                            Number(editForm.units_produced),
                        real_labor_hours:
                            Number(editForm.real_labor_hours || 0),
                        notes:
                            editForm.notes
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                alert(
                    `❌ ${
                        data.error
                        ||
                        "No se pudo modificar el lote"
                    }`
                );
                return;
            }

            alert(`✅ ${data.message}`);

            closeEditLot();
            await loadLots();
        } catch {
            alert("❌ No se pudo conectar con el backend");
        } finally {
            setSavingEdit(false);
        }
    }

    async function deleteLot(lot) {
        const produced = Number(lot.units_produced || 0);
        const available = Math.max(
            Math.min(
                Number(lot.remaining_units || 0),
                produced
            ),
            0
        );

        const partialDeletion =
            Math.abs(available - produced) > 0.000001;

        let message =
            `¿Eliminar definitivamente el lote ${lot.lot_number}?\n\n`
            +
            `Se descontarán ${formatNumber(available)} ${
                String(lot.output_type).toUpperCase()
                    === "RAW_MATERIAL"
                    ? "del stock de la materia prima elaborada"
                    : "unidades del producto terminado"
            }.`;

        if (partialDeletion) {
            message +=
                `\n\nEl lote produjo ${formatNumber(produced)}, pero `
                +
                `solo conserva ${formatNumber(available)} disponibles. `
                +
                "Las materias primas se repondrán únicamente en esa proporción.";
        } else {
            message +=
                " Se repondrán todas las materias primas utilizadas.";
        }

        message +=
            "\n\nMODO TEMPORAL DE LIMPIEZA: aunque el lote tenga ventas, "
            +
            "movimientos de stock u otros lotes vinculados, se eliminará igual. "
            +
            "Esos registros permanecerán y solo se quitarán sus vínculos técnicos."
            +
            "\n\nLos asientos contables no se modificarán. "
            +
            "Después deberás corregirlos manualmente desde el Libro Diario.";

        if (lot.material_history_source === "FORMULA_ESTIMATE") {
            message +=
                "\n\n⚠️ Este lote es anterior al historial detallado. "
                +
                "Las materias primas se repondrán según las cantidades "
                +
                "de la fórmula actual.";
        }

        const confirmed = window.confirm(message);

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API}/lots/${lot.id}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                alert(
                    `❌ ${
                        data.error
                        ||
                        "No se pudo eliminar el lote"
                    }`
                );
                return;
            }

            let successMessage = `✅ ${data.message}`;

            if (data.warning) {
                successMessage += `\n\n⚠️ ${data.warning}`;
            }

            alert(successMessage);
            setExpandedLotId(null);
            await loadLots();
            await loadNextLotNumber();
        } catch {
            alert("❌ No se pudo conectar con el backend");
        }
    }

    const productOptions = Array.from(
        new Map(
            lots.map((lot) => [
                String(lot.product_id || lot.product_name),
                {
                    id: String(lot.product_id || lot.product_name),
                    name: lot.product_name
                }
            ])
        ).values()
    ).sort((a, b) =>
        String(a.name || "").localeCompare(
            String(b.name || ""),
            "es",
            { sensitivity: "base" }
        )
    );

    const isLegacyTestLot = (lot) => {
        const lotNumber = String(lot.lot_number || "").trim();
        return /^\d{8,}$/.test(lotNumber);
    };

    const filteredLots = lots.filter((lot) => {
        const matchesLot = String(lot.lot_number || "")
            .toLowerCase()
            .includes(lotFilter.trim().toLowerCase());

        const matchesMonth =
            !monthFilter
            ||
            String(lot.production_date || "").startsWith(monthFilter);

        const lotProductKey = String(
            lot.product_id || lot.product_name
        );

        const matchesProduct =
            !productFilter
            ||
            lotProductKey === productFilter;

        const matchesLegacyVisibility =
            showLegacyTestLots
            ||
            !isLegacyTestLot(lot);

        return (
            matchesLot
            &&
            matchesMonth
            &&
            matchesProduct
            &&
            matchesLegacyVisibility
        );
    });

    function clearFilters() {
        setLotFilter("");
        setMonthFilter("");
        setProductFilter("");
        setShowLegacyTestLots(false);
    }

    const tabButtonStyle = (active) => ({
        padding: "9px 14px",
        marginRight: 8,
        borderRadius: 6,
        border: "1px solid #999",
        cursor: "pointer",
        fontWeight: active ? "bold" : "normal"
    });

    return (
        <div>
            <h2>🏭 Lotes de producción</h2>

            <div style={{ marginBottom: 24 }}>
                <button
                    onClick={() => setView("new")}
                    style={tabButtonStyle(view === "new")}
                >
                    ➕ Nuevo lote
                </button>

                <button
                    onClick={() => {
                        setView("history");
                        loadLots();
                    }}
                    style={tabButtonStyle(view === "history")}
                >
                    📋 Historial de lotes
                </button>
            </div>

            {view === "new" ? (
                <div>
                    <h3>Nuevo lote</h3>

                    <label>Número de lote</label>
                    <br />
                    <input value={batchNumber} disabled />

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
                        onChange={(event) => setDate(event.target.value)}
                    />

                    <br /><br />

                    <label>Fecha de vencimiento</label>
                    <br />
                    <input
                        type="date"
                        value={expirationDate}
                        onChange={(event) =>
                            setExpirationDate(event.target.value)
                        }
                    />

                    <br /><br />

                    <label>Fórmula</label>
                    <br />
                    <select
                        value={formulaId}
                        onChange={(event) => {
                            setFormulaId(event.target.value);
                            setItems([]);
                            setExtraMaterialId("");
                        }}
                    >
                        <option value="">Seleccionar fórmula</option>

                        {formulas.map((formula) => (
                            <option key={formula.id} value={formula.id}>
                                {formula.name}
                                {" — "}
                                {formula.output_name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadFormula}
                        style={{ marginLeft: 10 }}
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
                                <th>Costo utilizado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign: "center",
                                            padding: 20
                                        }}
                                    >
                                        No hay materias primas cargadas.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id || `${item.raw_material_id}-${index}`}>
                                        <td>
                                            {item.raw_material}
                                            {item.is_extra && (
                                                <span
                                                    style={{
                                                        marginLeft: 7,
                                                        fontSize: 12,
                                                        fontWeight: "bold"
                                                    }}
                                                >
                                                    (extra)
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {item.is_extra
                                                ? "—"
                                                : `${formatNumber(item.quantity)} ${item.unit}`}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={item.real_quantity}
                                                onChange={(event) =>
                                                    changeQuantity(
                                                        index,
                                                        event.target.value
                                                    )
                                                }
                                                style={{ width: 90 }}
                                            />{" "}{item.unit}
                                        </td>
                                        <td>
                                            {item.is_extra
                                                ? "Ingrediente agregado"
                                                : `${formatNumber(
                                                    Number(item.real_quantity || 0)
                                                    -
                                                    Number(item.quantity || 0)
                                                )} ${item.unit}`}
                                        </td>
                                        <td>
                                            {formatMoney(
                                                Number(item.real_quantity || 0)
                                                *
                                                Number(item.unit_cost || 0)
                                            )}
                                        </td>
                                        <td>
                                            {item.is_extra
                                                ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeExtraMaterial(index)
                                                        }
                                                    >
                                                        Quitar
                                                    </button>
                                                )
                                                : (
                                                    Number(item.real_quantity || 0) === 0
                                                        ? "Omitido"
                                                        : "—"
                                                )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div
                        style={{
                            marginTop: 14,
                            padding: 12,
                            border: "1px solid #bbb",
                            borderRadius: 6,
                            maxWidth: 650
                        }}
                    >
                        <b>Agregar ingrediente extra al lote</b>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                marginTop: 8
                            }}
                        >
                            <select
                                value={extraMaterialId}
                                onChange={(event) =>
                                    setExtraMaterialId(event.target.value)
                                }
                            >
                                <option value="">
                                    Seleccionar materia prima
                                </option>

                                {availableExtraMaterials.map((material) => (
                                    <option
                                        key={material.id}
                                        value={material.id}
                                    >
                                        {material.name}
                                        {material.unit
                                            ? ` (${material.unit})`
                                            : ""}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={addExtraMaterial}
                            >
                                ➕ Agregar ingrediente extra
                            </button>
                        </div>

                        <div
                            style={{
                                marginTop: 7,
                                fontSize: 12,
                                color: "#666"
                            }}
                        >
                            Podés dejar en 0 un ingrediente de la fórmula para
                            omitirlo solo en este lote. La fórmula original no se
                            modifica.
                        </div>
                    </div>

                    <br /><br />

                    <label>
                        {selectedOutputType === "RAW_MATERIAL"
                            ? `Cantidad real obtenida${
                                selectedOutputUnit
                                    ? ` (${selectedOutputUnit})`
                                    : ""
                            }`
                            : "Unidades producidas"}
                    </label>
                    <br />
                    <input
                        type="number"
                        step="any"
                        value={unitsProduced}
                        onChange={(event) =>
                            setUnitsProduced(event.target.value)
                        }
                    />

                    <br /><br />

                    <label>Horas de producción</label>
                    <br />
                    <input
                        type="number"
                        step="0.25"
                        value={laborHours}
                        onChange={(event) =>
                            setLaborHours(event.target.value)
                        }
                    />

                    <div
                        style={{
                            marginTop: 5,
                            fontSize: 12,
                            color: "#666"
                        }}
                    >
                        Valor por hora configurado: {formatMoney(laborHourCost)}
                    </div>

                    <br />

                    <label>Notas</label>
                    <br />
                    <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows="3"
                        style={{ width: "450px", maxWidth: "100%" }}
                    />

                    <br /><br />

                    <h3>Resumen del lote</h3>

                    <table style={{ width: "450px", maxWidth: "100%" }}>
                        <tbody>
                            <tr>
                                <td>Materias primas</td>
                                <td>{formatMoney(totalMaterials)}</td>
                            </tr>
                            <tr>
                                <td>Mano de obra</td>
                                <td>{formatMoney(laborTotal)}</td>
                            </tr>
                            <tr>
                                <td><b>Costo total</b></td>
                                <td><b>{formatMoney(totalCost)}</b></td>
                            </tr>
                            <tr>
                                <td><b>Costo por unidad</b></td>
                                <td><b>{formatMoney(unitCost)}</b></td>
                            </tr>
                        </tbody>
                    </table>

                    <br />

                    <button onClick={finishLot}>
                        🏭 Finalizar Lote
                    </button>
                </div>
            ) : (
                <div>
                    <h3>Historial de lotes</h3>

                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            alignItems: "end",
                            marginBottom: 18
                        }}
                    >
                        <div>
                            <label>Buscar lote</label>
                            <br />
                            <input
                                value={lotFilter}
                                onChange={(event) =>
                                    setLotFilter(event.target.value)
                                }
                                placeholder="Número de lote"
                            />
                        </div>

                        <div>
                            <label>Mes</label>
                            <br />
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={(event) =>
                                    setMonthFilter(event.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label>Resultado</label>
                            <br />
                            <select
                                value={productFilter}
                                onChange={(event) =>
                                    setProductFilter(event.target.value)
                                }
                            >
                                <option value="">Todos</option>

                                {productOptions.map((product) => (
                                    <option
                                        key={product.id}
                                        value={product.id}
                                    >
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                paddingBottom: 6
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={showLegacyTestLots}
                                onChange={(event) =>
                                    setShowLegacyTestLots(
                                        event.target.checked
                                    )
                                }
                            />
                            Mostrar lotes de prueba anteriores
                        </label>

                        <button onClick={clearFilters}>
                            Limpiar filtros
                        </button>

                        <button onClick={loadLots}>
                            🔄 Actualizar
                        </button>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        Se muestran <b>{filteredLots.length}</b> lotes.
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 1260
                            }}
                            border="1"
                            cellPadding="7"
                        >
                            <thead>
                                <tr>
                                    <th>Lote</th>
                                    <th>Fecha</th>
                                    <th>Resultado</th>
                                    <th>Tipo</th>
                                    <th>Fórmula</th>
                                    <th>Producido</th>
                                    <th>Disponible</th>
                                    <th>Materias primas</th>
                                    <th>Mano de obra</th>
                                    <th>Costo total</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loadingLots ? (
                                    <tr>
                                        <td colSpan="12" style={{ textAlign: "center" }}>
                                            Cargando lotes...
                                        </td>
                                    </tr>
                                ) : filteredLots.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="12"
                                            style={{
                                                textAlign: "center",
                                                padding: 20
                                            }}
                                        >
                                            No hay lotes para mostrar.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLots.map((lot) => (
                                        <tr key={lot.id}>
                                            <td><b>{lot.lot_number}</b></td>
                                            <td>{formatDate(lot.production_date)}</td>
                                            <td>{lot.product_name}</td>
                                            <td>
                                                {String(
                                                    lot.output_type || "PRODUCT"
                                                ).toUpperCase()
                                                    === "RAW_MATERIAL"
                                                    ? "Materia prima elaborada"
                                                    : "Producto terminado"}
                                            </td>
                                            <td>{lot.formula_name}</td>
                                            <td>
                                                {formatNumber(lot.units_produced)}
                                                {String(
                                                    lot.output_type || "PRODUCT"
                                                ).toUpperCase()
                                                    === "RAW_MATERIAL"
                                                    ? ""
                                                    : " unid."}
                                            </td>
                                            <td>
                                                {formatNumber(lot.remaining_units)}
                                                {String(
                                                    lot.output_type || "PRODUCT"
                                                ).toUpperCase()
                                                    === "RAW_MATERIAL"
                                                    ? ""
                                                    : " unid."}
                                            </td>
                                            <td>{formatMoney(lot.material_cost)}</td>
                                            <td>{formatMoney(lot.labor_cost)}</td>
                                            <td><b>{formatMoney(lot.total_cost)}</b></td>
                                            <td>{lot.status}</td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                                <button
                                                    onClick={() =>
                                                        setExpandedLotId(
                                                            expandedLotId === lot.id
                                                                ? null
                                                                : lot.id
                                                        )
                                                    }
                                                >
                                                    {expandedLotId === lot.id
                                                        ? "Ocultar"
                                                        : "Ver detalle"}
                                                </button>

                                                <button
                                                    onClick={() => openEditLot(lot)}
                                                    disabled={!lot.can_edit}
                                                    title={
                                                        lot.can_edit
                                                            ? "Editar lote"
                                                            : "Este lote no se puede editar"
                                                    }
                                                    style={{ marginLeft: 6 }}
                                                >
                                                    ✏️ Editar
                                                </button>

                                                <button
                                                    onClick={() => deleteLot(lot)}
                                                    title="Eliminar lote (modo temporal sin bloqueos)"
                                                    style={{ marginLeft: 6 }}
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {editingLot && (
                        <div
                            style={{
                                marginTop: 20,
                                padding: 18,
                                border: "2px solid #777",
                                borderRadius: 8,
                                background: "#fafafa"
                            }}
                        >
                            <h3>
                                ✏️ Editar lote {editingLot.lot_number}
                            </h3>

                            <p>
                                <b>Producto:</b> {editingLot.product_name}
                                <br />
                                <b>Fórmula:</b> {editingLot.formula_name}
                                <br />
                                <b>
                                    {String(
                                        editingLot.output_type
                                        || "PRODUCT"
                                    ).toUpperCase()
                                        === "RAW_MATERIAL"
                                        ? "Cantidad ya utilizada:"
                                        : "Unidades ya utilizadas:"}
                                </b>{" "}
                                {formatNumber(
                                    Number(editingLot.units_produced || 0)
                                    -
                                    Number(editingLot.remaining_units || 0)
                                )}
                            </p>

                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 18
                                }}
                            >
                                <div>
                                    <label>Fecha de elaboración</label>
                                    <br />
                                    <input
                                        type="date"
                                        name="production_date"
                                        value={editForm.production_date}
                                        onChange={changeEditField}
                                    />
                                </div>

                                <div>
                                    <label>Fecha de vencimiento</label>
                                    <br />
                                    <input
                                        type="date"
                                        name="expiration_date"
                                        value={editForm.expiration_date}
                                        onChange={changeEditField}
                                    />
                                </div>

                                <div>
                                    <label>
                                        {String(
                                            editingLot.output_type
                                            || "PRODUCT"
                                        ).toUpperCase()
                                            === "RAW_MATERIAL"
                                            ? "Cantidad producida"
                                            : "Unidades producidas"}
                                    </label>
                                    <br />
                                    <input
                                        type="number"
                                        name="units_produced"
                                        value={editForm.units_produced}
                                        onChange={changeEditField}
                                    />
                                </div>

                                <div>
                                    <label>Horas de producción</label>
                                    <br />
                                    <input
                                        type="number"
                                        step="0.25"
                                        name="real_labor_hours"
                                        value={editForm.real_labor_hours}
                                        onChange={changeEditField}
                                    />
                                </div>
                            </div>

                            <br />

                            <label>Notas</label>
                            <br />
                            <textarea
                                name="notes"
                                value={editForm.notes}
                                onChange={changeEditField}
                                rows="3"
                                style={{
                                    width: "500px",
                                    maxWidth: "100%"
                                }}
                            />

                            <div style={{ marginTop: 16 }}>
                                <button
                                    onClick={saveEditedLot}
                                    disabled={savingEdit}
                                >
                                    {savingEdit
                                        ? "Guardando..."
                                        : "💾 Guardar cambios"}
                                </button>

                                <button
                                    onClick={closeEditLot}
                                    disabled={savingEdit}
                                    style={{ marginLeft: 8 }}
                                >
                                    Cancelar
                                </button>
                            </div>

                            <div
                                style={{
                                    marginTop: 12,
                                    fontSize: 13,
                                    color: "#666"
                                }}
                            >
                                Al cambiar las unidades, el sistema ajustará
                                solamente la diferencia en el stock.
                            </div>
                        </div>
                    )}

                    {expandedLotId && (() => {
                        const lot = lots.find(
                            (item) => item.id === expandedLotId
                        );

                        if (!lot) {
                            return null;
                        }

                        return (
                            <div
                                style={{
                                    marginTop: 20,
                                    padding: 16,
                                    border: "1px solid #aaa",
                                    borderRadius: 8
                                }}
                            >
                                <h3>Detalle del lote {lot.lot_number}</h3>

                                {lot.material_history_source === "FORMULA_ESTIMATE" && (
                                    <div
                                        style={{
                                            padding: 10,
                                            marginBottom: 12,
                                            border: "1px solid #b58b00",
                                            borderRadius: 6
                                        }}
                                    >
                                        ⚠️ Este lote fue creado antes del historial
                                        detallado. Las cantidades de materias primas
                                        se estimaron con la fórmula actual.
                                    </div>
                                )}

                                <p>
                                    <b>Producto:</b> {lot.product_name}<br />
                                    <b>Fórmula:</b> {lot.formula_name}<br />
                                    <b>Fecha:</b> {formatDate(lot.production_date)}<br />
                                    <b>Vencimiento:</b>{" "}
                                    {lot.expiration_date
                                        ? formatDate(lot.expiration_date)
                                        : "Sin fecha"}<br />
                                    <b>Horas de trabajo:</b>{" "}
                                    {formatNumber(lot.real_labor_hours)}<br />
                                    <b>Costo por unidad:</b>{" "}
                                    {formatMoney(lot.unit_cost)}
                                </p>

                                <h4>Materias primas utilizadas</h4>

                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse"
                                    }}
                                    border="1"
                                    cellPadding="7"
                                >
                                    <thead>
                                        <tr>
                                            <th>Materia prima</th>
                                            <th>Cantidad</th>
                                            <th>Costo unitario</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lot.materials.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: "center" }}>
                                                    Sin detalle de materias primas.
                                                </td>
                                            </tr>
                                        ) : (
                                            lot.materials.map((material, index) => (
                                                <tr
                                                    key={`${material.raw_material_id}-${index}`}
                                                >
                                                    <td>{material.name}</td>
                                                    <td>
                                                        {formatNumber(material.quantity)}{" "}
                                                        {material.unit}
                                                    </td>
                                                    <td>
                                                        {formatMoney(material.unit_cost)}
                                                    </td>
                                                    <td>
                                                        {formatMoney(material.subtotal_cost)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <p style={{ marginTop: 14 }}>
                                    <b>Notas:</b> {lot.notes || "Sin notas"}
                                </p>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
