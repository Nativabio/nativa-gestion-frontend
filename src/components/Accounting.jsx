import { useState } from "react";

const API = "http://127.0.0.1:8000";

function firstDayOfCurrentMonth() {

    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    )
        .toISOString()
        .substring(0, 10);

}

function today() {

    return new Date()
        .toISOString()
        .substring(0, 10);

}

export default function Accounting() {

    const [accounts, setAccounts] = useState([]);

    const [journal, setJournal] = useState([]);

    const [showAccounts, setShowAccounts] = useState(false);

    const [showJournal, setShowJournal] = useState(false);

    const [showManualEntry, setShowManualEntry] = useState(false);

    const [showLedger, setShowLedger] = useState(false);

    const [showIncomeStatement, setShowIncomeStatement] = useState(false);

    const [showBalance, setShowBalance] = useState(false);

    const [balance, setBalance] = useState([]);

    const [editingEntry, setEditingEntry] = useState(null);


    const [ledgerAccountId, setLedgerAccountId] = useState("");

    const [ledgerFrom, setLedgerFrom] = useState(
        firstDayOfCurrentMonth()
    );

    const [ledgerTo, setLedgerTo] = useState(
        today()
    );

    const [incomeFrom, setIncomeFrom] = useState(
        firstDayOfCurrentMonth()
    );

    const [incomeTo, setIncomeTo] = useState(
        today()
    );

    const [manualEntry, setManualEntry] = useState({

        date: today(),
        concept: "",
        lines: [
            {
                account_code: "",
                debit: "",
                credit: ""
            },
            {
                account_code: "",
                debit: "",
                credit: ""
            }
        ]

    });

    const [form, setForm] = useState({

        code: "",
        name: "",
        type: "ACTIVO",
        category: ""

    });


    async function loadAccounts() {

        const response = await fetch(
            `${API}/accounts`
        );

        const data = await response.json();

        setAccounts(data);

        return data;

    }


    async function loadJournal() {

        const response = await fetch(
            `${API}/journal-entry`
        );

        const data = await response.json();

        setJournal(data);

        return data;

    }


    async function loadAccountingData() {

        const [accountsData, journalData] = await Promise.all([

            loadAccounts(),

            loadJournal()

        ]);

        return {

            accountsData,
            journalData

        };

    }


    async function saveAccount() {

        if (!form.code.trim() || !form.name.trim()) {

            alert("Completá el código y el nombre de la cuenta");

            return;

        }

        const response = await fetch(
            `${API}/accounts`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(form)

            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {

            alert(
                data.error ||
                "No se pudo guardar la cuenta"
            );

            return;

        }

        setForm({

            code: "",
            name: "",
            type: "ACTIVO",
            category: ""

        });

        await loadAccounts();

    }


    async function deleteAccount(id) {

        if (!window.confirm("¿Eliminar cuenta?")) {

            return;

        }

        await fetch(
            `${API}/accounts/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAccounts();

    }


    async function openAccounts() {

        await loadAccounts();

        setShowAccounts(true);

    }


    async function openManualEntry() {

        await loadAccounts();

        setShowManualEntry(true);

    }


    function updateManualLine(
        index,
        field,
        value
    ) {

        setManualEntry((current) => ({

            ...current,

            lines: current.lines.map(
                (line, lineIndex) => {

                    if (lineIndex !== index) {

                        return line;

                    }

                    const updated = {
                        ...line,
                        [field]: value
                    };

                    if (
                        field === "debit"
                        &&
                        Number(value) > 0
                    ) {

                        updated.credit = "";

                    }

                    if (
                        field === "credit"
                        &&
                        Number(value) > 0
                    ) {

                        updated.debit = "";

                    }

                    return updated;

                }
            )

        }));

    }


    function addManualLine() {

        setManualEntry((current) => ({

            ...current,

            lines: [
                ...current.lines,
                {
                    account_code: "",
                    debit: "",
                    credit: ""
                }
            ]

        }));

    }


    function removeManualLine(
        index
    ) {

        setManualEntry((current) => {

            if (current.lines.length <= 2) {

                alert(
                    "El asiento debe conservar al menos dos renglones"
                );

                return current;

            }

            return {
                ...current,
                lines: current.lines.filter(
                    (_, lineIndex) =>
                        lineIndex !== index
                )
            };

        });

    }


    async function saveManualEntry() {

        if (!manualEntry.date) {

            alert("Ingresá una fecha");

            return;

        }

        if (!manualEntry.concept.trim()) {

            alert("Ingresá un concepto");

            return;

        }

        if (manualEntry.lines.length < 2) {

            alert(
                "El asiento debe tener al menos dos renglones"
            );

            return;

        }

        let totalDebit = 0;
        let totalCredit = 0;

        for (
            let index = 0;
            index < manualEntry.lines.length;
            index += 1
        ) {

            const line = manualEntry.lines[index];

            if (!line.account_code) {

                alert(
                    `Falta la cuenta del renglón ${index + 1}`
                );

                return;

            }

            const debit = Number(
                line.debit || 0
            );

            const credit = Number(
                line.credit || 0
            );

            if (debit < 0 || credit < 0) {

                alert(
                    "Los importes no pueden ser negativos"
                );

                return;

            }

            if (debit > 0 && credit > 0) {

                alert(
                    (
                        `El renglón ${index + 1} no puede tener `
                        +
                        "Debe y Haber al mismo tiempo"
                    )
                );

                return;

            }

            if (debit <= 0 && credit <= 0) {

                alert(
                    `El renglón ${index + 1} no tiene importe`
                );

                return;

            }

            totalDebit += debit;
            totalCredit += credit;

        }

        if (
            Math.abs(
                totalDebit
                -
                totalCredit
            ) > 0.009
        ) {

            alert(
                (
                    "El asiento está desbalanceado. "
                    +
                    `Debe: $${formatMoney(totalDebit)} - `
                    +
                    `Haber: $${formatMoney(totalCredit)}`
                )
            );

            return;

        }

        const response = await fetch(
            `${API}/journal-entry`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    date: manualEntry.date,
                    concept: manualEntry.concept.trim(),
                    lines: manualEntry.lines.map(
                        (line) => ({
                            account_code:
                                line.account_code,
                            debit:
                                Number(line.debit || 0),
                            credit:
                                Number(line.credit || 0)
                        })
                    )
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {

            alert(
                data.error ||
                "No se pudo registrar el asiento"
            );

            return;

        }

        alert(
            "Asiento contable registrado correctamente"
        );

        setManualEntry({
            date: today(),
            concept: "",
            lines: [
                {
                    account_code: "",
                    debit: "",
                    credit: ""
                },
                {
                    account_code: "",
                    debit: "",
                    credit: ""
                }
            ]
        });

        await loadJournal();

        if (showBalance) {

            await cargarBalance();

        }

    }


    async function cargarLibro() {

        await loadAccountingData();

        setShowJournal(true);

    }


    function getJournalGroups(
        movements
    ) {

        const grouped = new Map();

        movements.forEach((movement) => {

            const groupId = movement.entry_group || (
                `legacy-${movement.date}-${movement.concept}`
            );

            if (!grouped.has(groupId)) {

                grouped.set(
                    groupId,
                    {
                        entry_group: groupId,
                        date: movement.date,
                        concept: movement.concept,
                        origin: movement.origin || "MANUAL",
                        origin_id: movement.origin_id,
                        first_id: movement.id,
                        lines: []
                    }
                );

            }

            grouped.get(groupId).lines.push(
                movement
            );

        });


        return Array.from(
            grouped.values()
        )
            .map((group) => {

                const sortedLines = [...group.lines]
                    .sort(
                        (a, b) =>
                            Number(a.id)
                            -
                            Number(b.id)
                    );

                return {

                    ...group,

                    lines:
                    sortedLines,

                    total_debit:
                    sortedLines.reduce(
                        (sum, line) =>
                            sum + Number(
                                line.debit || 0
                            ),
                        0
                    ),

                    total_credit:
                    sortedLines.reduce(
                        (sum, line) =>
                            sum + Number(
                                line.credit || 0
                            ),
                        0
                    )

                };

            })
            .sort((a, b) => {

                const dateCompare = String(
                    b.date || ""
                ).localeCompare(
                    String(a.date || "")
                );

                if (dateCompare !== 0) {

                    return dateCompare;

                }

                return (
                    Number(b.first_id)
                    -
                    Number(a.first_id)
                );

            });

    }


    function originLabel(
        origin
    ) {

        const labels = {

            MANUAL: "Manual",
            VENTA: "Venta",
            CMV: "Costo de venta",
            COMPRA: "Compra",
            PRODUCCION: "Producción",
            BAJA_STOCK: "Baja de stock"

        };

        return (
            labels[origin]
            ||
            origin
            ||
            "Manual"
        );

    }


    function startEditEntry(
        group
    ) {

        setEditingEntry({

            entry_group:
            group.entry_group,

            date:
            String(
                group.date || ""
            ).substring(0, 10),

            concept:
            group.concept || "",

            origin:
            group.origin || "MANUAL",

            origin_id:
            group.origin_id,

            lines:
            group.lines.map((line) => ({

                account_code:
                line.account_code || "",

                debit:
                Number(
                    line.debit || 0
                ) > 0
                    ? String(line.debit)
                    : "",

                credit:
                Number(
                    line.credit || 0
                ) > 0
                    ? String(line.credit)
                    : ""

            }))

        });

    }


    function updateEditingLine(
        index,
        field,
        value
    ) {

        setEditingEntry((current) => {

            const lines = current.lines.map(
                (line, lineIndex) => {

                    if (lineIndex !== index) {

                        return line;

                    }

                    const updated = {

                        ...line,

                        [field]:
                        value

                    };

                    if (
                        field === "debit"
                        &&
                        Number(value) > 0
                    ) {

                        updated.credit = "";

                    }

                    if (
                        field === "credit"
                        &&
                        Number(value) > 0
                    ) {

                        updated.debit = "";

                    }

                    return updated;

                }
            );

            return {

                ...current,

                lines

            };

        });

    }


    function addEditingLine() {

        setEditingEntry((current) => ({

            ...current,

            lines: [

                ...current.lines,

                {
                    account_code: "",
                    debit: "",
                    credit: ""
                }

            ]

        }));

    }


    function removeEditingLine(
        index
    ) {

        setEditingEntry((current) => {

            if (current.lines.length <= 2) {

                alert(
                    "El asiento debe conservar al menos dos renglones"
                );

                return current;

            }

            return {

                ...current,

                lines:
                current.lines.filter(
                    (_, lineIndex) =>
                        lineIndex !== index
                )

            };

        });

    }


    async function saveEditedEntry() {

        if (!editingEntry) {

            return;

        }

        if (!editingEntry.date) {

            alert("Ingresá una fecha");

            return;

        }

        if (!editingEntry.concept.trim()) {

            alert("Ingresá un concepto");

            return;

        }

        if (editingEntry.lines.length < 2) {

            alert(
                "El asiento debe tener al menos dos renglones"
            );

            return;

        }

        let totalDebit = 0;

        let totalCredit = 0;

        for (
            let index = 0;
            index < editingEntry.lines.length;
            index += 1
        ) {

            const line = editingEntry.lines[index];

            if (!line.account_code) {

                alert(
                    `Falta la cuenta del renglón ${index + 1}`
                );

                return;

            }

            const debit = Number(
                line.debit || 0
            );

            const credit = Number(
                line.credit || 0
            );

            if (debit < 0 || credit < 0) {

                alert(
                    "Los importes no pueden ser negativos"
                );

                return;

            }

            if (debit > 0 && credit > 0) {

                alert(
                    (
                        `El renglón ${index + 1} no puede tener `
                        +
                        "Debe y Haber al mismo tiempo"
                    )
                );

                return;

            }

            if (debit <= 0 && credit <= 0) {

                alert(
                    `El renglón ${index + 1} no tiene importe`
                );

                return;

            }

            totalDebit += debit;

            totalCredit += credit;

        }


        if (
            Math.abs(
                totalDebit
                -
                totalCredit
            ) > 0.009
        ) {

            alert(
                (
                    "El asiento está desbalanceado. "
                    +
                    `Debe: $${formatMoney(totalDebit)} - `
                    +
                    `Haber: $${formatMoney(totalCredit)}`
                )
            );

            return;

        }


        if (
            editingEntry.origin !== "MANUAL"
            &&
            !window.confirm(
                (
                    "Este asiento fue generado automáticamente. "
                    +
                    "La modificación será solamente contable: "
                    +
                    "no cambiará la venta, compra, lote ni stock. "
                    +
                    "¿Continuar?"
                )
            )
        ) {

            return;

        }


        const response = await fetch(
            (
                `${API}/journal-entry-group/`
                +
                editingEntry.entry_group
            ),
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    date:
                    editingEntry.date,

                    concept:
                    editingEntry.concept.trim(),

                    lines:
                    editingEntry.lines.map(
                        (line) => ({

                            account_code:
                            line.account_code,

                            debit:
                            Number(
                                line.debit || 0
                            ),

                            credit:
                            Number(
                                line.credit || 0
                            )

                        })
                    )

                })

            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {

            alert(
                data.error
                ||
                "No se pudo modificar el asiento"
            );

            return;

        }

        alert(
            "Asiento modificado correctamente"
        );

        setEditingEntry(null);

        await loadJournal();

        if (showBalance) {

            await cargarBalance();

        }

    }


    async function deleteJournalGroup(
        group
    ) {

        const isAutomatic = (
            group.origin
            &&
            group.origin !== "MANUAL"
        );

        const message = isAutomatic
            ? (
                "Este asiento fue generado automáticamente. "
                +
                "Se eliminará únicamente de la contabilidad; "
                +
                "la venta, compra, lote y stock seguirán existiendo. "
                +
                "¿Eliminar igualmente?"
            )
            : (
                "¿Eliminar este asiento completo?"
            );

        if (!window.confirm(message)) {

            return;

        }

        const response = await fetch(
            (
                `${API}/journal-entry-group/`
                +
                group.entry_group
            ),
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {

            alert(
                data.error
                ||
                "No se pudo eliminar el asiento"
            );

            return;

        }

        if (
            editingEntry?.entry_group
            ===
            group.entry_group
        ) {

            setEditingEntry(null);

        }

        alert(
            "Asiento eliminado correctamente"
        );

        await loadJournal();

        if (showBalance) {

            await cargarBalance();

        }

    }


    async function abrirMayor() {

        const data = await loadAccountingData();

        if (
            !ledgerAccountId &&
            data.accountsData.length > 0
        ) {

            setLedgerAccountId(
                String(data.accountsData[0].id)
            );

        }

        setShowLedger(true);

    }


    async function abrirEstadoResultados() {

        await loadAccountingData();

        setShowIncomeStatement(true);

    }


    async function cargarBalance() {

        const {
            accountsData,
            journalData
        } = await loadAccountingData();

        const result = accountsData
            .map((account) => {

                const movements = journalData.filter(
                    (movement) =>
                        movement.account_code
                        ===
                        account.code
                );

                const totalDebit = movements.reduce(
                    (sum, movement) =>
                        sum + Number(
                            movement.debit || 0
                        ),
                    0
                );

                const totalCredit = movements.reduce(
                    (sum, movement) =>
                        sum + Number(
                            movement.credit || 0
                        ),
                    0
                );

                const creditNature = [
                    "PASIVO",
                    "PATRIMONIO",
                    "INGRESO"
                ].includes(account.type);

                const balanceValue = creditNature
                    ? totalCredit - totalDebit
                    : totalDebit - totalCredit;

                return {

                    ...account,
                    totalDebit,
                    totalCredit,
                    balance: balanceValue

                };

            })
            .filter(
                (account) =>
                    Math.abs(account.balance) > 0.001
            )
            .sort(
                (a, b) =>
                    a.code.localeCompare(b.code)
            );

        setBalance(result);

        setShowBalance(true);

    }


    function formatMoney(value) {

        return Number(value || 0).toLocaleString(
            "es-AR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    function dateInsideRange(
        dateValue,
        from,
        to
    ) {

        const normalizedDate = String(
            dateValue || ""
        ).substring(0, 10);

        if (
            from &&
            normalizedDate < from
        ) {

            return false;

        }

        if (
            to &&
            normalizedDate > to
        ) {

            return false;

        }

        return true;

    }


    const manualTotalDebit = manualEntry.lines.reduce(
        (sum, line) =>
            sum + Number(line.debit || 0),
        0
    );


    const manualTotalCredit = manualEntry.lines.reduce(
        (sum, line) =>
            sum + Number(line.credit || 0),
        0
    );


    const manualBalanced = (
        manualTotalDebit > 0
        &&
        Math.abs(
            manualTotalDebit
            -
            manualTotalCredit
        ) < 0.01
    );


    const journalGroups = getJournalGroups(
        journal
    );


    const editingTotalDebit = editingEntry
        ? editingEntry.lines.reduce(
            (sum, line) =>
                sum + Number(
                    line.debit || 0
                ),
            0
        )
        : 0;


    const editingTotalCredit = editingEntry
        ? editingEntry.lines.reduce(
            (sum, line) =>
                sum + Number(
                    line.credit || 0
                ),
            0
        )
        : 0;


    const editingBalanced = (
        editingTotalDebit > 0
        &&
        Math.abs(
            editingTotalDebit
            -
            editingTotalCredit
        ) < 0.01
    );


    const selectedLedgerAccount = accounts.find(
        (account) =>
            account.id
            ===
            Number(ledgerAccountId)
    );


    const ledgerMovements = journal
        .filter(
            (movement) =>
                selectedLedgerAccount &&
                movement.account_code
                ===
                selectedLedgerAccount.code &&
                dateInsideRange(
                    movement.date,
                    ledgerFrom,
                    ledgerTo
                )
        )
        .sort(
            (a, b) => {

                const dateCompare = String(
                    a.date || ""
                ).localeCompare(
                    String(b.date || "")
                );

                if (dateCompare !== 0) {

                    return dateCompare;

                }

                return Number(a.id) - Number(b.id);

            }
        );


    let runningLedgerBalance = 0;

    const ledgerRows = ledgerMovements.map(
        (movement) => {

            const creditNature = selectedLedgerAccount &&
                [
                    "PASIVO",
                    "PATRIMONIO",
                    "INGRESO"
                ].includes(
                    selectedLedgerAccount.type
                );

            if (creditNature) {

                runningLedgerBalance +=
                    Number(movement.credit || 0)
                    -
                    Number(movement.debit || 0);

            } else {

                runningLedgerBalance +=
                    Number(movement.debit || 0)
                    -
                    Number(movement.credit || 0);

            }

            return {

                ...movement,
                runningBalance:
                    runningLedgerBalance

            };

        }
    );


    const totalLedgerDebit = ledgerMovements.reduce(
        (sum, movement) =>
            sum + Number(movement.debit || 0),
        0
    );

    const totalLedgerCredit = ledgerMovements.reduce(
        (sum, movement) =>
            sum + Number(movement.credit || 0),
        0
    );


    const incomeStatementAccounts = accounts
        .filter(
            (account) =>
                [
                    "INGRESO",
                    "COSTO",
                    "GASTO"
                ].includes(account.type)
        )
        .map((account) => {

            const movements = journal.filter(
                (movement) =>
                    movement.account_code
                    ===
                    account.code &&
                    dateInsideRange(
                        movement.date,
                        incomeFrom,
                        incomeTo
                    )
            );

            const debit = movements.reduce(
                (sum, movement) =>
                    sum + Number(
                        movement.debit || 0
                    ),
                0
            );

            const credit = movements.reduce(
                (sum, movement) =>
                    sum + Number(
                        movement.credit || 0
                    ),
                0
            );

            const amount = account.type === "INGRESO"
                ? credit - debit
                : debit - credit;

            return {

                ...account,
                amount

            };

        })
        .filter(
            (account) =>
                Math.abs(account.amount) > 0.001
        )
        .sort(
            (a, b) =>
                a.code.localeCompare(b.code)
        );


    const incomeAccounts = incomeStatementAccounts.filter(
        (account) => account.type === "INGRESO"
    );

    const costAccounts = incomeStatementAccounts.filter(
        (account) => account.type === "COSTO"
    );

    const expenseAccounts = incomeStatementAccounts.filter(
        (account) => account.type === "GASTO"
    );

    const totalIncome = incomeAccounts.reduce(
        (sum, account) =>
            sum + account.amount,
        0
    );

    const totalCosts = costAccounts.reduce(
        (sum, account) =>
            sum + account.amount,
        0
    );

    const grossResult =
        totalIncome -
        totalCosts;

    const totalExpenses = expenseAccounts.reduce(
        (sum, account) =>
            sum + account.amount,
        0
    );

    const finalResult =
        grossResult -
        totalExpenses;


    const assetAccounts = balance.filter(
        (account) =>
            account.type === "ACTIVO"
    );

    const liabilityAccounts = balance.filter(
        (account) =>
            account.type === "PASIVO"
    );

    const equityAccounts = balance.filter(
        (account) =>
            account.type === "PATRIMONIO"
    );

    const totalAssets = assetAccounts.reduce(
        (sum, account) =>
            sum + account.balance,
        0
    );

    const totalLiabilities = liabilityAccounts.reduce(
        (sum, account) =>
            sum + account.balance,
        0
    );

    const totalEquityAccounts = equityAccounts.reduce(
        (sum, account) =>
            sum + account.balance,
        0
    );

    const balanceIncome = balance
        .filter(
            (account) =>
                account.type === "INGRESO"
        )
        .reduce(
            (sum, account) =>
                sum + account.balance,
            0
        );

    const balanceCosts = balance
        .filter(
            (account) =>
                account.type === "COSTO"
        )
        .reduce(
            (sum, account) =>
                sum + account.balance,
            0
        );

    const balanceExpenses = balance
        .filter(
            (account) =>
                account.type === "GASTO"
        )
        .reduce(
            (sum, account) =>
                sum + account.balance,
            0
        );

    const balanceResult =
        balanceIncome -
        balanceCosts -
        balanceExpenses;

    const totalEquity =
        totalEquityAccounts +
        balanceResult;

    const totalLiabilitiesAndEquity =
        totalLiabilities +
        totalEquity;


    const cardStyle = {

        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        background: "white"

    };

    const sectionStyle = {

        marginTop: 40,
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        background: "white"

    };

    const tableStyle = {

        width: "100%",
        borderCollapse: "collapse"

    };

    const cellStyle = {

        padding: 9,
        borderBottom: "1px solid #ddd"

    };


    return (

        <div>

            <h2>💰 Contabilidad</h2>

            <p>
                Gestión contable de NATIVA.
            </p>


            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 20,
                    marginTop: 30
                }}
            >

                <div style={cardStyle}>

                    <h3>📖</h3>

                    <h3>Plan de Cuentas</h3>

                    <p>Administrar cuentas contables.</p>

                    <button onClick={openAccounts}>
                        Ver cuentas
                    </button>

                </div>


                <div style={cardStyle}>

                    <h3>📒</h3>

                    <h3>Libro Diario</h3>

                    <p>Todos los asientos contables.</p>

                    <button onClick={cargarLibro}>
                        Ver movimientos
                    </button>

                </div>


                <div style={cardStyle}>

                    <h3>📚</h3>

                    <h3>Libro Mayor</h3>

                    <p>Movimientos y saldo por cuenta.</p>

                    <button onClick={abrirMayor}>
                        Ver mayor
                    </button>

                </div>


                <div style={cardStyle}>

                    <h3>✍️</h3>

                    <h3>Asiento Manual</h3>

                    <p>Registrar otros movimientos.</p>

                    <button onClick={openManualEntry}>
                        Nuevo asiento
                    </button>

                </div>


                <div style={cardStyle}>

                    <h3>📊</h3>

                    <h3>Estado de Resultados</h3>

                    <p>Ingresos, costos y gastos.</p>

                    <button onClick={abrirEstadoResultados}>
                        Ver resultado
                    </button>

                </div>


                <div style={cardStyle}>

                    <h3>⚖️</h3>

                    <h3>Balance General</h3>

                    <p>Activo, Pasivo y Patrimonio.</p>

                    <button onClick={cargarBalance}>
                        Ver balance
                    </button>

                </div>

            </div>


            {

                showManualEntry && (

                    <div style={sectionStyle}>

                        <h2>✍️ Registrar Asiento Contable</h2>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(2, minmax(250px, 1fr))",
                                gap: 20,
                                maxWidth: 950
                            }}
                        >

                            <div>

                                <label>Fecha</label>

                                <input
                                    type="date"
                                    value={manualEntry.date}
                                    onChange={(event) =>
                                        setManualEntry({
                                            ...manualEntry,
                                            date: event.target.value
                                        })
                                    }
                                    style={{
                                        width: "100%",
                                        padding: 8,
                                        marginTop: 5,
                                        boxSizing: "border-box"
                                    }}
                                />

                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>

                                <label>Concepto</label>

                                <input
                                    placeholder="Ejemplo: Pago de luz"
                                    value={manualEntry.concept}
                                    onChange={(event) =>
                                        setManualEntry({
                                            ...manualEntry,
                                            concept: event.target.value
                                        })
                                    }
                                    style={{
                                        width: "100%",
                                        padding: 8,
                                        marginTop: 5,
                                        boxSizing: "border-box"
                                    }}
                                />

                            </div>

                        </div>

                        <div
                            style={{
                                marginTop: 22,
                                overflowX: "auto"
                            }}
                        >

                            <table
                                style={{
                                    ...tableStyle,
                                    minWidth: 760
                                }}
                            >

                                <thead>

                                    <tr>
                                        <th style={cellStyle}>Cuenta</th>
                                        <th style={cellStyle}>Debe</th>
                                        <th style={cellStyle}>Haber</th>
                                        <th style={cellStyle}></th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {manualEntry.lines.map(
                                        (line, index) => (

                                            <tr key={index}>

                                                <td style={cellStyle}>

                                                    <select
                                                        value={
                                                            line.account_code
                                                        }
                                                        onChange={(event) =>
                                                            updateManualLine(
                                                                index,
                                                                "account_code",
                                                                event.target.value
                                                            )
                                                        }
                                                        style={{
                                                            width: "100%",
                                                            padding: 7
                                                        }}
                                                    >

                                                        <option value="">
                                                            Seleccionar cuenta
                                                        </option>

                                                        {accounts.map(
                                                            (account) => (
                                                                <option
                                                                    key={
                                                                        account.id
                                                                    }
                                                                    value={
                                                                        account.code
                                                                    }
                                                                >
                                                                    {account.code}
                                                                    {" - "}
                                                                    {account.name}
                                                                </option>
                                                            )
                                                        )}

                                                    </select>

                                                </td>

                                                <td style={cellStyle}>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.debit}
                                                        onChange={(event) =>
                                                            updateManualLine(
                                                                index,
                                                                "debit",
                                                                event.target.value
                                                            )
                                                        }
                                                        style={{
                                                            width: "100%",
                                                            boxSizing:
                                                                "border-box",
                                                            padding: 7
                                                        }}
                                                    />

                                                </td>

                                                <td style={cellStyle}>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.credit}
                                                        onChange={(event) =>
                                                            updateManualLine(
                                                                index,
                                                                "credit",
                                                                event.target.value
                                                            )
                                                        }
                                                        style={{
                                                            width: "100%",
                                                            boxSizing:
                                                                "border-box",
                                                            padding: 7
                                                        }}
                                                    />

                                                </td>

                                                <td style={cellStyle}>

                                                    <button
                                                        onClick={() =>
                                                            removeManualLine(
                                                                index
                                                            )
                                                        }
                                                    >
                                                        ✕
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                                <tfoot>

                                    <tr>

                                        <td style={cellStyle}>
                                            <b>Totales</b>
                                        </td>

                                        <td
                                            style={{
                                                ...cellStyle,
                                                textAlign: "right"
                                            }}
                                        >
                                            <b>
                                                $
                                                {formatMoney(
                                                    manualTotalDebit
                                                )}
                                            </b>
                                        </td>

                                        <td
                                            style={{
                                                ...cellStyle,
                                                textAlign: "right"
                                            }}
                                        >
                                            <b>
                                                $
                                                {formatMoney(
                                                    manualTotalCredit
                                                )}
                                            </b>
                                        </td>

                                        <td style={cellStyle}>
                                            {manualBalanced
                                                ? "✅"
                                                : "⚠️"}
                                        </td>

                                    </tr>

                                </tfoot>

                            </table>

                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                marginTop: 15,
                                flexWrap: "wrap"
                            }}
                        >

                            <button onClick={addManualLine}>
                                ➕ Agregar renglón
                            </button>

                            <button
                                onClick={saveManualEntry}
                                disabled={!manualBalanced}
                            >
                                💾 Registrar asiento
                            </button>

                        </div>

                    </div>

                )

            }


            {

                showAccounts && (

                    <div style={sectionStyle}>

                        <h2>📖 Plan de Cuentas</h2>

                        <input
                            placeholder="Código"
                            value={form.code}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    code: event.target.value
                                })
                            }
                        />

                        <br /><br />

                        <input
                            placeholder="Nombre"
                            value={form.name}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    name: event.target.value
                                })
                            }
                        />

                        <br /><br />

                        <select
                            value={form.type}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    type: event.target.value
                                })
                            }
                        >

                            <option>ACTIVO</option>
                            <option>PASIVO</option>
                            <option>PATRIMONIO</option>
                            <option>INGRESO</option>
                            <option>COSTO</option>
                            <option>GASTO</option>

                        </select>

                        <br /><br />

                        <input
                            placeholder="Categoría"
                            value={form.category}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    category: event.target.value
                                })
                            }
                        />

                        <br /><br />

                        <button onClick={saveAccount}>
                            💾 Guardar cuenta
                        </button>

                        <hr style={{ margin: "30px 0" }} />

                        <table style={tableStyle}>

                            <thead>

                                <tr>

                                    <th style={cellStyle}>Código</th>
                                    <th style={cellStyle}>Nombre</th>
                                    <th style={cellStyle}>Tipo</th>
                                    <th style={cellStyle}>Categoría</th>
                                    <th style={cellStyle}></th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    accounts.map((account) => (

                                        <tr key={account.id}>

                                            <td style={cellStyle}>
                                                {account.code}
                                            </td>

                                            <td style={cellStyle}>
                                                {account.name}
                                            </td>

                                            <td style={cellStyle}>
                                                {account.type}
                                            </td>

                                            <td style={cellStyle}>
                                                {account.category}
                                            </td>

                                            <td style={cellStyle}>

                                                <button
                                                    onClick={() =>
                                                        deleteAccount(
                                                            account.id
                                                        )
                                                    }
                                                >
                                                    🗑️
                                                </button>

                                            </td>

                                        </tr>

                                    ))

                                }

                            </tbody>

                        </table>

                    </div>

                )

            }


            {

                showJournal && (

                    <div style={sectionStyle}>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 20,
                                flexWrap: "wrap",
                                marginBottom: 25
                            }}
                        >

                            <div>

                                <h2 style={{ marginBottom: 5 }}>
                                    📒 Libro Diario
                                </h2>

                                <p style={{ marginTop: 0 }}>
                                    {
                                        journalGroups.length
                                    }
                                    {" "}
                                    asientos registrados.
                                </p>

                            </div>

                            <button onClick={loadAccountingData}>
                                🔄 Actualizar
                            </button>

                        </div>


                        {

                            journalGroups.length === 0 ? (

                                <p>
                                    No hay asientos contables registrados.
                                </p>

                            ) : (

                                journalGroups.map((group) => (

                                    <div
                                        key={group.entry_group}
                                        style={{
                                            border: "1px solid #ddd",
                                            borderRadius: 10,
                                            marginBottom: 18,
                                            overflow: "hidden"
                                        }}
                                    >

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems: "center",
                                                gap: 15,
                                                flexWrap: "wrap",
                                                padding: 15,
                                                background: "#f7f7f7",
                                                borderBottom:
                                                    "1px solid #ddd"
                                            }}
                                        >

                                            <div>

                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: "#666",
                                                        marginBottom: 5
                                                    }}
                                                >
                                                    Asiento #
                                                    {group.first_id}
                                                    {" · "}
                                                    {group.date}
                                                    {" · "}
                                                    {originLabel(
                                                        group.origin
                                                    )}
                                                </div>

                                                <b>
                                                    {group.concept}
                                                </b>

                                            </div>


                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8
                                                }}
                                            >

                                                <button
                                                    onClick={() =>
                                                        startEditEntry(
                                                            group
                                                        )
                                                    }
                                                >
                                                    ✏️ Editar
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        deleteJournalGroup(
                                                            group
                                                        )
                                                    }
                                                >
                                                    🗑️ Eliminar
                                                </button>

                                            </div>

                                        </div>


                                        <div
                                            style={{
                                                overflowX: "auto"
                                            }}
                                        >

                                            <table style={tableStyle}>

                                                <thead>

                                                    <tr>

                                                        <th style={cellStyle}>
                                                            Código
                                                        </th>

                                                        <th style={cellStyle}>
                                                            Cuenta
                                                        </th>

                                                        <th
                                                            style={{
                                                                ...cellStyle,
                                                                textAlign:
                                                                    "right"
                                                            }}
                                                        >
                                                            Debe
                                                        </th>

                                                        <th
                                                            style={{
                                                                ...cellStyle,
                                                                textAlign:
                                                                    "right"
                                                            }}
                                                        >
                                                            Haber
                                                        </th>

                                                    </tr>

                                                </thead>

                                                <tbody>

                                                    {

                                                        group.lines.map(
                                                            (movement) => (

                                                                <tr
                                                                    key={
                                                                        movement.id
                                                                    }
                                                                >

                                                                    <td
                                                                        style={
                                                                            cellStyle
                                                                        }
                                                                    >
                                                                        {
                                                                            movement.account_code
                                                                        }
                                                                    </td>

                                                                    <td
                                                                        style={
                                                                            cellStyle
                                                                        }
                                                                    >
                                                                        {
                                                                            movement.account_name
                                                                        }
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            ...cellStyle,
                                                                            textAlign:
                                                                                "right"
                                                                        }}
                                                                    >
                                                                        {
                                                                            Number(
                                                                                movement.debit
                                                                                ||
                                                                                0
                                                                            ) > 0
                                                                                ? `$${formatMoney(
                                                                                    movement.debit
                                                                                )}`
                                                                                : ""
                                                                        }
                                                                    </td>

                                                                    <td
                                                                        style={{
                                                                            ...cellStyle,
                                                                            textAlign:
                                                                                "right"
                                                                        }}
                                                                    >
                                                                        {
                                                                            Number(
                                                                                movement.credit
                                                                                ||
                                                                                0
                                                                            ) > 0
                                                                                ? `$${formatMoney(
                                                                                    movement.credit
                                                                                )}`
                                                                                : ""
                                                                        }
                                                                    </td>

                                                                </tr>

                                                            )
                                                        )

                                                    }

                                                </tbody>

                                                <tfoot>

                                                    <tr>

                                                        <th
                                                            style={cellStyle}
                                                            colSpan="2"
                                                        >
                                                            Totales
                                                        </th>

                                                        <th
                                                            style={{
                                                                ...cellStyle,
                                                                textAlign:
                                                                    "right"
                                                            }}
                                                        >
                                                            $
                                                            {formatMoney(
                                                                group.total_debit
                                                            )}
                                                        </th>

                                                        <th
                                                            style={{
                                                                ...cellStyle,
                                                                textAlign:
                                                                    "right"
                                                            }}
                                                        >
                                                            $
                                                            {formatMoney(
                                                                group.total_credit
                                                            )}
                                                        </th>

                                                    </tr>

                                                </tfoot>

                                            </table>

                                        </div>

                                    </div>

                                ))

                            )

                        }


                        {

                            editingEntry && (

                                <div
                                    style={{
                                        marginTop: 35,
                                        border: "2px solid #999",
                                        borderRadius: 10,
                                        padding: 20
                                    }}
                                >

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent:
                                                "space-between",
                                            alignItems: "center",
                                            gap: 15,
                                            flexWrap: "wrap"
                                        }}
                                    >

                                        <div>

                                            <h2 style={{ marginBottom: 5 }}>
                                                ✏️ Editar asiento
                                            </h2>

                                            <p style={{ marginTop: 0 }}>
                                                Origen:
                                                {" "}
                                                <b>
                                                    {originLabel(
                                                        editingEntry.origin
                                                    )}
                                                </b>
                                            </p>

                                        </div>

                                        <button
                                            onClick={() =>
                                                setEditingEntry(null)
                                            }
                                        >
                                            ✖ Cerrar
                                        </button>

                                    </div>


                                    {

                                        editingEntry.origin !== "MANUAL" && (

                                            <div
                                                style={{
                                                    padding: 12,
                                                    marginBottom: 20,
                                                    borderRadius: 8,
                                                    background: "#fff4cc",
                                                    border:
                                                        "1px solid #e4c45a"
                                                }}
                                            >
                                                ⚠️ Este asiento es automático.
                                                Los cambios serán solamente
                                                contables y no modificarán la
                                                operación ni el stock.
                                            </div>

                                        )

                                    }


                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "minmax(170px, 220px) 1fr",
                                            gap: 15,
                                            marginBottom: 22
                                        }}
                                    >

                                        <div>

                                            <label>Fecha</label>

                                            <br />

                                            <input
                                                type="date"
                                                value={editingEntry.date}
                                                onChange={(event) =>
                                                    setEditingEntry({
                                                        ...editingEntry,
                                                        date:
                                                            event.target.value
                                                    })
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: 8,
                                                    marginTop: 5,
                                                    boxSizing:
                                                        "border-box"
                                                }}
                                            />

                                        </div>


                                        <div>

                                            <label>Concepto</label>

                                            <br />

                                            <input
                                                value={editingEntry.concept}
                                                onChange={(event) =>
                                                    setEditingEntry({
                                                        ...editingEntry,
                                                        concept:
                                                            event.target.value
                                                    })
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: 8,
                                                    marginTop: 5,
                                                    boxSizing:
                                                        "border-box"
                                                }}
                                            />

                                        </div>

                                    </div>


                                    <div style={{ overflowX: "auto" }}>

                                        <table
                                            style={{
                                                ...tableStyle,
                                                minWidth: 760
                                            }}
                                        >

                                            <thead>

                                                <tr>

                                                    <th style={cellStyle}>
                                                        Cuenta
                                                    </th>

                                                    <th
                                                        style={{
                                                            ...cellStyle,
                                                            width: 170
                                                        }}
                                                    >
                                                        Debe
                                                    </th>

                                                    <th
                                                        style={{
                                                            ...cellStyle,
                                                            width: 170
                                                        }}
                                                    >
                                                        Haber
                                                    </th>

                                                    <th
                                                        style={{
                                                            ...cellStyle,
                                                            width: 70
                                                        }}
                                                    >
                                                    </th>

                                                </tr>

                                            </thead>

                                            <tbody>

                                                {

                                                    editingEntry.lines.map(
                                                        (line, index) => (

                                                            <tr key={index}>

                                                                <td
                                                                    style={
                                                                        cellStyle
                                                                    }
                                                                >

                                                                    <select
                                                                        value={
                                                                            line.account_code
                                                                        }
                                                                        onChange={
                                                                            (event) =>
                                                                                updateEditingLine(
                                                                                    index,
                                                                                    "account_code",
                                                                                    event.target.value
                                                                                )
                                                                        }
                                                                        style={{
                                                                            width:
                                                                                "100%",
                                                                            padding:
                                                                                8
                                                                        }}
                                                                    >

                                                                        <option
                                                                            value=""
                                                                        >
                                                                            Seleccionar cuenta
                                                                        </option>

                                                                        {

                                                                            accounts.map(
                                                                                (
                                                                                    account
                                                                                ) => (

                                                                                    <option
                                                                                        key={
                                                                                            account.id
                                                                                        }
                                                                                        value={
                                                                                            account.code
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            account.code
                                                                                        }
                                                                                        {" - "}
                                                                                        {
                                                                                            account.name
                                                                                        }
                                                                                    </option>

                                                                                )
                                                                            )

                                                                        }

                                                                    </select>

                                                                </td>


                                                                <td
                                                                    style={
                                                                        cellStyle
                                                                    }
                                                                >

                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={
                                                                            line.debit
                                                                        }
                                                                        onChange={
                                                                            (event) =>
                                                                                updateEditingLine(
                                                                                    index,
                                                                                    "debit",
                                                                                    event.target.value
                                                                                )
                                                                        }
                                                                        style={{
                                                                            width:
                                                                                "100%",
                                                                            padding:
                                                                                8,
                                                                            boxSizing:
                                                                                "border-box"
                                                                        }}
                                                                    />

                                                                </td>


                                                                <td
                                                                    style={
                                                                        cellStyle
                                                                    }
                                                                >

                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={
                                                                            line.credit
                                                                        }
                                                                        onChange={
                                                                            (event) =>
                                                                                updateEditingLine(
                                                                                    index,
                                                                                    "credit",
                                                                                    event.target.value
                                                                                )
                                                                        }
                                                                        style={{
                                                                            width:
                                                                                "100%",
                                                                            padding:
                                                                                8,
                                                                            boxSizing:
                                                                                "border-box"
                                                                        }}
                                                                    />

                                                                </td>


                                                                <td
                                                                    style={
                                                                        cellStyle
                                                                    }
                                                                >

                                                                    <button
                                                                        onClick={() =>
                                                                            removeEditingLine(
                                                                                index
                                                                            )
                                                                        }
                                                                    >
                                                                        🗑️
                                                                    </button>

                                                                </td>

                                                            </tr>

                                                        )
                                                    )

                                                }

                                            </tbody>

                                            <tfoot>

                                                <tr>

                                                    <th style={cellStyle}>
                                                        Totales
                                                    </th>

                                                    <th
                                                        style={{
                                                            ...cellStyle,
                                                            textAlign:
                                                                "right"
                                                        }}
                                                    >
                                                        $
                                                        {formatMoney(
                                                            editingTotalDebit
                                                        )}
                                                    </th>

                                                    <th
                                                        style={{
                                                            ...cellStyle,
                                                            textAlign:
                                                                "right"
                                                        }}
                                                    >
                                                        $
                                                        {formatMoney(
                                                            editingTotalCredit
                                                        )}
                                                    </th>

                                                    <th style={cellStyle}>
                                                    </th>

                                                </tr>

                                            </tfoot>

                                        </table>

                                    </div>


                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent:
                                                "space-between",
                                            alignItems: "center",
                                            gap: 15,
                                            flexWrap: "wrap",
                                            marginTop: 20
                                        }}
                                    >

                                        <button onClick={addEditingLine}>
                                            ➕ Agregar renglón
                                        </button>


                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 15,
                                                flexWrap: "wrap"
                                            }}
                                        >

                                            <b
                                                style={{
                                                    color:
                                                        editingBalanced
                                                            ? "#18733d"
                                                            : "#b00020"
                                                }}
                                            >
                                                {
                                                    editingBalanced
                                                        ? "✅ Asiento balanceado"
                                                        : "⚠️ Debe y Haber no coinciden"
                                                }
                                            </b>

                                            <button
                                                onClick={saveEditedEntry}
                                            >
                                                💾 Guardar cambios
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )

                        }

                    </div>

                )

            }


            {

                showLedger && (

                    <div style={sectionStyle}>

                        <h2>📚 Libro Mayor</h2>

                        <div
                            style={{
                                display: "flex",
                                gap: 15,
                                flexWrap: "wrap",
                                alignItems: "end",
                                marginBottom: 25
                            }}
                        >

                            <div>

                                <label>Cuenta</label>

                                <br />

                                <select
                                    value={ledgerAccountId}
                                    onChange={(event) =>
                                        setLedgerAccountId(
                                            event.target.value
                                        )
                                    }
                                    style={{
                                        width: 320,
                                        padding: 8,
                                        marginTop: 5
                                    }}
                                >

                                    <option value="">
                                        Seleccionar cuenta
                                    </option>

                                    {

                                        accounts.map((account) => (

                                            <option
                                                key={account.id}
                                                value={account.id}
                                            >
                                                {account.code} - {account.name}
                                            </option>

                                        ))

                                    }

                                </select>

                            </div>


                            <div>

                                <label>Desde</label>

                                <br />

                                <input
                                    type="date"
                                    value={ledgerFrom}
                                    onChange={(event) =>
                                        setLedgerFrom(
                                            event.target.value
                                        )
                                    }
                                    style={{
                                        padding: 8,
                                        marginTop: 5
                                    }}
                                />

                            </div>


                            <div>

                                <label>Hasta</label>

                                <br />

                                <input
                                    type="date"
                                    value={ledgerTo}
                                    onChange={(event) =>
                                        setLedgerTo(
                                            event.target.value
                                        )
                                    }
                                    style={{
                                        padding: 8,
                                        marginTop: 5
                                    }}
                                />

                            </div>


                            <button onClick={loadAccountingData}>
                                🔄 Actualizar
                            </button>

                        </div>


                        {

                            !selectedLedgerAccount ? (

                                <p>
                                    Seleccioná una cuenta para ver su Mayor.
                                </p>

                            ) : (

                                <>

                                    <h3>
                                        {selectedLedgerAccount.code}
                                        {" - "}
                                        {selectedLedgerAccount.name}
                                    </h3>

                                    <p>
                                        Tipo: {selectedLedgerAccount.type}
                                    </p>

                                    <table style={tableStyle}>

                                        <thead>

                                            <tr>

                                                <th style={cellStyle}>Fecha</th>
                                                <th style={cellStyle}>Concepto</th>
                                                <th style={cellStyle}>Debe</th>
                                                <th style={cellStyle}>Haber</th>
                                                <th style={cellStyle}>Saldo</th>

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {

                                                ledgerRows.length === 0 ? (

                                                    <tr>

                                                        <td
                                                            style={cellStyle}
                                                            colSpan="5"
                                                        >
                                                            No hay movimientos
                                                            para el período.
                                                        </td>

                                                    </tr>

                                                ) : (

                                                    ledgerRows.map((movement) => (

                                                        <tr key={movement.id}>

                                                            <td style={cellStyle}>
                                                                {movement.date}
                                                            </td>

                                                            <td style={cellStyle}>
                                                                {movement.concept}
                                                            </td>

                                                            <td style={cellStyle}>
                                                                {
                                                                    Number(
                                                                        movement.debit || 0
                                                                    ) > 0
                                                                        ? `$${formatMoney(
                                                                            movement.debit
                                                                        )}`
                                                                        : ""
                                                                }
                                                            </td>

                                                            <td style={cellStyle}>
                                                                {
                                                                    Number(
                                                                        movement.credit || 0
                                                                    ) > 0
                                                                        ? `$${formatMoney(
                                                                            movement.credit
                                                                        )}`
                                                                        : ""
                                                                }
                                                            </td>

                                                            <td style={cellStyle}>
                                                                ${formatMoney(
                                                                    movement.runningBalance
                                                                )}
                                                            </td>

                                                        </tr>

                                                    ))

                                                )

                                            }

                                        </tbody>

                                        <tfoot>

                                            <tr>

                                                <th
                                                    style={cellStyle}
                                                    colSpan="2"
                                                >
                                                    Totales
                                                </th>

                                                <th style={cellStyle}>
                                                    ${formatMoney(
                                                        totalLedgerDebit
                                                    )}
                                                </th>

                                                <th style={cellStyle}>
                                                    ${formatMoney(
                                                        totalLedgerCredit
                                                    )}
                                                </th>

                                                <th style={cellStyle}>
                                                    ${formatMoney(
                                                        runningLedgerBalance
                                                    )}
                                                </th>

                                            </tr>

                                        </tfoot>

                                    </table>

                                </>

                            )

                        }

                    </div>

                )

            }


            {

                showIncomeStatement && (

                    <div style={sectionStyle}>

                        <h2>📊 Estado de Resultados</h2>

                        <div
                            style={{
                                display: "flex",
                                gap: 15,
                                flexWrap: "wrap",
                                alignItems: "end",
                                marginBottom: 25
                            }}
                        >

                            <div>

                                <label>Desde</label>

                                <br />

                                <input
                                    type="date"
                                    value={incomeFrom}
                                    onChange={(event) =>
                                        setIncomeFrom(
                                            event.target.value
                                        )
                                    }
                                    style={{
                                        padding: 8,
                                        marginTop: 5
                                    }}
                                />

                            </div>


                            <div>

                                <label>Hasta</label>

                                <br />

                                <input
                                    type="date"
                                    value={incomeTo}
                                    onChange={(event) =>
                                        setIncomeTo(
                                            event.target.value
                                        )
                                    }
                                    style={{
                                        padding: 8,
                                        marginTop: 5
                                    }}
                                />

                            </div>


                            <button onClick={loadAccountingData}>
                                🔄 Actualizar
                            </button>

                        </div>


                        <table
                            style={{
                                ...tableStyle,
                                maxWidth: 800
                            }}
                        >

                            <tbody>

                                <tr>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "left"
                                        }}
                                    >
                                        INGRESOS
                                    </th>

                                    <th style={cellStyle}></th>

                                </tr>

                                {

                                    incomeAccounts.map((account) => (

                                        <tr key={account.id}>

                                            <td style={cellStyle}>
                                                {account.code} - {account.name}
                                            </td>

                                            <td
                                                style={{
                                                    ...cellStyle,
                                                    textAlign: "right"
                                                }}
                                            >
                                                ${formatMoney(account.amount)}
                                            </td>

                                        </tr>

                                    ))

                                }

                                <tr>

                                    <th style={cellStyle}>
                                        Total Ingresos
                                    </th>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right"
                                        }}
                                    >
                                        ${formatMoney(totalIncome)}
                                    </th>

                                </tr>


                                <tr>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "left",
                                            paddingTop: 22
                                        }}
                                    >
                                        COSTOS
                                    </th>

                                    <th style={cellStyle}></th>

                                </tr>

                                {

                                    costAccounts.map((account) => (

                                        <tr key={account.id}>

                                            <td style={cellStyle}>
                                                {account.code} - {account.name}
                                            </td>

                                            <td
                                                style={{
                                                    ...cellStyle,
                                                    textAlign: "right"
                                                }}
                                            >
                                                ${formatMoney(account.amount)}
                                            </td>

                                        </tr>

                                    ))

                                }

                                <tr>

                                    <th style={cellStyle}>
                                        Total Costos
                                    </th>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right"
                                        }}
                                    >
                                        ${formatMoney(totalCosts)}
                                    </th>

                                </tr>


                                <tr>

                                    <th style={cellStyle}>
                                        RESULTADO BRUTO
                                    </th>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right"
                                        }}
                                    >
                                        ${formatMoney(grossResult)}
                                    </th>

                                </tr>


                                <tr>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "left",
                                            paddingTop: 22
                                        }}
                                    >
                                        GASTOS
                                    </th>

                                    <th style={cellStyle}></th>

                                </tr>

                                {

                                    expenseAccounts.map((account) => (

                                        <tr key={account.id}>

                                            <td style={cellStyle}>
                                                {account.code} - {account.name}
                                            </td>

                                            <td
                                                style={{
                                                    ...cellStyle,
                                                    textAlign: "right"
                                                }}
                                            >
                                                ${formatMoney(account.amount)}
                                            </td>

                                        </tr>

                                    ))

                                }

                                <tr>

                                    <th style={cellStyle}>
                                        Total Gastos
                                    </th>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right"
                                        }}
                                    >
                                        ${formatMoney(totalExpenses)}
                                    </th>

                                </tr>


                                <tr>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            fontSize: 18,
                                            borderTop: "2px solid #888"
                                        }}
                                    >
                                        RESULTADO DEL PERÍODO
                                    </th>

                                    <th
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right",
                                            fontSize: 18,
                                            borderTop: "2px solid #888"
                                        }}
                                    >
                                        ${formatMoney(finalResult)}
                                    </th>

                                </tr>

                            </tbody>

                        </table>

                    </div>

                )

            }


            {

                showBalance && (

                    <div style={sectionStyle}>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 20,
                                marginBottom: 20
                            }}
                        >

                            <div>

                                <h2>⚖️ Balance General</h2>

                                <p>
                                    Activo a la izquierda y Pasivo más
                                    Patrimonio Neto a la derecha.
                                </p>

                            </div>

                            <button onClick={cargarBalance}>
                                🔄 Actualizar balance
                            </button>

                        </div>


                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(2, minmax(320px, 1fr))",
                                gap: 25,
                                alignItems: "start"
                            }}
                        >

                            <BalanceBlock
                                title="ACTIVO"
                                accounts={assetAccounts}
                                totalLabel="TOTAL ACTIVO"
                                total={totalAssets}
                                formatMoney={formatMoney}
                            />


                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 20
                                }}
                            >

                                <BalanceBlock
                                    title="PASIVO"
                                    accounts={liabilityAccounts}
                                    totalLabel="TOTAL PASIVO"
                                    total={totalLiabilities}
                                    formatMoney={formatMoney}
                                />


                                <div
                                    style={{
                                        border: "1px solid #ddd",
                                        borderRadius: 10,
                                        overflow: "hidden"
                                    }}
                                >

                                    <div
                                        style={{
                                            padding: 15,
                                            background: "#f4f4f4",
                                            borderBottom:
                                                "1px solid #ddd"
                                        }}
                                    >

                                        <h3 style={{ margin: 0 }}>
                                            PATRIMONIO NETO
                                        </h3>

                                    </div>

                                    <table style={tableStyle}>

                                        <tbody>

                                            {

                                                equityAccounts.map(
                                                    (account) => (

                                                        <tr key={account.id}>

                                                            <td style={cellStyle}>
                                                                {account.code}
                                                                {" - "}
                                                                {account.name}
                                                            </td>

                                                            <td
                                                                style={{
                                                                    ...cellStyle,
                                                                    textAlign:
                                                                        "right"
                                                                }}
                                                            >
                                                                $
                                                                {formatMoney(
                                                                    account.balance
                                                                )}
                                                            </td>

                                                        </tr>

                                                    )
                                                )

                                            }

                                            <tr>

                                                <td style={cellStyle}>
                                                    Resultado del ejercicio
                                                </td>

                                                <td
                                                    style={{
                                                        ...cellStyle,
                                                        textAlign: "right"
                                                    }}
                                                >
                                                    ${formatMoney(
                                                        balanceResult
                                                    )}
                                                </td>

                                            </tr>

                                        </tbody>

                                        <tfoot>

                                            <tr>

                                                <th style={cellStyle}>
                                                    TOTAL PATRIMONIO NETO
                                                </th>

                                                <th
                                                    style={{
                                                        ...cellStyle,
                                                        textAlign: "right"
                                                    }}
                                                >
                                                    ${formatMoney(
                                                        totalEquity
                                                    )}
                                                </th>

                                            </tr>

                                        </tfoot>

                                    </table>

                                </div>


                                <div
                                    style={{
                                        border: "2px solid #bbb",
                                        borderRadius: 10,
                                        padding: 15,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 20
                                    }}
                                >

                                    <b>
                                        TOTAL PASIVO + PATRIMONIO NETO
                                    </b>

                                    <b>
                                        ${formatMoney(
                                            totalLiabilitiesAndEquity
                                        )}
                                    </b>

                                </div>

                            </div>

                        </div>


                        <div
                            style={{
                                marginTop: 25,
                                padding: 15,
                                borderRadius: 8,
                                background: "#f7f7f7"
                            }}
                        >

                            {

                                Math.abs(
                                    totalAssets
                                    -
                                    totalLiabilitiesAndEquity
                                ) < 0.01 ? (

                                    <b>
                                        ✅ El Balance General está equilibrado.
                                    </b>

                                ) : (

                                    <b>
                                        ⚠️ Existe una diferencia de $
                                        {formatMoney(
                                            totalAssets
                                            -
                                            totalLiabilitiesAndEquity
                                        )}.
                                    </b>

                                )

                            }

                        </div>

                    </div>

                )

            }

        </div>

    );

}


function BalanceBlock({
    title,
    accounts,
    totalLabel,
    total,
    formatMoney
}) {

    const cellStyle = {

        padding: 9,
        borderBottom: "1px solid #ddd"

    };

    return (

        <div
            style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                overflow: "hidden"
            }}
        >

            <div
                style={{
                    padding: 15,
                    background: "#f4f4f4",
                    borderBottom: "1px solid #ddd"
                }}
            >

                <h3 style={{ margin: 0 }}>
                    {title}
                </h3>

            </div>

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
            >

                <tbody>

                    {

                        accounts.length === 0 ? (

                            <tr>

                                <td
                                    style={cellStyle}
                                    colSpan="2"
                                >
                                    Sin saldos.
                                </td>

                            </tr>

                        ) : (

                            accounts.map((account) => (

                                <tr key={account.id}>

                                    <td style={cellStyle}>
                                        {account.code} - {account.name}
                                    </td>

                                    <td
                                        style={{
                                            ...cellStyle,
                                            textAlign: "right"
                                        }}
                                    >
                                        ${formatMoney(account.balance)}
                                    </td>

                                </tr>

                            ))

                        )

                    }

                </tbody>

                <tfoot>

                    <tr>

                        <th style={cellStyle}>
                            {totalLabel}
                        </th>

                        <th
                            style={{
                                ...cellStyle,
                                textAlign: "right"
                            }}
                        >
                            ${formatMoney(total)}
                        </th>

                    </tr>

                </tfoot>

            </table>

        </div>

    );

}
