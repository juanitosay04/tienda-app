import "./globals.css";

export const metadata = {
  title: "Mi Tienda Pro",
  description: "Sistema de ventas e inventario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
