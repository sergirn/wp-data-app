import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true
	},
	typescript: {
		ignoreBuildErrors: true
	},
	images: {
		unoptimized: true
	}
};

// Exportamos configuración combinada con soporte PWA
export default withPWA({
	dest: "public",
	register: true,
	skipWaiting: true,

	// Muy importante:
	// No activar PWA en modo dev, solo en producción
	disable: process.env.NODE_ENV === "development"
})(nextConfig);
