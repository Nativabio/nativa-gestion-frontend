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
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Nativa Gestión</h1>

      {!data ? (
        <p>Cargando datos...</p>
      ) : (
        <div>
          <p>Sales: {data.sales}</p>
          <p>Production: {data.production}</p>
          <p>Profit: {data.profit}</p>
          <p>Stock Alerts: {data.stock_alerts}</p>
        </div>
      )}
    </div>
  );
}

export default App;
