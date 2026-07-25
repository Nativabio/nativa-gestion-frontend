import { useEffect, useState } from "react";
import RawMaterials from "./components/RawMaterials";
import Formulas from "./components/Formulas";
import Purchases from "./components/Purchases";
import Products from "./components/Products";
import Lots from "./components/Lots";
import Suppliers from "./components/Suppliers";
import Sales from "./components/Sales";
import Accounting from "./components/Accounting";
import {
  getStoredUsername,
  loginRequest,
  logoutRequest,
  verifySession
} from "./api.js";

function App() {

  const [tab, setTab] = useState("dashboard");

  const [checkingSession, setCheckingSession] = useState(true);

  const [authenticated, setAuthenticated] = useState(false);

  const [username, setUsername] = useState(
    getStoredUsername()
  );


  useEffect(() => {

    checkSession();

    function sessionExpired() {

      setAuthenticated(false);

      setUsername("");

    }

    window.addEventListener(
      "nativa-auth-expired",
      sessionExpired
    );

    return () => {

      window.removeEventListener(
        "nativa-auth-expired",
        sessionExpired
      );

    };

  }, []);


  async function checkSession() {

    try {

      const session = await verifySession();

      if (session) {

        setUsername(
          session.username || ""
        );

        setAuthenticated(true);

      } else {

        setAuthenticated(false);

      }

    } catch {

      setAuthenticated(false);

    } finally {

      setCheckingSession(false);

    }

  }


  async function handleLogin(
    loginUsername,
    password
  ) {

    const result = await loginRequest(
      loginUsername,
      password
    );

    setUsername(
      result.username || loginUsername
    );

    setAuthenticated(true);

    setTab("dashboard");

  }


  async function handleLogout() {

    await logoutRequest();

    setAuthenticated(false);

    setUsername("");

  }


  if (checkingSession) {

    return (

      <div style={styles.loginPage}>

        <div style={styles.loginCard}>

          <div style={styles.loginLogo}>
            🌿
          </div>

          <h1 style={styles.loginTitle}>
            Nativa Gestión
          </h1>

          <p>
            Verificando acceso...
          </p>

        </div>

      </div>

    );

  }


  if (!authenticated) {

    return (
      <LoginScreen
        onLogin={handleLogin}
      />
    );

  }


  return (

    <div style={styles.container}>

      <div style={styles.appHeader}>

        <h1 style={styles.appTitle}>
          🌿 NATIVA ERP v1.0
        </h1>

        <div style={styles.sessionBox}>

          <span>
            👤 {username}
          </span>

          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Cerrar sesión
          </button>

        </div>

      </div>

      <div style={styles.menu}>

        <button onClick={() => setTab("dashboard")}>📊 Dashboard</button>

        <button onClick={() => setTab("products")}>📦 Productos</button>

        <button onClick={() => setTab("raw")}>🌿 Materias Primas</button>

        <button onClick={() => setTab("formulas")}>🧪 Fórmulas</button>

        <button onClick={() => setTab("lots")}>🏭 Lotes</button>

        <button onClick={() => setTab("purchases")}>🛒 Compras</button>

        <button onClick={() => setTab("suppliers")}>👥 Proveedores</button>

        <button onClick={() => setTab("sales")}>🧾 Ventas</button>

        <button onClick={() => setTab("accounting")}>💰 Contabilidad</button>

        <button onClick={() => setTab("settings")}>⚙️ Configuración</button>

      </div>

      <div style={styles.content}>

        {tab === "dashboard" && <Dashboard />}

        {tab === "products" && <Products />}

        {tab === "raw" && <RawMaterials />}

        {tab === "formulas" && <Formulas />}

        {tab === "lots" && <Lots />}

        {tab === "purchases" && <Purchases />}

        {tab === "suppliers" && <Suppliers />}

        {tab === "sales" && <Sales />}

        {tab === "accounting" && <Accounting />}

        {tab === "settings" && <Settings />}


      </div>

    </div>

  );

}


