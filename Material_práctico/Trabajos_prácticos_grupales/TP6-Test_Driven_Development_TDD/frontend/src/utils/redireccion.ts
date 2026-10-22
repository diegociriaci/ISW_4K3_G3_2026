// Sale de la app hacia otro sitio (por ejemplo, Mercado Pago Checkout Pro)
export default function redirigirFueraDeLaApp(url: string): void {
  window.location.assign(url);
}
