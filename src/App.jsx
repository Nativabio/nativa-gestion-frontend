import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("https://nativa-gestion.onrender.com/dashboard")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <div style={{ padding: 30, fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh" }}>
      <h1>📊 Nativa Gestión</h1>

      {!data ? (
        <p>Cargando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          <Card title="Sales" value={data.sales} color="#4f46e5" />
          <Card title="Production" value={data.production} color="#16a34a" />
          <Card title="Profit" value={data.profit} color="#f59e0b" />
          <Card title="Stock Alerts" value={data.stock_alerts} color="#ef4444" />
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{ background: "white", padding: 20, borderRadius: 10, borderLeft: `6px solid ${color}` }}>
      <h3>{title}</h3>
      <p style={{ fontSize: 28, fontWeight: "bold" }}>{value}</p>
    </div>
  );
}

export default App;