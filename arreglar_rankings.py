from pathlib import Path
from datetime import datetime
import shutil
import sys

IMPORT_LINE = 'import DashboardRankings from "./components/DashboardRankings";'
COMPONENT_LINE = "      <DashboardRankings />"
DASHBOARD_MARKER = "      <div style={styles.dashboardSections}>"

def find_frontend_root(start: Path) -> Path:
    candidates = [start, *start.parents]

    for candidate in candidates:
        if (
            (candidate / "src" / "App.jsx").exists()
            and
            (candidate / "src" / "components").is_dir()
        ):
            return candidate

    raise RuntimeError(
        "No encontré la carpeta frontend. "
        "Guardá estos archivos dentro de la carpeta frontend y volvé a ejecutar."
    )

def main():
    package_dir = Path(__file__).resolve().parent
    frontend = find_frontend_root(Path.cwd())

    app_path = frontend / "src" / "App.jsx"
    components_dir = frontend / "src" / "components"
    rankings_source = package_dir / "DashboardRankings.jsx"
    rankings_target = components_dir / "DashboardRankings.jsx"

    if not rankings_source.exists():
        raise RuntimeError("Falta DashboardRankings.jsx junto al instalador.")

    app_text = app_path.read_text(encoding="utf-8")
    original = app_text

    if IMPORT_LINE not in app_text:
        import_marker = 'import Accounting from "./components/Accounting";'

        if import_marker in app_text:
            app_text = app_text.replace(
                import_marker,
                import_marker + "\n" + IMPORT_LINE,
                1
            )
        else:
            lines = app_text.splitlines()
            last_import = -1

            for index, line in enumerate(lines):
                if line.startswith("import "):
                    last_import = index

            if last_import < 0:
                raise RuntimeError("No encontré los imports en App.jsx.")

            lines.insert(last_import + 1, IMPORT_LINE)
            app_text = "\n".join(lines) + (
                "\n" if original.endswith("\n") else ""
            )

    if "<DashboardRankings" not in app_text:
        if DASHBOARD_MARKER not in app_text:
            raise RuntimeError(
                "No encontré la sección del Dashboard donde insertar los rankings."
            )

        app_text = app_text.replace(
            DASHBOARD_MARKER,
            COMPONENT_LINE + "\n\n" + DASHBOARD_MARKER,
            1
        )

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    if app_text != original:
        backup_path = app_path.with_name(
            f"{app_path.name}.backup-rankings-{stamp}"
        )
        shutil.copy2(app_path, backup_path)
        app_path.write_text(app_text, encoding="utf-8")
        print(f"✅ App.jsx corregido.")
        print(f"   Respaldo: {backup_path.name}")
    else:
        print("ℹ️ App.jsx ya contenía la conexión con los rankings.")

    shutil.copy2(rankings_source, rankings_target)

    final_text = app_path.read_text(encoding="utf-8")

    checks = {
        "Import de DashboardRankings": IMPORT_LINE in final_text,
        "Componente dentro del Dashboard": "<DashboardRankings" in final_text,
        "Archivo DashboardRankings.jsx": rankings_target.exists(),
    }

    print("")
    print("Verificación:")
    for label, ok in checks.items():
        print(f"{'✅' if ok else '❌'} {label}")

    if not all(checks.values()):
        raise RuntimeError("La verificación final no fue correcta.")

    print("")
    print("Ahora, si npm run dev estaba abierto, detenelo con Ctrl+C")
    print("y volvé a ejecutar: npm run dev")
    print("Después entrá nuevamente al Dashboard.")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("")
        print(f"❌ Error: {error}")
        sys.exit(1)
