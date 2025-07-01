// DOM elements
const curlCommand = document.getElementById('curlCommand');
const expectedText = document.getElementById('expectedText');
const iterations = document.getElementById('iterations');
const executeBtn = document.getElementById('executeBtn');
const snippetBtn = document.getElementById('snippetBtn');
const stopBtn = document.getElementById('stopBtn');
const outputText = document.getElementById('outputText');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const snippetModal = document.getElementById('snippetModal');
const codeContent = document.getElementById('codeContent');
const copyBtn = document.getElementById('copyBtn');
const totalRequestsEl = document.getElementById('totalRequests');
const successCountEl = document.getElementById('successCount');
const failureCountEl = document.getElementById('failureCount');
const successRateEl = document.getElementById('successRate');
const closeModals = document.querySelectorAll('.close-modal');

// Execution state
let stopExecution = false;
let currentIteration = 0;
let totalIterations = 0;
let successCount = 0;
let failureCount = 0;

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        document.getElementById(`${tabName}Content`).classList.add('active');
    });
});

// Modal handling
aboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'flex';
});

snippetBtn.addEventListener('click', () => {
    generateSnippet();
    snippetModal.style.display = 'flex';
});

closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        aboutModal.style.display = 'none';
        snippetModal.style.display = 'none';
    });
});

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
    if (e.target === snippetModal) snippetModal.style.display = 'none';
});

// Copy to clipboard
copyBtn.addEventListener('click', () => {
    const textArea = document.createElement('textarea');
    textArea.value = codeContent.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // Show copied feedback
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
    }, 1500);
});

// Execute requests
executeBtn.addEventListener('click', async () => {
    // Reset state
    stopExecution = false;
    currentIteration = 0;
    successCount = 0;
    failureCount = 0;
    outputText.innerHTML = '';
    updateStats();

    // Get input values
    const curlText = curlCommand.value.trim();
    const searchText = expectedText.value.trim();
    const iterCount = parseInt(iterations.value) || 50;
    totalIterations = iterCount;

    // Validate inputs
    if (!curlText) {
        alert('Please enter a cURL command.');
        return;
    }

    if (!searchText) {
        alert('Please enter text to search for.');
        return;
    }

    // Update UI
    executeBtn.disabled = true;
    stopBtn.disabled = false;
    progressFill.style.width = '0%';
    progressLabel.textContent = `0/${totalIterations} completed`;

    // Extract URL and headers from cURL command
    const { url, headers, cookies } = extractUrl(curlCommand.value.trim());

    if (!url) {
        alert('Could not extract URL from cURL command.');
        executeBtn.disabled = false;
        stopBtn.disabled = true;
        return;
    }

    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        alert(`Invalid URL format: ${url}`);
        executeBtn.disabled = false;
        stopBtn.disabled = true;
        return;
    }

    // Run requests
    for (let i = 0; i < iterCount; i++) {
        if (stopExecution) {
            outputText.innerHTML += `<div class="warning">Execution stopped after ${i} iterations.</div>`;
            break;
        }

        currentIteration = i + 1;

        try {
            const startTime = Date.now();
            console.log(url)
            const response = await fetch(url, {
                headers,
                credentials: 'include' // Include cookies if any
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseText = await response.text();
            const found = responseText.includes(searchText);
            const duration = Date.now() - startTime;

            // Update output
            const resultLine = document.createElement('div');
            resultLine.textContent = `Iteration: ${i+1} | ${response.status} | ${found ? 'Found Text' : 'Text Not Found'} | ${duration}ms`;
            resultLine.className = found ? 'success' : 'error';
            outputText.appendChild(resultLine);

            // Update stats
            if (found) successCount++;
            else failureCount++;

        } catch (error) {
            let errorMessage = error.message;

            // Provide more specific error messages
            if (error.message.includes('Failed to fetch')) {
                errorMessage = `Network error: ${getNetworkErrorDetails(url)}`;
            } else if (error.message.includes('CORS')) {
                errorMessage = `CORS error: The server is blocking requests from this origin. Try a CORS proxy or enable CORS on the server.`;
            }

            const errorLine = document.createElement('div');
            errorLine.innerHTML = `<span class="error">Iteration: ${i+1} | ${errorMessage}</span>`;
            outputText.appendChild(errorLine);

            failureCount++;
        }

        // Scroll to bottom
        outputText.scrollTop = outputText.scrollHeight;

        // Update progress
        const progressPercent = (currentIteration / totalIterations) * 100;
        progressFill.style.width = `${progressPercent}%`;
        progressLabel.textContent = `${currentIteration}/${totalIterations} completed`;

        // Add a small delay to prevent browser freezing
        await new Promise(resolve => setTimeout(resolve, 50));

        // Update stats
        updateStats();

        // Add a small delay to prevent browser freezing
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Reset UI
    executeBtn.disabled = false;
    stopBtn.disabled = true;
});

// Helper function to diagnose network errors
function getNetworkErrorDetails(url) {
    const details = [];

    // Check if URL is HTTPS
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
        details.push('Mixed Content: Trying to access HTTP from HTTPS page');
    }

    // Check if URL is valid
    try {
        new URL(url);
    } catch (e) {
        details.push('Invalid URL format');
    }

    // Check for domain issues
    if (!url.includes('://') || url.split('://')[1].split('/')[0].includes(' ')) {
        details.push('Invalid domain name');
    }

    return details.length > 0 ? details.join('. ') : 'Unknown network issue. Check your connection.';
}


// Improved extractUrl function
function extractUrl(curlCommand) {
    let url = null;
    const headers = {};
    const cookies = {};

    // Extract URL
    const urlMatch = curlCommand.match(/curl\s+['"]([^'"]+)['"]/);
    if (urlMatch && urlMatch[1]) {
        url = urlMatch[1];
    }

    // Extract headers
    const headerMatches = curlCommand.matchAll(/-H\s+['"]([^'"]+)['"]/g);
    for (const match of headerMatches) {
        const [key, value] = match[1].split(':').map(s => s.trim());
        if (key && value) {
            headers[key] = value;
        }
    }

    // Extract cookies
    const cookieMatch = curlCommand.match(/-b\s+['"]([^'"]+)['"]/);
    if (cookieMatch && cookieMatch[1]) {
        cookieMatch[1].split(';').forEach(pair => {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value) {
                cookies[key] = decodeURIComponent(value);
            }
        });
    }

    return { url, headers, cookies };
}


