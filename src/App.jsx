import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("https://nativa-gestion.onrender.com/dashboard")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📊 Nativa Gestión</h1>

      {!data ? (
        <p>Cargando datos...</p>
      ) : (
        <div style={styles.grid}>
          <Card title="Sales" value={data.sales} color="#4f46e5" />
          Card title="Production" value={data.production} color="#16a34a" />
          Card title="Profit" value={data.profit} color="#f59e0b" />
          Card title="Stock Alerts" value={data.stock_alerts} color="#ef4444" />
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
      <h3>{title}</h3>
      <p style={styles.value}>{value}</p>
    </div>
  );
}

const styles = {
  container: {
    padding: 30,
    fontFamily: "Arial",
    background: "#f4f4f4",
    minHeight: "100vh",
  },
  title: {
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  value: {
    fontSize: 28,
    fontWeight: "bold",
  },
};

export default App;