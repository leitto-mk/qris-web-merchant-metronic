const ImagePrintService = {
    base64(base64Image) {
        try {
            const src = base64Image?.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image || ''}`;

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.setAttribute('aria-hidden', 'true');

            document.body.appendChild(iframe);

            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                    <html lang="en">
                      <head>
                        <title>Print</title>
                        <style>
                          @page { size: auto; margin: 0; }
                          html, body { margin: 0; padding: 0; }
                          img { width: 100%; height: auto; display: block; }
                        </style>
                      </head>
                      <body>
                        <img id="qris-base64-image" src="${src}" alt="" />
                      </body>
                    </html>
                `);
            doc.close();

            const imageEl = doc.getElementById('qris-base64-image');
            const cleanup = () => setTimeout(() => document.body.removeChild(iframe), 200);

            imageEl.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                cleanup();
            };

            imageEl.onerror = () => {
                console.error('Failed to load image for printing');
                cleanup();
            };
        } catch (e) {
            console.error('Print failed', e);
        }
    }
};

export default ImagePrintService;
