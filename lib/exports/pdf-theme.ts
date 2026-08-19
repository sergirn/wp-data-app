import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const PDF_COLORS = {
	background: rgb(0.055, 0.075, 0.11),
	text: rgb(0.94, 0.965, 0.985),
	textSoft: rgb(0.58, 0.65, 0.73),
	border: rgb(0.17, 0.24, 0.32),
	borderSoft: rgb(0.12, 0.18, 0.25),
	surface: rgb(0.075, 0.105, 0.15),
	surfaceAlt: rgb(0.095, 0.135, 0.19),
	panel: rgb(0.11, 0.17, 0.23),
	primary: rgb(0.15, 0.68, 0.86),
	primaryStrong: rgb(0.08, 0.52, 0.75),
	primarySoft: rgb(0.07, 0.22, 0.3),
	blue: rgb(0.15, 0.68, 0.86),
	blueSoft: rgb(0.07, 0.22, 0.3),
	greenBg: rgb(0.06, 0.22, 0.16),
	greenText: rgb(0.35, 0.88, 0.61),
	redBg: rgb(0.25, 0.08, 0.1),
	redText: rgb(1, 0.45, 0.48),
	yellowBg: rgb(0.24, 0.18, 0.06),
	yellowText: rgb(0.98, 0.76, 0.28),
};

export async function embedReportFonts(pdfDoc: PDFDocument): Promise<{ font: PDFFont; fontBold: PDFFont }> {
	pdfDoc.registerFontkit(fontkit);
	const fontsDirectory = path.join(process.cwd(), "public", "fonts");
	const [regularBytes, semiboldBytes] = await Promise.all([
		readFile(path.join(fontsDirectory, "BaiJamjuree-Regular.ttf")),
		readFile(path.join(fontsDirectory, "BaiJamjuree-SemiBold.ttf")),
	]);

	const [font, fontBold] = await Promise.all([
		pdfDoc.embedFont(regularBytes, { subset: true }),
		pdfDoc.embedFont(semiboldBytes, { subset: true }),
	]);
	return { font, fontBold };
}

export function createThemedPage(pdfDoc: PDFDocument, width: number, height: number) {
	const page = pdfDoc.addPage([width, height]);
	page.drawRectangle({ x: 0, y: 0, width, height, color: PDF_COLORS.background });
	page.drawRectangle({ x: 0, y: height - 7, width, height: 7, color: PDF_COLORS.primaryStrong });
	page.drawRectangle({ x: 0, y: 0, width, height: 3, color: PDF_COLORS.primarySoft });
	page.drawEllipse({
		x: width - 42,
		y: height - 40,
		xScale: 92,
		yScale: 92,
		color: PDF_COLORS.primary,
		opacity: 0.055,
	});
	page.drawEllipse({
		x: width - 18,
		y: height - 18,
		xScale: 46,
		yScale: 46,
		color: PDF_COLORS.primary,
		opacity: 0.08,
	});
	return page;
}

export function drawAccentLabel(page: PDFPage, x: number, y: number, width = 28) {
	page.drawRectangle({ x, y, width, height: 3, color: PDF_COLORS.primary });
}
