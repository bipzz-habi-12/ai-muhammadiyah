import Landing from "@/components/home/Landing";

// Halaman publik yang dirender lewat rewrite di proxy.ts saat "/" diakses
// TANPA sesi login — lihat proxy.ts untuk kondisinya. URL address bar tetap
// "/"; user tidak pernah benar-benar mendarat di "/home" secara terlihat,
// kecuali mengetik path ini langsung.
export default function HomePage() {
  return <Landing />;
}
