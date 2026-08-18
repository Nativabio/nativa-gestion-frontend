import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

const TYPES = [
    { value: "Nota", label: "📝 Nota" },
    { value: "Idea", label: "💡 Idea" },
    { value: "Encargo", label: "📦 Encargo" }
];

export default function Notes() {
    const [notes, setNotes] = useState([]);
    const [kind, setKind] = useState("Nota");
    const [content, setContent] = useState("");
    const [filter, setFilter] = useState("Todos");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editKind, setEditKind] = useState("Nota");
    const [editContent, setEditContent] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadNotes();
    }, []);

    async function loadNotes() {
        try {
            const response = await fetch(`${API}/notes`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "No se pudieron cargar las notas");
            }

            setNotes(Array.isArray(data) ? data : []);
        } catch (error) {
            alert(`❌ ${error.message}`);
        }
    }

    async function createNote() {
        const clean = content.trim();

        if (!clean) {
            alert("Escribí algo antes de guardar");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(`${API}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    kind,
                    content: clean
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "No se pudo guardar la nota");
            }

            setContent("");
            setKind("Nota");
            await loadNotes();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    function startEdit(note) {
        setEditingId(note.id);
        setEditKind(note.kind || "Nota");
        setEditContent(note.content || "");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditKind("Nota");
        setEditContent("");
    }

    async function saveEdit(noteId) {
        const clean = editContent.trim();

        if (!clean) {
            alert("La nota no puede quedar vacía");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(`${API}/notes/${noteId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    kind: editKind,
                    content: clean
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "No se pudo modificar la nota");
            }

            cancelEdit();
            await loadNotes();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function deleteNote(note) {
        const confirmed = window.confirm(
            "¿Eliminar esta nota definitivamente?"
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${API}/notes/${note.id}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "No se pudo eliminar la nota");
            }

            if (editingId === note.id) {
                cancelEdit();
            }

            await loadNotes();
        } catch (error) {
            alert(`❌ ${error.message}`);
        }
    }

    const visibleNotes = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return notes.filter((note) => {
            const matchesType =
                filter === "Todos"
                || String(note.kind || "Nota") === filter;

            const matchesSearch =
                !normalizedSearch
                || String(note.content || "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            return matchesType && matchesSearch;
        });
    }, [notes, filter, search]);

    return (
        <div>
            <div style={styles.header}>
                <div>
                    <h2 style={{ marginBottom: 5 }}>
                        📝 Encargos / Ideas
                    </h2>
                    <p style={styles.subtitle}>
                        Un bloc simple para anotar cosas que no querés olvidar.
                    </p>
                </div>
                <button onClick={loadNotes}>
                    🔄 Actualizar
                </button>
            </div>

            <div style={styles.editorCard}>
                <div style={styles.editorTop}>
                    <select
                        value={kind}
                        onChange={(event) => setKind(event.target.value)}
                        style={styles.select}
                    >
                        {TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Escribí acá un encargo, una idea o cualquier cosa que quieras recordar..."
                    rows={7}
                    style={styles.textarea}
                />

                <div style={styles.editorActions}>
                    <span style={styles.help}>
                        Se guarda con fecha automáticamente.
                    </span>
                    <button
                        onClick={createNote}
                        disabled={saving}
                        style={styles.primaryButton}
                    >
                        {saving ? "Guardando..." : "💾 Guardar nota"}
                    </button>
                </div>
            </div>

            <div style={styles.filters}>
                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    style={styles.select}
                >
                    <option value="Todos">Todas</option>
                    <option value="Nota">Notas</option>
                    <option value="Idea">Ideas</option>
                    <option value="Encargo">Encargos</option>
                </select>

                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar en las notas..."
                    style={styles.search}
                />

                <span style={styles.counter}>
                    {visibleNotes.length} nota{visibleNotes.length === 1 ? "" : "s"}
                </span>
            </div>

            <div style={styles.notesGrid}>
                {visibleNotes.length === 0 ? (
                    <div style={styles.empty}>
                        No hay notas para mostrar.
                    </div>
                ) : (
                    visibleNotes.map((note) => (
                        <div key={note.id} style={styles.noteCard}>
                            {editingId === note.id ? (
                                <>
                                    <select
                                        value={editKind}
                                        onChange={(event) =>
                                            setEditKind(event.target.value)
                                        }
                                        style={styles.select}
                                    >
                                        {TYPES.map((type) => (
                                            <option
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>

                                    <textarea
                                        value={editContent}
                                        onChange={(event) =>
                                            setEditContent(event.target.value)
                                        }
                                        rows={6}
                                        style={{
                                            ...styles.textarea,
                                            marginTop: 12
                                        }}
                                    />

                                    <div style={styles.cardActions}>
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => saveEdit(note.id)}
                                            disabled={saving}
                                            style={styles.primaryButton}
                                        >
                                            Guardar cambios
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={styles.noteHeader}>
                                        <strong>
                                            {note.kind === "Idea"
                                                ? "💡 Idea"
                                                : note.kind === "Encargo"
                                                    ? "📦 Encargo"
                                                    : "📝 Nota"}
                                        </strong>

                                        <span style={styles.date}>
                                            {formatDate(note.created_at)}
                                        </span>
                                    </div>

                                    <div style={styles.noteText}>
                                        {note.content}
                                    </div>

                                    <div style={styles.cardActions}>
                                        <button
                                            onClick={() => startEdit(note)}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => deleteNote(note)}
                                            style={styles.deleteButton}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function formatDate(value) {
    const text = String(value || "").trim();

    if (!text) return "";

    const datePart = text.substring(0, 10);
    const timePart = text.substring(11, 16);
    const parts = datePart.split("-");

    if (parts.length !== 3) return text;

    return `${parts[2]}/${parts[1]}/${parts[0]}${timePart ? ` ${timePart}` : ""}`;
}

const styles = {
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 18
    },
    subtitle: {
        marginTop: 0,
        color: "#666"
    },
    editorCard: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 18,
        marginBottom: 18
    },
    editorTop: {
        marginBottom: 12
    },
    select: {
        padding: "8px 10px",
        border: "1px solid #bbb",
        borderRadius: 6,
        background: "#fff"
    },
    textarea: {
        width: "100%",
        boxSizing: "border-box",
        resize: "vertical",
        padding: 12,
        border: "1px solid #bbb",
        borderRadius: 8,
        fontFamily: "inherit",
        fontSize: 15,
        lineHeight: 1.5
    },
    editorActions: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15,
        flexWrap: "wrap",
        marginTop: 12
    },
    help: {
        fontSize: 13,
        color: "#777"
    },
    primaryButton: {
        fontWeight: 600
    },
    filters: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 15
    },
    search: {
        padding: "8px 10px",
        border: "1px solid #bbb",
        borderRadius: 6,
        minWidth: 260,
        flex: "1 1 260px"
    },
    counter: {
        color: "#666",
        fontSize: 14
    },
    notesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
        gap: 14
    },
    noteCard: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 16,
        minHeight: 150,
        display: "flex",
        flexDirection: "column"
    },
    noteHeader: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        marginBottom: 12
    },
    date: {
        color: "#777",
        fontSize: 12
    },
    noteText: {
        whiteSpace: "pre-wrap",
        lineHeight: 1.5,
        flex: 1,
        marginBottom: 16
    },
    cardActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 12
    },
    deleteButton: {
        color: "#a00000"
    },
    empty: {
        background: "#fff",
        border: "1px dashed #bbb",
        borderRadius: 10,
        padding: 28,
        textAlign: "center",
        color: "#777"
    }
};