// Stop execution
stopBtn.addEventListener('click', () => {
    stopExecution = true;
    stopBtn.disabled = true;  // Disable the stop button after it’s clicked
    executeBtn.disabled = false; // Allow re-execution if needed
});


// Update statistics
function updateStats() {
    const total = successCount + failureCount;
    const successRate = total > 0 ? (successCount / total * 100).toFixed(2) : 0;

    totalRequestsEl.textContent = total;
    successCountEl.textContent = successCount;
    failureCountEl.textContent = failureCount;
    successRateEl.textContent = `${successRate}%`;
}

// Generate Python snippet
function generateSnippet() {
    const curlText = curlCommand.value.trim();
    const searchText = expectedText.value.trim();
    const iterCount = parseInt(iterations.value) || 50;

    const { url, headers } = extractUrl(curlText);

    if (!url) {
        codeContent.textContent = 'Error: Could not extract URL from cURL command.';
        return;
    }

    // Format headers for Python
    let headersStr = 'headers = {\n';
    for (const [key, value] of Object.entries(headers)) {
        headersStr += `    '${key}': '${value}',\n`;
    }
    headersStr += '}';

    // Generate Python code
    const pythonCode = `
import requests

url = '${url}'
${headersStr}
expected_text = '${searchText}'
iterations = ${iterCount}

for i in range(iterations):
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            if expected_text in response.text:
                print(f"Iteration {i+1}: Found expected text")
            else:
                print(f"Iteration {i+1}: Expected text not found")
        else:
            print(f"Iteration {i+1}: Request failed with status {response.status_code}")
    except Exception as e:
        print(f"Iteration {i+1}: Error occurred - {str(e)}")`;

    codeContent.textContent = pythonCode;
}


// Initialize UI
function init() {
    stopBtn.disabled = true;
    updateStats();

    // Add sample output
    outputText.innerHTML = '<div class="success">Iteration: 1 | 200 | Found Text</div>' +
                          '<div class="success">Iteration: 2 | 200 | Found Text</div>' +
                          '<div class="error">Iteration: 3 | 404 | Text Not Found</div>' +
                          '<div class="success">Iteration: 4 | 200 | Found Text</div>';

    // Set sample stats
    successCount = 3;
    failureCount = 1;
    updateStats();
}

// Initialize
init();
