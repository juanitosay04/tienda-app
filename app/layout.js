import "./globals.css";

export const metadata = {
  title: "Tienda Donde Juancho",
  description: "Sistema de ventas, fiados e inventario",
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
