/**
 * MDSync Core Utilities
 * Funcoes utilitarias para calculos geotecnicos, conversao de coordenadas e formatacao.
 */

export const Utils = {
    /**
     * Converte coordenadas UTM 23S / SIRGAS 2000 (X=EW, Y=NS) para Lat/Lon WGS84
     * para plotagem direta em mapas Leaflet / OpenStreetMap / Google Maps.
     */
    utm23sToLatLng(ew, ns) {
        if (!ew || !ns || isNaN(ew) || isNaN(ns)) {
            return null;
        }

        const a = 6378137.0; // WGS84 / GRS80 semi-eixo maior
        const f = 1 / 298.257222101;
        const e = Math.sqrt(2 * f - f * f);
        const e1sq = (e * e) / (1 - e * e);
        const k0 = 0.9996;
        const zone = 23;
        const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

        const x = parseFloat(ew) - 500000.0;
        const y = parseFloat(ns) - 10000000.0; // Hemisferio Sul

        const M = y / k0;
        const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * Math.pow(e, 6) / 256));
        const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));

        const phi1 = mu + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
            + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
            + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu);

        const sinPhi1 = Math.sin(phi1);
        const cosPhi1 = Math.cos(phi1);
        const tanPhi1 = Math.tan(phi1);

        const N1 = a / Math.sqrt(1 - e * e * sinPhi1 * sinPhi1);
        const T1 = tanPhi1 * tanPhi1;
        const C1 = e1sq * cosPhi1 * cosPhi1;
        const R1 = a * (1 - e * e) / Math.pow(1 - e * e * sinPhi1 * sinPhi1, 1.5);
        const D = x / (N1 * k0);

        const lat = phi1 - (N1 * tanPhi1 / R1) * (
            D * D / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720
        );

        const lon = lon0 + (
            D
            - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120
        ) / cosPhi1;

        return {
            lat: lat * (180 / Math.PI),
            lng: lon * (180 / Math.PI)
        };
    },

    /**
     * Formata valores numericos de cotas e leituras
     */
    formatNumber(value, digits = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return "-";
        }
        return Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    },

    /**
     * Formata data ISO para padrao brasileiro
     */
    formatDate(isoString, includeTime = false) {
        if (!isoString) return "-";
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return includeTime
                ? date.toLocaleString("pt-BR")
                : date.toLocaleDateString("pt-BR");
        } catch {
            return isoString;
        }
    },

    /**
     * Determina classe de alerta e cor para o status geotécnico
     */
    getStatusBadge(status) {
        const s = (status || "").toLowerCase();
        if (s.includes("emergencia") || s.includes("crítico") || s.includes("critico")) {
            return { label: "Emergência", class: "status-danger", color: "#dc2626" };
        }
        if (s.includes("alerta")) {
            return { label: "Alerta", class: "status-alert", color: "#ea580c" };
        }
        if (s.includes("atencao") || s.includes("atenção")) {
            return { label: "Atenção", class: "status-warning", color: "#eab308" };
        }
        return { label: "Normal", class: "status-success", color: "#16a34a" };
    },

    /**
     * Sanitiza strings para exibicao segura
     */
    escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};
