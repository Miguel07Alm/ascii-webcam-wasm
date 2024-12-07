const ASCII_CHARS = "`.',-~:;=+*#%@M";

class Convert {
    constructor(preserveColor) {
        this.preserveColor = preserveColor;
        this.asciiLookup = new Uint8Array(256);
        this.resultBuffer = new Array(1024); // Buffer preasignado
        this.colorBuffer = new Array(1024);  // Buffer para colores
        
        // Precalcular lookup table
        for (let i = 0; i < 256; i++) {
            this.asciiLookup[i] = ((i * (ASCII_CHARS.length - 1) + 127) / 255) | 0;
        }
        
        // Precalcular caracteres ASCII
        this.chars = ASCII_CHARS.split('');
        
        // Precalcular colores comunes
        this.colorCache = new Map();
        // Generar algunos colores comunes
        for (let r = 0; r < 256; r += 32) {
            for (let g = 0; g < 256; g += 32) {
                for (let b = 0; b < 256; b += 32) {
                    const key = (r << 16) | (g << 8) | b;
                    this.colorCache.set(key, {r, g, b});
                }
            }
        }
    }

    getColor(r, g, b) {
        const key = ((r & 0xE0) << 16) | ((g & 0xE0) << 8) | (b & 0xE0);
        return this.colorCache.get(key) || {r, g, b};
    }

    processRow(imageData, width, y, outputArray) {
        const rowStart = y * width * 4;
        const rowLength = width * 4;
        let bufferIndex = 0;
        
        // Usar vista tipada para acceso más rápido
        const data = new Uint8Array(imageData.buffer, rowStart, rowLength);
        
        for (let i = 0; i < rowLength; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const gray = (r * 77 + g * 151 + b * 28) >>> 8;
            const char = this.chars[this.asciiLookup[gray]];

            if (this.preserveColor) {
                this.colorBuffer[bufferIndex] = this.getColor(r, g, b);
            }
            this.resultBuffer[bufferIndex] = char;
            bufferIndex++;
        }
        
        if (this.preserveColor) {
            outputArray.push({
                chars: this.resultBuffer.slice(0, bufferIndex),
                colors: this.colorBuffer.slice(0, bufferIndex)
            });
        } else {
            outputArray.push(this.resultBuffer.slice(0, bufferIndex).join(''));
        }
    }
}

const converterInstance = new Convert(true);

export function toAscii(imageData, width, height, preserveColor) {
    if (converterInstance.preserveColor !== preserveColor) {
        converterInstance.preserveColor = preserveColor;
    }
    
    const rows = new Array(height);
    for (let y = 0; y < height; y++) {
        rows[y] = [];
        converterInstance.processRow(imageData, width, y, rows[y]);
    }
    
    return rows;
}