function LoginScreen({
  onLogin
}) {

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");


  async function submit(
    event
  ) {

    event.preventDefault();

    setError("");

    setLoading(true);

    try {

      await onLogin(
        username.trim(),
        password
      );

    } catch (err) {

      setError(
        err.message
        ||
        "No se pudo iniciar sesión"
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <div style={styles.loginPage}>

      <form
        onSubmit={submit}
        style={styles.loginCard}
      >

        <div style={styles.loginLogo}>
          🌿
        </div>

        <h1 style={styles.loginTitle}>
          Nativa Gestión
        </h1>

        <p style={styles.loginSubtitle}>
          Ingresá para administrar tu negocio.
        </p>

        <label style={styles.loginLabel}>
          Usuario
        </label>

        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          style={styles.loginInput}
          disabled={loading}
          required
          autoFocus
        />

        <label style={styles.loginLabel}>
          Contraseña
        </label>

        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          style={styles.loginInput}
          disabled={loading}
          required
        />

        {

          error && (

            <div style={styles.loginError}>
              {error}
            </div>

          )

        }

        <button
          type="submit"
          style={styles.loginButton}
          disabled={loading}
        >

          {
            loading
              ?
              "Ingresando..."
              :
              "Ingresar"
          }

        </button>

        <p style={styles.loginHelp}>
          La primera apertura puede tardar unos segundos
          mientras se activa el servidor.
        </p>

      </form>

    </div>

  );

}



function Dashboard() {

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    loadDashboard();

  }, []);


  async function loadDashboard() {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/dashboard"
      );

      const result = await response.json();

      if (!response.ok || result.error) {

        throw new Error(
          result.error || "No se pudo cargar el Dashboard"
        );

      }

      setData(result);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  }


  function money(value) {

    return Number(value || 0).toLocaleString(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  if (loading) {

    return (
      <>
        <h2>📊 Dashboard</h2>
        <p>Cargando información...</p>
      </>
    );

  }


  if (error) {

    return (
      <>
        <h2>📊 Dashboard</h2>

        <p style={{ color: "#b00020" }}>
          {error}
        </p>

        <button onClick={loadDashboard}>
          🔄 Reintentar
        </button>
      </>
    );

  }


  const dashboard = data || {};

  const recentSales = dashboard.recent_sales || [];
  const recentPurchases = dashboard.recent_purchases || [];
  const recentLots = dashboard.recent_lots || [];

  const rawAlerts = dashboard.raw_material_alerts || [];
  const productAlerts = dashboard.product_alerts || [];


  return (

    <div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap"
        }}
      >

        <div>

          <h2 style={{ marginBottom: 5 }}>
            📊 Dashboard
          </h2>

          <p style={{ marginTop: 0 }}>
            Resumen de NATIVA — {dashboard.period}
          </p>

        </div>

        <button onClick={loadDashboard}>
          🔄 Actualizar
        </button>

      </div>


      <div style={styles.dashboardCards}>

        <MetricCard
          icon="💰"
          title="Ventas del mes"
          value={money(dashboard.sales_month)}
          detail={`${dashboard.sales_count_month || 0} ventas`}
        />

        <MetricCard
          icon="📈"
          title="Resultado del mes"
          value={money(dashboard.result_month)}
          detail="Ingresos menos costos y gastos"
        />

        <MetricCard
          icon="🛒"
          title="Compras del mes"
          value={money(dashboard.purchases_month)}
          detail={`${dashboard.purchases_count_month || 0} compras`}
        />

        <MetricCard
          icon="🏭"
          title="Producción del mes"
          value={`${dashboard.production_units_month || 0} unidades`}
          detail={`${dashboard.production_lots_month || 0} lotes`}
        />

        <MetricCard
          icon="🧾"
          title="Ventas totales"
          value={money(dashboard.sales_total)}
          detail="Acumulado histórico"
        />

        <MetricCard
          icon="⚠️"
          title="Alertas de stock"
          value={dashboard.stock_alerts_total || 0}
          detail="Materias primas y productos"
        />

      </div>


      <div style={styles.dashboardSections}>

        <DashboardSection title="🧾 Últimas ventas">

          {

            recentSales.length === 0 ? (

              <p>No hay ventas registradas.</p>

            ) : (

              <table style={styles.dashboardTable}>

                <thead>

                  <tr>
                    <th style={styles.dashboardTh}>Fecha</th>
                    <th style={styles.dashboardTh}>Venta</th>
                    <th style={styles.dashboardTh}>Cliente</th>
                    <th style={styles.dashboardTh}>Medio</th>
                    <th style={styles.dashboardThRight}>Total</th>
                  </tr>

                </thead>

                <tbody>

                  {

                    recentSales.map((sale) => (

                      <tr key={sale.id}>

                        <td style={styles.dashboardTd}>
                          {sale.date}
                        </td>

                        <td style={styles.dashboardTd}>
                          {sale.number}
                        </td>

                        <td style={styles.dashboardTd}>
                          {sale.client || "Consumidor final"}
                        </td>

                        <td style={styles.dashboardTd}>
                          {sale.payment_method || "Caja"}
                        </td>

                        <td style={styles.dashboardTdRight}>
                          {money(sale.total)}
                        </td>

                      </tr>

                    ))

                  }

                </tbody>

              </table>

            )

          }

        </DashboardSection>


        <DashboardSection title="🏭 Últimas producciones">

          {

            recentLots.length === 0 ? (

              <p>No hay lotes registrados.</p>

            ) : (

              <table style={styles.dashboardTable}>

                <thead>

                  <tr>
                    <th style={styles.dashboardTh}>Fecha</th>
                    <th style={styles.dashboardTh}>Lote</th>
                    <th style={styles.dashboardTh}>Producto</th>
                    <th style={styles.dashboardThRight}>Unidades</th>
                    <th style={styles.dashboardThRight}>Costo total</th>
                  </tr>

                </thead>

                <tbody>

                  {

                    recentLots.map((lot) => (

                      <tr key={lot.id}>

                        <td style={styles.dashboardTd}>
                          {lot.production_date}
                        </td>

                        <td style={styles.dashboardTd}>
                          {lot.lot_number}
                        </td>

                        <td style={styles.dashboardTd}>
                          {lot.product_name || "Sin producto"}
                        </td>

                        <td style={styles.dashboardTdRight}>
                          {lot.units_produced}
                        </td>

                        <td style={styles.dashboardTdRight}>
                          {money(lot.total_cost)}
                        </td>

                      </tr>

                    ))

                  }

                </tbody>

              </table>

            )

          }

        </DashboardSection>


        <DashboardSection title="🛒 Últimas compras">

          {

            recentPurchases.length === 0 ? (

              <p>No hay compras registradas.</p>

            ) : (

              <table style={styles.dashboardTable}>

                <thead>

                  <tr>
                    <th style={styles.dashboardTh}>Fecha</th>
                    <th style={styles.dashboardTh}>Compra</th>
                    <th style={styles.dashboardTh}>Proveedor</th>
                    <th style={styles.dashboardTh}>Medio</th>
                    <th style={styles.dashboardThRight}>Total</th>
                  </tr>

                </thead>

                <tbody>

                  {

                    recentPurchases.map((purchase) => (

                      <tr key={purchase.id}>

                        <td style={styles.dashboardTd}>
                          {purchase.date}
                        </td>

                        <td style={styles.dashboardTd}>
                          {purchase.number}
                        </td>

                        <td style={styles.dashboardTd}>
                          {purchase.supplier}
                        </td>

                        <td style={styles.dashboardTd}>
                          {purchase.payment_method || "Caja"}
                        </td>

                        <td style={styles.dashboardTdRight}>
                          {money(purchase.total)}
                        </td>

                      </tr>

                    ))

                  }

                </tbody>

              </table>

            )

          }

        </DashboardSection>


        <DashboardSection title="⚠️ Alertas de stock">

          <div style={styles.alertColumns}>

            <div>

              <h4>Materias primas</h4>

              {

                rawAlerts.length === 0 ? (

                  <p>Sin alertas de materias primas.</p>

                ) : (

                  rawAlerts.map((material) => (

                    <div
                      key={material.id}
                      style={styles.alertItem}
                    >

                      <b>{material.name}</b>

                      <span>
                        Stock: {material.stock} {material.unit || ""}
                        {" · "}
                        Mínimo: {material.minimum_stock}
                      </span>

                    </div>

                  ))

                )

              }

            </div>


            <div>

              <h4>Productos terminados</h4>

              {

                productAlerts.length === 0 ? (

                  <p>Sin alertas de productos.</p>

                ) : (

                  productAlerts.map((product) => (

                    <div
                      key={product.id}
                      style={styles.alertItem}
                    >

                      <b>{product.name}</b>

                      <span>
                        Stock disponible: {product.stock}
                      </span>

                    </div>

                  ))

                )

              }

            </div>

          </div>

        </DashboardSection>

      </div>

    </div>

  );

}



