import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("https://nativa-gestion.onrender.com/dashboard")
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Nativa Gestión</h1>

      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Cargando datos...</p>
      )}
    </div>
  );
}

export default App;
