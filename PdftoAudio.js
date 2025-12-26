
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const display = document.getElementById("displayWord");
const pdfContainer = document.getElementById("pdfContainer");
const progressBar = document.getElementById("progressBar");
const speechRateInput = document.getElementById("rate");

let wordSpans = [];
let currentIndex = 0;
let isPaused = false;
let isStopped = false;
let currentUtterance = null;

async function processPDF() {
    const file = document.getElementById('pdfInput').files[0];
    if (!file) {
        alert("Please select a PDF file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        pdfContainer.innerHTML = '';
        wordSpans = [];
        currentIndex = 0;
        isStopped = false;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });

            const pageDiv = document.createElement("div");
            pageDiv.style.position = "relative";
            pageDiv.style.marginBottom = "20px";

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;

            const textContent = await page.getTextContent();
            const textLayer = document.createElement("div");
            textLayer.className = "textLayer";
            textLayer.style.width = canvas.width + "px";
            textLayer.style.height = canvas.height + "px";

            const fragment = document.createDocumentFragment();
            textContent.items.forEach(item => {
                const text = item.str.trim();
                if (!text) return;

                const span = document.createElement("span");
                span.textContent = text
                span.setAttribute('data-word', text);

                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                Object.assign(span.style, {
                    left: `${tx[4]}px`,
                    top: `${tx[5] - item.height}px`,
                    fontSize: `${item.height}px`,
                    fontFamily: item.fontName
                });

                span.classList.add("word");
                wordSpans.push(span);
                fragment.appendChild(span);
            });

            textLayer.appendChild(fragment);
            pageDiv.appendChild(canvas);
            pageDiv.appendChild(textLayer);
            pdfContainer.appendChild(pageDiv);
        }

        speakNext();
    };
    reader.readAsArrayBuffer(file);
}

function speakNext() {
    if (currentIndex >= wordSpans.length || isStopped) {
        display.textContent = "Finished reading!";
        progressBar.style.width = '100%';
        return;
    }

    const wordSpan = wordSpans[currentIndex];
    const word = wordSpan.getAttribute('data-word');

    wordSpans.forEach(span => span.classList.remove("highlight"));
    wordSpan.classList.add("highlight");
    display.textContent = word;

    currentUtterance = new SpeechSynthesisUtterance(word);
    currentUtterance.rate = parseFloat(speechRateInput.value);

    currentUtterance.onend = () => {
        if (!isPaused && !isStopped) {
            currentIndex++;
            const progressPercentage = (currentIndex / wordSpans.length) * 100;
            progressBar.style.width = `${progressPercentage}%`;
            speakNext();
        }
    };

    speechSynthesis.speak(currentUtterance);
}

function pauseReading() {
    if (!isPaused) {
        isPaused = true;
        speechSynthesis.pause();
    }
}

function resumeReading() {
    if (isPaused) {
        isPaused = false;
        speechSynthesis.resume();
    }
}

function stopReading() {
    isPaused = false;
    isStopped = true;
    speechSynthesis.cancel();
    currentIndex = 0;
    display.textContent = "Stopped.";
    progressBar.style.width = '0%';
    wordSpans.forEach(span => span.classList.remove("highlight"));
}