function MetricCard({
  icon,
  title,
  value,
  detail
}) {

  return (

    <div style={styles.metricCard}>

      <div style={styles.metricIcon}>
        {icon}
      </div>

      <div>

        <div style={styles.metricTitle}>
          {title}
        </div>

        <div style={styles.metricValue}>
          {value}
        </div>

        <div style={styles.metricDetail}>
          {detail}
        </div>

      </div>

    </div>

  );

}



function DashboardSection({
  title,
  children
}) {

  return (

    <div style={styles.dashboardSection}>

      <h3 style={{ marginTop: 0 }}>
        {title}
      </h3>

      <div style={{ overflowX: "auto" }}>
        {children}
      </div>

    </div>

  );

}



function Settings() {

  const [laborCost, setLaborCost] = useState(10000);

  return (

    <>

      <h2>⚙️ Configuración</h2>

      <div style={{ marginTop: 20 }}>

        <label>

          <b>Costo hora de producción ($)</b>

        </label>

        <br />

        <input
          type="number"
          value={laborCost}
          onChange={(e) => setLaborCost(e.target.value)}
          style={{
            marginTop: 10,
            padding: 8,
            width: 200
          }}
        />

        <br /><br />

        <button>
          💾 Guardar
        </button>

      </div>

    </>

  );

}



