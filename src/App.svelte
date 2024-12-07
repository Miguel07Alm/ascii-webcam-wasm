<script>
    import { onMount } from 'svelte';
    import { toAscii } from './asciiConverter';
    
    let asciiArt = 'Iniciando cámara...';
    let video;
    let active = false;
    let error = null;
    let preserveColor = true;
    let fps = 0;
    let frameCount = 0;
    let lastTime = performance.now();

    // Cache para el HTML generado
    let htmlCache = new Map();
    
    // Optimizar la conversión ANSI a HTML
    function ansiToHtml(rows) {
        if (!Array.isArray(rows)) return '';
        
        return rows.map(row => {
            if (Array.isArray(row)) {
                const [data] = row;
                if (preserveColor && data.chars) {
                    return data.chars.map((char, i) => {
                        const color = data.colors[i];
                        return `<span style="color:rgb(${color.r},${color.g},${color.b})">${char}</span>`;
                    }).join('');
                }
                return data;
            }
            return row;
        }).join('<br>');
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                } 
            });
            video.srcObject = stream;
            await video.play();
            
            // Ajustar el canvas al aspect ratio del video
            const canvas = document.createElement('canvas');
            const aspectRatio = video.videoWidth / video.videoHeight;
            const targetWidth = 50; // Ancho objetivo para ASCII art
            canvas.width = targetWidth;
            canvas.height = Math.round(targetWidth / aspectRatio);
            
            const ctx = canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: true
            });

            active = true;
            error = null;

            function processFrame() {
                if (active && video.readyState === video.HAVE_ENOUGH_DATA) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const rawAscii = toAscii(imageData.data, canvas.width, canvas.height, preserveColor);
                    asciiArt = ansiToHtml(rawAscii);
                    updateFPS();
                }
                requestAnimationFrame(processFrame);
            }

            requestAnimationFrame(processFrame);
        } catch (e) {
            error = "Error al acceder a la cámara: " + e.message;
            console.error(e);
        }
    }

    function updateFPS() {
        const now = performance.now();
        const delta = now - lastTime;
        
        if (delta >= 1000) {
            fps = Math.round((frameCount * 1000) / delta);
            frameCount = 0;
            lastTime = now;
        }
        frameCount++;
    }

    onMount(async () => {
        try {
            const canvas = document.createElement('canvas');
			canvas.width = 100;
			canvas.height = 50;
            const ctx = canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: true
            });
            let animationFrame;

            function processFrame() {
                if (active && video.readyState === video.HAVE_ENOUGH_DATA) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const rawAscii = toAscii(imageData.data, canvas.width, canvas.height, preserveColor);
                    asciiArt = ansiToHtml(rawAscii);
                    updateFPS();
                }
                animationFrame = requestAnimationFrame(processFrame);
            }

            // Usar requestAnimationFrame en lugar de setInterval
            animationFrame = requestAnimationFrame(processFrame);

            return () => {
                cancelAnimationFrame(animationFrame);
                htmlCache.clear();
            };
        } catch (e) {
            error = "Error al inicializar: " + e.message;
            console.error(e);
        }
    });
</script>

<main>
    <div class="controls">
        <button on:click={startCamera} disabled={active}>
            {active ? 'Cámara activa' : 'Iniciar cámara'}
        </button>
        <label>
            <input type="checkbox" bind:checked={preserveColor}>
            Preservar color
        </label>
        {#if active}
            <span class="fps">{fps} FPS</span>
        {/if}
    </div>

    {#if error}
        <p class="error">{error}</p>
    {/if}

    <video bind:this={video} style="display: none;"></video>
    <pre class="ascii-container" class:with-color={preserveColor}>
        {@html asciiArt}
    </pre>
</main>

<style>
    main {
        text-align: center;
        padding: 20px;
    }

    pre {
        font-family: monospace;
        font-size: 8px;
        line-height: 6px;
        background: black;
        color: white;
        padding: 10px;
        margin: 20px auto;
        display: inline-block;
        text-align: left;
    }

    button {
        padding: 10px 20px;
        margin: 10px;
    }

    .error {
        color: red;
        margin: 10px;
    }

    .controls {
        margin-bottom: 20px;
    }

    .ascii-container {
        font-family: monospace;
        font-size: 4px;         
        line-height: 4px;    
        background: black;
        color: white;
        padding: 10px;
        margin: 30px auto;   
        white-space: pre;
        display: inline-block;
        transform: scale(3);
        transform-origin: center top;
        letter-spacing: 0px;
    }

    .with-color :global(span) {
        display: inline;
        letter-spacing: 0px;
    }

    label {
        margin-left: 10px;
    }

    .fps {
        margin-left: 15px;
        background: #333;
        padding: 4px 8px;
        border-radius: 4px;
        color: #fff;
        font-family: monospace;
    }
</style>