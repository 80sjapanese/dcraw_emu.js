const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const halfSizeCheck = document.getElementById('halfSizeCheck');
const statusEl = document.getElementById('status');
const resultDiv = document.getElementById('result');
const downloadLink = document.getElementById('downloadLink');

let rawFileData = null;

// Processing when selecting a file
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusEl.textContent = `Loading ${file.name} into memory...`;
    processBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = (event) => {
        // Store file data as Uint8Array
        rawFileData = new Uint8Array(event.target.result);
        const sizeMB = (rawFileData.length / 1024 / 1024).toFixed(2);
        statusEl.textContent = `File loaded. Ready to process (${sizeMB} MB).`;
        processBtn.disabled = false;
    };
    reader.readAsArrayBuffer(file);
});

// Processing when clicking the "Process" button
processBtn.addEventListener('click', async () => {
    if (!rawFileData) return;

    statusEl.textContent = "Processing RAW file... (This may take a few seconds)";
    processBtn.disabled = true;
    resultDiv.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 50));

    let Module = null;
    let c_logs = ""; // Store internal logs from the C++ side (dcraw_emu)

    const startTime = performance.now();

    try {
        // 1. Initialize the Wasm module (hook internal logs simultaneously)
        Module = await createDcrawModule({
            print: (text) => { 
                console.log("dcraw stdout:", text); 
                c_logs += text + "\n"; 
            },
            printErr: (text) => { 
                console.error("dcraw stderr:", text); 
                c_logs += text + "\n"; 
            }
        });

        // 2. Write to the virtual file system
        Module.FS.writeFile('/input.raw', rawFileData);

        // 3. Assemble execution arguments
        const args = ['-T', '-w'];
        if (halfSizeCheck.checked) {
            args.push('-h');
        }
        args.push('/input.raw');
        
        // Execute processing
        Module.callMain(args);

        // 4. Read the result
        const outData = Module.FS.readFile('/input.raw.tiff');

        // 5. Create download link
        const blob = new Blob([outData], { type: 'image/tiff' });
        const url = URL.createObjectURL(blob);
        
        downloadLink.href = url;
        resultDiv.style.display = 'block';

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        statusEl.textContent = `Done in ${duration} seconds!`;

    } catch (error) {
        console.error("JavaScript Error:", error);
        
        // If an error occurs, display not only the JS error but also the internal logs from the C++ side
        statusEl.innerHTML = `
            <span style="color:red; font-weight:bold;">Error: ${error.message || 'Processing failed'}</span>
            <div style="margin-top: 15px; text-align: left;">
                <b>[dcraw_emu Internal Logs]</b>
                <pre style="background: #f8d7da; color: #721c24; padding: 10px; font-size: 13px; overflow-x: auto;">${c_logs || "(No internal logs)"}</pre>
            </div>
        `;
    } finally {
        // 6. Memory release
        if (Module) {
            Module = null;
        }
        processBtn.disabled = false;
    }
});