const styles = {

  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #f4efe4 0%, #e4eadc 100%)",
    fontFamily: "Arial",
  },

  loginCard: {
    width: "100%",
    maxWidth: 390,
    padding: 34,
    boxSizing: "border-box",
    borderRadius: 18,
    background: "white",
    boxShadow:
      "0 18px 45px rgba(76, 86, 62, 0.18)",
    border: "1px solid #d9dfd1",
    textAlign: "left",
  },

  loginLogo: {
    textAlign: "center",
    fontSize: 46,
    marginBottom: 8,
  },

  loginTitle: {
    margin: "0 0 8px",
    textAlign: "center",
    fontSize: 30,
    color: "#4e5b3f",
  },

  loginSubtitle: {
    margin: "0 0 25px",
    textAlign: "center",
    color: "#706b63",
    fontSize: 15,
  },

  loginLabel: {
    display: "block",
    marginBottom: 6,
    marginTop: 15,
    fontWeight: "bold",
    color: "#504b45",
    fontSize: 14,
  },

  loginInput: {
    width: "100%",
    padding: "11px 12px",
    boxSizing: "border-box",
    border: "1px solid #cfcac0",
    borderRadius: 8,
    fontSize: 16,
    background: "white",
    color: "#222",
  },

  loginButton: {
    width: "100%",
    marginTop: 24,
    padding: "12px 16px",
    border: "none",
    borderRadius: 8,
    background: "#667650",
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  },

  loginError: {
    marginTop: 16,
    padding: 10,
    borderRadius: 7,
    background: "#fff0f0",
    color: "#a33b3b",
    border: "1px solid #e7b8b8",
    fontSize: 14,
  },

  loginHelp: {
    marginTop: 16,
    textAlign: "center",
    color: "#777",
    fontSize: 12,
    lineHeight: 1.4,
  },

  appHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },

  appTitle: {
    margin: 0,
    fontSize: 34,
  },

  sessionBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
  },

  logoutButton: {
    padding: "7px 11px",
    border: "1px solid #bbb",
    borderRadius: 6,
    cursor: "pointer",
    background: "white",
    color: "#444",
  },

  container: {
    padding: 20,
    fontFamily: "Arial",
    background: "#f5f5f5",
    minHeight: "100vh",
  },

  menu: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  content: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,.1)",
  },

  dashboardCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 25,
  },

  metricCard: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 15,
    background: "#fff",
  },

  metricIcon: {
    fontSize: 30,
  },

  metricTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },

  metricValue: {
    fontSize: 23,
    fontWeight: "bold",
  },

  metricDetail: {
    fontSize: 12,
    color: "#777",
    marginTop: 5,
  },

  dashboardSections: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 20,
    marginTop: 25,
  },

  dashboardSection: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 18,
    background: "#fff",
  },

  dashboardTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 580,
  },

  dashboardTh: {
    textAlign: "left",
    padding: "9px 7px",
    borderBottom: "2px solid #ddd",
    fontSize: 13,
  },

  dashboardThRight: {
    textAlign: "right",
    padding: "9px 7px",
    borderBottom: "2px solid #ddd",
    fontSize: 13,
  },

  dashboardTd: {
    padding: "9px 7px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
  },

  dashboardTdRight: {
    padding: "9px 7px",
    borderBottom: "1px solid #eee",
    textAlign: "right",
    fontSize: 13,
  },

  alertColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 20,
  },

  alertItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 10,
    marginBottom: 8,
    border: "1px solid #eee",
    borderRadius: 8,
    background: "#fafafa",
    fontSize: 13,
  },

};

export default App;